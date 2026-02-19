import { Hono } from 'hono';
import pool from '../db.js';
import * as youtubeScraper from '../scrapers/youtube.js';
import * as twitterScraper from '../scrapers/twitter.js';
import { scrapeRateLimit } from '../middleware/ratelimit.js';

const scrape = new Hono();

// SECURITY FIX: Apply strict rate limiting to all scrape endpoints
scrape.use('/*', scrapeRateLimit);

// POST /api/scrape/:creatorId - Trigger manual scrape for a specific creator
scrape.post('/:creatorId', async (c) => {
  const creatorId = parseInt(c.req.param('creatorId'));

  if (isNaN(creatorId) || creatorId <= 0) {
    return c.json({ error: 'Invalid creator ID' }, 400);
  }

  try {
    const result = await scrapeCreatorById(creatorId);
    return c.json(result);
  } catch (err) {
    console.error(`Error scraping creator ${creatorId}:`, err);
    // SECURITY FIX: Don't leak error details in production
    return c.json({ 
      error: 'Failed to scrape creator',
      details: process.env.NODE_ENV === 'production' ? undefined : err.message
    }, 500);
  }
});

// Helper function to scrape a single creator (shared logic)
async function scrapeCreatorById(creatorId) {
  const creatorResult = await pool.query(
    'SELECT * FROM creators WHERE id = $1',
    [creatorId]
  );

  if (creatorResult.rows.length === 0) {
    throw new Error('Creator not found');
  }

  const creator = creatorResult.rows[0];
  let scrapedData;
  let contentInserted = 0;
  let commentsInserted = 0;

  // Scrape based on platform
  if (creator.platform === 'youtube') {
    scrapedData = await youtubeScraper.scrapeChannel(creator.handle);
    
    // Update creator metadata
    if (scrapedData.channel) {
      await pool.query(
        `UPDATE creators 
         SET subscriber_count = $1, metadata = $2, last_scraped_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [
          scrapedData.channel.subscriberCount || creator.subscriber_count,
          JSON.stringify(scrapedData.channel),
          creatorId
        ]
      );
    }

    // Insert videos
    if (scrapedData.videos) {
      for (const video of scrapedData.videos) {
        const result = await pool.query(
          `INSERT INTO content (creator_id, platform, external_id, title, description, published_at, metrics)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (platform, external_id) DO UPDATE
           SET title = EXCLUDED.title, metrics = EXCLUDED.metrics
           RETURNING id`,
          [
            creatorId,
            'youtube',
            video.id,
            video.title,
            video.description,
            new Date(), // Approximate, would need better parsing
            JSON.stringify({
              views: video.viewCount || 0,
              duration: video.duration
            })
          ]
        );

        if (result.rows.length > 0) {
          contentInserted++;

          // Scrape comments for this video
          try {
            const comments = await youtubeScraper.scrapeVideoComments(video.id, 50);
            for (const comment of comments) {
              await pool.query(
                `INSERT INTO comments (content_id, text, author, likes)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT DO NOTHING`,
                [result.rows[0].id, comment.text, comment.author, comment.likes || 0]
              );
              commentsInserted++;
            }
          } catch (commentErr) {
            console.error(`Failed to scrape comments for video ${video.id}:`, commentErr);
          }
        }
      }
    }

  } else if (creator.platform === 'twitter') {
    scrapedData = await twitterScraper.scrapeProfile(creator.handle);

    // Update creator metadata
    if (scrapedData.profile) {
      await pool.query(
        `UPDATE creators 
         SET subscriber_count = $1, metadata = $2, last_scraped_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [
          scrapedData.profile.followerCount || creator.subscriber_count,
          JSON.stringify(scrapedData.profile),
          creatorId
        ]
      );
    }

    // Insert posts
    if (scrapedData.posts) {
      for (const post of scrapedData.posts) {
        const result = await pool.query(
          `INSERT INTO content (creator_id, platform, external_id, title, description, published_at, metrics)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (platform, external_id) DO UPDATE
           SET metrics = EXCLUDED.metrics
           RETURNING id`,
          [
            creatorId,
            'twitter',
            post.id,
            post.text.substring(0, 100), // First 100 chars as title
            post.text,
            new Date(post.createdAt),
            JSON.stringify(post.metrics)
          ]
        );

        if (result.rows.length > 0) {
          contentInserted++;
        }
      }
    }
  }

  return {
    success: true,
    creator: creator.name,
    platform: creator.platform,
    contentInserted,
    commentsInserted
  };
}

// POST /api/scrape/all - Scrape all tracked creators
scrape.post('/all', async (c) => {
  try {
    const result = await pool.query('SELECT * FROM creators ORDER BY id');
    const creators = result.rows;

    const results = {
      total: creators.length,
      successful: 0,
      failed: 0,
      details: []
    };

    for (const creator of creators) {
      try {
        // Call scrape function directly instead of making HTTP request to self
        // SECURITY FIX: Eliminates SSRF and prevents API key leakage in self-requests
        const data = await scrapeCreatorById(creator.id);
        results.successful++;
        results.details.push({
          creator: creator.name,
          platform: creator.platform,
          status: 'success',
          ...data
        });
      } catch (err) {
        results.failed++;
        results.details.push({
          creator: creator.name,
          platform: creator.platform,
          status: 'failed',
          error: err.message
        });
      }

      // Small delay to avoid overwhelming services
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return c.json(results);

  } catch (err) {
    console.error('Error scraping all creators:', err);
    // SECURITY FIX: Don't leak error details in production
    return c.json({ 
      error: 'Failed to scrape creators',
      details: process.env.NODE_ENV === 'production' ? undefined : err.message
    }, 500);
  }
});

export default scrape;
