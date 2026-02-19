import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { bodyLimit } from 'hono/body-limit';
import pool, { initializeDatabase } from './db.js';
import { apiKeyAuth, validateApiKeyConfig } from './middleware/auth.js';
import { rateLimit } from './middleware/ratelimit.js';

// Route imports
import creators from './routes/creators.js';
import scrape from './routes/scrape.js';
import content from './routes/content.js';
import trends from './routes/trends.js';
import ideas from './routes/ideas.js';
import analysis from './routes/analysis.js';

const app = new Hono();

// Validate required environment variables at startup
validateApiKeyConfig();

// Security headers middleware
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  
  if (process.env.NODE_ENV === 'production') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
});

// Global middleware
app.use('*', logger());

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3020', 'http://localhost:3000'];

app.use('*', cors({
  origin: (origin) => {
    // SECURITY FIX: Restrict CORS even in development
    if (!origin) return origin;
    
    // Always validate against allowed origins
    const isAllowed = allowedOrigins.includes(origin);
    
    if (!isAllowed && process.env.NODE_ENV !== 'production') {
      console.warn(`⚠️  CORS: Origin ${origin} not in allowed list. Add to CORS_ORIGINS if needed.`);
    }
    
    return isAllowed ? origin : null;
  },
  credentials: false,
}));

// Body size limit - 1MB max
app.use('*', bodyLimit({
  maxSize: 1024 * 1024,
  onError: (c) => {
    return c.json({ error: 'Payload Too Large' }, 413);
  }
}));

// Health check (no auth required)
app.get('/health', async (c) => {
  try {
    await pool.query('SELECT 1');
    return c.json({ 
      status: 'healthy', 
      service: 'content-intel',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Health check failed:', err);
    return c.json({ 
      status: 'unhealthy', 
      service: 'content-intel'
    }, 503);
  }
});

// Protected routes (require API key)
app.use('/api/*', apiKeyAuth);
app.use('/api/*', rateLimit);

// Mount API routes
app.route('/api/creators', creators);
app.route('/api/scrape', scrape);
app.route('/api/content', content);
app.route('/api/trends', trends);
app.route('/api/ideas', ideas);
app.route('/api/analysis', analysis);

// Root endpoint
app.get('/', apiKeyAuth, (c) => {
  return c.json({
    service: 'Content Intelligence Scraper',
    description: 'Continuous monitoring and analysis of top content creators',
    version: '1.0.0',
    platform: '00raiser',
    endpoints: {
      health: 'GET /health',
      creators: {
        list: 'GET /api/creators',
        add: 'POST /api/creators',
        get: 'GET /api/creators/:id',
        delete: 'DELETE /api/creators/:id'
      },
      scrape: {
        single: 'POST /api/scrape/:creatorId',
        all: 'POST /api/scrape/all'
      },
      content: {
        list: 'GET /api/content',
        get: 'GET /api/content/:id'
      },
      trends: {
        list: 'GET /api/trends',
        analyze: 'POST /api/trends/analyze',
        categories: 'GET /api/trends/categories'
      },
      ideas: {
        list: 'GET /api/ideas',
        create: 'POST /api/ideas',
        update: 'PATCH /api/ideas/:id',
        delete: 'DELETE /api/ideas/:id',
        generate: 'POST /api/ideas/generate'
      },
      analysis: {
        gaps: 'GET /api/analysis/gaps',
        performance: 'GET /api/analysis/performance',
        engagement: 'GET /api/analysis/engagement',
        keywords: 'GET /api/analysis/keywords'
      }
    }
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// Initialize database and start server
const PORT = parseInt(process.env.PORT || '3015');

initializeDatabase()
  .then(() => {
    console.log('✓ Database initialized');
    
    serve({
      fetch: app.fetch,
      port: PORT
    });
    
    console.log(`✓ Content Intelligence Scraper running on port ${PORT}`);
    console.log(`✓ Health check: http://localhost:${PORT}/health`);
  })
  .catch((err) => {
    console.error('Failed to start service:', err);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});
