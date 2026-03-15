#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CALLER_SET_DB_HOST="${DB_HOST+x}"
CALLER_SET_DB_PORT="${DB_PORT+x}"
CALLER_SET_DIRECT_DB_CONNECTION="${DIRECT_DB_CONNECTION+x}"

if [[ "${SKIP_INTEGRATION_DB_PREP:-0}" != "1" ]]; then
  export DB_HOST="${DB_HOST:-localhost}"
  export DB_PORT="${DB_PORT:-8012}"
  export DB_NAME="${DB_NAME:-nonprofit_manager}"
  export DB_USER="${DB_USER:-postgres}"
  export DB_PASSWORD="${DB_PASSWORD:-postgres}"
  export COMPOSE_MODE="${COMPOSE_MODE:-ci}"
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
    if [[ "$CALLER_SET_DB_HOST" != "x" && "$CALLER_SET_DB_PORT" != "x" && "$CALLER_SET_DIRECT_DB_CONNECTION" != "x" ]]; then
      env \
        -u DB_HOST \
        -u DB_PORT \
        -u DB_NAME \
        -u DB_USER \
        -u DB_PASSWORD \
        DB_AUTO_START=true \
        "$REPO_ROOT/scripts/db-migrate.sh"
    else
      DB_AUTO_START=true DIRECT_DB_CONNECTION=1 "$REPO_ROOT/scripts/db-migrate.sh"
    fi
  )
fi

if [[ "$#" -eq 0 ]]; then
  exec npx jest --forceExit --runInBand src/__tests__/integration
fi

exec npx jest --forceExit --runInBand "$@"
