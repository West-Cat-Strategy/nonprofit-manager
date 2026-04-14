#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

CALLER_SET_DB_HOST="${DB_HOST+x}"
CALLER_SET_DB_PORT="${DB_PORT+x}"
CALLER_SET_DB_NAME="${DB_NAME+x}"
CALLER_SET_DB_USER="${DB_USER+x}"
CALLER_SET_DB_PASSWORD="${DB_PASSWORD+x}"
MODE="${COMPOSE_MODE:-dev}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-8002}"
DB_NAME="${DB_NAME:-nonprofit_manager}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
TEST_CONTAINER_NAME="${DB_TEST_CONTAINER_NAME:-nonprofit-manager-test-postgres}"
TEST_VOLUME_NAME="${DB_TEST_VOLUME_NAME:-nonprofit-manager-test-postgres-data}"
TEST_IMAGE="${DB_TEST_IMAGE:-postgres:14-alpine}"
STATUS_ONLY=0
DEV_COMPOSE_PROJECT="${COMPOSE_PROJECT_DEV}"
DEV_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.dev.yml"

dev_compose() {
  compose_with_project_files "$DEV_COMPOSE_PROJECT" "$DEV_COMPOSE_FILE" -- "$@"
}

if [[ "${1:-}" == "--status" ]]; then
  STATUS_ONLY=1
fi

is_test_db() {
  [[ "$DB_PORT" == "8012" || "$DB_NAME" == "nonprofit_manager_test" || "$MODE" == "ci" ]]
}

normalize_test_db_contract() {
  if ! is_test_db; then
    return 0
  fi

  if [[ "$CALLER_SET_DB_HOST" == "x" && "$CALLER_SET_DB_PORT" == "x" && "$CALLER_SET_DB_NAME" == "x" && "$CALLER_SET_DB_USER" == "x" && "$CALLER_SET_DB_PASSWORD" == "x" ]]; then
    return 0
  fi

  DB_HOST="127.0.0.1"
  DB_PORT="8012"
  DB_NAME="nonprofit_manager_test"
  DB_USER="postgres"
  DB_PASSWORD="postgres"
}

wait_for_schema_migrations() {
  local container="$1"
  local attempt=1
  local max_attempts=60

  while true; do
    if docker exec "$container" psql -U "$DB_USER" -d "$DB_NAME" -Atqc 'SELECT 1 FROM schema_migrations LIMIT 1;' >/dev/null 2>&1; then
      return 0
    fi

    if [[ "$attempt" -ge "$max_attempts" ]]; then
      log_error "Timed out waiting for PostgreSQL migrations in $container on port $DB_PORT."
      docker logs "$container" --tail 100 >&2 || true
      return 1
    fi

    sleep 2
    attempt=$((attempt + 1))
  done
}

wait_for_host_connection() {
  local host="$1"
  local port="$2"
  local attempt=1
  local max_attempts=30

  while true; do
    if PGPASSWORD="$DB_PASSWORD" psql -h "$host" -p "$port" -U "$DB_USER" -d "$DB_NAME" -Atqc 'SELECT 1;' >/dev/null 2>&1; then
      return 0
    fi

    if [[ "$attempt" -ge "$max_attempts" ]]; then
      log_error "Timed out waiting for PostgreSQL to accept host connections on $host:$port."
      return 1
    fi

    sleep 1
    attempt=$((attempt + 1))
  done
}

ensure_dev_database() {
  local container_id
  container_id="$(dev_compose ps -q postgres 2>/dev/null || true)"

  if [[ -z "$container_id" ]]; then
    log_info "Starting Docker development database services..."
    dev_compose up -d postgres redis
    container_id="$(dev_compose ps -q postgres 2>/dev/null || true)"
  fi

  if [[ -z "$container_id" ]]; then
    log_error "Unable to locate the development postgres container. Run 'make dev' first."
    return 1
  fi

  wait_for_schema_migrations "$container_id"
  wait_for_host_connection "127.0.0.1" "$DB_PORT"
  log_success "Development database is available on localhost:${DB_PORT}."
}

ensure_test_database() {
  local attempt=1
  local max_attempts=5
  local run_log

  while [[ "$attempt" -le "$max_attempts" ]]; do
    log_info "Rebuilding the isolated test database on ${DB_HOST}:${DB_PORT}/${DB_NAME} (attempt ${attempt}/${max_attempts})..."
    docker rm -f "$TEST_CONTAINER_NAME" >/dev/null 2>&1 || true
    docker volume rm "$TEST_VOLUME_NAME" >/dev/null 2>&1 || true

    run_log="$(mktemp)"
    if docker run -d \
      --name "$TEST_CONTAINER_NAME" \
      -p "127.0.0.1:${DB_PORT}:5432" \
      -e POSTGRES_DB="$DB_NAME" \
      -e POSTGRES_USER="$DB_USER" \
      -e POSTGRES_PASSWORD="$DB_PASSWORD" \
      -v "$TEST_VOLUME_NAME:/var/lib/postgresql/data" \
      -v "$PROJECT_ROOT/database/initdb/000_init.sql:/docker-entrypoint-initdb.d/000_init.sql:ro" \
      -v "$PROJECT_ROOT/database/migrations:/migrations:ro" \
      -v "$PROJECT_ROOT/database/seeds:/seeds:ro" \
      "$TEST_IMAGE" >"$run_log" 2>&1; then
      rm -f "$run_log"
      wait_for_schema_migrations "$TEST_CONTAINER_NAME"
      wait_for_host_connection "$DB_HOST" "$DB_PORT"
      log_success "Isolated test database is ready on ${DB_HOST}:${DB_PORT}/${DB_NAME}."
      return 0
    fi

    if grep -qi 'port is already allocated' "$run_log" && [[ "$attempt" -lt "$max_attempts" ]]; then
      log_warn "Test database port ${DB_PORT} is still releasing; retrying shortly."
      rm -f "$run_log"
      sleep 2
      attempt=$((attempt + 1))
      continue
    fi

    log_error "Unable to start the isolated Playwright test database."
    cat "$run_log" >&2 || true
    rm -f "$run_log"
    return 1
  done

  log_error "Failed to start the isolated Playwright test database after ${max_attempts} attempts."
  return 1
}

normalize_test_db_contract

show_status() {
  if is_test_db; then
    if docker ps --filter "name=^/${TEST_CONTAINER_NAME}$" --format '{{.ID}}' | grep -q .; then
      log_info "Test database container $TEST_CONTAINER_NAME is running."
      docker exec "$TEST_CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -Atqc 'SELECT COUNT(*) FROM schema_migrations;' || true
    else
      log_warn "Test database container $TEST_CONTAINER_NAME is not running."
      return 1
    fi
    return 0
  fi

  local container_id
  container_id="$(dev_compose ps -q postgres 2>/dev/null || true)"
  if [[ -z "$container_id" ]]; then
    log_warn "Development postgres service is not running."
    return 1
  fi

  log_info "Development postgres service is running."
  docker exec "$container_id" psql -U postgres -d nonprofit_manager -Atqc 'SELECT COUNT(*) FROM schema_migrations;' || true
}

main() {
  if [[ "$STATUS_ONLY" -eq 1 ]]; then
    show_status
    return $?
  fi

  if is_test_db; then
    ensure_test_database
    return $?
  fi

  ensure_dev_database
}

main "$@"
