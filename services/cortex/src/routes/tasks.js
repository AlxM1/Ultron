import { Hono } from 'hono';
import pool from '../db.js';

const tasks = new Hono();

/**
 * POST /api/tasks
 * Register a new task
 */
tasks.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { service_name, task_type, status = 'pending', metadata = {}, started_at, error_message } = body;

    if (!service_name || !task_type) {
      return c.json({ error: 'Bad Request', message: 'service_name and task_type are required' }, 400);
    }

    if (!['pending', 'running', 'completed', 'failed'].includes(status)) {
      return c.json({ error: 'Bad Request', message: 'Invalid status. Must be: pending, running, completed, or failed' }, 400);
    }

    const result = await pool.query(
      `INSERT INTO tasks (service_name, task_type, status, metadata, started_at, error_message, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       RETURNING *`,
      [service_name, task_type, status, JSON.stringify(metadata), started_at || null, error_message || null]
    );

    return c.json({ task: result.rows[0] }, 201);
  } catch (err) {
    console.error('Error creating task:', err);
    return c.json({ error: 'Internal Server Error', message: err.message }, 500);
  }
});

/**
 * PATCH /api/tasks/:id
 * Update task status and metadata
 */
tasks.patch('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();
    const { status, metadata, completed_at, duration_ms, error_message } = body;

    // Validate status if provided
    if (status && !['pending', 'running', 'completed', 'failed'].includes(status)) {
      return c.json({ error: 'Bad Request', message: 'Invalid status' }, 400);
    }

    // Build dynamic UPDATE query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(metadata));
    }
    if (completed_at !== undefined) {
      updates.push(`completed_at = $${paramIndex++}`);
      values.push(completed_at);
    }
    if (duration_ms !== undefined) {
      updates.push(`duration_ms = $${paramIndex++}`);
      values.push(duration_ms);
    }
    if (error_message !== undefined) {
      updates.push(`error_message = $${paramIndex++}`);
      values.push(error_message);
    }

    // Auto-set completed_at if status is completed or failed and not already set
    if (status && ['completed', 'failed'].includes(status) && completed_at === undefined) {
      updates.push(`completed_at = CURRENT_TIMESTAMP`);
    }

    if (updates.length === 0) {
      return c.json({ error: 'Bad Request', message: 'No fields to update' }, 400);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Not Found', message: 'Task not found' }, 404);
    }

    return c.json({ task: result.rows[0] });
  } catch (err) {
    console.error('Error updating task:', err);
    return c.json({ error: 'Internal Server Error', message: err.message }, 500);
  }
});

/**
 * GET /api/tasks
 * List tasks with filters
 */
tasks.get('/', async (c) => {
  try {
    const { service, status, limit = '50', offset = '0' } = c.req.query();

    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (service) {
      conditions.push(`service_name = $${paramIndex++}`);
      values.push(service);
    }

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    values.push(parseInt(limit, 10));
    values.push(parseInt(offset, 10));

    const result = await pool.query(
      `SELECT * FROM tasks ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      values
    );

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM tasks ${whereClause}`,
      values.slice(0, -2) // Remove limit and offset
    );

    return c.json({
      tasks: result.rows,
      total: parseInt(countResult.rows[0].total, 10),
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });
  } catch (err) {
    console.error('Error fetching tasks:', err);
    return c.json({ error: 'Internal Server Error', message: err.message }, 500);
  }
});

/**
 * GET /api/tasks/:id
 * Get single task detail
 */
tasks.get('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return c.json({ error: 'Not Found', message: 'Task not found' }, 404);
    }

    return c.json({ task: result.rows[0] });
  } catch (err) {
    console.error('Error fetching task:', err);
    return c.json({ error: 'Internal Server Error', message: err.message }, 500);
  }
});

/**
 * GET /api/tasks/stats
 * Aggregate statistics
 */
tasks.get('/stats/aggregate', async (c) => {
  try {
    const result = await pool.query(`
      SELECT 
        service_name,
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'running') as running,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        ROUND(AVG(duration_ms)) as avg_duration_ms,
        MAX(created_at) as last_activity
      FROM tasks
      GROUP BY service_name
      ORDER BY last_activity DESC
    `);

    return c.json({ stats: result.rows });
  } catch (err) {
    console.error('Error fetching stats:', err);
    return c.json({ error: 'Internal Server Error', message: err.message }, 500);
  }
});

export default tasks;
