import { Hono } from 'hono';
import pool from '../db.js';

const transcripts = new Hono();

// GET /api/transcripts - List transcripts with filters
transcripts.get('/', async (c) => {
  try {
    const contentId = c.req.query('content_id');
    const creatorId = c.req.query('creator_id');
    const language = c.req.query('language');
    const search = c.req.query('search');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    // Validate pagination
    if (isNaN(limit) || limit < 1) return c.json({ error: 'Invalid limit' }, 400);
    if (isNaN(offset) || offset < 0) return c.json({ error: 'Invalid offset' }, 400);
    const safeLimit = Math.min(limit, 200);

    let query = `
      SELECT t.*, 
             c.title as content_title, 
             c.platform as content_platform,
             cr.name as creator_name,
             cr.handle as creator_handle
      FROM transcripts t
      JOIN content c ON t.content_id = c.id
      JOIN creators cr ON c.creator_id = cr.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (contentId) {
      const parsed = parseInt(contentId, 10);
      if (isNaN(parsed) || parsed < 1) {
        return c.json({ error: 'Invalid content_id' }, 400);
      }
      paramCount++;
      query += ` AND t.content_id = $${paramCount}`;
      params.push(parsed);
    }

    if (creatorId) {
      const parsed = parseInt(creatorId, 10);
      if (isNaN(parsed) || parsed < 1) {
        return c.json({ error: 'Invalid creator_id' }, 400);
      }
      paramCount++;
      query += ` AND c.creator_id = $${paramCount}`;
      params.push(parsed);
    }

    if (language) {
      paramCount++;
      query += ` AND t.language = $${paramCount}`;
      params.push(language);
    }

    if (search && search.trim().length > 0) {
      paramCount++;
      query += ` AND t.text ILIKE $${paramCount}`;
      params.push(`%${search.trim()}%`);
    }

    query += ` ORDER BY t.created_at DESC`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(safeLimit, offset);

    const result = await pool.query(query, params);

    // Count query
    let countQuery = `
      SELECT COUNT(*) 
      FROM transcripts t
      JOIN content c ON t.content_id = c.id
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 0;

    if (contentId) {
      countParamCount++;
      countQuery += ` AND t.content_id = $${countParamCount}`;
      countParams.push(parseInt(contentId, 10));
    }

    if (creatorId) {
      countParamCount++;
      countQuery += ` AND c.creator_id = $${countParamCount}`;
      countParams.push(parseInt(creatorId, 10));
    }

    if (language) {
      countParamCount++;
      countQuery += ` AND t.language = $${countParamCount}`;
      countParams.push(language);
    }

    if (search && search.trim().length > 0) {
      countParamCount++;
      countQuery += ` AND t.text ILIKE $${countParamCount}`;
      countParams.push(`%${search.trim()}%`);
    }

    const countResult = await pool.query(countQuery, countParams);

    return c.json({
      transcripts: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: safeLimit,
      offset
    });

  } catch (err) {
    console.error('Error listing transcripts:', err);
    return c.json({ error: 'Failed to list transcripts' }, 500);
  }
});

// GET /api/transcripts/:id - Get a single transcript by ID
transcripts.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id) || id < 1) {
      return c.json({ error: 'Invalid transcript ID' }, 400);
    }

    const result = await pool.query(
      `SELECT t.*,
              c.title as content_title,
              c.platform as content_platform,
              cr.name as creator_name,
              cr.handle as creator_handle
       FROM transcripts t
       JOIN content c ON t.content_id = c.id
       JOIN creators cr ON c.creator_id = cr.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Transcript not found' }, 404);
    }

    return c.json({ transcript: result.rows[0] });

  } catch (err) {
    console.error('Error getting transcript:', err);
    return c.json({ error: 'Failed to get transcript' }, 500);
  }
});

export default transcripts;
