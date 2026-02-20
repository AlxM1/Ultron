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

// Initialize database schema with retry logic
export async function initializeDatabase() {
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    const client = await pool.connect();
    try {
      console.log(`Initializing database schema... (attempt ${retryCount + 1}/${maxRetries})`);
      const schemaPath = join(__dirname, '..', 'sql', 'schema.sql');
      const schema = await readFile(schemaPath, 'utf-8');
      
      // Execute schema initialization with explicit transaction
      await client.query('BEGIN');
      await client.query(schema);
      await client.query('COMMIT');
      
      console.log('Database schema initialized successfully');
      return; // Success - exit retry loop
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {}); // Ignore rollback errors
      
      // Check for "already exists" errors - these are often not fatal
      if (err.code === '42P07') {
        console.warn(`Schema object already exists (${err.message}), continuing...`);
        if (retryCount === maxRetries - 1) {
          // On final retry, treat "already exists" as success
          console.log('Database schema appears to be already initialized');
          return;
        }
      }
      
      console.error(`Failed to initialize database schema (attempt ${retryCount + 1}):`, err.message);
      retryCount++;
      
      if (retryCount >= maxRetries) {
        console.error('Max retries exceeded for database initialization');
        throw err;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } finally {
      client.release();
    }
  }
}

export default pool;
