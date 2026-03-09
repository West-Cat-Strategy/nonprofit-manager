#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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
source "$SCRIPT_DIR/lib/migration-manifest.sh"

if [[ "$has_db_name" == "true" ]]; then
  DB_NAME="$inbound_db_name"
else
  DB_NAME="${DB_VERIFY_NAME:-nonprofit_manager_test}"
fi

if [[ "$has_db_host" == "true" ]]; then
  DB_HOST="$inbound_db_host"
else
  DB_HOST="${DB_VERIFY_HOST:-localhost}"
fi

if [[ "$has_db_port" == "true" ]]; then
  DB_PORT="$inbound_db_port"
else
  DB_PORT="${DB_VERIFY_PORT:-8012}"
fi

if [[ "$has_db_user" == "true" ]]; then
  DB_USER="$inbound_db_user"
else
  DB_USER="${DB_VERIFY_USER:-postgres}"
fi

if [[ "$has_db_password" == "true" ]]; then
  DB_PASSWORD="$inbound_db_password"
else
  DB_PASSWORD="${DB_VERIFY_PASSWORD:-postgres}"
fi

usage() {
  cat <<'USAGE'
Usage: ./scripts/verify-migrations.sh [--timing]

Options:
  --timing   Print per-migration timing during verification replay
  --help     Show this help message
USAGE
}

TIMING_ENABLED=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --timing)
      TIMING_ENABLED=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      log_error "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if ! command -v psql >/dev/null 2>&1; then
  log_error "psql is required for migration verification"
  exit 1
fi

: "${DB_NAME:?DB_NAME is required}"

if [[ "${DB_NAME}" != *_test ]]; then
  log_error "Refusing to run migrations unless DB_NAME ends with _test"
  exit 1
fi

if [[ "$MIGRATIONS_DIR" != /* ]]; then
  MIGRATIONS_DIR="$PROJECT_ROOT/$MIGRATIONS_DIR"
fi

load_migration_manifest "$MIGRATIONS_DIR"

export PGHOST="${DB_HOST:-localhost}"
export PGPORT="${DB_PORT:-5432}"
export PGUSER="${DB_USER:-postgres}"
export PGPASSWORD="${DB_PASSWORD:-}"

ensure_verify_database() {
  local target_db="$1"
  local exists

  exists="$(
    PGDATABASE=postgres psql -v ON_ERROR_STOP=1 -tA -c \
      "SELECT 1 FROM pg_database WHERE datname = '$target_db';" 2>/dev/null || true
  )"

  if [[ "$exists" == "1" ]]; then
    return
  fi

  log_info "Creating verification database ${target_db}"
  PGDATABASE=postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$target_db\";" >/dev/null
}

ensure_verify_database "$DB_NAME"
export PGDATABASE="${DB_NAME}"

log_info "Verifying migrations against ${PGDATABASE}"

psql -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO CURRENT_USER;
GRANT ALL ON SCHEMA public TO PUBLIC;
SQL

psql -v ON_ERROR_STOP=1 <<SQL >/dev/null
$(emit_schema_migrations_bootstrap_sql)
SQL

TOTAL_START_MS="$(current_time_millis)"
TIMING_LINES=()

for ((i = 0; i < ${#MIGRATION_IDS[@]}; i++)); do
  migration_id="${MIGRATION_IDS[$i]}"
  canonical_filename="${MIGRATION_CANONICAL_FILES[$i]}"
  migration_path="$MIGRATIONS_DIR/$canonical_filename"
  checksum="$(calculate_file_checksum "$migration_path")"

  log_info "Applying ${migration_id} (${canonical_filename})"
  start_ms="$(current_time_millis)"

  psql -v ON_ERROR_STOP=1 -f "$migration_path" >/dev/null

  psql -v ON_ERROR_STOP=1 <<SQL >/dev/null
$(emit_schema_migration_record_sql "$migration_id" "$canonical_filename" "$checksum")
SQL

  if [[ "$TIMING_ENABLED" == true ]]; then
    end_ms="$(current_time_millis)"
    duration="$(format_duration_millis "$start_ms" "$end_ms")"
    TIMING_LINES+=("${migration_id} ${canonical_filename} ${duration}")
    log_info "Timing: ${migration_id} ${duration}"
  fi
done

if [[ "$TIMING_ENABLED" == true ]]; then
  TOTAL_END_MS="$(current_time_millis)"
  for timing_line in "${TIMING_LINES[@]}"; do
    echo "$timing_line"
  done
  log_info "Total duration: $(format_duration_millis "$TOTAL_START_MS" "$TOTAL_END_MS")"
fi

log_success "Migration verification complete"
