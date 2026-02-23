# INotion (Outline) Deployment Summary

**Date:** 2026-02-21  
**Status:** ✅ Successfully Deployed  
**Service:** Outline Wiki (replacing AFFiNE)  
**Access:** http://localhost:3010

---

## What Was Done

### 1. Pre-Deployment Checks ✅
- Verified AFFiNE container was not running (already removed)
- Confirmed Outline database and user already existed in PostgreSQL
- Generated new SECRET_KEY and UTILS_SECRET for production

### 2. Configuration Updates ✅
- Updated docker-compose.yml with proper environment variable format (using `-` prefix)
- Enabled email authentication (`SMTP_HOST=console` for development)
- Fixed healthcheck endpoint from `/api/health` to `/`
- Used fresh secrets:
  - `SECRET_KEY`: 3c2b9de2f61641380d6d9723bf23eb0c97211ea02a4b556d74fffe9fca03284f
  - `UTILS_SECRET`: 0d64912f0faf0afa27e644bdb8de4deb44ca9668293ef04d1222e150cfe8fa24

### 3. Database Initialization ✅
- Created team: **INotion** (ID: a0000000-0000-4000-8000-000000000001)
- Created admin user: **admin@00raiser.local** (ID: b0000000-0000-4000-8000-000000000001)
- Generated API key: `sk-25684e1be71f7ae58ae6ecd1ea1a295f`

### 4. Collections Created ✅
Five collections were created for organizational structure:

| Collection | ID | Icon | Documents |
|------------|-----|------|-----------|
| Creator Profiles | `10000000-0000-4000-8000-000000000001` | 👤 | 39 |
| Operations | `10000000-0000-4000-8000-000000000002` | ⚙️ | 0 |
| Infrastructure | `10000000-0000-4000-8000-000000000003` | 🏗️ | 0 |
| Content Pipeline | `10000000-0000-4000-8000-000000000004` | 📺 | 0 |
| Cost Tracking | `10000000-0000-4000-8000-000000000005` | 💰 | 0 |

### 5. Content Import ✅
- **39 creator profiles** successfully imported from `/home/eternity/.openclaw/workspace/Ultron/media/creator-profiles/`
- All profiles loaded into the "Creator Profiles" collection
- Profiles include: AI Explained, Alex Hormozi, Fireship, OpenAI, Matt Wolfe, and 34 others

### 6. Service Status ✅
```
Container:  raiser-outline
Status:     Up 3 minutes (healthy)
Ports:      127.0.0.1:3010->3000/tcp
Email Auth: Enabled
```

---

## Access Information

### Web Interface
- **URL:** http://localhost:3010
- **Admin Email:** admin@00raiser.local
- **Auth Method:** Email magic links (printed to container logs)

### API Access
- **Base URL:** http://localhost:3010/api
- **API Key:** `sk-25684e1be71f7ae58ae6ecd1ea1a295f`
- **Header:** `Authorization: Bearer <API_KEY>`

### Database Access
```bash
docker exec -it raiser-postgres psql -U outline -d outline
```

---

## Files Created/Modified

### Modified
- `/home/eternity/.openclaw/workspace/Ultron/docker-compose.yml` - Updated Outline service config

### Created
- `/home/eternity/.openclaw/.innotion-admin-creds` (chmod 600) - Admin credentials
- `/home/eternity/.openclaw/workspace/Ultron/INNOTION-DEPLOYMENT.md` - This file
- `/tmp/outline-secrets` - Generated secrets (can be deleted)
- `/tmp/create-outline-admin-v3.sql` - Admin user creation SQL (can be deleted)
- `/tmp/create-collections.sql` - Collections creation SQL (can be deleted)
- `/tmp/import-creator-profiles.py` - Import script (can be deleted)

---

## Next Steps

### Immediate
1. Access http://localhost:3010 in your browser
2. Request a magic link for admin@00raiser.local
3. Check container logs for the login URL: `docker logs raiser-outline | grep -i "magic\|login\|email"`

### Future Enhancements
1. **Configure proper SMTP** - Replace console SMTP with real email provider
2. **Set up OIDC** - Integrate with Authentik (raiser-authentik) for SSO
3. **Add content to other collections:**
   - Operations: Workflow documentation
   - Infrastructure: Docker configs, service mappings
   - Content Pipeline: Creator pipeline processes
   - Cost Tracking: Budget spreadsheets
4. **Configure proxy** - Add to Nginx/Caddy for public access
5. **Backup automation** - Set up automated Postgres dumps

---

## Troubleshooting

### Container keeps restarting
```bash
docker logs raiser-outline --tail 50
```

### Can't access web interface
```bash
curl http://localhost:3010/
docker ps --filter "name=raiser-outline"
```

### Need to regenerate API key
```sql
INSERT INTO "apiKeys" (id, secret, name, "userId", "createdAt", "updatedAt", "lastActiveAt", last4)
VALUES (
  gen_random_uuid(),
  'sk-' || substr(md5(random()::text), 1, 48),
  'New API Key',
  'b0000000-0000-4000-8000-000000000001',
  NOW(), NOW(), NOW(),
  substr(md5(random()::text), 1, 4)
)
RETURNING secret;
```

---

## Architecture Notes

- **Storage:** Local filesystem at `/var/lib/outline/data` (Docker volume: `outline_data`)
- **Database:** PostgreSQL (shared with other Raiser services)
- **Cache:** Redis (shared, db index 0)
- **Network:** raiser-net (Docker bridge network)
- **Security:** no-new-privileges, all capabilities dropped
- **Memory Limit:** 1GB

---

**Deployment completed successfully at 2026-02-21 10:15 PST**
