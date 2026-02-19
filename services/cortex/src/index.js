import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import pool, { initializeDatabase } from './db.js';
import { apiKeyAuth } from './middleware/auth.js';
import { rateLimit } from './middleware/ratelimit.js';
import tasks from './routes/tasks.js';
import services from './routes/services.js';
import timeline from './routes/timeline.js';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors());

// Health check (no auth required)
app.get('/health', async (c) => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    return c.json({ 
      status: 'healthy', 
      service: 'cortex',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (err) {
    return c.json({ 
      status: 'unhealthy', 
      service: 'cortex',
      error: err.message 
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

// Root endpoint
app.get('/', (c) => {
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
  return c.json({ error: 'Not Found', message: 'Endpoint does not exist' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal Server Error', message: err.message }, 500);
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
