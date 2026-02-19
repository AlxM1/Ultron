import { Hono } from 'hono';
import pool from '../db.js';

const content = new Hono();

// GET /api/content - List scraped content with filters
content.get('/', async (c) => {
  try {
    const platform = c.req.query('platform');
    const creatorId = c.req.query('creator_id');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    const sortBy = c.req.query('sort_by') || 'published_at';
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
      paramCount++;
      query += ` AND c.creator_id = $${paramCount}`;
      params.push(parseInt(creatorId));
    }

    // Validate sort column
    const validSortColumns = ['published_at', 'scraped_at', 'id'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'published_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY c.${sortColumn} ${sortOrder}`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM content WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (platform) {
      countParamCount++;
      countQuery += ` AND platform = $${countParamCount}`;
      countParams.push(platform);
    }

    if (creatorId) {
      countParamCount++;
      countQuery += ` AND creator_id = $${countParamCount}`;
      countParams.push(parseInt(creatorId));
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
    const id = parseInt(c.req.param('id'));

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
