import { Hono } from 'hono';
import pool from '../db.js';

const services = new Hono();

/**
 * GET /api/services
 * List all registered services and their last activity
 */
services.get('/', async (c) => {
  try {
    const result = await pool.query(`
      SELECT 
        service_name,
        MAX(created_at) as last_activity,
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'running') as active_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_tasks
      FROM tasks
      GROUP BY service_name
      ORDER BY last_activity DESC
    `);

    return c.json({ services: result.rows });
  } catch (err) {
    console.error('Error fetching services:', err);
    return c.json({ error: 'Internal Server Error', message: err.message }, 500);
  }
});

export default services;
