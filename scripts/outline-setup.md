# INotion Setup Guide (Outline Wiki backend)

## Access Information

- **URL:** http://localhost:3010
- **Container:** raiser-outline
- **Database:** outline (PostgreSQL)
- **Status:** Running and healthy

## Initial Setup Required

INotion requires authentication configuration before use. Choose one option:

### Option 1: Email Authentication (Console Mode - Development)
1. Visit http://localhost:3010
2. Click "Continue with Email"
3. Enter your email address
4. Check Docker logs for the magic link:
   ```bash
   docker logs raiser-outline 2>&1 | grep -i "magic\|signin"
   ```
5. Copy the magic link from logs and open it in your browser

### Option 2: OIDC with Authentik (Recommended for Production)
Add these environment variables to `docker-compose.yml` under the `outline` service:

```yaml
OIDC_CLIENT_ID: <get from Authentik>
OIDC_CLIENT_SECRET: <get from Authentik>
OIDC_AUTH_URI: http://localhost:9443/application/o/authorize/
OIDC_TOKEN_URI: http://raiser-authentik-server:9000/application/o/token/
OIDC_USERINFO_URI: http://raiser-authentik-server:9000/application/o/userinfo/
OIDC_DISPLAY_NAME: Authentik
```

## Post-Setup: Generate API Token

Once logged in:
1. Go to Settings → API Tokens
2. Click "Create Token"
3. Give it a name (e.g., "INotion Automation")
4. Copy the token and save it to `~/.openclaw/.innotion-admin-creds`:
   ```bash
   echo "API_TOKEN=outline_xxxxxxxxxxxx" > ~/.openclaw/.innotion-admin-creds
   chmod 600 ~/.openclaw/.innotion-admin-creds
   ```

## Load Data

Once you have an API token, run:
```bash
python3 /home/eternity/.openclaw/workspace/Ultron/scripts/load-innotion-data.py
```

This will:
- Create 6 collections (Creator Profiles, Operations, Infrastructure, Content Pipeline, Cost Tracking, Meeting Notes)
- Load all 39 creator profiles
- Create an Operations Calendar document
- Import cron job listings

## Environment Variables

```yaml
SECRET_KEY: 4af1581a18dc6f400647576aebafec8891827af096a4a5433962a016aa2822ce
UTILS_SECRET: 6f61a0e4ed3b56eef60629bc3f94f23b7ec123f1571d34c78d7e8905a2e31a7e
DATABASE_URL: postgres://outline:outline@postgres:5432/outline
REDIS_URL: redis://:bdbb389a97194f746efdd37bafdc46f9fe557777d492d2a1@redis:6379
URL: http://localhost:3010
PORT: 3000
FILE_STORAGE: local
FILE_STORAGE_LOCAL_ROOT_DIR: /var/lib/outline/data
```

## Troubleshooting

### Check container status
```bash
docker ps | grep raiser-outline
docker logs raiser-outline --tail 50
```

### Restart container
```bash
docker compose restart outline
```

### Access database
```bash
docker exec -it raiser-postgres psql -U outline outline
```
