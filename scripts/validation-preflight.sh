#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: scripts/validation-preflight.sh <docker|isolated-test-db> [--context NAME] [--compose]

Fail fast with nonprofit-manager-specific prerequisite messages before root
validation wrappers reach Docker socket or isolated test DB failures late.

Modes:
  docker            Require Docker CLI and a reachable Docker daemon.
  isolated-test-db  Require psql plus either an existing ready isolated test DB
                    or a reachable Docker daemon that can bootstrap it.

Options:
  --context NAME    Human-readable command name for error output.
  --compose         Also require Docker Compose availability in docker mode.
EOF
}

MODE="${1:-}"
if [[ $# -gt 0 ]]; then
  shift
fi

CONTEXT="the requested validation command"
REQUIRE_COMPOSE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --context)
      CONTEXT="${2:-}"
      if [[ -z "$CONTEXT" ]]; then
        echo "Missing value for --context" >&2
        usage >&2
        exit 2
      fi
      shift 2
      ;;
    --compose)
      REQUIRE_COMPOSE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

docker_context_name() {
  docker context show 2>/dev/null || printf 'unknown'
}

docker_host_description() {
  if [[ -n "${DOCKER_HOST:-}" ]]; then
    printf '%s' "$DOCKER_HOST"
    return
  fi

  printf 'default Docker context'
}

fail_docker_cli_missing() {
  log_error "Nonprofit Manager validation preflight failed before ${CONTEXT}: Docker CLI is not installed or not on PATH."
  cat >&2 <<EOF
This repo's Docker-backed validation wrappers use Docker for Compose overlays,
Redis sidecars, isolated test databases, Caddy validation, and smoke stacks.

Install/start Docker Desktop or provide a compatible docker CLI, then rerun:
  ${CONTEXT}
EOF
}

fail_docker_daemon_unavailable() {
  log_error "Nonprofit Manager validation preflight failed before ${CONTEXT}: Docker daemon is not reachable."
  cat >&2 <<EOF
Docker is installed, but the daemon/socket is unavailable for this checkout.
Checked Docker context: $(docker_context_name)
Checked Docker host: $(docker_host_description)

Start Docker Desktop or restore the active Docker socket, confirm with:
  docker info

Then rerun:
  ${CONTEXT}
EOF
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    fail_docker_cli_missing
    return 1
  fi

  if ! docker info >/dev/null 2>&1; then
    fail_docker_daemon_unavailable
    return 1
  fi

  if [[ "$REQUIRE_COMPOSE" == "1" ]]; then
    if docker compose version >/dev/null 2>&1; then
      return 0
    fi
    if command -v docker-compose >/dev/null 2>&1 && docker-compose version >/dev/null 2>&1; then
      return 0
    fi

    log_error "Nonprofit Manager validation preflight failed before ${CONTEXT}: Docker Compose is unavailable."
    cat >&2 <<EOF
Docker is reachable, but this wrapper needs Docker Compose to evaluate the
repo's Compose manifests and overlays. Install Docker Desktop's compose plugin
or docker-compose, then rerun:
  ${CONTEXT}
EOF
    return 1
  fi
}

test_db_host() {
  printf '%s' "${DB_HOST:-127.0.0.1}"
}

test_db_port() {
  printf '%s' "${DB_PORT:-8012}"
}

test_db_name() {
  printf '%s' "${DB_NAME:-nonprofit_manager_test}"
}

test_db_user() {
  printf '%s' "${DB_USER:-postgres}"
}

test_db_password() {
  printf '%s' "${DB_PASSWORD:-postgres}"
}

test_db_target() {
  printf '%s:%s/%s' "$(test_db_host)" "$(test_db_port)" "$(test_db_name)"
}

test_db_ready() {
  PGPASSWORD="$(test_db_password)" psql \
    -h "$(test_db_host)" \
    -p "$(test_db_port)" \
    -U "$(test_db_user)" \
    -d "$(test_db_name)" \
    -Atqc 'SELECT 1;' >/dev/null 2>&1
}

published_port_container() {
  docker ps --filter "publish=$(test_db_port)" --format '{{.ID}}' | head -n 1
}

require_isolated_test_db() {
  if ! command -v psql >/dev/null 2>&1; then
    log_error "Nonprofit Manager validation preflight failed before ${CONTEXT}: psql is not installed or not on PATH."
    cat >&2 <<EOF
The DB-backed wrapper tests verify the isolated database contract at
$(test_db_target). Install PostgreSQL client tools, then rerun:
  ${CONTEXT}
EOF
    return 1
  fi

  if test_db_ready; then
    log_info "Isolated test database is already reachable at $(test_db_target)."
    return 0
  fi

  if [[ "${SKIP_INTEGRATION_DB_PREP:-0}" == "1" ]]; then
    log_error "Nonprofit Manager validation preflight failed before ${CONTEXT}: isolated test DB is not reachable."
    cat >&2 <<EOF
SKIP_INTEGRATION_DB_PREP=1 tells the wrapper to reuse an already-prepared DB,
but $(test_db_target) did not answer SELECT 1.

Run make db-verify first, unset SKIP_INTEGRATION_DB_PREP, or point DB_HOST,
DB_PORT, DB_NAME, DB_USER, and DB_PASSWORD at a ready isolated test database.
EOF
    return 1
  fi

  require_docker || return 1

  local existing_container=""
  existing_container="$(published_port_container || true)"
  if [[ -n "$existing_container" ]]; then
    local detected_service=""
    local detected_project=""
    detected_service="$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.service" }}' "$existing_container" 2>/dev/null || true)"
    detected_project="$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project" }}' "$existing_container" 2>/dev/null || true)"

    if [[ "$detected_service" != "postgres" ]]; then
      log_error "Nonprofit Manager validation preflight failed before ${CONTEXT}: port $(test_db_port) is occupied by a non-Postgres container."
      cat >&2 <<EOF
The isolated test DB wrapper needs $(test_db_target), but Docker reports
container ${existing_container} on that published port.

Stop the conflicting container or choose an unused DB_PORT before rerunning:
  ${CONTEXT}
EOF
      return 1
    fi

    log_warn "Port $(test_db_port) is already published by Postgres container ${existing_container} from project ${detected_project:-unknown}; the DB wrapper will attempt reuse or rebuild."
  fi

  log_info "Docker is reachable and can bootstrap the isolated test database at $(test_db_target)."
}

case "$MODE" in
  docker)
    require_docker
    ;;
  isolated-test-db)
    require_isolated_test_db
    ;;
  ""|-h|--help)
    usage
    [[ -n "$MODE" ]]
    ;;
  *)
    echo "Unknown mode: $MODE" >&2
    usage >&2
    exit 2
    ;;
esac
