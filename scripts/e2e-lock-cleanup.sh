#!/bin/bash
set -euo pipefail

LOCK_FILE="${1:-${E2E_LOCK_FILE:-/tmp/nonprofit-manager-e2e.lock}}"

read_lock_pid() {
  if [[ ! -f "$LOCK_FILE" ]]; then
    echo ""
    return
  fi
  tr -dc '0-9' < "$LOCK_FILE" 2>/dev/null || true
}

remove_lock_if_matches() {
  local pid="$1"
  if [[ ! -f "$LOCK_FILE" ]]; then
    return
  fi
  local current_pid
  current_pid="$(read_lock_pid)"
  if [[ -z "$current_pid" || "$current_pid" == "$pid" ]]; then
    rm -f "$LOCK_FILE"
  fi
}

is_playwright_lock_owner() {
  local pid="$1"
  local command_line
  command_line="$(ps -p "$pid" -o command= 2>/dev/null || true)"
  [[ "$command_line" == *"e2e-run-with-lock.sh"* ]] && [[ "$command_line" == *"playwright test"* ]]
}

terminate_lock_owner() {
  local pid="$1"

  kill "$pid" 2>/dev/null || true

  local attempt=1
  while [[ "$attempt" -le 5 ]]; do
    if ! kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
    sleep 1
    attempt=$((attempt + 1))
  done

  if kill -0 "$pid" 2>/dev/null; then
    kill -9 "$pid" 2>/dev/null || true
  fi
}

main() {
  if [[ ! -f "$LOCK_FILE" ]]; then
    exit 0
  fi

  local lock_pid
  lock_pid="$(read_lock_pid)"

  if [[ -z "$lock_pid" ]]; then
    echo "[WARN] Removing invalid E2E lock file: $LOCK_FILE" >&2
    rm -f "$LOCK_FILE"
    exit 0
  fi

  if ! kill -0 "$lock_pid" 2>/dev/null; then
    echo "[INFO] Removing stale E2E lock file (dead pid=$lock_pid): $LOCK_FILE" >&2
    remove_lock_if_matches "$lock_pid"
    exit 0
  fi

  if ! is_playwright_lock_owner "$lock_pid"; then
    echo "[WARN] Lock pid $lock_pid is not an e2e wrapper playwright owner; removing stale lock file only: $LOCK_FILE" >&2
    remove_lock_if_matches "$lock_pid"
    exit 0
  fi

  echo "[INFO] Terminating lock-owner playwright wrapper pid=$lock_pid for lock file: $LOCK_FILE" >&2
  terminate_lock_owner "$lock_pid"
  remove_lock_if_matches "$lock_pid"
}

main "$@"
