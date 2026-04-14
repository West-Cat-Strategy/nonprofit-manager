#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

DB_NAME="${DB_NAME:-nonprofit_manager_test}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-8012}"
DB_AUTO_START="${DB_AUTO_START:-1}"
DB_DRY_RUN="${DB_DRY_RUN:-0}"

verify_with_psql() {
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 "$@"
}

if [[ "$DB_AUTO_START" != "0" ]]; then
  env \
    COMPOSE_MODE="${COMPOSE_MODE:-ci}" \
    DB_NAME="$DB_NAME" \
    DB_PORT="$DB_PORT" \
    DB_PASSWORD="$DB_PASSWORD" \
    "$PROJECT_ROOT/scripts/db-migrate.sh" >/dev/null
fi

if [[ "$DB_DRY_RUN" == "1" ]]; then
  log_info "Migration verification dry-run complete."
  exit 0
fi

verify_with_psql -c 'SELECT 1;' >/dev/null
echo "✓ Database connection successful"

mapfile -t expected_migrations < <(
  awk -F '\t' 'BEGIN { OFS="\t" } /^[0-9]/ { print $2 }' "$PROJECT_ROOT/database/migrations/manifest.tsv"
)

mapfile -t applied_migrations < <(
  verify_with_psql -Atqc "SELECT canonical_filename FROM schema_migrations WHERE canonical_filename IS NOT NULL ORDER BY migration_id, canonical_filename;"
)

if [[ "${#expected_migrations[@]}" -ne "${#applied_migrations[@]}" ]]; then
  echo "Migration verification failed: expected ${#expected_migrations[@]} migrations but found ${#applied_migrations[@]}" >&2
  exit 1
fi

for i in "${!expected_migrations[@]}"; do
  if [[ "${expected_migrations[$i]}" != "${applied_migrations[$i]}" ]]; then
    echo "Migration verification failed: migration mismatch at position $((i + 1))" >&2
    echo "Expected: ${expected_migrations[$i]}" >&2
    echo "Actual:   ${applied_migrations[$i]}" >&2
    exit 1
  fi
done

echo "✓ All migration files applied"

expected_tables=(
  users
  accounts
  contacts
  volunteers
  volunteer_assignments
  events
  event_registrations
  donations
  tasks
  activities
)

missing_tables=()
for table in "${expected_tables[@]}"; do
  count="$(verify_with_psql -Atqc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table';")"
  if [[ "$count" != "1" ]]; then
    missing_tables+=("$table")
  fi
done

if [[ "${#missing_tables[@]}" -gt 0 ]]; then
  echo "Migration verification failed: missing expected tables: ${missing_tables[*]}" >&2
  exit 1
fi

echo "✓ All expected tables exist"

foreign_key_issues="$(verify_with_psql -Atqc "SELECT COUNT(*) FROM pg_constraint WHERE contype = 'f' AND NOT convalidated;")"
if [[ "$foreign_key_issues" != "0" ]]; then
  echo "Migration verification failed: unvalidated foreign keys detected" >&2
  exit 1
fi

echo "✓ All foreign keys valid"
echo "Migration verification completed successfully!"
