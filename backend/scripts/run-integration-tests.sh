#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [[ "${SKIP_INTEGRATION_DB_PREP:-0}" != "1" ]]; then
  export DB_HOST="${DB_HOST:-localhost}"
  export DB_PORT="${DB_PORT:-8012}"
  export DB_NAME="${DB_NAME:-nonprofit_manager}"
  export DB_USER="${DB_USER:-postgres}"
  export DB_PASSWORD="${DB_PASSWORD:-postgres}"
  export COMPOSE_MODE="${COMPOSE_MODE:-ci}"
  export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-${CI_COMPOSE_PROJECT_NAME:-nonprofit-ci}}"
  export COMPOSE_FILES="${COMPOSE_FILES:-$REPO_ROOT/docker-compose.yml $REPO_ROOT/docker-compose.host-access.yml $REPO_ROOT/docker-compose.ci.yml}"
  (
    cd "$REPO_ROOT"
    DB_AUTO_START=true "$REPO_ROOT/scripts/db-migrate.sh"
  )
fi

if [[ "$#" -eq 0 ]]; then
  exec npx jest --forceExit --runInBand src/__tests__/integration
fi

exec npx jest --forceExit --runInBand "$@"
