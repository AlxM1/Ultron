// Simple in-memory rate limiter
// For production, consider Redis-backed rate limiting

const requestCounts = new Map();
const scrapeRequestCounts = new Map();
const WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS = 100; // 100 requests per minute per API key
const MAX_SCRAPE_REQUESTS = 5; // SECURITY FIX: 5 scrape requests per minute per API key

function cleanupOldEntries() {
  const now = Date.now();
  for (const [key, data] of requestCounts.entries()) {
    if (now - data.windowStart > WINDOW_MS) {
      requestCounts.delete(key);
    }
  }
  for (const [key, data] of scrapeRequestCounts.entries()) {
    if (now - data.windowStart > WINDOW_MS) {
      scrapeRequestCounts.delete(key);
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupOldEntries, 5 * 60 * 1000);

export async function rateLimit(c, next) {
  const apiKey = c.req.header('X-API-Key') || c.req.query('api_key') || 'anonymous';
  const now = Date.now();
  
  const clientData = requestCounts.get(apiKey);
  
  if (!clientData || now - clientData.windowStart > WINDOW_MS) {
    // New window
    requestCounts.set(apiKey, {
      count: 1,
      windowStart: now
    });
  } else {
    // Within window
    clientData.count++;
    
    if (clientData.count > MAX_REQUESTS) {
      return c.json({ 
        error: 'Rate limit exceeded',
        limit: MAX_REQUESTS,
        window: '1 minute',
        retry_after: Math.ceil((WINDOW_MS - (now - clientData.windowStart)) / 1000)
      }, 429);
    }
  }
  
  await next();
}

// SECURITY FIX: Separate, stricter rate limiting for scrape endpoints
export async function scrapeRateLimit(c, next) {
  const apiKey = c.req.header('X-API-Key') || c.req.query('api_key') || 'anonymous';
  const now = Date.now();
  
  const clientData = scrapeRequestCounts.get(apiKey);
  
  if (!clientData || now - clientData.windowStart > WINDOW_MS) {
    // New window
    scrapeRequestCounts.set(apiKey, {
      count: 1,
      windowStart: now
    });
  } else {
    // Within window
    clientData.count++;
    
    if (clientData.count > MAX_SCRAPE_REQUESTS) {
      return c.json({ 
        error: 'Scrape rate limit exceeded',
        message: 'Scraping is rate-limited to prevent abuse',
        limit: MAX_SCRAPE_REQUESTS,
        window: '1 minute',
        retry_after: Math.ceil((WINDOW_MS - (now - clientData.windowStart)) / 1000)
      }, 429);
    }
  }
  
  await next();
}
