#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
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

mkdir -p "$(dirname "$LOCK_FILE")"
if [[ -z "${E2E_REQUIRED_PORTS:-}" ]]; then
  export E2E_REQUIRED_PORTS="$BACKEND_PORT $FRONTEND_PORT"
fi

read_lock_pid() {
  if [[ ! -f "$LOCK_FILE" ]]; then
    echo ""
    return
  fi

  local metadata
  metadata="$(cat "$LOCK_FILE" 2>/dev/null || true)"
  printf '%s' "$metadata" | cut -d':' -f1 | tr -dc '0-9'
}

read_lock_pgid() {
  if [[ ! -f "$LOCK_FILE" ]]; then
    echo ""
    return
  fi

  local metadata
  metadata="$(cat "$LOCK_FILE" 2>/dev/null || true)"
  if [[ "$metadata" == *:* ]]; then
    printf '%s' "$metadata" | cut -d':' -f2 | tr -dc '0-9'
  fi
}

pid_is_alive() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

get_process_group() {
  local pid="$1"
  ps -o pgid= -p "$pid" 2>/dev/null | tr -d '[:space:]'
}

wait_for_pid_exit() {
  local pid="$1"
  local max_checks="${2:-20}"
  local check=1

  while pid_is_alive "$pid" && [[ "$check" -le "$max_checks" ]]; do
    sleep 0.5
    check=$((check + 1))
  done
}

write_lock_metadata() {
  local pid="$1"
  local pgid="$2"

  if [[ -n "$pgid" ]]; then
    printf '%s:%s\n' "$pid" "$pgid" > "$LOCK_FILE"
  else
    printf '%s\n' "$pid" > "$LOCK_FILE"
  fi
}

terminate_lock_owner() {
  local lock_pid="$1"
  local lock_pgid="$2"
  local current_pgid="$3"

  if ! pid_is_alive "$lock_pid"; then
    return
  fi

  if [[ -n "$lock_pgid" && "$lock_pgid" != "$current_pgid" ]]; then
    kill -TERM -- "-$lock_pgid" 2>/dev/null || true
    wait_for_pid_exit "$lock_pid"
    if pid_is_alive "$lock_pid"; then
      kill -KILL -- "-$lock_pgid" 2>/dev/null || true
      wait_for_pid_exit "$lock_pid" 4
    fi
    return
  fi

  kill "$lock_pid" 2>/dev/null || true
  wait_for_pid_exit "$lock_pid"
  if pid_is_alive "$lock_pid"; then
    kill -9 "$lock_pid" 2>/dev/null || true
    wait_for_pid_exit "$lock_pid" 4
  fi
}

cleanup_lock() {
  local current_pid
  current_pid="$(read_lock_pid)"
  if [[ "$current_pid" == "$$" ]]; then
    rm -f "$LOCK_FILE"
  fi
}

trap cleanup_lock EXIT INT TERM

acquire_lock() {
  local lock_pid
  local lock_pgid
  local current_pgid
  lock_pid="$(read_lock_pid)"
  lock_pgid="$(read_lock_pgid)"
  current_pgid="$(get_process_group "$$")"

  if [[ "$lock_pid" == "$$" ]]; then
    rm -f "$LOCK_FILE"
    lock_pid=""
    lock_pgid=""
  fi

  if pid_is_alive "$lock_pid"; then
    if [[ "$RUNNER_ACTION" == "kill" ]]; then
      echo "E2E lock is held by PID $lock_pid. Terminating it because E2E_RUNNER_ACTION=kill." >&2
      terminate_lock_owner "$lock_pid" "$lock_pgid" "$current_pgid"
    else
      echo "Another E2E run is active (PID $lock_pid). Set E2E_RUNNER_ACTION=kill to terminate it." >&2
      exit 1
    fi
  fi

  rm -f "$LOCK_FILE"
  write_lock_metadata "$$" "$current_pgid"
}

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
    "$@" > >(tee "$attempt_log" "$latest_log") 2>&1 &
    local command_pid=$!
    local heartbeat_pid=""

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
    set -e

    if [[ "$command_status" -eq 0 ]]; then
      return 0
    fi

    if [[ "$attempt" -lt "$MAX_ATTEMPTS" ]] && is_port_conflict_failure "$attempt_log"; then
      echo "Detected Playwright startup port conflict. Retrying (attempt $((attempt + 1))/$MAX_ATTEMPTS)." >&2
      E2E_PORT_ACTION="$PORT_ACTION" "$SCRIPT_DIR/e2e-port-preflight.sh" || true
      attempt=$((attempt + 1))
      continue
    fi

    return "$command_status"
  done

  return 1
}

acquire_lock

E2E_PORT_ACTION="$PORT_ACTION" "$SCRIPT_DIR/e2e-port-preflight.sh"

run_with_retry "$@"
