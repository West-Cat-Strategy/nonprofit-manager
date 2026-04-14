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
RUNNER_LOG_DIR="${E2E_RUNNER_LOG_DIR:-$PROJECT_ROOT/tmp/e2e-runner}"

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

export E2E_LOCK_FILE="$LOCK_FILE"
export E2E_RUNNER_ACTION="$RUNNER_ACTION"
export E2E_PORT_ACTION="$PORT_ACTION"
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

is_port_conflict_failure() {
  local log_file="$1"
  grep -Eq "Port ${FRONTEND_PORT} is already in use|Port ${BACKEND_PORT} is already in use|EADDRINUSE|Process from config\\.webServer was not able to start" "$log_file"
}

run_with_retry() {
  local attempt=1
  mkdir -p "$RUNNER_LOG_DIR"

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

    return "$command_status"
  done

  return 1
}

e2e_preflight_ports

run_with_retry "$@"
