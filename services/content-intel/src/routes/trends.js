import { Hono } from 'hono';
import pool from '../db.js';
import { analyzeContent, extractKeywords } from '../analyzers/trends.js';

const trends = new Hono();

// GET /api/trends - Get current trending topics
trends.get('/', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const category = c.req.query('category');
    const minScore = parseFloat(c.req.query('min_score') || '0');

    let query = 'SELECT * FROM trends WHERE score >= $1';
    const params = [minScore];

    if (category) {
      query += ' AND category = $2';
      params.push(category);
    }

    query += ' ORDER BY score DESC, last_seen DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await pool.query(query, params);

    return c.json({
      trends: result.rows,
      total: result.rows.length
    });

  } catch (err) {
    console.error('Error getting trends:', err);
    return c.json({ error: 'Failed to get trends' }, 500);
  }
});

// POST /api/trends/analyze - Analyze recent content and update trends
trends.post('/analyze', async (c) => {
  try {
    const daysBack = parseInt(c.req.query('days') || '7');

    // Get recent content
    const contentResult = await pool.query(
      `SELECT * FROM content 
       WHERE scraped_at > NOW() - INTERVAL '${daysBack} days'
       ORDER BY scraped_at DESC`
    );

    if (contentResult.rows.length === 0) {
      return c.json({ 
        message: 'No recent content to analyze',
        trends: []
      });
    }

    // Analyze content to extract trends
    const analysis = analyzeContent(contentResult.rows);

    let trendsUpdated = 0;

    // Update trends in database
    for (const trend of analysis.trends) {
      await pool.query(
        `INSERT INTO trends (keyword, frequency, score, category, last_seen)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (keyword) DO UPDATE
         SET frequency = trends.frequency + EXCLUDED.frequency,
             score = EXCLUDED.score,
             category = COALESCE(EXCLUDED.category, trends.category),
             last_seen = CURRENT_TIMESTAMP`,
        [trend.keyword, trend.frequency, trend.score, trend.category]
      );
      trendsUpdated++;
    }

    return c.json({
      success: true,
      contentAnalyzed: contentResult.rows.length,
      trendsUpdated,
      topTrends: analysis.trends.slice(0, 10),
      themes: analysis.themes
    });

  } catch (err) {
    console.error('Error analyzing trends:', err);
    return c.json({ error: 'Failed to analyze trends' }, 500);
  }
});

// GET /api/trends/categories - Get available trend categories
trends.get('/categories', async (c) => {
  try {
    const result = await pool.query(
      `SELECT category, COUNT(*) as count, AVG(score) as avg_score
       FROM trends
       WHERE category IS NOT NULL
       GROUP BY category
       ORDER BY count DESC`
    );

    return c.json({
      categories: result.rows
    });

  } catch (err) {
    console.error('Error getting categories:', err);
    return c.json({ error: 'Failed to get categories' }, 500);
  }
});

export default trends;
