import { Hono } from 'hono';
import pool from '../db.js';

const creators = new Hono();

// POST /api/creators - Add creator to track
creators.post('/', async (c) => {
  try {
    const { platform, handle, name } = await c.req.json();

    // Validate input
    if (!platform || !handle || !name) {
      return c.json({ error: 'Missing required fields: platform, handle, name' }, 400);
    }

    if (!['youtube', 'twitter'].includes(platform)) {
      return c.json({ error: 'Invalid platform. Must be youtube or twitter' }, 400);
    }

    const result = await pool.query(
      `INSERT INTO creators (platform, handle, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (platform, handle) DO UPDATE
       SET name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [platform, handle, name]
    );

    return c.json({
      success: true,
      creator: result.rows[0]
    }, 201);

  } catch (err) {
    console.error('Error adding creator:', err);
    return c.json({ error: 'Failed to add creator' }, 500);
  }
});

// GET /api/creators - List tracked creators
creators.get('/', async (c) => {
  try {
    const platform = c.req.query('platform');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    let query = 'SELECT * FROM creators';
    const params = [];

    if (platform) {
      query += ' WHERE platform = $1';
      params.push(platform);
    }

    query += ' ORDER BY subscriber_count DESC, name ASC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    const countQuery = platform 
      ? 'SELECT COUNT(*) FROM creators WHERE platform = $1'
      : 'SELECT COUNT(*) FROM creators';
    const countResult = await pool.query(countQuery, platform ? [platform] : []);

    return c.json({
      creators: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    });

  } catch (err) {
    console.error('Error listing creators:', err);
    return c.json({ error: 'Failed to list creators' }, 500);
  }
});

// GET /api/creators/:id - Get creator details
creators.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const result = await pool.query(
      'SELECT * FROM creators WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Creator not found' }, 404);
    }

    // Get content count for this creator
    const contentResult = await pool.query(
      'SELECT COUNT(*) FROM content WHERE creator_id = $1',
      [id]
    );

    const creator = result.rows[0];
    creator.content_count = parseInt(contentResult.rows[0].count);

    return c.json({ creator });

  } catch (err) {
    console.error('Error getting creator:', err);
    return c.json({ error: 'Failed to get creator' }, 500);
  }
});

// DELETE /api/creators/:id - Remove creator
creators.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const result = await pool.query(
      'DELETE FROM creators WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Creator not found' }, 404);
    }

    return c.json({
      success: true,
      message: 'Creator removed successfully',
      creator: result.rows[0]
    });

  } catch (err) {
    console.error('Error deleting creator:', err);
    return c.json({ error: 'Failed to delete creator' }, 500);
  }
});

export default creators;
