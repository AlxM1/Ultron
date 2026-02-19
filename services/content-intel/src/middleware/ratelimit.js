// Redis-backed rate limiter for production use
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379/5';
const WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS = 100; // 100 requests per minute per API key
const MAX_SCRAPE_REQUESTS = 5; // 5 scrape requests per minute per API key

// Initialize Redis client
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Redis rate limiter connected');
});

// Connect to Redis
redis.connect().catch(err => {
  console.error('Failed to connect to Redis:', err);
});

/**
 * Check rate limit using Redis
 * @param {string} key - Rate limit key (e.g., "ratelimit:general:apikey")
 * @param {number} maxRequests - Maximum requests allowed in window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Promise<{allowed: boolean, retryAfter: number}>}
 */
async function checkRateLimit(key, maxRequests, windowMs) {
  try {
    const now = Date.now();
    const windowKey = `${key}:${Math.floor(now / windowMs)}`;
    
    // Increment counter
    const count = await redis.incr(windowKey);
    
    // Set expiry on first request in this window
    if (count === 1) {
      await redis.pexpire(windowKey, windowMs);
    }
    
    if (count > maxRequests) {
      const ttl = await redis.pttl(windowKey);
      const retryAfter = Math.ceil(ttl / 1000);
      return { allowed: false, retryAfter };
    }
    
    return { allowed: true, retryAfter: 0 };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open - allow request if Redis is unavailable
    return { allowed: true, retryAfter: 0 };
  }
}

export async function rateLimit(c, next) {
  const apiKey = c.req.header('X-API-Key') || c.req.query('api_key') || 'anonymous';
  const key = `ratelimit:general:${apiKey}`;
  
  const { allowed, retryAfter } = await checkRateLimit(key, MAX_REQUESTS, WINDOW_MS);
  
  if (!allowed) {
    return c.json({ 
      error: 'Rate limit exceeded',
      limit: MAX_REQUESTS,
      window: '1 minute',
      retry_after: retryAfter
    }, 429);
  }
  
  await next();
}

// Separate, stricter rate limiting for scrape endpoints
export async function scrapeRateLimit(c, next) {
  const apiKey = c.req.header('X-API-Key') || c.req.query('api_key') || 'anonymous';
  const key = `ratelimit:scrape:${apiKey}`;
  
  const { allowed, retryAfter } = await checkRateLimit(key, MAX_SCRAPE_REQUESTS, WINDOW_MS);
  
  if (!allowed) {
    return c.json({ 
      error: 'Scrape rate limit exceeded',
      message: 'Scraping is rate-limited to prevent abuse',
      limit: MAX_SCRAPE_REQUESTS,
      window: '1 minute',
      retry_after: retryAfter
    }, 429);
  }
  
  await next();
}
