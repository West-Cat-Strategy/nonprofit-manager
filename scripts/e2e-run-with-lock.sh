#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
LOCK_FILE="${E2E_LOCK_FILE:-/tmp/nonprofit-manager-e2e.lock}"
RUNNER_ACTION="${E2E_RUNNER_ACTION:-fail}" # fail | kill
PORT_ACTION="${E2E_PORT_ACTION:-kill}"
MAX_ATTEMPTS="${E2E_RUNNER_MAX_ATTEMPTS:-2}"
HEARTBEAT_SECONDS="${E2E_RUNNER_HEARTBEAT_SECONDS:-20}"
BACKEND_PORT="${E2E_BACKEND_PORT:-3001}"
FRONTEND_PORT="${E2E_FRONTEND_PORT:-5173}"
RUNNER_RUN_ID="${E2E_RUNNER_RUN_ID:-$(date -u +"%Y%m%dT%H%M%SZ")-$$}"
RUNNER_LOG_DIR="${E2E_RUNNER_LOG_DIR:-$PROJECT_ROOT/tmp/e2e-runner/$RUNNER_RUN_ID}"

if [[ "$RUNNER_ACTION" != "fail" && "$RUNNER_ACTION" != "kill" ]]; then
  echo "Invalid E2E_RUNNER_ACTION='$RUNNER_ACTION'. Expected 'fail' or 'kill'." >&2
  exit 2
fi

if ! [[ "$MAX_ATTEMPTS" =~ ^[0-9]+$ ]] || [[ "$MAX_ATTEMPTS" -lt 1 ]]; then
  echo "Invalid E2E_RUNNER_MAX_ATTEMPTS='$MAX_ATTEMPTS'. Expected a positive integer." >&2
  exit 2
fi

if ! [[ "$HEARTBEAT_SECONDS" =~ ^[0-9]+$ ]]; then
  echo "Invalid E2E_RUNNER_HEARTBEAT_SECONDS='$HEARTBEAT_SECONDS'. Expected a non-negative integer." >&2
  exit 2
fi

if [[ $# -eq 0 ]]; then
  echo "Usage: $0 <command> [args...]" >&2
  exit 2
fi

playwright_command_requests_webkit() {
  local saw_test_subcommand=0
  local saw_project_flag=0
  local expect_project_value=0
  local arg

  for arg in "$@"; do
    if [[ "$expect_project_value" -eq 1 ]]; then
      saw_project_flag=1
      expect_project_value=0
      case "$arg" in
        webkit|"Mobile Safari"|Tablet)
          return 0
          ;;
      esac
      continue
    fi

    case "$arg" in
      test)
        saw_test_subcommand=1
        ;;
      --project)
        saw_project_flag=1
        expect_project_value=1
        ;;
      --project=webkit|--project=Tablet|--project="Mobile Safari"|--project=Mobile\ Safari)
        return 0
        ;;
      --browser=webkit)
        return 0
        ;;
    esac
  done

  if [[ "$saw_test_subcommand" -eq 1 && "$saw_project_flag" -eq 0 ]]; then
    return 0
  fi

  return 1
}

e2e_fail_fast_for_background_webkit() {
  local manager_name

  if [[ "${E2E_ALLOW_BACKGROUND_WEBKIT:-0}" == "1" ]]; then
    return 0
  fi

  if [[ "$(uname -s)" != "Darwin" ]]; then
    return 0
  fi

  if ! playwright_command_requests_webkit "$@"; then
    return 0
  fi

  if ! command -v launchctl >/dev/null 2>&1; then
    return 0
  fi

  manager_name="$(launchctl managername 2>/dev/null || true)"
  if [[ "$manager_name" != "Background" ]]; then
    return 0
  fi

  log_error "This Playwright command includes WebKit/Safari projects, but the current macOS session is '$manager_name'."
  log_error "Playwright's macOS WebKit browser requires an active Aqua/login session and times out when launched from a background SSH session."
  log_error "Log into the Mac console or Screen Sharing session, then rerun. Set E2E_ALLOW_BACKGROUND_WEBKIT=1 to bypass this preflight."
  exit 78
}

export E2E_LOCK_FILE="$LOCK_FILE"
export E2E_RUNNER_ACTION="$RUNNER_ACTION"
export E2E_PORT_ACTION="$PORT_ACTION"
export E2E_RUNNER_RUN_ID="$RUNNER_RUN_ID"
command_pid=""
heartbeat_pid=""

if [[ -z "${E2E_REQUIRED_PORTS:-}" ]]; then
  export E2E_REQUIRED_PORTS="$BACKEND_PORT $FRONTEND_PORT"
fi

cleanup_runner() {
  local exit_code=$?

  trap - EXIT INT TERM

  if [[ -n "${heartbeat_pid:-}" ]]; then
    kill "$heartbeat_pid" 2>/dev/null || true
    wait "$heartbeat_pid" 2>/dev/null || true
    heartbeat_pid=""
  fi

  if [[ -n "${command_pid:-}" ]]; then
    kill "$command_pid" 2>/dev/null || true
    wait "$command_pid" 2>/dev/null || true
    command_pid=""
  fi

  e2e_cleanup_lock
  exit "$exit_code"
}

trap cleanup_runner EXIT INT TERM

e2e_acquire_lock

e2e_fail_fast_for_background_webkit "$@"

is_port_conflict_failure() {
  local log_file="$1"
  grep -Eq "Port ${FRONTEND_PORT} is already in use|Port ${BACKEND_PORT} is already in use|EADDRINUSE|Process from config\\.webServer was not able to start" "$log_file"
}

write_runner_metadata() {
  local metadata_file="$RUNNER_LOG_DIR/metadata.env"

  mkdir -p "$RUNNER_LOG_DIR"
  {
    printf 'E2E_RUNNER_RUN_ID=%q\n' "$RUNNER_RUN_ID"
    printf 'E2E_LOCK_FILE=%q\n' "$LOCK_FILE"
    printf 'E2E_RUNNER_ACTION=%q\n' "$RUNNER_ACTION"
    printf 'E2E_PORT_ACTION=%q\n' "$PORT_ACTION"
    printf 'E2E_REQUIRED_PORTS=%q\n' "${E2E_REQUIRED_PORTS:-}"
    printf 'E2E_READY_URLS=%q\n' "${E2E_READY_URLS:-}"
    printf 'BASE_URL=%q\n' "${BASE_URL:-}"
    printf 'API_URL=%q\n' "${API_URL:-}"
    printf 'PLAYWRIGHT_HTML_OUTPUT_DIR=%q\n' "${PLAYWRIGHT_HTML_OUTPUT_DIR:-}"
    printf 'PLAYWRIGHT_JSON_OUTPUT_FILE=%q\n' "${PLAYWRIGHT_JSON_OUTPUT_FILE:-}"
    printf 'COMMAND=%q\n' "$*"
  } > "$metadata_file"
}

print_failure_diagnostics() {
  local log_file="$1"
  local status="$2"
  local diagnostics_file="$RUNNER_LOG_DIR/failure-diagnostics.txt"

  if [[ ! -f "$log_file" ]]; then
    return 0
  fi

  {
    echo "[e2e-runner] command failed with status ${status}; diagnostics from ${log_file}:"

    if grep -Eiq "EADDRINUSE|Port ${FRONTEND_PORT} is already in use|Port ${BACKEND_PORT} is already in use" "$log_file"; then
      echo "[e2e-runner] port conflict suspected on backend/frontend ports (${BACKEND_PORT}/${FRONTEND_PORT})."
      e2e_log_port_usage "${E2E_REQUIRED_PORTS:-$BACKEND_PORT $FRONTEND_PORT}" || true
    fi

    if grep -Eiq "Timed out waiting|health/(live|ready)|ECONNREFUSED|ERR_CONNECTION_REFUSED|Process from config\\.webServer was not able to start" "$log_file"; then
      echo "[e2e-runner] readiness failure suspected. Check backend/frontend startup output above and the readiness URLs: ${E2E_READY_URLS:-Playwright webServer URLs}."
    fi

    if grep -Eiq "backend|dist/index\\.js|ts-node|db-migrate|database|migration|JWT_SECRET|Cannot find module|failed to start" "$log_file"; then
      echo "[e2e-runner] backend startup crash may have occurred. Last matching backend/startup lines:"
      grep -Ei "backend|dist/index\\.js|ts-node|db-migrate|database|migration|JWT_SECRET|Cannot find module|failed to start" "$log_file" | tail -n 20 || true
    fi

    echo "[e2e-runner] last 40 log lines:"
    tail -n 40 "$log_file" || true
  } | tee "$diagnostics_file" >&2

  echo "[e2e-runner] wrote failure diagnostics to ${diagnostics_file}" >&2
}

run_with_retry() {
  local attempt=1
  mkdir -p "$RUNNER_LOG_DIR"
  write_runner_metadata "$@"

  while [[ "$attempt" -le "$MAX_ATTEMPTS" ]]; do
    local attempt_log
    local latest_log
    attempt_log="$RUNNER_LOG_DIR/attempt-${attempt}.log"
    latest_log="$RUNNER_LOG_DIR/last-attempt.log"
    : > "$attempt_log"
    : > "$latest_log"

    set +e
    (
      set -o pipefail
      "$@" 2>&1 | tee "$attempt_log" "$latest_log"
    ) &
    command_pid=$!
    heartbeat_pid=""

    if [[ "$HEARTBEAT_SECONDS" -gt 0 ]]; then
      (
        while kill -0 "$command_pid" 2>/dev/null; do
          sleep "$HEARTBEAT_SECONDS"
          if kill -0 "$command_pid" 2>/dev/null; then
            echo "[e2e-runner] still running (attempt ${attempt}/${MAX_ATTEMPTS})..." >&2
          fi
        done
      ) &
      heartbeat_pid=$!
    fi

    wait "$command_pid"
    local command_status=$?

    if [[ -n "$heartbeat_pid" ]]; then
      kill "$heartbeat_pid" 2>/dev/null || true
      wait "$heartbeat_pid" 2>/dev/null || true
    fi

    command_pid=""
    heartbeat_pid=""

    set -e

    if [[ "$command_status" -eq 0 ]]; then
      return 0
    fi

    if [[ "$attempt" -lt "$MAX_ATTEMPTS" ]] && is_port_conflict_failure "$attempt_log"; then
      echo "Detected Playwright startup port conflict. Retrying (attempt $((attempt + 1))/$MAX_ATTEMPTS)." >&2
      e2e_preflight_ports || true
      attempt=$((attempt + 1))
      continue
    fi

    print_failure_diagnostics "$attempt_log" "$command_status"
    return "$command_status"
  done

  return 1
}

e2e_preflight_ports

run_with_retry "$@"
