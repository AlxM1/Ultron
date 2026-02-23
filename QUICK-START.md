# AgentSmith Quick Start Guide

## 🚀 Getting Started

### 1. Access Points

- **Backend API:** http://localhost:4000
- **Admin Dashboard:** http://localhost:3001
- **Main UI:** http://localhost:3000
- **API Documentation:** http://localhost:4000/api/docs/

### 2. Admin Access

**Password file:** `~/.openclaw/.agentsmith-admin-pass`
**Password:** `SDnRMsc4jnTVOwI1N8TZ25OcQrb0DCff`

### 3. First-Time Setup

#### Create Admin User

```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "admin@local",
    "password": "your-secure-password",
    "name": "Admin User"
  }'
```

#### Login and Get Token

```bash
TOKEN=$(curl -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "admin@local",
    "password": "your-secure-password"
  }' | jq -r '.data.token')

echo $TOKEN
```

#### Export Token for Scripts

```bash
export AGENTSMITH_TOKEN="$TOKEN"
```

### 4. Upload Workflows

```bash
cd /home/eternity/.openclaw/workspace/Ultron
./upload-workflows.sh
```

The script will upload these workflows:
1. **Health Monitoring** - Checks all services every 5 minutes
2. **Content Pipeline** - Processes transcripts via webhook
3. **Cost Tracking** - Daily cost aggregation at 1 AM

### 5. Manual Workflow Upload

```bash
# Upload health monitoring
curl -X POST http://localhost:4000/api/v1/workflows \
  -H "Authorization: Bearer $AGENTSMITH_TOKEN" \
  -H "Content-Type: application/json" \
  -d @workflows/health-monitoring.json

# Get workflow ID from response, then activate
curl -X POST http://localhost:4000/api/v1/workflows/{WORKFLOW_ID}/activate \
  -H "Authorization: Bearer $AGENTSMITH_TOKEN"
```

### 6. Common Operations

#### List All Workflows

```bash
curl -H "Authorization: Bearer $AGENTSMITH_TOKEN" \
  http://localhost:4000/api/v1/workflows
```

#### Get Workflow Details

```bash
curl -H "Authorization: Bearer $AGENTSMITH_TOKEN" \
  http://localhost:4000/api/v1/workflows/{WORKFLOW_ID}
```

#### List Executions

```bash
curl -H "Authorization: Bearer $AGENTSMITH_TOKEN" \
  http://localhost:4000/api/v1/executions
```

#### View Execution Stats

```bash
curl -H "Authorization: Bearer $AGENTSMITH_TOKEN" \
  http://localhost:4000/api/v1/executions/stats
```

#### Trigger Content Pipeline via Webhook

```bash
curl -X POST http://localhost:4000/webhooks/content-pipeline \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-webhook-key" \
  -d '{
    "id": "transcript-123",
    "transcript": "This is a test transcript...",
    "source": "whisperflow",
    "url": "https://example.com/video.mp4",
    "duration": 120,
    "language": "en"
  }'
```

### 7. Database Setup (Required)

Create the required tables for workflows:

```bash
docker exec -it raiser-postgres psql -U postgres -d raiser
```

Then run:

```sql
-- Transcripts table
CREATE TABLE IF NOT EXISTS transcripts (
    transcript_id VARCHAR(255) PRIMARY KEY,
    transcript TEXT NOT NULL,
    source VARCHAR(100),
    source_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Persona analysis table
CREATE TABLE IF NOT EXISTS persona_analysis (
    id SERIAL PRIMARY KEY,
    transcript_id VARCHAR(255) REFERENCES transcripts(transcript_id),
    analysis_id VARCHAR(255),
    sentiment VARCHAR(50),
    topics JSONB,
    speaker_id VARCHAR(255),
    confidence DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Daily cost metrics table
CREATE TABLE IF NOT EXISTS daily_cost_metrics (
    date DATE PRIMARY KEY,
    total_executions INTEGER,
    api_cost DECIMAL(10,4),
    compute_cost DECIMAL(10,4),
    storage_cost DECIMAL(10,4),
    total_cost DECIMAL(10,4),
    metrics_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- API usage logs table
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100),
    api_provider VARCHAR(100),
    endpoint VARCHAR(255),
    estimated_cost DECIMAL(10,6),
    timestamp TIMESTAMP DEFAULT NOW()
);
```

### 8. Health Check

```bash
# Quick health check
curl http://localhost:4000/health/live

# Detailed health check
curl http://localhost:4000/health/ready

# Check all services
docker ps --filter "name=raiser-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### 9. Monitoring

#### Prometheus Metrics

```bash
curl http://localhost:4000/metrics
```

#### Workflow Execution Logs

```bash
# Via API
curl -H "Authorization: Bearer $AGENTSMITH_TOKEN" \
  "http://localhost:4000/api/v1/executions?page=1&perPage=10&sortBy=createdAt&sortOrder=desc"

# Via Admin UI
# Open http://localhost:3001 and navigate to Executions
```

#### Admin Dashboard Stats

```bash
curl -H "Authorization: Bearer $AGENTSMITH_TOKEN" \
  http://localhost:4000/api/admin/stats/dashboard
```

### 10. Troubleshooting

#### Backend Not Responding

```bash
# Check logs
docker logs raiser-agentsmith-backend --tail 100

# Restart service
docker restart raiser-agentsmith-backend
```

#### Database Connection Issues

```bash
# Check Postgres is running
docker exec raiser-postgres pg_isready -U postgres

# Check database exists
docker exec raiser-postgres psql -U postgres -c "\l" | grep raiser
```

#### Workflow Won't Activate

```bash
# Check workflow status
curl -H "Authorization: Bearer $AGENTSMITH_TOKEN" \
  http://localhost:4000/api/v1/workflows/{WORKFLOW_ID}

# Check for errors in backend logs
docker logs raiser-agentsmith-backend | grep -i error
```

#### Webhook Not Receiving Data

```bash
# Test webhook endpoint
curl -X POST http://localhost:4000/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Check webhook registrations in database
docker exec raiser-postgres psql -U postgres -d raiser \
  -c "SELECT * FROM webhooks WHERE is_active = true;"
```

### 11. Integration Examples

#### WhisperFlow → AgentSmith

Configure WhisperFlow to send transcripts:

```bash
# In WhisperFlow config
WEBHOOK_URL=http://raiser-agentsmith-backend:4000/webhooks/content-pipeline
WEBHOOK_METHOD=POST
WEBHOOK_HEADERS={"Content-Type":"application/json","X-API-Key":"your-key"}
```

#### Cortex Task Creation

```bash
curl -X POST http://localhost:3011/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "custom_alert",
    "priority": "high",
    "data": {
      "message": "Test alert from AgentSmith"
    }
  }'
```

### 12. Useful Admin Endpoints

```bash
# System health stats
curl -H "Authorization: Bearer $AGENTSMITH_TOKEN" \
  http://localhost:4000/api/admin/stats/health

# Execution trends
curl -H "Authorization: Bearer $AGENTSMITH_TOKEN" \
  http://localhost:4000/api/admin/stats/executions/trend

# Node usage stats
curl -H "Authorization: Bearer $AGENTSMITH_TOKEN" \
  http://localhost:4000/api/admin/stats/nodes/usage

# Audit logs
curl -H "Authorization: Bearer $AGENTSMITH_TOKEN" \
  "http://localhost:4000/api/admin/audit-logs?page=1&perPage=50"
```

### 13. Files & Documentation

- **API Endpoints:** `agentsmith-api-endpoints.md`
- **Setup Summary:** `agentsmith-setup-summary.md`
- **Workflows:** `workflows/` directory
- **Upload Script:** `upload-workflows.sh`

### 14. Service Status Check Script

Create a quick status check:

```bash
#!/bin/bash
echo "AgentSmith Service Status"
echo "========================="
echo ""
echo "Backend: $(curl -s http://localhost:4000/health/live || echo 'DOWN')"
echo "Admin UI: $(curl -s http://localhost:3001 | grep -q 'AgentSmith' && echo 'UP' || echo 'DOWN')"
echo "Cortex: $(curl -s http://localhost:3011/health || echo 'DOWN')"
echo ""
echo "Active Workflows:"
curl -s -H "Authorization: Bearer $AGENTSMITH_TOKEN" \
  "http://localhost:4000/api/v1/workflows?status=active" | \
  jq -r '.data[] | "  - \(.name) (\(.status))"'
```

---

**Need Help?**
- Check logs: `docker logs raiser-agentsmith-backend`
- Admin UI: http://localhost:3001
- API Docs: http://localhost:4000/api/docs/
