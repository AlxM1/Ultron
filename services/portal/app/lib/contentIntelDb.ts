import { Pool } from "pg";

const pool = new Pool({
  host: process.env.CONTENT_INTEL_DB_HOST || "raiser-postgres",
  port: parseInt(process.env.CONTENT_INTEL_DB_PORT || "5432"),
  database: "content_intel",
  user: process.env.CONTENT_INTEL_DB_USER || "postgres",
  password: process.env.CONTENT_INTEL_DB_PASSWORD || process.env.POSTGRES_PASSWORD || "postgres",
  max: 5,
  idleTimeoutMillis: 30000,
});

export default pool;
