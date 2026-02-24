#!/usr/bin/env bash
set -euo pipefail

# Load common utilities and configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Preserve caller-provided DB env vars before config defaults are sourced.
has_db_name=false
has_db_host=false
has_db_port=false
has_db_user=false
has_db_password=false

if [[ "${DB_NAME+x}" == "x" ]]; then
  has_db_name=true
  inbound_db_name="$DB_NAME"
fi

if [[ "${DB_HOST+x}" == "x" ]]; then
  has_db_host=true
  inbound_db_host="$DB_HOST"
fi

if [[ "${DB_PORT+x}" == "x" ]]; then
  has_db_port=true
  inbound_db_port="$DB_PORT"
fi

if [[ "${DB_USER+x}" == "x" ]]; then
  has_db_user=true
  inbound_db_user="$DB_USER"
fi

if [[ "${DB_PASSWORD+x}" == "x" ]]; then
  has_db_password=true
  inbound_db_password="$DB_PASSWORD"
fi

source "$SCRIPT_DIR/lib/common.sh"
source "$SCRIPT_DIR/lib/config.sh"

# Reapply caller-provided DB env vars so explicit overrides win over defaults.
if [[ "$has_db_name" == "true" ]]; then
  DB_NAME="$inbound_db_name"
fi

if [[ "$has_db_host" == "true" ]]; then
  DB_HOST="$inbound_db_host"
fi

if [[ "$has_db_port" == "true" ]]; then
  DB_PORT="$inbound_db_port"
fi

if [[ "$has_db_user" == "true" ]]; then
  DB_USER="$inbound_db_user"
fi

if [[ "$has_db_password" == "true" ]]; then
  DB_PASSWORD="$inbound_db_password"
fi

if ! command -v psql >/dev/null 2>&1; then
  log_error "psql is required for migration verification"
  exit 1
fi

: "${DB_NAME:?DB_NAME is required}"

shopt -s nullglob

if [[ "${DB_NAME}" != *_test ]]; then
  log_error "Refusing to run migrations unless DB_NAME ends with _test"
  exit 1
fi

export PGHOST="${DB_HOST:-localhost}"
export PGPORT="${DB_PORT:-5432}"
export PGDATABASE="${DB_NAME}"
export PGUSER="${DB_USER:-postgres}"
export PGPASSWORD="${DB_PASSWORD:-}"

migrations=("${SCRIPT_DIR}/../database/migrations"/*.sql)

if [[ ${#migrations[@]} -eq 0 ]]; then
  log_error "No migration files found in database/migrations"
  exit 1
fi

log_info "Verifying migrations against ${PGDATABASE}"

for file in "${migrations[@]}"; do
  log_info "Applying ${file##*/}"
  psql -v ON_ERROR_STOP=1 -f "$file" >/dev/null
done

log_success "Migration verification complete"
