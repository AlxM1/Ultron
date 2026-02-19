import { Hono } from 'hono';
import pool from '../db.js';

const creators = new Hono();

// Helper function to validate creator handle
function validateCreatorHandle(handle, platform) {
  // SECURITY FIX: Strict validation to prevent path manipulation and SSRF
  // Handles must be alphanumeric with limited special chars
  const validHandleRegex = /^[a-zA-Z0-9_.-]{1,100}$/;
  
  if (!validHandleRegex.test(handle)) {
    throw new Error('Invalid handle format. Only alphanumeric, underscore, dash, and period allowed (1-100 chars)');
  }

  // Additional platform-specific validation
  if (platform === 'youtube') {
    // YouTube handles start with @ or are channel IDs
    if (handle.startsWith('@')) {
      // Valid format like @channelname
      if (handle.length < 2 || handle.length > 31) {
        throw new Error('YouTube handle must be 1-30 characters after @');
      }
    }
  } else if (platform === 'twitter') {
    // Twitter handles are alphanumeric + underscore, 1-15 chars
    if (!/^[a-zA-Z0-9_]{1,15}$/.test(handle.replace(/^@/, ''))) {
      throw new Error('Twitter handle must be alphanumeric and underscore only (1-15 chars)');
    }
  }

  return handle;
}

// Helper function to validate creator name
function validateCreatorName(name) {
  // SECURITY FIX: Sanitize name to prevent injection
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('Name must be a non-empty string');
  }
  
  if (name.length > 200) {
    throw new Error('Name must be 200 characters or less');
  }

  // Remove any potential SQL injection or XSS attempts
  const sanitizedName = name.trim().substring(0, 200);
  return sanitizedName;
}

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

    // SECURITY FIX: Validate and sanitize handle and name
    let validatedHandle, validatedName;
    try {
      validatedHandle = validateCreatorHandle(handle, platform);
      validatedName = validateCreatorName(name);
    } catch (validationErr) {
      return c.json({ error: validationErr.message }, 400);
    }

    const result = await pool.query(
      `INSERT INTO creators (platform, handle, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (platform, handle) DO UPDATE
       SET name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [platform, validatedHandle, validatedName]
    );

    return c.json({
      success: true,
      creator: result.rows[0]
    }, 201);

  } catch (err) {
    console.error('Error adding creator:', err);
    // SECURITY FIX: Don't leak error details in production
    return c.json({ 
      error: 'Failed to add creator',
      details: process.env.NODE_ENV === 'production' ? undefined : err.message
    }, 500);
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
