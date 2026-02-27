import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'seoh',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS seoh_audits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      url TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      overall_score INTEGER,
      dimensions JSONB,
      recommendations JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );
  `);
  console.log('[db] seoh_audits table ready');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS seoh_comparisons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      urls JSONB NOT NULL,
      overall_winner JSONB,
      dimension_winners JSONB,
      site_scores JSONB,
      compared_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('[db] seoh_comparisons table ready');
}
