import fetch from 'node-fetch';

/**
 * Twitter/X Scraper Module
 * Uses Apify scraper service via job-based API
 */

const APIFY_SCRAPER_URL = process.env.APIFY_SCRAPER_URL || 'http://raiser-apify:8000';
const JOB_POLL_INTERVAL_MS = 3000;
const JOB_TIMEOUT_MS = 120000; // 2 minutes max

// SECURITY FIX: Validate Apify scraper URL at startup
try {
  const apifyUrl = new URL(APIFY_SCRAPER_URL);
  if (!['http:', 'https:'].includes(apifyUrl.protocol)) {
    throw new Error('Invalid APIFY_SCRAPER_URL protocol');
  }
  console.log('✓ Twitter scraper URL validated:', APIFY_SCRAPER_URL);
} catch (err) {
  console.error('⚠️  Invalid APIFY_SCRAPER_URL:', err.message);
}

/**
 * Submit a scrape job and wait for completion
 */
async function submitAndWait(platform, action, target, maxResults = 50) {
  // Submit job
  const submitRes = await fetch(`${APIFY_SCRAPER_URL}/api/scrapes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform, action, target, max_results: maxResults })
  });

  if (!submitRes.ok) {
    throw new Error(`Apify job submit failed: ${submitRes.status} ${submitRes.statusText}`);
  }

  const job = await submitRes.json();
  const jobId = job.id;

  // Poll for completion
  const deadline = Date.now() + JOB_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, JOB_POLL_INTERVAL_MS));

    const statusRes = await fetch(`${APIFY_SCRAPER_URL}/api/scrapes/${jobId}`);
    if (!statusRes.ok) {
      throw new Error(`Failed to poll job ${jobId}: ${statusRes.status}`);
    }

    const status = await statusRes.json();

    if (status.status === 'COMPLETED' || status.status === 'completed') {
      return status;
    }
    if (status.status === 'FAILED' || status.status === 'failed' || status.status === 'CANCELLED') {
      throw new Error(`Scrape job failed: ${status.error || 'unknown error'}`);
    }
    // Still pending/running — keep polling
  }

  throw new Error(`Scrape job ${jobId} timed out after ${JOB_TIMEOUT_MS / 1000}s`);
}

/**
 * Scrape a Twitter/X profile
 */
export async function scrapeProfile(handle) {
  const username = handle.replace('@', '');

  try {
    // Use 'posts' action to get timeline data (includes profile context)
    const job = await submitAndWait('twitter', 'posts', username, 50);

    const results = job.results || [];
    const posts = results.filter(r => r.content_type === 'post' || r.content_type === 'tweet');
    const profileResult = results.find(r => r.content_type === 'profile');

    const profileData = profileResult?.data || {};

    return {
      profile: {
        name: profileData.name || profileData.display_name || handle,
        handle: username,
        followerCount: profileData.followers_count || profileData.followers || 0,
        followingCount: profileData.following_count || profileData.following || 0,
        tweetCount: profileData.tweet_count || profileData.statuses_count || 0,
        bio: profileData.description || profileData.bio || '',
        verified: profileData.verified || false,
        avatar: profileData.profile_image_url || profileData.image || null
      },
      posts: posts.map(r => {
        const d = r.data || {};
        return {
          id: d.tweet_id || d.id || d.id_str || '',
          text: d.text || d.full_text || '',
          createdAt: d.created_at || null,
          metrics: {
            likes: d.like_count || d.favorite_count || 0,
            retweets: d.retweet_count || 0,
            replies: d.reply_count || 0,
            quotes: d.quote_count || 0
          },
          isThread: d.is_thread || false,
          hasMedia: Array.isArray(d.media) ? d.media.length > 0 : false
        };
      })
    };

  } catch (err) {
    console.error(`Failed to scrape Twitter profile ${handle}:`, err.message);
    throw err;
  }
}

/**
 * Scrape a viral thread
 */
export async function scrapeThread(tweetId) {
  try {
    const job = await submitAndWait('twitter', 'posts', tweetId, 20);
    return (job.results || []).map(r => r.data || {});
  } catch (err) {
    console.error(`Failed to scrape Twitter thread ${tweetId}:`, err.message);
    return [];
  }
}

/**
 * Search for trending topics on Twitter
 */
export async function searchTrending(query, limit = 50) {
  try {
    const job = await submitAndWait('twitter', 'search', query, limit);
    return (job.results || []).map(r => r.data || {});
  } catch (err) {
    console.error(`Failed to search Twitter for "${query}":`, err.message);
    return [];
  }
}
