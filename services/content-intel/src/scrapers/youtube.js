import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

/**
 * YouTube Scraper Module
 * Scrapes YouTube channel data without requiring YouTube API initially
 * Can be upgraded to use YouTube Data API v3 when available
 */

const APIFY_SCRAPER_URL = process.env.APIFY_SCRAPER_URL || 'http://raiser-apify:8400';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// SECURITY FIX: Validate Apify scraper URL at startup
try {
  const apifyUrl = new URL(APIFY_SCRAPER_URL);
  if (!['http:', 'https:'].includes(apifyUrl.protocol)) {
    throw new Error('Invalid APIFY_SCRAPER_URL protocol');
  }
  console.log('✓ Apify scraper URL validated:', APIFY_SCRAPER_URL);
} catch (err) {
  console.error('⚠️  Invalid APIFY_SCRAPER_URL:', err.message);
}

/**
 * Scrape a YouTube channel using Apify service
 */
export async function scrapeChannelViaApify(channelHandle) {
  try {
    // SECURITY FIX: URL-encode the channel handle to prevent path manipulation
    const encodedHandle = encodeURIComponent(channelHandle);
    const channelUrl = `https://youtube.com/@${encodedHandle}`;
    
    const response = await fetch(`${APIFY_SCRAPER_URL}/api/youtube/channel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelUrl: channelUrl,
        maxVideos: 20
      })
    });

    if (!response.ok) {
      throw new Error(`Apify scraper failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (err) {
    console.error(`Failed to scrape channel ${channelHandle} via Apify:`, err);
    throw err;
  }
}

/**
 * Scrape channel data directly (fallback if Apify unavailable)
 */
export async function scrapeChannelDirect(channelHandle) {
  try {
    // SECURITY FIX: URL-encode the channel handle to prevent path manipulation
    const encodedHandle = encodeURIComponent(channelHandle);
    const url = `https://youtube.com/@${encodedHandle}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract initial data from page scripts
    const scriptTags = $('script').toArray();
    let ytInitialData = null;

    for (const script of scriptTags) {
      const content = $(script).html();
      if (content && content.includes('var ytInitialData = ')) {
        const match = content.match(/var ytInitialData = ({.+?});/);
        if (match) {
          ytInitialData = JSON.parse(match[1]);
          break;
        }
      }
    }

    if (!ytInitialData) {
      throw new Error('Could not extract YouTube data from page');
    }

    // Parse channel metadata and recent videos
    const channelData = extractChannelData(ytInitialData);
    const videos = extractVideos(ytInitialData);

    return {
      channel: channelData,
      videos: videos.slice(0, 20) // Limit to 20 most recent
    };

  } catch (err) {
    console.error(`Failed to scrape channel ${channelHandle} directly:`, err);
    throw err;
  }
}

/**
 * Extract channel metadata from ytInitialData
 */
function extractChannelData(ytInitialData) {
  try {
    const header = ytInitialData?.header?.c4TabbedHeaderRenderer || {};
    
    return {
      name: header.title || 'Unknown',
      subscriberCount: parseSubscriberCount(header.subscriberCountText?.simpleText),
      videoCount: parseInt(header.videosCountText?.runs?.[0]?.text?.replace(/,/g, '') || '0'),
      description: header.tagline?.simpleText || '',
      avatar: header.avatar?.thumbnails?.[0]?.url || null
    };
  } catch (err) {
    console.error('Failed to extract channel data:', err);
    return {};
  }
}

/**
 * Extract videos from ytInitialData
 */
function extractVideos(ytInitialData) {
  try {
    const tabs = ytInitialData?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    let videos = [];

    for (const tab of tabs) {
      const content = tab?.tabRenderer?.content?.richGridRenderer?.contents || [];
      
      for (const item of content) {
        const videoRenderer = item?.richItemRenderer?.content?.videoRenderer;
        if (videoRenderer) {
          videos.push({
            id: videoRenderer.videoId,
            title: videoRenderer.title?.runs?.[0]?.text || 'Untitled',
            description: videoRenderer.descriptionSnippet?.runs?.[0]?.text || '',
            thumbnail: videoRenderer.thumbnail?.thumbnails?.[0]?.url || null,
            publishedText: videoRenderer.publishedTimeText?.simpleText || '',
            viewCount: parseViewCount(videoRenderer.viewCountText?.simpleText),
            duration: videoRenderer.lengthText?.simpleText || ''
          });
        }
      }
    }

    return videos;
  } catch (err) {
    console.error('Failed to extract videos:', err);
    return [];
  }
}

/**
 * Parse subscriber count from text like "1.5M subscribers"
 */
function parseSubscriberCount(text) {
  if (!text) return 0;
  const match = text.match(/([\d.]+)([KMB]?)/i);
  if (!match) return 0;
  
  const num = parseFloat(match[1]);
  const suffix = match[2].toUpperCase();
  
  const multipliers = { K: 1000, M: 1000000, B: 1000000000 };
  return Math.floor(num * (multipliers[suffix] || 1));
}

/**
 * Parse view count from text like "1.5M views"
 */
function parseViewCount(text) {
  if (!text) return 0;
  return parseSubscriberCount(text.replace(' views', ''));
}

/**
 * Main scraper function - tries Apify first, falls back to direct scraping
 */
export async function scrapeChannel(channelHandle) {
  try {
    // Try Apify service first
    return await scrapeChannelViaApify(channelHandle);
  } catch (apifyErr) {
    console.warn('Apify scraper unavailable, falling back to direct scraping');
    
    try {
      // Fallback to direct scraping
      return await scrapeChannelDirect(channelHandle);
    } catch (directErr) {
      console.error('Both Apify and direct scraping failed:', directErr);
      throw new Error('All scraping methods failed');
    }
  }
}

/**
 * Scrape top comments for a video
 */
export async function scrapeVideoComments(videoId, limit = 50) {
  try {
    const response = await fetch(`${APIFY_SCRAPER_URL}/api/youtube/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId,
        maxComments: limit
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to scrape comments: ${response.statusText}`);
    }

    const data = await response.json();
    return data.comments || [];
  } catch (err) {
    console.error(`Failed to scrape comments for video ${videoId}:`, err);
    return []; // Return empty array on failure
  }
}
