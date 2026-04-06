#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CALLER_SET_DB_HOST="${DB_HOST+x}"
CALLER_SET_DB_PORT="${DB_PORT+x}"
CALLER_SET_DB_NAME="${DB_NAME+x}"
CALLER_SET_DB_USER="${DB_USER+x}"
CALLER_SET_DB_PASSWORD="${DB_PASSWORD+x}"

resolve_test_db_contract() {
  local use_caller_contract=0

  if [[ "$CALLER_SET_DB_HOST" == "x" && "$CALLER_SET_DB_PORT" == "x" && "$CALLER_SET_DB_NAME" == "x" && "$CALLER_SET_DB_USER" == "x" && "$CALLER_SET_DB_PASSWORD" == "x" ]]; then
    use_caller_contract=1
  fi

  export DB_HOST="${DB_HOST:-127.0.0.1}"
  export DB_PORT="${DB_PORT:-8012}"
  export DB_NAME="${DB_NAME:-nonprofit_manager_test}"
  export DB_USER="${DB_USER:-postgres}"
  export DB_PASSWORD="${DB_PASSWORD:-postgres}"

  if [[ "$use_caller_contract" != "1" ]]; then
    export DB_HOST="127.0.0.1"
    export DB_PORT="8012"
    export DB_NAME="nonprofit_manager_test"
    export DB_USER="postgres"
    export DB_PASSWORD="postgres"
  fi
}

assert_test_db_contract() {
  echo "Using full-test DB contract: ${DB_HOST}:${DB_PORT}/${DB_NAME}"

  if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -Atqc 'SELECT 1;' >/dev/null 2>&1; then
    echo "Full-test DB contract check failed for ${DB_HOST}:${DB_PORT}/${DB_NAME}." >&2
    exit 1
  fi
}

if [[ "${SKIP_INTEGRATION_DB_PREP:-0}" != "1" ]]; then
  resolve_test_db_contract
  export COMPOSE_MODE="${COMPOSE_MODE:-ci}"
  export COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-.env.development}"
  export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-${CI_COMPOSE_PROJECT_NAME:-nonprofit-ci}}"
  export COMPOSE_FILES="${COMPOSE_FILES:-$REPO_ROOT/docker-compose.yml $REPO_ROOT/docker-compose.host-access.yml $REPO_ROOT/docker-compose.ci.yml}"

  if command -v docker >/dev/null 2>&1 && [[ "$DB_HOST" =~ ^(localhost|127\.0\.0\.1|::1)$ ]]; then
    existing_postgres_container="$(
      docker ps --filter "publish=${DB_PORT}" --format '{{.ID}}' | head -n 1
    )"

    if [[ -n "$existing_postgres_container" ]]; then
      detected_service="$(
        docker inspect -f '{{ index .Config.Labels "com.docker.compose.service" }}' "$existing_postgres_container" 2>/dev/null || true
      )"
      detected_project="$(
        docker inspect -f '{{ index .Config.Labels "com.docker.compose.project" }}' "$existing_postgres_container" 2>/dev/null || true
      )"

      if [[ "$detected_service" == "postgres" && -n "$detected_project" ]]; then
        export COMPOSE_PROJECT_NAME="$detected_project"
      fi
    fi
  fi

  (
    cd "$REPO_ROOT"
    env \
      -u DB_HOST \
      -u DB_PORT \
      -u DB_NAME \
      -u DB_USER \
      -u DB_PASSWORD \
      DB_HOST="$DB_HOST" \
      DB_PORT="$DB_PORT" \
      DB_NAME="$DB_NAME" \
      DB_USER="$DB_USER" \
      DB_PASSWORD="$DB_PASSWORD" \
      DB_AUTO_START=true \
      DIRECT_DB_CONNECTION=1 \
      "$REPO_ROOT/scripts/db-migrate.sh"
  )
fi

resolve_test_db_contract
assert_test_db_contract

if [[ "$#" -eq 0 ]]; then
  exec npx jest --forceExit --runInBand
fi

exec npx jest --forceExit --runInBand "$@"
