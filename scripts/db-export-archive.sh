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
DB_COMPOSE_PROJECT="${DB_COMPOSE_PROJECT:-$COMPOSE_PROJECT_DEV}"
DB_COMPOSE_FILE="${DB_COMPOSE_FILE:-$PROJECT_ROOT/docker-compose.dev.yml}"
DB_COMPOSE_FILES_RAW="${DB_COMPOSE_FILES:-$DB_COMPOSE_FILE}"
DB_COMPOSE_ENV_FILE="${DB_COMPOSE_ENV_FILE:-}"

ARCHIVE_OUTPUT="${1:-${DB_ARCHIVE_FILE:-}}"
if [[ -z "$ARCHIVE_OUTPUT" ]]; then
  validate_backup_dir_for_local_db
  ARCHIVE_OUTPUT="$BACKUP_DIR/nonprofit-manager-archive-$TIMESTAMP.dump"
fi

compose_db() {
  local -a compose_args=(-p "$DB_COMPOSE_PROJECT")
  local compose_file

  if [[ -n "$DB_COMPOSE_ENV_FILE" ]]; then
    compose_args+=(--env-file "$DB_COMPOSE_ENV_FILE")
  fi

  for compose_file in $DB_COMPOSE_FILES_RAW; do
    compose_args+=(-f "$compose_file")
  done

  compose "${compose_args[@]}" exec -T "$DB_SERVICE" "$@"
}

mkdir -p "$(dirname "$ARCHIVE_OUTPUT")"

dump_database() {
  if [[ "$DB_HOST" == "postgres" ]]; then
    compose_db pg_dump -Fc -C --no-owner --no-acl -U "$DB_USER" -d "$DB_NAME"
  else
    PGPASSWORD="$DB_PASSWORD" pg_dump -Fc -C --no-owner --no-acl -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
  fi
}

dump_database > "$ARCHIVE_OUTPUT"
echo "Database archive written to $ARCHIVE_OUTPUT"
