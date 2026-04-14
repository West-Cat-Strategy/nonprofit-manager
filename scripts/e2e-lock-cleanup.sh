#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

LOCK_FILE="${E2E_LOCK_FILE:-${E2E_CI_LOCK_FILE:-/tmp/nonprofit-manager-e2e.lock}}"
ACTION="${1:-warn}"

export E2E_LOCK_FILE="$LOCK_FILE"

if [[ ! -f "$LOCK_FILE" ]]; then
  echo "No E2E lock file present at $LOCK_FILE"
  exit 0
fi

lock_pid="$(e2e_read_lock_pid)"
lock_pgid="$(e2e_read_lock_pgid)"

if [[ -z "$lock_pid" ]]; then
  rm -f "$LOCK_FILE"
  echo "Removed malformed E2E lock file: $LOCK_FILE"
  exit 0
fi

if e2e_pid_is_alive "$lock_pid"; then
  if [[ "$ACTION" == "kill" ]]; then
    if [[ -n "$lock_pgid" ]]; then
      kill -TERM -- "-$lock_pgid" 2>/dev/null || true
      sleep 1
      kill -KILL -- "-$lock_pgid" 2>/dev/null || true
    else
      kill -TERM "$lock_pid" 2>/dev/null || true
      sleep 1
      kill -KILL "$lock_pid" 2>/dev/null || true
    fi
    rm -f "$LOCK_FILE"
    echo "Terminated active E2E lock owner PID $lock_pid and removed $LOCK_FILE"
    exit 0
  fi

  echo "E2E lock is still owned by PID $lock_pid; use 'kill' to terminate it." >&2
  exit 1
fi

rm -f "$LOCK_FILE"
echo "Removed stale E2E lock file: $LOCK_FILE"
