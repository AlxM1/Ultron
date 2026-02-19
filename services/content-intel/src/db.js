import pg from 'pg';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// SECURITY FIX: Require DATABASE_URL in production, no default credentials
if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL environment variable is required in production');
  } else {
    console.warn('⚠️  SECURITY WARNING: DATABASE_URL not set, using development default');
  }
}

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://content_intel:password@postgres:5432/content_intel',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

// Initialize database schema
export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('Initializing database schema...');
    const schemaPath = join(__dirname, '..', 'sql', 'schema.sql');
    const schema = await readFile(schemaPath, 'utf-8');
    await client.query(schema);
    console.log('Database schema initialized successfully');
  } catch (err) {
    console.error('Failed to initialize database schema:', err);
    throw err;
  } finally {
    client.release();
  }
}

export default pool;
