import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

/**
 * YouTube Scraper Module
 * Uses YouTubeDL service (yt-dlp) for reliable metadata extraction
 * Falls back to direct HTML scraping if needed
 */

const YOUTUBEDL_URL = process.env.YOUTUBEDL_URL || 'http://raiser-youtubedl:8000';
const YOUTUBEDL_API_KEY = process.env.YOUTUBEDL_API_KEY || '';
const APIFY_SCRAPER_URL = process.env.APIFY_SCRAPER_URL || 'http://raiser-apify:8000';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

console.log('✓ YouTube scraper initialized');
console.log('  YouTubeDL URL:', YOUTUBEDL_URL);

/**
 * Scrape a YouTube channel - tries multiple methods
 */
export async function scrapeChannel(channelHandle) {
  console.log(`Scraping YouTube channel: @${channelHandle}`);

  // Method 1: Use yt-dlp via YouTubeDL service (most reliable)
  try {
    return await scrapeChannelViaYtDlp(channelHandle);
  } catch (err) {
    console.warn(`yt-dlp scraping failed for ${channelHandle}:`, err.message);
  }

  // Method 2: Direct HTML scraping (less reliable)
  try {
    return await scrapeChannelDirect(channelHandle);
  } catch (err) {
    console.error(`All scraping methods failed for ${channelHandle}:`, err.message);
    throw new Error('All scraping methods failed');
  }
}

/**
 * Scrape channel using yt-dlp via YouTubeDL service
 * Extracts channel metadata + video list from channel /videos page
 */
async function scrapeChannelViaYtDlp(channelHandle) {
  const encodedHandle = encodeURIComponent(channelHandle);
  const channelUrl = `https://www.youtube.com/@${encodedHandle}/videos`;

  const response = await fetch(`${YOUTUBEDL_URL}/api/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(YOUTUBEDL_API_KEY ? { 'X-API-Key': YOUTUBEDL_API_KEY } : {})
    },
    body: JSON.stringify({ url: channelUrl }),
    timeout: 60000
  });

  if (!response.ok) {
    throw new Error(`YouTubeDL extract failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // yt-dlp returns a playlist-like structure for channel pages
  const entries = data.entries || data.formats || [];
  const channel = {
    name: data.channel || data.uploader || channelHandle,
    handle: channelHandle,
    subscriberCount: data.channel_follower_count || 0,
    description: data.description || '',
    url: `https://youtube.com/@${channelHandle}`,
    thumbnailUrl: data.thumbnail || null,
  };

  const videos = (Array.isArray(entries) ? entries : []).slice(0, 200).map(entry => ({
    videoId: entry.id || entry.display_id,
    title: entry.title || 'Untitled',
    description: entry.description || '',
    publishedAt: entry.upload_date
      ? `${entry.upload_date.slice(0,4)}-${entry.upload_date.slice(4,6)}-${entry.upload_date.slice(6,8)}`
      : null,
    viewCount: entry.view_count || 0,
    likeCount: entry.like_count || 0,
    duration: entry.duration || 0,
    thumbnailUrl: entry.thumbnail || null,
    tags: entry.tags || [],
    categories: entry.categories || [],
  }));

  console.log(`  yt-dlp: Found ${videos.length} videos for @${channelHandle}`);
  return { channel, videos };
}

/**
 * Fallback: Scrape channel directly from YouTube HTML
 */
export async function scrapeChannelDirect(channelHandle) {
  const encodedHandle = encodeURIComponent(channelHandle);
  const url = `https://youtube.com/@${encodedHandle}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    },
    timeout: 15000
  });

  if (!response.ok) {
    throw new Error(`YouTube returned ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract ytInitialData from page scripts
  let ytInitialData = null;
  const scriptTags = $('script').toArray();
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

  const channelData = extractChannelData(ytInitialData);
  const videos = extractVideos(ytInitialData);

  return {
    channel: channelData,
    videos: videos.slice(0, 50)
  };
}

function extractChannelData(data) {
  try {
    const header = data?.header?.c4TabbedHeaderRenderer ||
                   data?.header?.pageHeaderRenderer ||
                   {};
    return {
      name: header.title || '',
      subscriberCount: 0,
      description: '',
      url: '',
      thumbnailUrl: header?.avatar?.thumbnails?.[0]?.url || null
    };
  } catch {
    return { name: '', subscriberCount: 0, description: '', url: '', thumbnailUrl: null };
  }
}

function extractVideos(data) {
  try {
    const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    const videosTab = tabs.find(t =>
      t?.tabRenderer?.title === 'Videos' || t?.tabRenderer?.title === 'Home'
    );
    const contents = videosTab?.tabRenderer?.content?.richGridRenderer?.contents || [];
    return contents
      .filter(c => c?.richItemRenderer?.content?.videoRenderer)
      .map(c => {
        const v = c.richItemRenderer.content.videoRenderer;
        return {
          videoId: v.videoId,
          title: v.title?.runs?.[0]?.text || '',
          description: v.descriptionSnippet?.runs?.map(r => r.text).join('') || '',
          publishedAt: v.publishedTimeText?.simpleText || '',
          viewCount: parseInt(v.viewCountText?.simpleText?.replace(/[^0-9]/g, '') || '0'),
          duration: v.lengthText?.simpleText || '',
          thumbnailUrl: v.thumbnail?.thumbnails?.[0]?.url || null,
        };
      });
  } catch {
    return [];
  }
}

/**
 * Scrape video comments (via Apify or direct)
 */
export async function scrapeVideoComments(videoId, limit = 50) {
  // Placeholder - YouTube comments require API or complex scraping
  console.warn(`Comment scraping not yet implemented for ${videoId}`);
  return [];
}
