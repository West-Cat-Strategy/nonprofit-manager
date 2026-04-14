#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

BACKUP_FILE="${1:-${DB_BACKUP_FILE:-}}"
DB_NAME="${DB_NAME:-nonprofit_manager}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-8002}"
DB_SERVICE="${DB_SERVICE:-postgres}"
DB_COMPOSE_PROJECT="${COMPOSE_PROJECT_DEV}"
DB_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.dev.yml"

compose_db() {
  compose_exec_with_project_files "$DB_COMPOSE_PROJECT" "$DB_COMPOSE_FILE" -- "$DB_SERVICE" "$@"
}

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

if [[ "$DB_HOST" == "postgres" ]]; then
  restore_stream | compose_db psql -U "$DB_USER" -d "$DB_NAME"
else
  restore_stream | PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
fi

echo "Database restore completed from $BACKUP_FILE"
