import { Hono } from 'hono';
import pool from '../db.js';

const timeline = new Hono();

/**
 * GET /api/timeline
 * Recent activity timeline for Portal dashboard
 */
timeline.get('/', async (c) => {
  try {
    const { limit = '50', service } = c.req.query();

    const conditions = service ? 'WHERE service_name = $2' : '';
    const values = service ? [parseInt(limit, 10), service] : [parseInt(limit, 10)];

    const result = await pool.query(
      `SELECT 
        id,
        service_name,
        task_type,
        status,
        metadata,
        started_at,
        completed_at,
        duration_ms,
        error_message,
        created_at
      FROM tasks
      ${conditions}
      ORDER BY created_at DESC
      LIMIT $1`,
      values
    );

    return c.json({ timeline: result.rows });
  } catch (err) {
    console.error('Error fetching timeline:', err);
    return c.json({ error: 'Internal Server Error', message: err.message }, 500);
  }
});

export default timeline;
