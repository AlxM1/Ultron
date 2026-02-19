import crypto from 'crypto';

// API Key authentication middleware
export function validateApiKeyConfig() {
  const apiKey = process.env.CONTENT_INTEL_API_KEY;
  if (!apiKey || apiKey === 'your-secure-api-key-here') {
    console.error('SECURITY WARNING: CONTENT_INTEL_API_KEY not properly configured!');
    console.error('Set a strong API key in your .env file');
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot start in production without proper CONTENT_INTEL_API_KEY');
    }
  }
}

export async function apiKeyAuth(c, next) {
  const apiKey = c.req.header('X-API-Key') || c.req.query('api_key');
  const expectedKey = process.env.CONTENT_INTEL_API_KEY;

  if (!apiKey) {
    return c.json({ error: 'Missing API key' }, 401);
  }

  // SECURITY FIX: Use timing-safe comparison to prevent timing attacks
  try {
    const apiKeyBuffer = Buffer.from(apiKey);
    const expectedBuffer = Buffer.from(expectedKey);

    // Check length first to avoid timing attack on length
    if (apiKeyBuffer.length !== expectedBuffer.length) {
      return c.json({ error: 'Invalid API key' }, 403);
    }

    // Use crypto.timingSafeEqual for constant-time comparison
    if (!crypto.timingSafeEqual(apiKeyBuffer, expectedBuffer)) {
      return c.json({ error: 'Invalid API key' }, 403);
    }
  } catch (err) {
    // If comparison fails for any reason, deny access
    console.error('API key comparison error:', err);
    return c.json({ error: 'Invalid API key' }, 403);
  }

  await next();
}
