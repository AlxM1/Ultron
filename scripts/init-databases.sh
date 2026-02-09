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

log "All databases initialised successfully."
