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

  if (apiKey !== expectedKey) {
    return c.json({ error: 'Invalid API key' }, 403);
  }

  await next();
}
