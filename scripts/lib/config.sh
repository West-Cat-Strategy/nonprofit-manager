#!/bin/bash
# Shared script configuration helpers for Nonprofit Manager.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif docker-compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  COMPOSE_CMD=(docker compose)
fi

repo_root() {
  printf '%s\n' "$PROJECT_ROOT"
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Required command not found: $cmd" >&2
    return 1
  fi
}

require_abs_path() {
  local value="${1:-}"
  if [[ -z "$value" || "${value:0:1}" != "/" ]]; then
    return 1
  fi
}

compose() {
  "${COMPOSE_CMD[@]}" "$@"
}

compose_with_project() {
  local project_name="$1"
  shift
  "${COMPOSE_CMD[@]}" -p "$project_name" "$@"
}

compose_exec() {
  local project_name="$1"
  local compose_file="$2"
  local service="$3"
  shift 3
  "${COMPOSE_CMD[@]}" -p "$project_name" -f "$compose_file" exec -T "$service" "$@"
}

compose_up() {
  local project_name="$1"
  shift
  "${COMPOSE_CMD[@]}" -p "$project_name" "$@" up -d
}

