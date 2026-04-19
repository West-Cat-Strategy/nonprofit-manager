#!/usr/bin/env bash
# Common utilities for Nonprofit Manager scripts.
# Source this file in other scripts to get shared functions.

COMMON_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$COMMON_DIR/config.sh"

# Color definitions
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export PURPLE='\033[0;35m'
export NC='\033[0m' # No Color

# Logging functions
log_info() { printf '%b\n' "${BLUE}[INFO]${NC} $*"; }
log_success() { printf '%b\n' "${GREEN}[SUCCESS]${NC} $*"; }
log_warn() { printf '%b\n' "${YELLOW}[WARN]${NC} $*"; }
log_error() { printf '%b\n' "${RED}[ERROR]${NC} $*"; }

run() {
  printf '==> %s\n' "$*"
  "$@"
}

e2e_lock_file() {
  printf '%s\n' "${E2E_LOCK_FILE:-/tmp/nonprofit-manager-e2e.lock}"
}

e2e_lock_metadata_file() {
  printf '%s\n' "$(e2e_lock_file)/owner"
}

e2e_read_lock_pid() {
  local metadata_file

  metadata_file="$(e2e_lock_metadata_file)"
  if [[ ! -f "$metadata_file" ]]; then
    echo ""
    return
  fi

  local metadata
  local lock_pid
  metadata="$(<"$metadata_file")"
  IFS=':' read -r lock_pid _ <<<"$metadata"
  printf '%s' "${lock_pid//[^0-9]/}"
}

e2e_read_lock_pgid() {
  local metadata_file

  metadata_file="$(e2e_lock_metadata_file)"
  if [[ ! -f "$metadata_file" ]]; then
    echo ""
    return
  fi

  local metadata
  local lock_pgid
  metadata="$(<"$metadata_file")"
  IFS=':' read -r _ lock_pgid <<<"$metadata"
  printf '%s' "${lock_pgid//[^0-9]/}"
}

e2e_pid_is_alive() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

e2e_process_group() {
  local pid="$1"

  if ! command -v ps >/dev/null 2>&1; then
    echo ""
    return 0
  fi

  ps -o pgid= -p "$pid" 2>/dev/null | tr -d '[:space:]' || true
}

e2e_wait_for_pid_exit() {
  local pid="$1"
  local max_checks="${2:-20}"
  local check=1

  while e2e_pid_is_alive "$pid" && [[ "$check" -le "$max_checks" ]]; do
    sleep 0.5
    check=$((check + 1))
  done
}

e2e_write_lock_metadata() {
  local pid="$1"
  local pgid="$2"
  local metadata_file

  metadata_file="$(e2e_lock_metadata_file)"

  if [[ -n "$pgid" ]]; then
    printf '%s:%s\n' "$pid" "$pgid" > "$metadata_file"
  else
    printf '%s\n' "$pid" > "$metadata_file"
  fi
}

e2e_terminate_lock_owner() {
  local lock_pid="$1"
  local lock_pgid="$2"
  local current_pgid="$3"

  if ! e2e_pid_is_alive "$lock_pid"; then
    return 0
  fi

  if [[ -n "$lock_pgid" && "$lock_pgid" != "$current_pgid" ]]; then
    kill -TERM -- "-$lock_pgid" 2>/dev/null || true
    e2e_wait_for_pid_exit "$lock_pid"
    if e2e_pid_is_alive "$lock_pid"; then
      kill -KILL -- "-$lock_pgid" 2>/dev/null || true
      e2e_wait_for_pid_exit "$lock_pid" 4
    fi
    return 0
  fi

  kill "$lock_pid" 2>/dev/null || true
  e2e_wait_for_pid_exit "$lock_pid"
  if e2e_pid_is_alive "$lock_pid"; then
    kill -9 "$lock_pid" 2>/dev/null || true
    e2e_wait_for_pid_exit "$lock_pid" 4
  fi
}

e2e_cleanup_lock() {
  local current_pid

  current_pid="$(e2e_read_lock_pid)"
  if [[ "$current_pid" == "$$" ]]; then
    rm -rf "$(e2e_lock_file)"
  fi
}

e2e_acquire_lock() {
  local lock_dir
  local lock_pid
  local lock_pgid
  local current_pgid
  local attempt=1
  local max_attempts=5

  lock_dir="$(e2e_lock_file)"
  mkdir -p "$(dirname "$lock_dir")"
  current_pgid="$(e2e_process_group "$$")"

  while [[ "$attempt" -le "$max_attempts" ]]; do
    if mkdir "$lock_dir" 2>/dev/null; then
      e2e_write_lock_metadata "$$" "$current_pgid"
      return 0
    fi

    lock_pid="$(e2e_read_lock_pid)"
    lock_pgid="$(e2e_read_lock_pgid)"

    if [[ "$lock_pid" == "$$" ]]; then
      rm -rf "$lock_dir"
      attempt=$((attempt + 1))
      continue
    fi

    if [[ -z "$lock_pid" ]] || ! e2e_pid_is_alive "$lock_pid"; then
      rm -rf "$lock_dir"
      attempt=$((attempt + 1))
      continue
    fi

    if [[ "${E2E_RUNNER_ACTION:-fail}" == "kill" ]]; then
      echo "E2E lock is held by PID $lock_pid. Terminating it because E2E_RUNNER_ACTION=kill." >&2
      e2e_terminate_lock_owner "$lock_pid" "$lock_pgid" "$current_pgid"
      rm -rf "$lock_dir"
      attempt=$((attempt + 1))
      continue
    fi

    echo "Another E2E run is active (PID $lock_pid). Set E2E_RUNNER_ACTION=kill to terminate it." >&2
    return 1
  done

  echo "Unable to acquire the E2E lock after ${max_attempts} attempts." >&2
  return 1
}

e2e_require_port_inspector() {
  if command -v lsof >/dev/null 2>&1; then
    return 0
  fi

  log_error "E2E port preflight requires 'lsof', but it is not installed or not on PATH."
  return 1
}

e2e_collect_listener_pids() {
  local ports="${1:-${E2E_REQUIRED_PORTS:-3001 5173}}"
  local collected=""
  local port
  local pids

  e2e_require_port_inspector || return 1

  for port in $ports; do
    pids="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      collected="${collected}"$'\n'"$pids"
    fi
  done

  if [[ -n "$collected" ]]; then
    printf '%s\n' "$collected" | tr ' ' '\n' | sed '/^$/d' | sort -u
  fi
}

e2e_log_port_usage() {
  local ports="${1:-${E2E_REQUIRED_PORTS:-3001 5173}}"
  local port
  local listeners

  e2e_require_port_inspector || return 1

  for port in $ports; do
    listeners="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "$listeners" ]]; then
      log_warn "Port $port is currently in use:"
      printf '%s\n' "$listeners"
    fi
  done
}

e2e_kill_stale_listeners() {
  local ports="${1:-${E2E_REQUIRED_PORTS:-3001 5173}}"
  local pids
  local remaining

  pids="$(e2e_collect_listener_pids "$ports")"
  if [[ -z "$pids" ]]; then
    return 0
  fi

  log_warn "Terminating stale listeners on E2E ports..."
  while IFS= read -r pid; do
    [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true
  done <<<"$pids"
  sleep 1

  remaining="$(e2e_collect_listener_pids "$ports")"
  if [[ -n "$remaining" ]]; then
    log_warn "Force-killing remaining listeners..."
    while IFS= read -r pid; do
      [[ -n "$pid" ]] && kill -9 "$pid" 2>/dev/null || true
    done <<<"$remaining"
    sleep 1
  fi
}

e2e_stabilize_ports() {
  local ports="${1:-${E2E_REQUIRED_PORTS:-3001 5173}}"
  local port_action="${2:-${E2E_PORT_ACTION:-fail}}"
  local port_stability_checks="${3:-${E2E_PORT_STABILITY_CHECKS:-3}}"
  local port_max_checks="${4:-${E2E_PORT_MAX_CHECKS:-15}}"
  local port_check_interval_seconds="${5:-${E2E_PORT_CHECK_INTERVAL_SECONDS:-1}}"
  local stable_checks=0
  local check=1
  local existing
  local final_listeners

  while [[ "$check" -le "$port_max_checks" ]]; do
    existing="$(e2e_collect_listener_pids "$ports")"

    if [[ -z "$existing" ]]; then
      stable_checks=$((stable_checks + 1))
      if [[ "$stable_checks" -ge "$port_stability_checks" ]]; then
        return 0
      fi
      sleep "$port_check_interval_seconds"
      check=$((check + 1))
      continue
    fi

    stable_checks=0
    e2e_log_port_usage "$ports"
    case "$port_action" in
      kill)
        e2e_kill_stale_listeners "$ports"
        ;;
      warn)
        log_warn "Proceeding with occupied E2E ports due to E2E_PORT_ACTION=warn."
        return 0
        ;;
      fail|*)
        log_error "E2E ports are occupied. Stop stale services or set E2E_PORT_ACTION=kill."
        return 1
        ;;
    esac

    sleep "$port_check_interval_seconds"
    check=$((check + 1))
  done

  final_listeners="$(e2e_collect_listener_pids "$ports")"
  if [[ -z "$final_listeners" && "$stable_checks" -ge "$port_stability_checks" ]]; then
    return 0
  fi

  if [[ "$port_action" == "kill" ]]; then
    log_error "E2E ports failed stability checks after ${port_max_checks} probe attempts."
    e2e_log_port_usage "$ports"
    return 1
  fi

  return 0
}

e2e_probe_http_url() {
  local url="$1"
  local request_timeout="${E2E_HTTP_READY_REQUEST_TIMEOUT_SECONDS:-5}"

  if command -v curl >/dev/null 2>&1; then
    curl --silent --fail --location --max-time "$request_timeout" --output /dev/null "$url" >/dev/null 2>&1
    return $?
  fi

  if command -v wget >/dev/null 2>&1; then
    wget -q --timeout="$request_timeout" -O /dev/null "$url" >/dev/null 2>&1
    return $?
  fi

  log_error "E2E HTTP readiness checks require 'curl' or 'wget', but neither was found on PATH."
  return 1
}

e2e_wait_for_http_urls() {
  local max_attempts="${E2E_HTTP_READY_MAX_ATTEMPTS:-60}"
  local interval_seconds="${E2E_HTTP_READY_INTERVAL_SECONDS:-1}"
  local attempt
  local url

  if [[ "$#" -eq 0 ]]; then
    return 0
  fi

  for url in "$@"; do
    attempt=1
    while [[ "$attempt" -le "$max_attempts" ]]; do
      if e2e_probe_http_url "$url"; then
        log_info "HTTP ready: $url"
        break
      fi

      if [[ "$attempt" -eq "$max_attempts" ]]; then
        log_error "Timed out waiting for HTTP readiness: $url"
        return 1
      fi

      sleep "$interval_seconds"
      attempt=$((attempt + 1))
    done
  done
}

e2e_preflight_ports() {
  local ports="${E2E_REQUIRED_PORTS:-3001 5173}"

  if ! e2e_stabilize_ports "$ports"; then
    return 1
  fi

  if [[ -n "${E2E_READY_URLS:-}" ]]; then
    # shellcheck disable=SC2086
    if ! e2e_wait_for_http_urls ${E2E_READY_URLS}; then
      return 1
    fi
    log_success "E2E HTTP readiness passed (${E2E_READY_URLS})."
  fi

  log_success "E2E port preflight passed (ports stable: $ports)."
}
