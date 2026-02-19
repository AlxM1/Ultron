/**
 * API Key Authentication Middleware
 * Validates X-API-Key header against CORTEX_API_KEY environment variable
 */
export function apiKeyAuth(c, next) {
  const apiKey = c.req.header('X-API-Key');
  const validApiKey = process.env.CORTEX_API_KEY;

  // Skip auth if no API key is configured (development mode)
  if (!validApiKey) {
    console.warn('⚠️  CORTEX_API_KEY not set - authentication disabled');
    return next();
  }

  if (!apiKey || apiKey !== validApiKey) {
    return c.json({ error: 'Unauthorized', message: 'Invalid or missing API key' }, 401);
  }

  return next();
}
