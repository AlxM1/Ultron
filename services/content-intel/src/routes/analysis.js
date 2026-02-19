import { Hono } from 'hono';
import pool from '../db.js';
import { identifyGaps } from '../analyzers/trends.js';

const analysis = new Hono();

// GET /api/analysis/gaps - Content gap analysis
analysis.get('/gaps', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '20');

    // Get current trends
    const trendsResult = await pool.query(
      'SELECT * FROM trends WHERE score > 0 ORDER BY score DESC LIMIT 100'
    );

    // Get all content for gap analysis
    const contentResult = await pool.query(
      'SELECT title, description FROM content'
    );

    const gaps = identifyGaps(trendsResult.rows, contentResult.rows);

    return c.json({
      gaps: gaps.slice(0, limit),
      total: gaps.length,
      analyzed_trends: trendsResult.rows.length,
      analyzed_content: contentResult.rows.length
    });

  } catch (err) {
    console.error('Error analyzing content gaps:', err);
    return c.json({ error: 'Failed to analyze content gaps' }, 500);
  }
});

// GET /api/analysis/performance - Creator performance analysis
analysis.get('/performance', async (c) => {
  try {
    const platform = c.req.query('platform');
    const daysBack = parseInt(c.req.query('days') || '30');

    let query = `
      SELECT 
        cr.id,
        cr.name,
        cr.handle,
        cr.platform,
        cr.subscriber_count,
        COUNT(c.id) as content_count,
        AVG((c.metrics->>'views')::int) as avg_views,
        AVG((c.metrics->>'likes')::int) as avg_likes,
        MAX(c.published_at) as last_published
      FROM creators cr
      LEFT JOIN content c ON cr.id = c.creator_id 
        AND c.published_at > NOW() - INTERVAL '${daysBack} days'
      WHERE 1=1
    `;

    const params = [];

    if (platform) {
      query += ' AND cr.platform = $1';
      params.push(platform);
    }

    query += `
      GROUP BY cr.id, cr.name, cr.handle, cr.platform, cr.subscriber_count
      ORDER BY avg_views DESC NULLS LAST
    `;

    const result = await pool.query(query, params);

    return c.json({
      creators: result.rows,
      period_days: daysBack
    });

  } catch (err) {
    console.error('Error analyzing performance:', err);
    return c.json({ error: 'Failed to analyze performance' }, 500);
  }
});

// GET /api/analysis/engagement - Top engaging content
analysis.get('/engagement', async (c) => {
  try {
    const platform = c.req.query('platform');
    const limit = parseInt(c.req.query('limit') || '20');
    const daysBack = parseInt(c.req.query('days') || '30');

    let query = `
      SELECT 
        c.*,
        cr.name as creator_name,
        cr.handle as creator_handle,
        (SELECT COUNT(*) FROM comments WHERE content_id = c.id) as comment_count,
        CASE 
          WHEN c.platform = 'youtube' THEN (c.metrics->>'views')::int
          WHEN c.platform = 'twitter' THEN (c.metrics->>'likes')::int
          ELSE 0
        END as engagement_score
      FROM content c
      JOIN creators cr ON c.creator_id = cr.id
      WHERE c.published_at > NOW() - INTERVAL '${daysBack} days'
    `;

    const params = [];

    if (platform) {
      query += ' AND c.platform = $1';
      params.push(platform);
    }

    query += ' ORDER BY engagement_score DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await pool.query(query, params);

    return c.json({
      content: result.rows,
      period_days: daysBack
    });

  } catch (err) {
    console.error('Error analyzing engagement:', err);
    return c.json({ error: 'Failed to analyze engagement' }, 500);
  }
});

// GET /api/analysis/keywords - Top keywords across all content
analysis.get('/keywords', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const daysBack = parseInt(c.req.query('days') || '7');

    const result = await pool.query(
      `SELECT keyword, frequency, score, category, last_seen
       FROM trends
       WHERE last_seen > NOW() - INTERVAL '${daysBack} days'
       ORDER BY score DESC
       LIMIT $1`,
      [limit]
    );

    return c.json({
      keywords: result.rows,
      period_days: daysBack
    });

  } catch (err) {
    console.error('Error analyzing keywords:', err);
    return c.json({ error: 'Failed to analyze keywords' }, 500);
  }
});

export default analysis;
