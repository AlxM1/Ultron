"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.initDb = initDb;
const pg_1 = require("pg");
exports.pool = new pg_1.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'seoh',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
});
async function initDb() {
    await exports.pool.query(`
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
}
