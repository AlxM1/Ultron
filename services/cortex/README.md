# Cortex — Activity Tracking & Monitoring

**Cortex** is the activity tracking and monitoring layer for the 00raiser platform.

## Overview

Cortex is a lightweight REST API that tracks task activity across all 00raiser services. Services report task lifecycle events (start, complete, fail) to Cortex, and orchestrators like AgentSmith and the Portal query Cortex to monitor system activity.

## Features

- **Task Tracking** — Register and update task status across services
- **Activity Timeline** — Recent activity feed for dashboard integration
- **Service Stats** — Aggregate metrics per service (success rates, avg duration, etc.)
- **API Key Auth** — Secure endpoints with CORTEX_API_KEY
- **Rate Limiting** — Prevent abuse with built-in rate limiting

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Hono (lightweight, fast)
- **Database:** PostgreSQL (via `pg` driver)
- **Port:** 3011

## API Endpoints

### Core Endpoints

- `POST /api/tasks` — Register a new task
- `PATCH /api/tasks/:id` — Update task status
- `GET /api/tasks` — List tasks (with filters)
- `GET /api/tasks/:id` — Get single task detail
- `GET /api/tasks/stats` — Aggregate statistics
- `GET /api/services` — List all services and their last activity
- `GET /api/timeline` — Recent activity timeline (for Portal dashboard)
- `GET /health` — Health check (no auth required)

### Authentication

All endpoints except `/health` require the `X-API-Key` header:

```bash
curl -H "X-API-Key: your-api-key-here" http://localhost:3011/api/tasks
```

## Environment Variables

```bash
PORT=3011
DATABASE_URL=postgresql://agent_bridge:PASSWORD@postgres:5432/agent_tasks
CORTEX_API_KEY=your-secret-api-key
```

## Database Schema

**tasks** table:
- `id` (serial, primary key)
- `service_name` (varchar, indexed)
- `task_type` (varchar)
- `status` (varchar, indexed) — pending, running, completed, failed
- `metadata` (jsonb)
- `started_at` (timestamp)
- `completed_at` (timestamp)
- `duration_ms` (integer)
- `error_message` (text)
- `created_at` (timestamp, indexed)

## Usage Example

```javascript
// Register a task
const response = await fetch('http://cortex:3011/api/tasks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.CORTEX_API_KEY
  },
  body: JSON.stringify({
    service_name: 'agentsmith',
    task_type: 'workflow_execution',
    status: 'running',
    metadata: { workflow_id: 123 }
  })
});

const task = await response.json();

// Update task status
await fetch(`http://cortex:3011/api/tasks/${task.id}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.CORTEX_API_KEY
  },
  body: JSON.stringify({
    status: 'completed',
    duration_ms: 1500
  })
});
```

## Docker

```bash
docker build -t raiser-cortex .
docker run -p 3011:3011 \
  -e DATABASE_URL=postgresql://... \
  -e CORTEX_API_KEY=secret \
  raiser-cortex
```

## Migration from Agent Bridge

Previously called "Agent Bridge" (`agent-bridge`). All references have been renamed to "Cortex" for clarity and consistency.

**Container:** `raiser-cortex`  
**Service:** `cortex`  
**Database:** Same schema, renamed from `agent_tasks` → `agent_tasks` (kept for backward compatibility)  
**Environment Variable:** Services reference via `TASK_BRIDGE_URL` (points to `http://raiser-cortex:3011`)

## License

MIT
