#!/usr/bin/env bash
# =============================================================================
# backup.sh — Daily backup for PostgreSQL, Redis, and media volumes
# =============================================================================
# Usage:
#   ./scripts/backup.sh              # run manually
#   0 3 * * * /path/to/backup.sh     # cron: every day at 03:00
#
# Backups are written to $BACKUP_DIR (default: ./backups/<date>/).
# Old backups beyond $RETENTION_DAYS are pruned automatically.
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_PROJECT="${COMPOSE_PROJECT_NAME:-raiser}"
BACKUP_ROOT="${BACKUP_DIR:-${PROJECT_DIR}/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

DATE="$(date +%Y%m%d-%H%M%S)"
DEST="${BACKUP_ROOT}/${DATE}"

# Postgres container name
PG_CONTAINER="${COMPOSE_PROJECT}-postgres-1"
# Redis container name
REDIS_CONTAINER="${COMPOSE_PROJECT}-redis-1"

# Databases to back up (must match init-databases.sh)
DATABASES=(authentik agentsmith krya voiceforge youtubedl newsletter_pipeline)

# Volume directories to back up (relative to project root)
MEDIA_DIRS=(downloads uploads output data)

log()  { echo "[backup $(date +%H:%M:%S)] $*"; }
fail() { log "ERROR: $*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
command -v docker >/dev/null 2>&1 || fail "docker not found in PATH"

docker inspect "$PG_CONTAINER" &>/dev/null || fail "Postgres container '$PG_CONTAINER' is not running"

mkdir -p "$DEST"
log "Backup destination: $DEST"

# ---------------------------------------------------------------------------
# 1. PostgreSQL — per-database pg_dump (custom format for pg_restore)
# ---------------------------------------------------------------------------
log "=== PostgreSQL backups ==="
PG_DEST="${DEST}/postgres"
mkdir -p "$PG_DEST"

for db in "${DATABASES[@]}"; do
    log "  Dumping database: $db"
    docker exec "$PG_CONTAINER" \
        pg_dump -U postgres -Fc --clean --if-exists "$db" \
        > "${PG_DEST}/${db}.dump" 2>/dev/null \
        && log "    -> ${db}.dump OK" \
        || log "    -> ${db}.dump FAILED (database may not exist yet)"
done

# Also dump the full cluster roles (for disaster recovery)
log "  Dumping global roles..."
docker exec "$PG_CONTAINER" \
    pg_dumpall -U postgres --roles-only \
    > "${PG_DEST}/roles.sql" 2>/dev/null \
    && log "    -> roles.sql OK"

# ---------------------------------------------------------------------------
# 2. Redis — RDB snapshot
# ---------------------------------------------------------------------------
log "=== Redis backup ==="
REDIS_DEST="${DEST}/redis"
mkdir -p "$REDIS_DEST"

REDIS_PW="${REDIS_PASSWORD:-}"
AUTH_FLAG=""
if [ -n "$REDIS_PW" ]; then
    AUTH_FLAG="-a ${REDIS_PW}"
fi

# Trigger a BGSAVE and wait for it to complete
docker exec "$REDIS_CONTAINER" \
    redis-cli $AUTH_FLAG BGSAVE >/dev/null 2>&1 || true
sleep 2

# Copy the RDB file out
docker cp "${REDIS_CONTAINER}:/data/dump.rdb" "${REDIS_DEST}/dump.rdb" 2>/dev/null \
    && log "  -> dump.rdb OK" \
    || log "  -> dump.rdb FAILED (no RDB file yet)"

# Also grab the AOF if appendonly is enabled
docker cp "${REDIS_CONTAINER}:/data/appendonlydir" "${REDIS_DEST}/appendonlydir" 2>/dev/null \
    && log "  -> appendonlydir OK" \
    || true

# ---------------------------------------------------------------------------
# 3. Media volumes — tar archives
# ---------------------------------------------------------------------------
log "=== Media volume backups ==="
MEDIA_DEST="${DEST}/media"
mkdir -p "$MEDIA_DEST"

for dir in "${MEDIA_DIRS[@]}"; do
    SRC="${PROJECT_DIR}/${dir}"
    if [ -d "$SRC" ]; then
        log "  Archiving: ${dir}/"
        tar -czf "${MEDIA_DEST}/${dir}.tar.gz" -C "$PROJECT_DIR" "$dir" 2>/dev/null \
            && log "    -> ${dir}.tar.gz OK" \
            || log "    -> ${dir}.tar.gz FAILED"
    else
        log "  Skipping ${dir}/ (not found)"
    fi
done

# ---------------------------------------------------------------------------
# 4. Prune old backups
# ---------------------------------------------------------------------------
log "=== Pruning backups older than ${RETENTION_DAYS} days ==="
find "$BACKUP_ROOT" -maxdepth 1 -mindepth 1 -type d -mtime "+${RETENTION_DAYS}" -print0 \
    | while IFS= read -r -d '' old; do
        log "  Removing: $(basename "$old")"
        rm -rf "$old"
    done

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
TOTAL_SIZE="$(du -sh "$DEST" | cut -f1)"
log "=== Backup complete: ${DEST} (${TOTAL_SIZE}) ==="
