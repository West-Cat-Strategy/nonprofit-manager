#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/lib/config.sh"

BACKUP_FILE="${1:-${DB_BACKUP_FILE:-}}"
DB_NAME="${DB_NAME:-nonprofit_manager}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-8002}"
DB_SERVICE="${DB_SERVICE:-postgres}"

if [[ -z "$BACKUP_FILE" ]]; then
  echo "Usage: scripts/db-restore.sh <backup-file.gz>" >&2
  exit 2
fi

if [[ "${DB_RESTORE_CONFIRM:-0}" != "1" ]]; then
  echo "Set DB_RESTORE_CONFIRM=1 to confirm the restore operation." >&2
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

restore_stream() {
  if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE"
  else
    cat "$BACKUP_FILE"
  fi
}

compose_exec() {
  local project_name="${COMPOSE_PROJECT_NAME:-${COMPOSE_PROJECT_DEV:-nonprofit-dev}}"
  local compose_files="${COMPOSE_FILES:-$ROOT_DIR/docker-compose.dev.yml}"
  local -a compose_args=(-p "$project_name")
  local file

  for file in $compose_files; do
    compose_args+=(-f "$file")
  done

  compose_args+=(exec -T "$DB_SERVICE")
  "${COMPOSE_CMD[@]}" "${compose_args[@]}" "$@"
}

if [[ "$DB_HOST" == "postgres" ]]; then
  restore_stream | compose_exec psql -U "$DB_USER" -d "$DB_NAME"
else
  restore_stream | PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
fi

echo "Database restore completed from $BACKUP_FILE"
