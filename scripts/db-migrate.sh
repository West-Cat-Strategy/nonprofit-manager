#!/bin/bash
# Database Migration Script
# Runs all pending SQL migrations in canonical manifest order.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

has_db_host=false
has_db_port=false
has_db_user=false
has_db_name=false
has_db_password=false

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

if [[ "${DB_NAME+x}" == "x" ]]; then
  has_db_name=true
  inbound_db_name="$DB_NAME"
fi

if [[ "${DB_PASSWORD+x}" == "x" ]]; then
  has_db_password=true
  inbound_db_password="$DB_PASSWORD"
fi

source "$SCRIPT_DIR/lib/common.sh"
source "$SCRIPT_DIR/lib/config.sh"
source "$SCRIPT_DIR/lib/db-at-rest.sh"
source "$SCRIPT_DIR/lib/migration-manifest.sh"

ENV_FILE="$(db_at_rest_env_file "${COMPOSE_ENV_FILE:-}")"

if [[ "$has_db_host" == "true" ]]; then
  DB_HOST="$inbound_db_host"
else
  DB_HOST="$(env_file_value_or_default DB_HOST "$ENV_FILE" "${DB_HOST:-localhost}")"
fi

if [[ "$has_db_port" == "true" ]]; then
  DB_PORT="$inbound_db_port"
else
  DB_PORT="$(env_file_value_or_default DB_PORT "$ENV_FILE" "${DB_PORT:-5432}")"
fi

if [[ "$has_db_user" == "true" ]]; then
  DB_USER="$inbound_db_user"
else
  DB_USER="$(env_file_value_or_default DB_USER "$ENV_FILE" "${DB_USER:-postgres}")"
fi

if [[ "$has_db_name" == "true" ]]; then
  DB_NAME="$inbound_db_name"
else
  DB_NAME="$(env_file_value_or_default DB_NAME "$ENV_FILE" "${DB_NAME:-nonprofit_manager}")"
fi

if [[ "$has_db_password" == "true" ]]; then
  DB_PASSWORD="$inbound_db_password"
else
  DB_PASSWORD="$(env_file_value_or_default DB_PASSWORD "$ENV_FILE" "${DB_PASSWORD:-postgres}")"
fi

usage() {
  cat <<'USAGE'
Usage: ./scripts/db-migrate.sh [--status] [--timing]

Options:
  --status   Show canonical migration status without applying pending migrations
  --timing   Print per-migration timing during application
  --help     Show this help message
USAGE
}

STATUS_ONLY=false
TIMING_ENABLED=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --status)
      STATUS_ONLY=true
      shift
      ;;
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

COMPOSE_MODE="$(normalize_compose_mode "${COMPOSE_MODE:-prod}")"
DB_SERVICE="${DB_SERVICE:-postgres}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-database/migrations}"
export DB_PASSWORD
DB_AUTO_START_RAW="$(printf '%s' "${DB_AUTO_START:-false}" | tr '[:upper:]' '[:lower:]')"

case "$DB_AUTO_START_RAW" in
  1|true|yes|on)
    DB_AUTO_START=true
    ;;
  *)
    DB_AUTO_START=false
    ;;
esac

if [[ "$MIGRATIONS_DIR" != /* ]]; then
  MIGRATIONS_DIR="$PROJECT_ROOT/$MIGRATIONS_DIR"
fi

print_header "Database Migrations"

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  log_error "Migrations directory not found: $MIGRATIONS_DIR"
  exit 1
fi

load_migration_manifest "$MIGRATIONS_DIR"

USE_DIRECT_DB=false
DB_AT_REST_MODE="$(resolve_db_at_rest_mode "$ENV_FILE")"

if ! validate_production_db_at_rest_config "$ENV_FILE"; then
  exit 1
fi

if [[ "${DIRECT_DB_CONNECTION:-0}" == "1" || "$has_db_host" == "true" || "$has_db_port" == "true" || "$DB_AT_REST_MODE" == "managed" ]]; then
  USE_DIRECT_DB=true
elif [[ "$DB_HOST" != "localhost" && "$DB_HOST" != "127.0.0.1" && "$DB_HOST" != "postgres" ]]; then
  USE_DIRECT_DB=true
fi

wait_for_direct_db() {
  local max_attempts="${1:-10}"
  local attempt=1

  if ! command -v psql >/dev/null 2>&1; then
    log_error "psql is required for direct database migrations"
    return 1
  fi

  export PGPASSWORD="$DB_PASSWORD"

  while ((attempt <= max_attempts)); do
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c 'SELECT 1' >/dev/null 2>&1; then
      log_success "Database is ready"
      return 0
    fi

    if ((attempt == max_attempts)); then
      log_error "Database is not reachable at ${DB_HOST}:${DB_PORT}/${DB_NAME}"
      return 1
    fi

    if ((attempt == 1)); then
      log_info "Waiting for database at ${DB_HOST}:${DB_PORT}/${DB_NAME}..."
    fi

    sleep 2
    attempt=$((attempt + 1))
  done
}

if [[ "$USE_DIRECT_DB" == true ]]; then
  wait_for_direct_db 10 || exit 1
else
  if ! check_compose_service_running "$DB_SERVICE" "$COMPOSE_MODE"; then
    if [[ "$DB_AUTO_START" == true ]]; then
      log_info "Starting database service '$DB_SERVICE' (mode: $COMPOSE_MODE)..."
      docker_compose_mode "$COMPOSE_MODE" up -d "$DB_SERVICE"
    else
      exit 1
    fi
  fi

  wait_for_db_service "$DB_SERVICE" "$DB_USER" "$DB_NAME" 10 "$COMPOSE_MODE" || exit 1
fi

run_db_psql() {
  if [[ "$USE_DIRECT_DB" == true ]]; then
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" "$@"
    return $?
  fi

  compose_exec "$COMPOSE_MODE" "$DB_SERVICE" psql -U "$DB_USER" -d "$DB_NAME" "$@"
}

ensure_schema_migrations_bookkeeping() {
  run_db_psql <<SQL >/dev/null
$(emit_schema_migrations_bootstrap_sql)
$(emit_schema_migrations_backfill_sql)
SQL
}

APPLIED_MIGRATION_IDS=()
APPLIED_RECORDED_FILES=()
APPLIED_AT_VALUES=()
PENDING_MIGRATION_IDS=()
PENDING_CANONICAL_FILES=()

find_applied_index_by_id() {
  local target="$1"
  local i

  for ((i = 0; i < ${#APPLIED_MIGRATION_IDS[@]}; i++)); do
    if [[ "${APPLIED_MIGRATION_IDS[$i]}" == "$target" ]]; then
      printf '%s' "$i"
      return 0
    fi
  done

  return 1
}

refresh_migration_status() {
  local raw_rows=""
  local line=""
  local filename=""
  local migration_id=""
  local canonical_filename=""
  local applied_at=""
  local manifest_index=""
  local resolved_id=""
  local applied_index=""
  local i

  APPLIED_MIGRATION_IDS=()
  APPLIED_RECORDED_FILES=()
  APPLIED_AT_VALUES=()
  PENDING_MIGRATION_IDS=()
  PENDING_CANONICAL_FILES=()

  raw_rows="$(
    run_db_psql -F $'\t' -A -t -c \
      "SELECT filename, COALESCE(migration_id, ''), COALESCE(canonical_filename, ''), COALESCE(applied_at::text, '') FROM schema_migrations ORDER BY applied_at NULLS LAST, id;" \
      2>/dev/null || true
  )"
  raw_rows="$(printf '%s' "$raw_rows" | tr -d '\r')"

  if [[ -n "$raw_rows" ]]; then
    while IFS=$'\t' read -r filename migration_id canonical_filename applied_at; do
      [[ -z "${filename}${migration_id}${canonical_filename}${applied_at}" ]] && continue
      resolved_id=""

      if [[ -n "$migration_id" ]]; then
        manifest_index="$(find_manifest_index_by_id "$migration_id" || true)"
        if [[ -n "$manifest_index" ]]; then
          resolved_id="${MIGRATION_IDS[$manifest_index]}"
        fi
      fi

      if [[ -z "$resolved_id" && -n "$filename" ]]; then
        manifest_index="$(find_manifest_index_by_known_filename "$filename" || true)"
        if [[ -n "$manifest_index" ]]; then
          resolved_id="${MIGRATION_IDS[$manifest_index]}"
        fi
      fi

      if [[ -z "$resolved_id" && -n "$canonical_filename" ]]; then
        manifest_index="$(find_manifest_index_by_known_filename "$canonical_filename" || true)"
        if [[ -n "$manifest_index" ]]; then
          resolved_id="${MIGRATION_IDS[$manifest_index]}"
        fi
      fi

      if [[ -z "$resolved_id" ]]; then
        continue
      fi

      applied_index="$(find_applied_index_by_id "$resolved_id" || true)"
      if [[ -z "$applied_index" ]]; then
        APPLIED_MIGRATION_IDS+=("$resolved_id")
        APPLIED_RECORDED_FILES+=("$filename")
        APPLIED_AT_VALUES+=("$applied_at")
      fi
    done <<< "$raw_rows"
  fi

  for ((i = 0; i < ${#MIGRATION_IDS[@]}; i++)); do
    if ! find_applied_index_by_id "${MIGRATION_IDS[$i]}" >/dev/null 2>&1; then
      PENDING_MIGRATION_IDS+=("${MIGRATION_IDS[$i]}")
      PENDING_CANONICAL_FILES+=("${MIGRATION_CANONICAL_FILES[$i]}")
    fi
  done
}

print_status_table() {
  local i
  local migration_id=""
  local canonical_filename=""
  local applied_index=""
  local status=""
  local recorded_as=""
  local applied_at=""

  printf '%-8s %-8s %-48s %-48s %s\n' "ID" "STATUS" "CANONICAL FILE" "RECORDED AS" "APPLIED AT"
  for ((i = 0; i < ${#MIGRATION_IDS[@]}; i++)); do
    migration_id="${MIGRATION_IDS[$i]}"
    canonical_filename="${MIGRATION_CANONICAL_FILES[$i]}"
    applied_index="$(find_applied_index_by_id "$migration_id" || true)"

    if [[ -n "$applied_index" ]]; then
      status="APPLIED"
      recorded_as="${APPLIED_RECORDED_FILES[$applied_index]}"
      applied_at="${APPLIED_AT_VALUES[$applied_index]}"
    else
      status="PENDING"
      recorded_as="-"
      applied_at="-"
    fi

    printf '%-8s %-8s %-48s %-48s %s\n' \
      "$migration_id" \
      "$status" \
      "$canonical_filename" \
      "${recorded_as:--}" \
      "${applied_at:--}"
  done

  echo ""
  log_info "Applied migrations: ${#APPLIED_MIGRATION_IDS[@]}"
  log_info "Pending migrations: ${#PENDING_MIGRATION_IDS[@]}"
}

log_info "Ensuring migrations table exists..."
ensure_schema_migrations_bookkeeping
refresh_migration_status

if [[ "$STATUS_ONLY" == true ]]; then
  print_status_table
  print_footer "Migration status complete"
  exit 0
fi

if [[ ${#PENDING_MIGRATION_IDS[@]} -eq 0 ]]; then
  log_success "No pending migrations"
  print_footer "Migration check complete"
  exit 0
fi

log_info "Found ${#PENDING_MIGRATION_IDS[@]} pending migration(s)"
echo ""

APPLIED_COUNT=0
FAILED=false
TOTAL_START_MS="$(current_time_millis)"
TIMING_LINES=()

for ((i = 0; i < ${#PENDING_MIGRATION_IDS[@]}; i++)); do
  migration_id="${PENDING_MIGRATION_IDS[$i]}"
  canonical_filename="${PENDING_CANONICAL_FILES[$i]}"
  migration_path="$MIGRATIONS_DIR/$canonical_filename"
  checksum="$(calculate_file_checksum "$migration_path")"

  log_info "Applying: ${migration_id} (${canonical_filename})"
  start_ms="$(current_time_millis)"

  if run_db_psql -v ON_ERROR_STOP=1 < "$migration_path"; then
    run_db_psql <<SQL >/dev/null
$(emit_schema_migration_record_sql "$migration_id" "$canonical_filename" "$checksum")
SQL
    end_ms="$(current_time_millis)"

    if [[ "$TIMING_ENABLED" == true ]]; then
      duration="$(format_duration_millis "$start_ms" "$end_ms")"
      TIMING_LINES+=("${migration_id} ${canonical_filename} ${duration}")
      log_info "Timing: ${migration_id} ${duration}"
    fi

    log_success "Applied: ${canonical_filename}"
    APPLIED_COUNT=$((APPLIED_COUNT + 1))
  else
    log_error "Failed to apply: ${canonical_filename}"
    FAILED=true
    break
  fi
done

echo ""
echo "========================================"
if [[ "$FAILED" == true ]]; then
  log_error "Migration failed!"
  echo "Applied $APPLIED_COUNT of ${#PENDING_MIGRATION_IDS[@]} migrations before failure"
  exit 1
fi

if [[ "$TIMING_ENABLED" == true ]]; then
  TOTAL_END_MS="$(current_time_millis)"
  for timing_line in "${TIMING_LINES[@]}"; do
    echo "$timing_line"
  done
  log_info "Total duration: $(format_duration_millis "$TOTAL_START_MS" "$TOTAL_END_MS")"
fi

log_success "Applied $APPLIED_COUNT migration(s)"
echo "========================================"
