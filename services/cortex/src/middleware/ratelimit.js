/**
 * Simple in-memory rate limiter
 * Limits requests per IP address
 */

const requests = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // per window

export function rateLimit(c, next) {
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
  const now = Date.now();
  
  if (!requests.has(ip)) {
    requests.set(ip, []);
  }

  const userRequests = requests.get(ip);
  
  // Remove old requests outside the window
  const recentRequests = userRequests.filter(timestamp => now - timestamp < WINDOW_MS);
  
  if (recentRequests.length >= MAX_REQUESTS) {
    return c.json({ 
      error: 'Too Many Requests', 
      message: `Rate limit exceeded. Max ${MAX_REQUESTS} requests per minute.` 
    }, 429);
  }

  recentRequests.push(now);
  requests.set(ip, recentRequests);

  return next();
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of requests.entries()) {
    const recent = timestamps.filter(t => now - t < WINDOW_MS);
    if (recent.length === 0) {
      requests.delete(ip);
    } else {
      requests.set(ip, recent);
    }
  }
}, 5 * 60 * 1000);
