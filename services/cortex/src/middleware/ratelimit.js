/**
 * Simple in-memory rate limiter
 * Limits requests per IP address
 * 
 * Uses direct connection IP to prevent X-Forwarded-For spoofing.
 * If behind a reverse proxy, configure trusted proxy headers in your reverse proxy
 * and use a middleware that validates them properly.
 */

const requests = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // per window

export function rateLimit(c, next) {
  // Use env.incoming.socket.remoteAddress or fallback to unknown
  // This prevents X-Forwarded-For spoofing
  let ip = 'unknown';
  
  try {
    // Hono with Node.js adapter exposes the request via env
    const nodeReq = c.env?.incoming;
    if (nodeReq?.socket?.remoteAddress) {
      ip = nodeReq.socket.remoteAddress;
    }
  } catch (err) {
    console.warn('Could not extract real IP:', err.message);
  }
  
  const now = Date.now();
  
  if (!requests.has(ip)) {
    requests.set(ip, []);
  }

  const userRequests = requests.get(ip);
  
  // Remove old requests outside the window
  const recentRequests = userRequests.filter(timestamp => now - timestamp < WINDOW_MS);
  
  if (recentRequests.length >= MAX_REQUESTS) {
    return c.json({ 
      error: 'Too Many Requests'
    }, 429);
  }

  recentRequests.push(now);
  requests.set(ip, recentRequests);

  return next();
}

// Cleanup old entries every 5 minutes
// Use unref() to allow process to exit cleanly
const cleanupInterval = setInterval(() => {
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

cleanupInterval.unref();
