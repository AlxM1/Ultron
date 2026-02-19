import fetch from 'node-fetch';

/**
 * Twitter/X Scraper Module
 * Uses Apify Twitter scraper service
 */

const APIFY_SCRAPER_URL = process.env.APIFY_SCRAPER_URL || 'http://raiser-apify:8400';

/**
 * Scrape a Twitter/X profile
 */
export async function scrapeProfile(handle) {
  try {
    const response = await fetch(`${APIFY_SCRAPER_URL}/api/twitter/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: handle.replace('@', ''),
        maxTweets: 50
      })
    });

    if (!response.ok) {
      throw new Error(`Apify scraper failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      profile: {
        name: data.name || handle,
        handle: data.username || handle,
        followerCount: data.followers_count || 0,
        followingCount: data.following_count || 0,
        tweetCount: data.tweet_count || 0,
        bio: data.description || '',
        verified: data.verified || false,
        avatar: data.profile_image_url || null
      },
      posts: (data.tweets || []).map(tweet => ({
        id: tweet.id_str || tweet.id,
        text: tweet.full_text || tweet.text || '',
        createdAt: tweet.created_at,
        metrics: {
          likes: tweet.favorite_count || 0,
          retweets: tweet.retweet_count || 0,
          replies: tweet.reply_count || 0,
          quotes: tweet.quote_count || 0
        },
        isThread: tweet.is_thread || false,
        hasMedia: (tweet.entities?.media?.length || 0) > 0
      }))
    };

  } catch (err) {
    console.error(`Failed to scrape Twitter profile ${handle}:`, err);
    throw err;
  }
}

/**
 * Scrape a viral thread
 */
export async function scrapeThread(tweetId) {
  try {
    const response = await fetch(`${APIFY_SCRAPER_URL}/api/twitter/thread`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tweetId })
    });

    if (!response.ok) {
      throw new Error(`Failed to scrape thread: ${response.statusText}`);
    }

    const data = await response.json();
    return data.thread || [];
  } catch (err) {
    console.error(`Failed to scrape Twitter thread ${tweetId}:`, err);
    return [];
  }
}

/**
 * Search for trending topics on Twitter
 */
export async function searchTrending(query, limit = 50) {
  try {
    const response = await fetch(`${APIFY_SCRAPER_URL}/api/twitter/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        maxTweets: limit,
        sortBy: 'engagement'
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to search Twitter: ${response.statusText}`);
    }

    const data = await response.json();
    return data.tweets || [];
  } catch (err) {
    console.error(`Failed to search Twitter for "${query}":`, err);
    return [];
  }
}
