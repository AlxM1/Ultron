import { Hono } from 'hono';
import pool from '../db.js';
import * as youtubeScraper from '../scrapers/youtube.js';
import * as twitterScraper from '../scrapers/twitter.js';

const scrape = new Hono();

// POST /api/scrape/:creatorId - Trigger manual scrape for a specific creator
scrape.post('/:creatorId', async (c) => {
  const creatorId = parseInt(c.req.param('creatorId'));

  try {
    // Get creator details
    const creatorResult = await pool.query(
      'SELECT * FROM creators WHERE id = $1',
      [creatorId]
    );

    if (creatorResult.rows.length === 0) {
      return c.json({ error: 'Creator not found' }, 404);
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

    return c.json({
      success: true,
      creator: creator.name,
      platform: creator.platform,
      contentInserted,
      commentsInserted
    });

  } catch (err) {
    console.error(`Error scraping creator ${creatorId}:`, err);
    return c.json({ 
      error: 'Failed to scrape creator',
      details: err.message 
    }, 500);
  }
});

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
        // Trigger scrape for this creator (reuse the single creator logic)
        const response = await fetch(`http://localhost:${process.env.PORT || 3015}/api/scrape/${creator.id}`, {
          method: 'POST',
          headers: {
            'X-API-Key': c.req.header('X-API-Key')
          }
        });

        if (response.ok) {
          results.successful++;
          const data = await response.json();
          results.details.push({
            creator: creator.name,
            platform: creator.platform,
            status: 'success',
            ...data
          });
        } else {
          results.failed++;
          results.details.push({
            creator: creator.name,
            platform: creator.platform,
            status: 'failed',
            error: await response.text()
          });
        }
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
    return c.json({ error: 'Failed to scrape creators' }, 500);
  }
});

export default scrape;
