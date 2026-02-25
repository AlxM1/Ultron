# Data Retention Policy — seoh.ca / 00raiser Platform

**Version:** 1.0  
**Status:** Draft — Pending Alex Approval  
**Created:** 2026-02-25  
**Covers:** All PostgreSQL databases in the 00raiser stack (agentsmith, krya, content_intel, agent_tasks, newsletter_pipeline, authentik, outline)  
**Issue:** V-39 — No data retention policy, user data kept indefinitely

---

## 1. Purpose

This policy defines how long different categories of data are retained on the seoh.ca / 00raiser platform, who is responsible for enforcement, and the approach for each deletion category. The goal is to:

- Limit legal and privacy exposure before launch
- Avoid unbounded database growth over time
- Align with PIPEDA (Canada) and GDPR principles (right to erasure, data minimisation)
- Establish automated purge routines before user data accumulates

---

## 2. Scope

All databases managed by the 00raiser Docker stack on the seoh.ca infrastructure:

| Database | Service | Contains Personal Data? |
|---|---|---|
| `agentsmith` | AgentSmith workflow engine | Yes (users, sessions, audit logs) |
| `krya` | Krya AI creative platform | Yes (users, usage logs, sessions) |
| `content_intel` | Creator Intelligence scraper | No (public content only) |
| `agent_tasks` | Cortex task scheduler | No (service activity only) |
| `newsletter_pipeline` | Newsletter/email signup | Yes (email addresses) |
| `authentik` | SSO / identity provider | Yes (auth logs, identity data) |
| `outline` | Internal wiki | Yes (user-authored documents) |

---

## 3. Retention Periods by Data Category

### 3.1 User Accounts (Personal Data)
**Databases:** `agentsmith.users`, `krya.User`  
**Retention:** Active for lifetime of account. On account deletion, hard-delete after a 30-day grace period (soft-delete via `is_active = false`).  
**Approach:** Soft-delete → hard-delete after 30 days  
**Rationale:** Allows account recovery within 30 days; avoids orphaned data.

### 3.2 Newsletter / Email Signups
**Database:** `newsletter_pipeline`  
**Retention:** **Until unsubscribe.** Immediately hard-delete on unsubscribe request.  
**Approach:** Hard-delete on unsubscribe  
**Rationale:** CASL (Canadian Anti-Spam Law) and PIPEDA require honouring opt-out within 10 business days. No grace period.  
**Note:** Schema not yet inspected — table/column names TBD. Assumed to have an `unsubscribed_at` or boolean flag.

### 3.3 YouTube Transcripts & Content Metadata (Non-Personal)
**Database:** `content_intel` — tables: `transcripts`, `content`, `creators`, `comments`, `trends`, `ideas`  
**Retention:** **Indefinitely** — this is the platform's core IP.  
**Approach:** No automated purge. Manual archival only.  
**Rationale:** Scraped from public sources. No personal data. Core dataset for the Creator Intelligence product.

### 3.4 API / Access Logs
**Databases:** 
- `agentsmith.audit_logs` (action log: `created_at`)
- `krya.UsageLog` (`createdAt`)
- `agent_tasks.tasks` (`created_at`)
**Retention:** **90 days**  
**Approach:** Hard-delete rows older than 90 days  
**Rationale:** Sufficient for incident investigation and billing disputes. Older logs have minimal operational value. Aligns with common SaaS practices and Canadian breach reporting windows (72-hour mandatory notification under PIPEDA).

#### 3.4.1 IP Address Handling in audit_logs (V-44)
**Issue (V-44):** The `agentsmith.audit_logs` table stores external client IP addresses (column: `ip_address`) captured from `X-Forwarded-For` / `req.ip` by the SOC 2 compliance middleware. Full IPs constitute personal data under PIPEDA and GDPR and must not be retained beyond what is necessary.

**Resolution:**
- **At write time:** IPs are **anonymized before storage** via `anonymizeIp()` in `src/middleware/soc2Compliance.ts`.  
  - IPv4: last octet zeroed (e.g. `203.0.113.42` → `203.0.113.0`)  
  - IPv6: last two groups (32 bits) zeroed  
  - This preserves geographic/network-level signal for security analytics while preventing individual re-identification.
- **At purge time:** `scripts/purge-old-data.sh` Section 1 hard-deletes all `audit_logs` rows older than 90 days.

**Note:** Existing rows written before this change may contain full IPs. A one-time backfill to re-anonymize historical `ip_address` values is recommended before launch (out of scope for V-44 automated fix — flag for manual review).

### 3.5 AgentSmith Workflow Executions
**Database:** `agentsmith` — tables: `executions`, `execution_data`  
**Retention:** **1 year** (365 days)  
**Approach:** Hard-delete `execution_data` rows first (FK child), then `executions` rows older than 365 days  
**Rationale:** Executions may be needed for debugging, billing, or workflow tuning. 1 year covers all reasonable audit and debugging windows.

### 3.6 AgentSmith User Sessions
**Database:** `agentsmith.sessions`  
**Retention:** **90 days after expiry** (column: `expires_at`)  
**Approach:** Hard-delete sessions where `expires_at < NOW() - INTERVAL '90 days'`  
**Rationale:** Sessions are invalidated by `expires_at`; keeping them 90 days post-expiry allows forensic review if needed. Beyond that there is no value.

### 3.7 Krya Auth Sessions
**Database:** `krya.Session` (Prisma table, column: `expires`)  
**Retention:** Hard-delete sessions where `expires < NOW() - INTERVAL '7 days'`  
**Approach:** Hard-delete  
**Rationale:** Krya sessions auto-expire; a 7-day grace removes definitely-dead sessions without operational risk.

### 3.8 Krya User Notifications
**Database:** `krya.Notification` (column: `createdAt`)  
**Retention:** **90 days**  
**Approach:** Hard-delete rows older than 90 days  
**Rationale:** Notifications are ephemeral UI artefacts. No audit or compliance value after 90 days.

### 3.9 Authentik Auth Logs
**Service:** Authentik (manages its own PostgreSQL schema internally)  
**Retention:** **90 days**  
**Approach:** Configure via Authentik's built-in retention settings (`authentik_tenant` settings or `AUTHENTIK_LOG_LEVEL` / outpost/flow event expiry)  
**Implementation:** Set `Event Retention` in Authentik Admin → System → Settings to `days=90`  
**Note:** Do NOT manually delete from `authentik` DB — Authentik manages its own schema. Use the admin UI or env var `AUTHENTIK_DEFAULT_TOKEN_DURATION`.

### 3.10 Backup Files (Filesystem)
**Location:** `Ultron/backups/` (daily PostgreSQL dumps)  
**Retention:** **30 days**  
**Approach:** `find ./backups -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \;`  
**Implementation:** Handled by `scripts/backup.sh` — confirm `--prune-older-than 30` flag is active.  
**Rationale:** 30-day backup window gives sufficient recovery point options without unbounded disk growth.

### 3.11 Inbound Media / Temp Files (Workspace)
**Location:** `~/.openclaw/media/inbound`, `/tmp/*.wav|ogg|mp3`, `ytdl-captions/`  
**Retention:** 7 days (media/captions), 1 day (temp audio)  
**Approach:** Already handled by `tools/data-retention.sh`

---

## 4. Deletion Approach Summary

| Category | Approach | Who Deletes |
|---|---|---|
| User accounts | Soft-delete → hard-delete after 30d | Application + purge script |
| Newsletter signups | Hard-delete on unsubscribe | Application (immediate) |
| Transcripts / content | Never (indefinite) | N/A |
| API logs / audit logs | Hard-delete after 90d | `purge-old-data.sh` |
| AgentSmith executions | Hard-delete after 1 year | `purge-old-data.sh` |
| AgentSmith sessions | Hard-delete 90d post-expiry | `purge-old-data.sh` |
| Krya sessions | Hard-delete 7d post-expiry | `purge-old-data.sh` |
| Krya notifications | Hard-delete after 90d | `purge-old-data.sh` |
| Authentik auth logs | Configured in Authentik admin (90d) | Authentik built-in |
| Backup files | Hard-delete after 30d | `backup.sh` / cron |
| Temp/media files | Hard-delete after 7d | `data-retention.sh` |

---

## 5. User Rights & Deletion Requests

Prior to launch, the following must be implemented in the application layer:

- **Right to access:** User can export their data on request
- **Right to erasure:** Deleting an account triggers immediate soft-delete; a 30-day scheduled hard-delete follows
- **Newsletter opt-out:** Unsubscribe link in every email; hard-delete within 10 business days (CASL)
- **Data portability:** Not required pre-launch but document the intent

---

## 6. Enforcement

### Automated Purge Script
- **Script:** `scripts/purge-old-data.sh`
- **Frequency:** Weekly recommended (Sunday 03:00 local time)
- **Status:** ⚠️ NOT yet scheduled — requires Alex approval before adding to cron
- **Dry-run:** `./scripts/purge-old-data.sh --dry-run` (safe preview)

### Authentik
- Configure event retention in Authentik Admin UI before launch

### Backups
- Confirm `backup.sh` prunes backups older than 30 days

---

## 7. Open Questions / Schema Gaps

1. **`newsletter_pipeline` DB** — No SQL schema file found in repo. Need to confirm table/column names before adding purge support. Expected: `subscribers` table with `email`, `subscribed_at`, `unsubscribed_at` or similar.
2. **`authentik` auth log table names** — Authentik manages these internally. Retention should be set via the Authentik admin UI rather than raw SQL.
3. **`outline` DB** — Outline wiki data. Not covered by automated purge. User-owned documents should follow the same account deletion cascade as user accounts.
4. **`krya.UsageLog` billing linkage** — If usage logs are used for billing disputes, consider extending retention to 1 year for paid users.
5. **`agentsmith.executions` large payload** — `execution_data.data` is JSONB and may be large. Consider a separate archival strategy (export to cold storage) before deleting executions older than 1 year.

---

## 8. Review Schedule

This policy should be reviewed:
- Before public launch (mandatory)
- Annually thereafter
- Any time a new data source is added to the platform

---

*Drafted by: Jarvis (automated compliance agent)*  
*Requires review and approval by: Alex (owner)*
