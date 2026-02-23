# AgentSmith API Endpoints

**Base URL:** http://localhost:4000
**Admin UI:** http://localhost:3001
**Main UI:** http://localhost:3000

## Health & Documentation

- `GET /health/` - Basic health check
- `GET /health/ready` - Readiness check
- `GET /health/live` - Liveness check  
- `GET /api/docs/` - Swagger UI API documentation

## Authentication & Users

### Auth Routes (`/api/v1/auth`)
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Get current user (requires auth)
- `POST /api/v1/auth/change-password` - Change password (requires auth)
- `POST /api/v1/auth/logout` - Logout (requires auth)
- `POST /api/v1/auth/password/reset-request` - Request password reset

### SSO Routes (`/api/v1/auth/sso`)
- SSO authentication endpoints

### 2FA Routes (`/api/v1/auth/2fa`)
- Two-factor authentication endpoints

### User Management (`/api/v1/users`)
- `GET /api/v1/users` - List users (admin only)
- `GET /api/v1/users/:id` - Get user details
- `POST /api/v1/users` - Create user (admin only)
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user (admin only)

## Workflows

### Workflow Routes (`/api/v1/workflows`)
- `GET /api/v1/workflows` - List workflows (supports pagination, search, status, tags)
  - Query params: `page`, `perPage`, `sortBy`, `sortOrder`, `search`, `status`, `tags`
- `GET /api/v1/workflows/:id` - Get single workflow
- `POST /api/v1/workflows` - Create workflow
- `PUT /api/v1/workflows/:id` - Update workflow
- `DELETE /api/v1/workflows/:id` - Delete workflow
- `POST /api/v1/workflows/:id/activate` - Activate workflow (registers triggers)
- `POST /api/v1/workflows/:id/deactivate` - Deactivate workflow (unregisters triggers)

### Workflow Sharing (`/api/v1/workflows/sharing`)
- Sharing and collaboration endpoints

## Executions

### Execution Routes (`/api/v1/executions`)
- `GET /api/v1/executions` - List executions (supports pagination)
- `GET /api/v1/executions/stats` - Get execution statistics
- `GET /api/v1/executions/:id` - Get single execution
- `POST /api/v1/executions/:id/stop` - Stop running execution
- `POST /api/v1/executions/:id/retry` - Retry failed execution
- `DELETE /api/v1/executions/:id` - Delete execution
- `POST /api/v1/executions/bulk-delete` - Bulk delete executions

## Credentials

### Credential Routes (`/api/v1/credentials`)
- `GET /api/v1/credentials` - List credentials (supports pagination)
- `GET /api/v1/credentials/types` - Get credential types
- `GET /api/v1/credentials/:id` - Get single credential
- `POST /api/v1/credentials` - Create credential
- `PUT /api/v1/credentials/:id` - Update credential
- `DELETE /api/v1/credentials/:id` - Delete credential
- `POST /api/v1/credentials/:id/test` - Test credential
- `POST /api/v1/credentials/test` - Test credential without saving

## Nodes

### Node Routes (`/api/v1/nodes`)
- `GET /api/v1/nodes` - List all available nodes
- `GET /api/v1/nodes/categories` - Get node categories
- `GET /api/v1/nodes/:name` - Get specific node definition
- `GET /api/v1/nodes/search` - Search nodes

## Environments

### Environment Routes (`/api/v1/environments`)
- Environment variable management

## Import/Export

### Import/Export Routes (`/api/v1/import-export`)
- Workflow import/export functionality

## Webhooks

### Webhook Routes (`/webhooks/*`)
- `GET /webhooks/:path(*)` - Handle webhook GET requests
- `POST /webhooks/:path(*)` - Handle webhook POST requests
- `PUT /webhooks/:path(*)` - Handle webhook PUT requests
- `PATCH /webhooks/:path(*)` - Handle webhook PATCH requests
- `DELETE /webhooks/:path(*)` - Handle webhook DELETE requests
- `HEAD /webhooks/:path(*)` - Handle webhook HEAD requests
- `OPTIONS /webhooks/:path(*)` - Handle webhook OPTIONS requests

## Metrics

### Metrics Routes (`/metrics` or `/api/metrics`)
- `GET /metrics` - Prometheus metrics endpoint

## Admin API

### Admin Routes (`/api/admin`) - All require admin role

#### Dashboard & Stats
- `GET /api/admin/stats/dashboard` - Dashboard overview
- `GET /api/admin/stats/health` - System health stats
- `GET /api/admin/stats/executions/trend` - Execution trends
- `GET /api/admin/stats/nodes/usage` - Node usage stats

#### Admin User Management
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/:id` - Get user details
- `POST /api/admin/users` - Create user
- `PATCH /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `POST /api/admin/users/:id/reset-password` - Reset user password

#### Admin Workflow Management
- `GET /api/admin/workflows` - List all workflows
- `GET /api/admin/workflows/:id` - Get workflow details
- `PATCH /api/admin/workflows/:id/active` - Toggle workflow active status
- `DELETE /api/admin/workflows/:id` - Delete workflow

#### Admin Execution Management
- `GET /api/admin/executions` - List all executions
- `GET /api/admin/executions/:id` - Get execution details
- `POST /api/admin/executions/:id/cancel` - Cancel execution
- `POST /api/admin/executions/:id/retry` - Retry execution

#### Admin Audit Logs
- `GET /api/admin/audit-logs` - Get audit logs

#### Admin Settings
- `GET /api/admin/settings` - Get system settings
- `PATCH /api/admin/settings` - Update system settings
- `POST /api/admin/settings/test-email` - Test email configuration

#### Admin Credentials
- `GET /api/admin/credentials/types` - Get credential types
- `GET /api/admin/credentials/usage` - Get credential usage

#### Admin Auth
- `POST /api/admin/auth/login` - Admin login
- `GET /api/admin/auth/profile` - Get admin profile
- `POST /api/admin/auth/logout` - Admin logout

## Service Integration URLs

The following services are configured in the docker-compose and can be integrated:

- **Cortex (Task Bridge):** http://raiser-cortex:3011
- **YouTubeDL:** http://raiser-youtubedl:8000
- **Apify/Scraper:** http://raiser-apify:8400
- **WhisperFlow:** http://raiser-whisperflow:8766
- **VoiceForge:** http://raiser-voiceforge:8000
- **Krya:** http://raiser-krya:3000
- **Persona Pipeline:** http://raiser-persona-pipeline:8500
- **Newsletter Pipeline:** http://raiser-newsletter-pipeline:8000
- **Content Intel:** http://raiser-content-intel:3015
- **Portal:** http://raiser-portal:3020
- **Affine:** http://raiser-affine:3010

## Authentication

Admin password stored in: `~/.openclaw/.agentsmith-admin-pass`

All API routes except `/health/*`, `/webhooks/*`, and `/api/docs` require authentication via JWT token.

Admin routes additionally require the `admin` role.

## Rate Limiting

API routes are rate-limited:
- Default: Configured via `config.rateLimit.windowMs` and `config.rateLimit.max`
- Applied to all `/api/*` routes
