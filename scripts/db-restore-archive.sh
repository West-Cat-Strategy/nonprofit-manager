#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

ARCHIVE_FILE="${1:-${DB_ARCHIVE_FILE:-}}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-8002}"
DB_SERVICE="${DB_SERVICE:-postgres}"
DB_COMPOSE_PROJECT="${DB_COMPOSE_PROJECT:-$COMPOSE_PROJECT_DEV}"
DB_COMPOSE_FILE="${DB_COMPOSE_FILE:-$PROJECT_ROOT/docker-compose.dev.yml}"
DB_COMPOSE_FILES_RAW="${DB_COMPOSE_FILES:-$DB_COMPOSE_FILE}"
DB_COMPOSE_ENV_FILE="${DB_COMPOSE_ENV_FILE:-}"
DB_RESTORE_TARGET_DB="${DB_RESTORE_TARGET_DB:-postgres}"

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

if [[ -z "$ARCHIVE_FILE" ]]; then
  echo "Usage: scripts/db-restore-archive.sh <archive-file>" >&2
  exit 2
fi

if [[ "${DB_RESTORE_CONFIRM:-0}" != "1" ]]; then
  echo "Set DB_RESTORE_CONFIRM=1 to confirm the archive restore operation." >&2
  exit 1
fi

if [[ ! -f "$ARCHIVE_FILE" ]]; then
  echo "Archive file not found: $ARCHIVE_FILE" >&2
  exit 1
fi

restore_database() {
  if [[ "$DB_HOST" == "postgres" ]]; then
    cat "$ARCHIVE_FILE" | compose_db pg_restore --clean --if-exists --create --exit-on-error -U "$DB_USER" -d "$DB_RESTORE_TARGET_DB"
  else
    PGPASSWORD="$DB_PASSWORD" pg_restore --clean --if-exists --create --exit-on-error -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_RESTORE_TARGET_DB" "$ARCHIVE_FILE"
  fi
}

restore_database
echo "Database archive restored from $ARCHIVE_FILE"
