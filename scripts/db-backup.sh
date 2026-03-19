#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/lib/config.sh"
source "$ROOT_DIR/scripts/lib/db-at-rest.sh"

DB_NAME="${DB_NAME:-nonprofit_manager}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-8002}"
DB_SERVICE="${DB_SERVICE:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backend/exports}"
TIMESTAMP="${TIMESTAMP:-$(date -u +%Y%m%d-%H%M%SZ)}"
OUTPUT_FILE="$BACKUP_DIR/nonprofit-manager-backup-$TIMESTAMP.sql.gz"

validate_production_db_at_rest_contract

if [[ "${NODE_ENV:-}" == "production" && "${DB_AT_REST_ENCRYPTION_MODE:-}" == "managed" ]]; then
  echo "db-backup.sh is intentionally blocked in managed production mode; use provider-managed backups instead." >&2
  exit 1
fi

validate_backup_dir_for_luks
mkdir -p "$BACKUP_DIR"

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

dump_database() {
  if [[ "$DB_HOST" == "postgres" ]]; then
    compose_exec pg_dump -U "$DB_USER" -d "$DB_NAME"
  else
    PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
  fi
}

dump_database | gzip -c > "$OUTPUT_FILE"
echo "Database backup written to $OUTPUT_FILE"
