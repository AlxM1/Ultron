import crypto from 'crypto';

/**
 * API Key Authentication Middleware
 * Validates X-API-Key header against CORTEX_API_KEY environment variable
 */
export function apiKeyAuth(c, next) {
  const apiKey = c.req.header('X-API-Key');
  const validApiKey = process.env.CORTEX_API_KEY;

  // Refuse to authenticate if no API key is configured in production
  if (!validApiKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error('🔴 FATAL: CORTEX_API_KEY not set in production - refusing to start');
      process.exit(1);
    }
    console.warn('⚠️  CORTEX_API_KEY not set - authentication disabled (development only)');
    return next();
  }

  if (!apiKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Constant-time comparison to prevent timing attacks
  try {
    const apiKeyBuffer = Buffer.from(apiKey);
    const validKeyBuffer = Buffer.from(validApiKey);
    
    if (apiKeyBuffer.length !== validKeyBuffer.length) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (!crypto.timingSafeEqual(apiKeyBuffer, validKeyBuffer)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
  } catch (err) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return next();
}

/**
 * Validate API key at startup
 * Call this before starting the server
 */
export function validateApiKeyConfig() {
  if (!process.env.CORTEX_API_KEY && process.env.NODE_ENV === 'production') {
    console.error('🔴 FATAL: CORTEX_API_KEY environment variable is required in production');
    console.error('Set CORTEX_API_KEY in your .env file or environment');
    process.exit(1);
  }
}
