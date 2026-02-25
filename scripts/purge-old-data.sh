#!/usr/bin/env bash
# =============================================================================
# purge-old-data.sh — Scheduled data retention purge for the 00raiser stack
# =============================================================================
#
# Implements the retention periods defined in docs/data-retention-policy.md
# (V-39 compliance fix; V-44 adds IP anonymization at write time — see soc2Compliance.ts).
#
# Usage:
#   ./scripts/purge-old-data.sh              # live run (deletes data)
#   ./scripts/purge-old-data.sh --dry-run    # preview only, no deletes
#
# ⚠️  NOT SCHEDULED — requires Alex approval before adding to cron.
#     When approved, suggested schedule: 0 3 * * 0  (Sundays at 03:00)
#
# What this purges:
#   [agentsmith] audit_logs         older than 90 days
#   [agentsmith] sessions           expired more than 90 days ago
#   [agentsmith] execution_data     child rows of executions older than 1 year
#   [agentsmith] executions         older than 1 year
#   [krya]       "UsageLog"         older than 90 days
#   [krya]       "Session"          expired more than 7 days ago
#   [krya]       "Notification"     older than 90 days
#   [agent_tasks] tasks             older than 90 days
#
# What this does NOT touch:
#   - content_intel (non-personal, kept indefinitely)
#   - newsletter_pipeline (schema not confirmed — manual process until V-xx)
#   - authentik (use Authentik admin UI to set 90-day event retention)
#   - outline (managed by Outline; user data follows account deletion)
#   - krya User / Generation / Video rows (user-owned content, not auto-purged)
#
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_PROJECT="${COMPOSE_PROJECT_NAME:-raiser}"
PG_CONTAINER="${PG_CONTAINER_NAME:-${COMPOSE_PROJECT}-postgres}"
PG_SUPERUSER="${POSTGRES_USER:-postgres}"

# Retention windows
LOGS_RETENTION_DAYS=90
EXECUTIONS_RETENTION_DAYS=365
SESSION_AGENTSMITH_GRACE_DAYS=90
SESSION_KRYA_GRACE_DAYS=7

DRY_RUN=false
LOG_PREFIX="[purge $(date '+%Y-%m-%d %H:%M:%S')]"

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
for arg in "$@"; do
    case "$arg" in
        --dry-run|-n) DRY_RUN=true ;;
        --help|-h)
            echo "Usage: $0 [--dry-run]"
            echo "  --dry-run   Preview rows that would be deleted without deleting anything"
            exit 0
            ;;
        *) echo "Unknown argument: $arg"; exit 1 ;;
    esac
done

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log()  { echo "${LOG_PREFIX} $*"; }
log_section() { echo ""; echo "${LOG_PREFIX} ─────────────────────────────────────────"; echo "${LOG_PREFIX} $*"; echo "${LOG_PREFIX} ─────────────────────────────────────────"; }

# Run SQL against a specific database via docker exec
# Usage: run_sql <database> <sql>
run_sql() {
    local db="$1"
    local sql="$2"
    docker exec -i "$PG_CONTAINER" \
        psql -U "$PG_SUPERUSER" -d "$db" -t -A -c "$sql" 2>&1
}

# Run SQL file/heredoc via stdin
run_sql_stdin() {
    local db="$1"
    docker exec -i "$PG_CONTAINER" \
        psql -U "$PG_SUPERUSER" -d "$db" -v ON_ERROR_STOP=1 2>&1
}

# Return row count for a query (SELECT COUNT(*) equivalent)
count_rows() {
    local db="$1"
    local table="$2"
    local where="$3"
    run_sql "$db" "SELECT COUNT(*) FROM ${table} WHERE ${where};" | tr -d ' '
}

# ---------------------------------------------------------------------------
# Pre-flight
# ---------------------------------------------------------------------------
log "=== Data Retention Purge ==="
if [ "$DRY_RUN" = true ]; then
    log "MODE: DRY RUN — no data will be deleted"
else
    log "MODE: LIVE — data WILL be permanently deleted"
fi
log "Project: $PROJECT_DIR"
log "Container: $PG_CONTAINER"

if ! docker inspect "$PG_CONTAINER" &>/dev/null; then
    log "ERROR: Postgres container '$PG_CONTAINER' is not running. Aborting."
    exit 1
fi

log "Postgres container is up. Starting purge..."

# ---------------------------------------------------------------------------
# SECTION 1: agentsmith — audit_logs (90 days)
# ---------------------------------------------------------------------------
log_section "AGENTSMITH: audit_logs (retain 90 days)"

AUDIT_COUNT=$(count_rows "agentsmith" "audit_logs" "created_at < NOW() - INTERVAL '${LOGS_RETENTION_DAYS} days'")
log "Rows eligible for deletion: $AUDIT_COUNT"

if [ "$DRY_RUN" = false ] && [ "$AUDIT_COUNT" -gt 0 ]; then
    run_sql_stdin "agentsmith" <<-SQL
        BEGIN;
        DELETE FROM audit_logs
        WHERE created_at < NOW() - INTERVAL '${LOGS_RETENTION_DAYS} days';
        GET DIAGNOSTICS -- rows affected shown in output
        COMMIT;
SQL
    log "Deleted $AUDIT_COUNT audit_log rows."
elif [ "$DRY_RUN" = true ]; then
    log "[DRY RUN] Would delete $AUDIT_COUNT rows from agentsmith.audit_logs"
else
    log "Nothing to delete."
fi

# ---------------------------------------------------------------------------
# SECTION 2: agentsmith — sessions (expired > 90 days ago)
# ---------------------------------------------------------------------------
log_section "AGENTSMITH: sessions (90-day grace after expiry)"

SESSION_COUNT=$(count_rows "agentsmith" "sessions" "expires_at < NOW() - INTERVAL '${SESSION_AGENTSMITH_GRACE_DAYS} days'")
log "Rows eligible for deletion: $SESSION_COUNT"

if [ "$DRY_RUN" = false ] && [ "$SESSION_COUNT" -gt 0 ]; then
    run_sql_stdin "agentsmith" <<-SQL
        BEGIN;
        DELETE FROM sessions
        WHERE expires_at < NOW() - INTERVAL '${SESSION_AGENTSMITH_GRACE_DAYS} days';
        COMMIT;
SQL
    log "Deleted $SESSION_COUNT session rows."
elif [ "$DRY_RUN" = true ]; then
    log "[DRY RUN] Would delete $SESSION_COUNT rows from agentsmith.sessions"
else
    log "Nothing to delete."
fi

# ---------------------------------------------------------------------------
# SECTION 3: agentsmith — executions + execution_data (1 year)
# Child rows (execution_data) must be deleted before parent (executions)
# due to FK constraint: execution_data.execution_id → executions.id
# ---------------------------------------------------------------------------
log_section "AGENTSMITH: executions + execution_data (retain 1 year)"

EXEC_COUNT=$(count_rows "agentsmith" "executions" "started_at < NOW() - INTERVAL '${EXECUTIONS_RETENTION_DAYS} days'")
EXEC_DATA_COUNT=$(run_sql "agentsmith" "SELECT COUNT(*) FROM execution_data ed JOIN executions e ON ed.execution_id = e.id WHERE e.started_at < NOW() - INTERVAL '${EXECUTIONS_RETENTION_DAYS} days';" | tr -d ' ')
log "executions eligible: $EXEC_COUNT"
log "execution_data rows eligible: $EXEC_DATA_COUNT"

if [ "$DRY_RUN" = false ] && [ "$EXEC_COUNT" -gt 0 ]; then
    run_sql_stdin "agentsmith" <<-SQL
        BEGIN;

        -- Step 1: Delete child rows first (FK constraint)
        DELETE FROM execution_data
        WHERE execution_id IN (
            SELECT id FROM executions
            WHERE started_at < NOW() - INTERVAL '${EXECUTIONS_RETENTION_DAYS} days'
        );

        -- Step 2: Delete parent rows
        DELETE FROM executions
        WHERE started_at < NOW() - INTERVAL '${EXECUTIONS_RETENTION_DAYS} days';

        COMMIT;
SQL
    log "Deleted $EXEC_DATA_COUNT execution_data rows and $EXEC_COUNT execution rows."
elif [ "$DRY_RUN" = true ]; then
    log "[DRY RUN] Would delete $EXEC_DATA_COUNT execution_data rows and $EXEC_COUNT executions from agentsmith"
else
    log "Nothing to delete."
fi

# ---------------------------------------------------------------------------
# SECTION 4: krya — "UsageLog" (90 days)
# Note: Prisma uses camelCase column names in double quotes
# ---------------------------------------------------------------------------
log_section "KRYA: UsageLog (retain 90 days)"

USAGE_COUNT=$(count_rows "krya" '"UsageLog"' '"createdAt" < NOW() - INTERVAL '"'"'${LOGS_RETENTION_DAYS} days'"'"'')
log "Rows eligible for deletion: $USAGE_COUNT"

if [ "$DRY_RUN" = false ] && [ "$USAGE_COUNT" -gt 0 ]; then
    run_sql_stdin "krya" <<-SQL
        BEGIN;
        DELETE FROM "UsageLog"
        WHERE "createdAt" < NOW() - INTERVAL '${LOGS_RETENTION_DAYS} days';
        COMMIT;
SQL
    log "Deleted $USAGE_COUNT UsageLog rows."
elif [ "$DRY_RUN" = true ]; then
    log "[DRY RUN] Would delete $USAGE_COUNT rows from krya.UsageLog"
else
    log "Nothing to delete."
fi

# ---------------------------------------------------------------------------
# SECTION 5: krya — "Session" (expired > 7 days ago)
# ---------------------------------------------------------------------------
log_section "KRYA: Session (7-day grace after expiry)"

KRYA_SESSION_COUNT=$(count_rows "krya" '"Session"' '"expires" < NOW() - INTERVAL '"'"'${SESSION_KRYA_GRACE_DAYS} days'"'"'')
log "Rows eligible for deletion: $KRYA_SESSION_COUNT"

if [ "$DRY_RUN" = false ] && [ "$KRYA_SESSION_COUNT" -gt 0 ]; then
    run_sql_stdin "krya" <<-SQL
        BEGIN;
        DELETE FROM "Session"
        WHERE "expires" < NOW() - INTERVAL '${SESSION_KRYA_GRACE_DAYS} days';
        COMMIT;
SQL
    log "Deleted $KRYA_SESSION_COUNT Session rows."
elif [ "$DRY_RUN" = true ]; then
    log "[DRY RUN] Would delete $KRYA_SESSION_COUNT rows from krya.Session"
else
    log "Nothing to delete."
fi

# ---------------------------------------------------------------------------
# SECTION 6: krya — "Notification" (90 days)
# ---------------------------------------------------------------------------
log_section "KRYA: Notification (retain 90 days)"

NOTIF_COUNT=$(count_rows "krya" '"Notification"' '"createdAt" < NOW() - INTERVAL '"'"'${LOGS_RETENTION_DAYS} days'"'"'')
log "Rows eligible for deletion: $NOTIF_COUNT"

if [ "$DRY_RUN" = false ] && [ "$NOTIF_COUNT" -gt 0 ]; then
    run_sql_stdin "krya" <<-SQL
        BEGIN;
        DELETE FROM "Notification"
        WHERE "createdAt" < NOW() - INTERVAL '${LOGS_RETENTION_DAYS} days';
        COMMIT;
SQL
    log "Deleted $NOTIF_COUNT Notification rows."
elif [ "$DRY_RUN" = true ]; then
    log "[DRY RUN] Would delete $NOTIF_COUNT rows from krya.Notification"
else
    log "Nothing to delete."
fi

# ---------------------------------------------------------------------------
# SECTION 7: agent_tasks — tasks (90 days)
# ---------------------------------------------------------------------------
log_section "AGENT_TASKS (Cortex): tasks (retain 90 days)"

# Note: the DB is called 'agent_tasks' per init-databases.sh, but some
# docker-compose DATABASE_URLs point to 'raiser'. If tasks aren't found
# in agent_tasks, re-run targeting 'raiser' and update this script.
TASKS_COUNT=$(count_rows "agent_tasks" "tasks" "created_at < NOW() - INTERVAL '${LOGS_RETENTION_DAYS} days'") 2>/dev/null || TASKS_COUNT=0
log "Rows eligible for deletion: $TASKS_COUNT"

if [ "$DRY_RUN" = false ] && [ "$TASKS_COUNT" -gt 0 ] 2>/dev/null; then
    run_sql_stdin "agent_tasks" <<-SQL
        BEGIN;
        DELETE FROM tasks
        WHERE created_at < NOW() - INTERVAL '${LOGS_RETENTION_DAYS} days';
        COMMIT;
SQL
    log "Deleted $TASKS_COUNT task rows."
elif [ "$DRY_RUN" = true ]; then
    log "[DRY RUN] Would delete $TASKS_COUNT rows from agent_tasks.tasks"
else
    log "Nothing to delete."
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
log_section "PURGE COMPLETE"
if [ "$DRY_RUN" = true ]; then
    log "DRY RUN complete. Re-run without --dry-run to apply deletions."
else
    log "Live purge complete. All deletions were committed in transactions."
fi
log "Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo ""

# ---------------------------------------------------------------------------
# ⚠️  CRON NOTE
# ---------------------------------------------------------------------------
# This script has NOT been added to cron. Before scheduling, Alex must:
#   1. Review the retention periods in docs/data-retention-policy.md
#   2. Run --dry-run at least once to verify row counts look sane
#   3. Approve the schedule: 0 3 * * 0  (Sundays 03:00)
#   4. Add to crontab: 0 3 * * 0 cd /path/to/Ultron && ./scripts/purge-old-data.sh >> logs/purge.log 2>&1
