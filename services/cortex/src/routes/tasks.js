import { Hono } from 'hono';
import pool from '../db.js';

const tasks = new Hono();

// Input validation constants
const MAX_SERVICE_NAME_LENGTH = 255;
const MAX_TASK_TYPE_LENGTH = 255;
const MAX_ERROR_MESSAGE_LENGTH = 10000; // 10KB max for error messages
const MAX_METADATA_SIZE = 100000; // 100KB max for metadata JSON
const MAX_LIMIT = 200;
const MAX_OFFSET = 1000000;

/**
 * Validate and sanitize inputs
 */
function validateTaskInput(body) {
  const { service_name, task_type, error_message, metadata } = body;
  
  if (!service_name || typeof service_name !== 'string') {
    return { valid: false, error: 'service_name is required and must be a string' };
  }
  if (service_name.length > MAX_SERVICE_NAME_LENGTH) {
    return { valid: false, error: `service_name must not exceed ${MAX_SERVICE_NAME_LENGTH} characters` };
  }
  
  if (!task_type || typeof task_type !== 'string') {
    return { valid: false, error: 'task_type is required and must be a string' };
  }
  if (task_type.length > MAX_TASK_TYPE_LENGTH) {
    return { valid: false, error: `task_type must not exceed ${MAX_TASK_TYPE_LENGTH} characters` };
  }
  
  if (error_message && typeof error_message !== 'string') {
    return { valid: false, error: 'error_message must be a string' };
  }
  if (error_message && error_message.length > MAX_ERROR_MESSAGE_LENGTH) {
    return { valid: false, error: `error_message must not exceed ${MAX_ERROR_MESSAGE_LENGTH} characters` };
  }
  
  if (metadata !== undefined) {
    if (typeof metadata !== 'object' || metadata === null) {
      return { valid: false, error: 'metadata must be an object' };
    }
    const metadataStr = JSON.stringify(metadata);
    if (metadataStr.length > MAX_METADATA_SIZE) {
      return { valid: false, error: `metadata must not exceed ${MAX_METADATA_SIZE} bytes` };
    }
  }
  
  return { valid: true };
}

/**
 * Validate task ID is a positive integer
 */
function validateTaskId(id) {
  const numId = parseInt(id, 10);
  if (isNaN(numId) || numId <= 0 || numId.toString() !== id) {
    return { valid: false, error: 'Invalid task ID' };
  }
  return { valid: true, id: numId };
}

/**
 * POST /api/tasks
 * Register a new task
 */
tasks.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { service_name, task_type, status = 'pending', metadata = {}, started_at, error_message } = body;

    // Validate inputs
    const validation = validateTaskInput(body);
    if (!validation.valid) {
      return c.json({ error: 'Bad Request', message: validation.error }, 400);
    }

    if (!['pending', 'running', 'completed', 'failed'].includes(status)) {
      return c.json({ error: 'Bad Request', message: 'Invalid status' }, 400);
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
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

/**
 * PATCH /api/tasks/:id
 * Update task status and metadata
 */
tasks.patch('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    
    // Validate task ID
    const idValidation = validateTaskId(id);
    if (!idValidation.valid) {
      return c.json({ error: 'Bad Request', message: idValidation.error }, 400);
    }
    
    const body = await c.req.json();
    const { status, metadata, completed_at, duration_ms, error_message } = body;

    // Validate status if provided
    if (status && !['pending', 'running', 'completed', 'failed'].includes(status)) {
      return c.json({ error: 'Bad Request', message: 'Invalid status' }, 400);
    }

    // Validate error_message length
    if (error_message && typeof error_message === 'string' && error_message.length > MAX_ERROR_MESSAGE_LENGTH) {
      return c.json({ error: 'Bad Request', message: `error_message exceeds maximum length` }, 400);
    }

    // Validate metadata size
    if (metadata !== undefined) {
      if (typeof metadata !== 'object' || metadata === null) {
        return c.json({ error: 'Bad Request', message: 'metadata must be an object' }, 400);
      }
      const metadataStr = JSON.stringify(metadata);
      if (metadataStr.length > MAX_METADATA_SIZE) {
        return c.json({ error: 'Bad Request', message: 'metadata exceeds maximum size' }, 400);
      }
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

    values.push(idValidation.id);
    const result = await pool.query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Not Found' }, 404);
    }

    return c.json({ task: result.rows[0] });
  } catch (err) {
    console.error('Error updating task:', err);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

/**
 * GET /api/tasks
 * List tasks with filters
 */
tasks.get('/', async (c) => {
  try {
    const { service, status, limit = '50', offset = '0' } = c.req.query();

    // Validate and clamp limit and offset
    let limitNum = parseInt(limit, 10);
    let offsetNum = parseInt(offset, 10);
    
    if (isNaN(limitNum) || limitNum < 1) {
      limitNum = 50;
    }
    if (limitNum > MAX_LIMIT) {
      limitNum = MAX_LIMIT;
    }
    
    if (isNaN(offsetNum) || offsetNum < 0) {
      offsetNum = 0;
    }
    if (offsetNum > MAX_OFFSET) {
      offsetNum = MAX_OFFSET;
    }

    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (service) {
      conditions.push(`service_name = $${paramIndex++}`);
      values.push(service);
    }

    if (status) {
      if (!['pending', 'running', 'completed', 'failed'].includes(status)) {
        return c.json({ error: 'Bad Request', message: 'Invalid status' }, 400);
      }
      conditions.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    values.push(limitNum);
    values.push(offsetNum);

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
      limit: limitNum,
      offset: offsetNum
    });
  } catch (err) {
    console.error('Error fetching tasks:', err);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

/**
 * GET /api/tasks/:id
 * Get single task detail
 */
tasks.get('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    
    // Validate task ID
    const idValidation = validateTaskId(id);
    if (!idValidation.valid) {
      return c.json({ error: 'Bad Request', message: idValidation.error }, 400);
    }
    
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [idValidation.id]);

    if (result.rows.length === 0) {
      return c.json({ error: 'Not Found' }, 404);
    }

    return c.json({ task: result.rows[0] });
  } catch (err) {
    console.error('Error fetching task:', err);
    return c.json({ error: 'Internal Server Error' }, 500);
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
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

export default tasks;
