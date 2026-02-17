#!/usr/bin/env bash
set -euo pipefail

# Load common utilities and configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
source "$SCRIPT_DIR/lib/config.sh"

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
