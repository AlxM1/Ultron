#!/usr/bin/env bash
# =============================================================================
# init-databases.sh — Create all databases and roles for the 00raiser stack
# =============================================================================
# Mounted into the postgres container at:
#   /docker-entrypoint-initdb.d/init-databases.sh
# Postgres runs this automatically on first start (empty data volume).
#
# The superuser credentials come from POSTGRES_USER / POSTGRES_PASSWORD
# which are already set by the postgres container entrypoint.
# Per-service passwords are injected via environment variables.
# =============================================================================
set -euo pipefail

log() { echo "[init-databases] $*"; }

# ---------------------------------------------------------------------------
# Helper: create role + database, grant privileges
# ---------------------------------------------------------------------------
create_db_and_user() {
    local db="$1"
    local user="$2"
    local password="$3"

    log "Creating role '$user' and database '$db'..."

    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-SQL
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${user}') THEN
                CREATE ROLE ${user} WITH LOGIN PASSWORD '${password}';
            END IF;
        END
        \$\$;

        SELECT 'CREATE DATABASE ${db} OWNER ${user}'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${db}')\gexec

        GRANT ALL PRIVILEGES ON DATABASE ${db} TO ${user};
SQL

    # Grant schema privileges (required for PostgreSQL 15+)
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$db" <<-SQL
        GRANT ALL ON SCHEMA public TO ${user};
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${user};
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${user};
SQL

    log "  -> database '$db' ready."
}

# ---------------------------------------------------------------------------
# Create databases for every service
# ---------------------------------------------------------------------------

create_db_and_user \
    "authentik" \
    "authentik" \
    "${AUTHENTIK_DB_PASSWORD:?AUTHENTIK_DB_PASSWORD is required}"

create_db_and_user \
    "agentsmith" \
    "agentsmith" \
    "${AGENTSMITH_DB_PASSWORD:?AGENTSMITH_DB_PASSWORD is required}"

create_db_and_user \
    "krya" \
    "krya" \
    "${KRYA_DB_PASSWORD:?KRYA_DB_PASSWORD is required}"

create_db_and_user \
    "voiceforge" \
    "voiceforge" \
    "${VOICEFORGE_DB_PASSWORD:?VOICEFORGE_DB_PASSWORD is required}"

create_db_and_user \
    "youtubedl" \
    "youtubedl" \
    "${YOUTUBEDL_DB_PASSWORD:?YOUTUBEDL_DB_PASSWORD is required}"

create_db_and_user \
    "newsletter_pipeline" \
    "nvp" \
    "${NVP_DB_PASSWORD:?NVP_DB_PASSWORD is required}"

create_db_and_user \
    "scraper" \
    "scraper" \
    "${SCRAPER_DB_PASSWORD:?SCRAPER_DB_PASSWORD is required}"

create_db_and_user \
    "affine" \
    "affine" \
    "${AFFINE_DB_PASSWORD:?AFFINE_DB_PASSWORD is required}"

create_db_and_user \
    "agent_tasks" \
    "agent_bridge" \
    "${CORTEX_DB_PASSWORD:?CORTEX_DB_PASSWORD is required}"

create_db_and_user \
    "content_intel" \
    "content_intel" \
    "${CONTENT_INTEL_DB_PASSWORD:?CONTENT_INTEL_DB_PASSWORD is required}"

create_db_and_user \
    "outline" \
    "outline" \
    "${OUTLINE_DB_PASSWORD:?OUTLINE_DB_PASSWORD is required}"

# --- SEOh Pipeline Services (Phase 1-3) ---

create_db_and_user \
    "twenty" \
    "twenty" \
    "${TWENTY_DB_PASSWORD:?TWENTY_DB_PASSWORD is required}"

create_db_and_user \
    "umami" \
    "umami" \
    "${UMAMI_DB_PASSWORD:?UMAMI_DB_PASSWORD is required}"

create_db_and_user \
    "postiz" \
    "postiz" \
    "${POSTIZ_DB_PASSWORD:?POSTIZ_DB_PASSWORD is required}"

create_db_and_user \
    "gitea" \
    "gitea" \
    "${GITEA_DB_PASSWORD:?GITEA_DB_PASSWORD is required}"

create_db_and_user \
    "calcom" \
    "calcom" \
    "${CALCOM_DB_PASSWORD:?CALCOM_DB_PASSWORD is required}"

create_db_and_user \
    "listmonk" \
    "listmonk" \
    "${LISTMONK_DB_PASSWORD:?LISTMONK_DB_PASSWORD is required}"

create_db_and_user \
    "teable" \
    "teable" \
    "${TEABLE_DB_PASSWORD:?TEABLE_DB_PASSWORD is required}"

create_db_and_user \
    "dify" \
    "dify" \
    "${DIFY_DB_PASSWORD:?DIFY_DB_PASSWORD is required}"

log "All databases initialised successfully."

# ---------------------------------------------------------------------------
# Run SQL migrations from the migrations directory
# Files are executed in sorted (alphabetical) order so date-prefixed names
# like 2026-02-22-fixes.sql apply in the correct sequence.
# Each migration file may use \connect to target specific databases.
# This block is idempotent: all migration SQL uses IF NOT EXISTS / DO guards.
# ---------------------------------------------------------------------------
run_migrations() {
    local migrations_dir="/docker-entrypoint-initdb.d/migrations"

    if [ ! -d "$migrations_dir" ]; then
        log "Migrations directory not found at $migrations_dir — skipping migration step."
        log "  (Mount ./migrations:/docker-entrypoint-initdb.d/migrations:ro in docker-compose.yml to enable.)"
        return 0
    fi

    # Collect .sql files sorted by name (POSIX sort = alphabetical = date order)
    local found=0
    for migration in $(find "$migrations_dir" -maxdepth 1 -name "*.sql" | sort); do
        found=1
        log "Applying migration: $(basename "$migration") ..."
        psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
            -f "$migration"
        log "  -> $(basename "$migration") applied."
    done

    if [ "$found" -eq 0 ]; then
        log "No .sql migration files found in $migrations_dir — nothing to do."
    else
        log "All migrations applied successfully."
    fi
}

run_migrations
