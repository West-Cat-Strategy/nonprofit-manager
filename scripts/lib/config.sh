#!/usr/bin/env bash
# Shared script configuration helpers for Nonprofit Manager.

CONFIG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$CONFIG_DIR/../.." && pwd)"

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif docker-compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  COMPOSE_CMD=(docker compose)
fi

COMPOSE_PROJECT_DEV="${COMPOSE_PROJECT_DEV:-nonprofit-dev}"
COMPOSE_PROJECT_PROD="${COMPOSE_PROJECT_PROD:-nonprofit-prod}"

to_lower() {
  printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]'
}

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

compose_with_project_files() {
  local project_name="$1"
  shift

  local -a compose_args=(-p "$project_name")

  while [[ $# -gt 0 && "$1" != "--" ]]; do
    compose_args+=(-f "$1")
    shift
  done

  if [[ $# -gt 0 && "$1" == "--" ]]; then
    shift
  fi

  "${COMPOSE_CMD[@]}" "${compose_args[@]}" "$@"
}

compose_exec() {
  local project_name="$1"
  local compose_file="$2"
  local service="$3"
  shift 3
  compose_exec_with_project_files "$project_name" "$compose_file" -- "$service" "$@"
}

compose_exec_with_project_files() {
  local project_name="$1"
  shift

  local -a compose_args=(-p "$project_name")
  while [[ $# -gt 0 && "$1" != "--" ]]; do
    compose_args+=(-f "$1")
    shift
  done

  if [[ $# -gt 0 && "$1" == "--" ]]; then
    shift
  fi

  local service="$1"
  shift

  "${COMPOSE_CMD[@]}" "${compose_args[@]}" exec -T "$service" "$@"
}

compose_up() {
  local project_name="$1"
  shift
  "${COMPOSE_CMD[@]}" -p "$project_name" "$@" up -d
}
