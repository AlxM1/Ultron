import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { bodyLimit } from 'hono/body-limit';
import pool, { initializeDatabase } from './db.js';
import { apiKeyAuth, validateApiKeyConfig } from './middleware/auth.js';
import { rateLimit } from './middleware/ratelimit.js';
import tasks from './routes/tasks.js';
import services from './routes/services.js';
import timeline from './routes/timeline.js';

const app = new Hono();

// Validate required environment variables at startup
validateApiKeyConfig();

// Security headers middleware
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  // Only set HSTS in production and when using HTTPS
  if (process.env.NODE_ENV === 'production') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
});

// Global middleware
app.use('*', logger());

// CORS - restrict to known origins in production
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3010', 'http://localhost:3000']; // Portal and dev defaults

app.use('*', cors({
  origin: (origin) => {
    // Allow requests with no origin (like curl, Postman, or same-origin)
    if (!origin) return origin;
    // In production, strictly validate origins
    if (process.env.NODE_ENV === 'production') {
      return allowedOrigins.includes(origin) ? origin : null;
    }
    // In development, allow all origins
    return origin;
  },
  credentials: false,
}));

// Body size limit - prevent memory exhaustion (1MB max)
app.use('*', bodyLimit({
  maxSize: 1024 * 1024, // 1MB
  onError: (c) => {
    return c.json({ error: 'Payload Too Large' }, 413);
  }
}));

// Health check (no auth required, but no details on error)
app.get('/health', async (c) => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    return c.json({ 
      status: 'healthy', 
      service: 'cortex',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    // Log details server-side but don't expose to client
    console.error('Health check failed:', err);
    return c.json({ 
      status: 'unhealthy', 
      service: 'cortex'
    }, 503);
  }
});

// Protected routes (require API key)
app.use('/api/*', apiKeyAuth);
app.use('/api/*', rateLimit);

// Mount API routes
app.route('/api/tasks', tasks);
app.route('/api/services', services);
app.route('/api/timeline', timeline);

// Root endpoint - require auth to prevent API enumeration
app.get('/', apiKeyAuth, (c) => {
  return c.json({
    service: 'Cortex',
    description: 'Activity tracking and monitoring layer for 00raiser platform',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      tasks: {
        create: 'POST /api/tasks',
        update: 'PATCH /api/tasks/:id',
        list: 'GET /api/tasks',
        get: 'GET /api/tasks/:id',
        stats: 'GET /api/tasks/stats/aggregate'
      },
      services: 'GET /api/services',
      timeline: 'GET /api/timeline'
    },
    docs: 'https://github.com/00raiser/cortex'
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler - never expose internal error details
app.onError((err, c) => {
  // Log full error details server-side
  console.error('Unhandled error:', err);
  
  // Return generic error to client
  return c.json({ error: 'Internal Server Error' }, 500);
});

// Start server
const PORT = process.env.PORT || 3011;

async function start() {
  try {
    // Initialize database schema
    await initializeDatabase();

    // Start HTTP server
    serve({
      fetch: app.fetch,
      port: PORT
    });

    console.log(`🚀 Cortex running on http://localhost:${PORT}`);
  } catch (err) {
    console.error('Failed to start Cortex:', err);
    process.exit(1);
  }
}

start();
