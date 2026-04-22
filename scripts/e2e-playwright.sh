#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: scripts/e2e-playwright.sh <host|docker> [--direct|--locked] <playwright command...>

Apply the repo's standard Playwright runtime defaults, then run the shared
lock/preflight wrapper or the command directly.

Modes:
  host    Playwright-managed frontend/backend runtime on 127.0.0.1:5173/3001
  docker  Externally managed runtime on 127.0.0.1:8005/8004
EOF
}

set_runtime_env() {
  local name="$1"
  local value="$2"

  printf -v "$name" '%s' "$value"
  export "$name"
}

port_has_listener() {
  local port="$1"

  if ! command -v lsof >/dev/null 2>&1; then
    return 1
  fi

  lsof -nP -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

pick_host_frontend_port() {
  local configured_port="${E2E_FRONTEND_PORT:-}"
  local default_port="5173"
  local candidate

  if [[ -n "$configured_port" ]]; then
    printf '%s\n' "$configured_port"
    return 0
  fi

  if ! port_has_listener "$default_port"; then
    printf '%s\n' "$default_port"
    return 0
  fi

  for candidate in 5317 5417 5517 5617; do
    if ! port_has_listener "$candidate"; then
      log_warn "Default host E2E frontend port ${default_port} is occupied; using ${candidate} instead." >&2
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  log_warn "Default host E2E frontend port ${default_port} is occupied and no alternate fallback port is free; keeping ${default_port}." >&2
  printf '%s\n' "$default_port"
}

uses_durable_audit_runtime() {
  local arg

  for arg in "$@"; do
    case "$arg" in
      *tests/dark-mode-accessibility-audit.spec.ts|*tests/performance.startup.spec.ts)
        return 0
        ;;
    esac
  done

  return 1
}

if [[ $# -lt 2 ]]; then
  usage >&2
  exit 2
fi

mode="$1"
shift

run_mode="locked"
case "${1:-}" in
  --direct)
    run_mode="direct"
    shift
    ;;
  --locked)
    run_mode="locked"
    shift
    ;;
esac

if [[ $# -lt 1 ]]; then
  usage >&2
  exit 2
fi

case "$mode" in
  host)
    # Host mode is always the Playwright-managed runtime contract.
    set_runtime_env E2E_BACKEND_HOST "${E2E_BACKEND_HOST:-127.0.0.1}"
    set_runtime_env E2E_FRONTEND_HOST "${E2E_FRONTEND_HOST:-127.0.0.1}"
    set_runtime_env E2E_BACKEND_PORT "${E2E_BACKEND_PORT:-3001}"
    set_runtime_env E2E_FRONTEND_PORT "$(pick_host_frontend_port)"
    set_runtime_env E2E_PUBLIC_SITE_PORT "${E2E_PUBLIC_SITE_PORT:-${E2E_BACKEND_PORT}}"
    set_runtime_env BASE_URL "${BASE_URL:-http://${E2E_FRONTEND_HOST}:${E2E_FRONTEND_PORT}}"
    set_runtime_env API_URL "${API_URL:-http://${E2E_BACKEND_HOST}:${E2E_BACKEND_PORT}}"
    set_runtime_env SKIP_WEBSERVER "0"
    set_runtime_env BYPASS_REGISTRATION_POLICY_IN_TEST "false"
    export E2E_USE_DEV_RUNTIME="${E2E_USE_DEV_RUNTIME:-0}"
    export E2E_COMPOSE_MODE="${E2E_COMPOSE_MODE:-ci}"
    export PW_REUSE_EXISTING_SERVER="${PW_REUSE_EXISTING_SERVER:-0}"
    if [[ "${PW_REUSE_EXISTING_SERVER}" == "1" ]]; then
      export E2E_PORT_ACTION="${E2E_PORT_ACTION:-warn}"
      export E2E_READY_URLS="${E2E_READY_URLS:-http://${E2E_BACKEND_HOST}:${E2E_BACKEND_PORT}/health/live http://${E2E_FRONTEND_HOST}:${E2E_FRONTEND_PORT}}"
    else
      export E2E_PORT_ACTION="${E2E_PORT_ACTION:-kill}"
      unset E2E_READY_URLS
    fi
    export E2E_REQUIRED_PORTS="${E2E_REQUIRED_PORTS:-${E2E_BACKEND_PORT} ${E2E_FRONTEND_PORT}}"
    ;;
  docker)
    # Docker mode is always an externally managed runtime contract.
    set_runtime_env E2E_BACKEND_HOST "${E2E_BACKEND_HOST:-127.0.0.1}"
    set_runtime_env E2E_FRONTEND_HOST "${E2E_FRONTEND_HOST:-127.0.0.1}"
    set_runtime_env E2E_BACKEND_PORT "${E2E_BACKEND_PORT:-8004}"
    set_runtime_env E2E_FRONTEND_PORT "${E2E_FRONTEND_PORT:-8005}"
    set_runtime_env E2E_PUBLIC_SITE_PORT "${E2E_PUBLIC_SITE_PORT:-8006}"
    set_runtime_env BASE_URL "${BASE_URL:-http://${E2E_FRONTEND_HOST}:${E2E_FRONTEND_PORT}}"
    set_runtime_env API_URL "${API_URL:-http://${E2E_BACKEND_HOST}:${E2E_BACKEND_PORT}}"
    set_runtime_env SKIP_WEBSERVER "1"
    set_runtime_env BYPASS_REGISTRATION_POLICY_IN_TEST "true"
    export DB_HOST="${DB_HOST:-127.0.0.1}"
    export DB_PORT="${DB_PORT:-${E2E_DB_PORT:-8002}}"
    export DB_NAME="${DB_NAME:-nonprofit_manager}"
    export DB_USER="${DB_USER:-nonprofit_app_user}"
    export DB_PASSWORD="${DB_PASSWORD:-nonprofit_app_password}"
    export E2E_DB_HOST="${E2E_DB_HOST:-127.0.0.1}"
    export E2E_DB_PORT="${E2E_DB_PORT:-${DB_PORT}}"
    export E2E_DB_NAME="${E2E_DB_NAME:-nonprofit_manager}"
    export E2E_DB_USER="${E2E_DB_USER:-nonprofit_app_user}"
    export E2E_DB_PASSWORD="${E2E_DB_PASSWORD:-nonprofit_app_password}"
    export E2E_RUNNER_ACTION="${E2E_RUNNER_ACTION:-kill}"
    export E2E_PORT_ACTION="${E2E_PORT_ACTION:-warn}"
    export PW_REUSE_EXISTING_SERVER="${PW_REUSE_EXISTING_SERVER:-1}"
    export E2E_REQUIRED_PORTS="${E2E_REQUIRED_PORTS:-${E2E_BACKEND_PORT} ${E2E_FRONTEND_PORT} ${E2E_PUBLIC_SITE_PORT}}"
    export E2E_READY_URLS="${E2E_READY_URLS:-http://${E2E_BACKEND_HOST}:${E2E_BACKEND_PORT}/health/ready http://${E2E_FRONTEND_HOST}:${E2E_FRONTEND_PORT} http://${E2E_BACKEND_HOST}:${E2E_PUBLIC_SITE_PORT}/health/ready}"
    ;;
  *)
    echo "Unknown mode: $mode" >&2
    usage >&2
    exit 2
    ;;
esac

if uses_durable_audit_runtime "$@"; then
  export E2E_FORCE_COMPILED_RUNTIME="${E2E_FORCE_COMPILED_RUNTIME:-1}"
  export PW_REUSE_EXISTING_SERVER="0"
fi

cd "$PROJECT_ROOT/e2e"
if [[ "$run_mode" == "direct" ]]; then
  exec "$@"
fi

exec "$PROJECT_ROOT/scripts/e2e-run-with-lock.sh" "$@"
