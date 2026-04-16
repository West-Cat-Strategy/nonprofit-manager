#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
source "$PROJECT_ROOT/scripts/lib/db-at-rest.sh"

DB_NAME="${DB_NAME:-nonprofit_manager}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-8002}"
DB_SERVICE="${DB_SERVICE:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backend/exports}"
TIMESTAMP="${TIMESTAMP:-$(date -u +%Y%m%d-%H%M%SZ)}"
OUTPUT_FILE="$BACKUP_DIR/nonprofit-manager-backup-$TIMESTAMP.sql.gz"
DB_COMPOSE_PROJECT="${COMPOSE_PROJECT_DEV}"
DB_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.dev.yml"

compose_db() {
  compose_exec_with_project_files "$DB_COMPOSE_PROJECT" "$DB_COMPOSE_FILE" -- "$DB_SERVICE" "$@"
}

validate_production_db_at_rest_contract

DB_AT_REST_MODE="$(to_lower "${DB_AT_REST_ENCRYPTION_MODE:-}")"

if [[ "${NODE_ENV:-}" == "production" && "$DB_AT_REST_MODE" == "managed" ]]; then
  echo "db-backup.sh is intentionally blocked in managed production mode; use provider-managed backups instead." >&2
  exit 1
fi

validate_backup_dir_for_local_db
mkdir -p "$BACKUP_DIR"

dump_database() {
  if [[ "$DB_HOST" == "postgres" ]]; then
    compose_db pg_dump -U "$DB_USER" -d "$DB_NAME"
  else
    PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
  fi
}

dump_database | gzip -c > "$OUTPUT_FILE"
echo "Database backup written to $OUTPUT_FILE"
