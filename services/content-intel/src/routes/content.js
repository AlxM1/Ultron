import { Hono } from 'hono';
import pool from '../db.js';

const content = new Hono();

// GET /api/content - List scraped content with filters
content.get('/', async (c) => {
  try {
    const platform = c.req.query('platform');
    const creatorId = c.req.query('creator_id');
    const search = c.req.query('search');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    // Accept both 'sort_by' and 'sort' as aliases
    const sortBy = c.req.query('sort_by') || c.req.query('sort') || 'published_at';
    const order = c.req.query('order') || 'DESC';

    let query = `
      SELECT c.*, cr.name as creator_name, cr.handle as creator_handle
      FROM content c
      JOIN creators cr ON c.creator_id = cr.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (platform) {
      paramCount++;
      query += ` AND c.platform = $${paramCount}`;
      params.push(platform);
    }

    if (creatorId) {
      if (!/^\d+$/.test(creatorId)) {
        return c.json({ error: 'Invalid creator_id — must be a positive integer' }, 400);
      }
      const parsedCreatorId = parseInt(creatorId, 10);
      if (isNaN(parsedCreatorId) || parsedCreatorId < 1) {
        return c.json({ error: 'Invalid creator_id — must be a positive integer' }, 400);
      }
      paramCount++;
      query += ` AND c.creator_id = $${paramCount}`;
      params.push(parsedCreatorId);
    }

    if (search && search.trim().length > 0) {
      paramCount++;
      query += ` AND (c.title ILIKE $${paramCount} OR c.description ILIKE $${paramCount})`;
      params.push(`%${search.trim()}%`);
    }

    // Validate and cap limit/offset
    if (isNaN(limit) || limit < 1) return c.json({ error: 'Invalid limit' }, 400);
    if (isNaN(offset) || offset < 0) return c.json({ error: 'Invalid offset' }, 400);
    const safeLimit = Math.min(limit, 200);

    // Validate sort column — also support 'views' mapped to metrics->views
    const validSortColumns = ['published_at', 'scraped_at', 'id', 'title'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'published_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY c.${sortColumn} ${sortOrder}`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(safeLimit, offset);

    const result = await pool.query(query, params);

    // Get total count (reuse same filters)
    let countQuery = `
      SELECT COUNT(*) 
      FROM content c
      JOIN creators cr ON c.creator_id = cr.id
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 0;

    if (platform) {
      countParamCount++;
      countQuery += ` AND c.platform = $${countParamCount}`;
      countParams.push(platform);
    }

    if (creatorId) {
      countParamCount++;
      countQuery += ` AND c.creator_id = $${countParamCount}`;
      countParams.push(parseInt(creatorId, 10));
    }

    if (search && search.trim().length > 0) {
      countParamCount++;
      countQuery += ` AND (c.title ILIKE $${countParamCount} OR c.description ILIKE $${countParamCount})`;
      countParams.push(`%${search.trim()}%`);
    }

    const countResult = await pool.query(countQuery, countParams);

    return c.json({
      content: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    });

  } catch (err) {
    console.error('Error listing content:', err);
    return c.json({ error: 'Failed to list content' }, 500);
  }
});

// GET /api/content/:id - Get content details with comments
content.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id) || id < 1) {
      return c.json({ error: 'Invalid content ID' }, 400);
    }

    const contentResult = await pool.query(
      `SELECT c.*, cr.name as creator_name, cr.handle as creator_handle, cr.platform as creator_platform
       FROM content c
       JOIN creators cr ON c.creator_id = cr.id
       WHERE c.id = $1`,
      [id]
    );

    if (contentResult.rows.length === 0) {
      return c.json({ error: 'Content not found' }, 404);
    }

    const item = contentResult.rows[0];

    // Get comments
    const commentsResult = await pool.query(
      'SELECT * FROM comments WHERE content_id = $1 ORDER BY likes DESC LIMIT 50',
      [id]
    );

    item.comments = commentsResult.rows;

    return c.json({ content: item });

  } catch (err) {
    console.error('Error getting content:', err);
    return c.json({ error: 'Failed to get content' }, 500);
  }
});

export default content;
