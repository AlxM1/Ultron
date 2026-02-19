import pg from 'pg';
const { Pool } = pg;

// Validate DATABASE_URL is set in production
if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
  console.error('🔴 FATAL: DATABASE_URL environment variable is required in production');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://agent_bridge:dev_password@localhost:5432/agent_tasks',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✓ Database connected');
});

pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

// Initialize schema
export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        service_name VARCHAR(255) NOT NULL,
        task_type VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
        metadata JSONB DEFAULT '{}'::jsonb,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        duration_ms INTEGER,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_service_name ON tasks(service_name);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_tasks_service_status ON tasks(service_name, status);
      CREATE INDEX IF NOT EXISTS idx_tasks_timeline ON tasks(created_at DESC, service_name, status);
    `);
    console.log('✓ Database schema initialized');
  } catch (err) {
    console.error('Failed to initialize database:', err);
    throw err;
  } finally {
    client.release();
  }
}

export default pool;
