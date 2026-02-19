-- Cortex Database Schema
-- Activity tracking for 00raiser platform

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

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_service_name ON tasks(service_name);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_service_status ON tasks(service_name, status);

-- Composite index for timeline queries
CREATE INDEX IF NOT EXISTS idx_tasks_timeline ON tasks(created_at DESC, service_name, status);
