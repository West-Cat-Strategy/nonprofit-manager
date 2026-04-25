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
VERIFY_ALLOW_NON_TEST_DB="${VERIFY_ALLOW_NON_TEST_DB:-0}"
APP_DB_USER="${APP_DB_USER:-${DB_APP_USER:-nonprofit_app_user}}"
APP_DB_PASSWORD="${APP_DB_PASSWORD:-${DB_APP_PASSWORD:-nonprofit_app_password}}"
AUDIT_PARTITION_MONTHS_AHEAD="${AUDIT_PARTITION_MONTHS_AHEAD:-12}"

FAILURES=0
RLS_FIXTURE_USER_ID="00000000-0000-4000-8000-000000000101"
RLS_FIXTURE_ACCOUNT_ID="00000000-0000-4000-8000-000000000201"
RLS_FIXTURE_CONTACT_ID="00000000-0000-4000-8000-000000000301"
RLS_FIXTURE_ACCESS_ID="00000000-0000-4000-8000-000000000401"
RLS_UNKNOWN_USER_ID="00000000-0000-4000-8000-000000000999"

admin_psql() {
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 "$@"
}

app_psql() {
  PGPASSWORD="$APP_DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$APP_DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 "$@"
}

record_failure() {
  log_error "$1"
  FAILURES=$((FAILURES + 1))
}

run_check() {
  local description="$1"
  shift

  if "$@"; then
    log_success "$description"
    return 0
  fi

  record_failure "$description"
  return 1
}

check_manifest_policy() {
  node "$PROJECT_ROOT/scripts/check-migration-manifest-policy.ts"
}

check_isolated_target() {
  if [[ "$VERIFY_ALLOW_NON_TEST_DB" == "1" ]]; then
    return 0
  fi

  if [[ "$DB_NAME" == *_test || "$DB_PORT" == "8012" ]]; then
    return 0
  fi

  echo "Migration verification failed: refusing to run destructive verification checks against non-test database ${DB_HOST}:${DB_PORT}/${DB_NAME}. Set VERIFY_ALLOW_NON_TEST_DB=1 to override." >&2
  return 1
}

if [[ "$DB_AUTO_START" != "0" ]]; then
  env \
    COMPOSE_MODE="${COMPOSE_MODE:-ci}" \
    DB_HOST="$DB_HOST" \
    DB_NAME="$DB_NAME" \
    DB_PORT="$DB_PORT" \
    DB_USER="$DB_USER" \
    DB_PASSWORD="$DB_PASSWORD" \
    "$PROJECT_ROOT/scripts/db-migrate.sh" >/dev/null
fi

if [[ "$DB_DRY_RUN" == "1" ]]; then
  log_info "Migration verification dry-run complete."
  exit 0
fi

check_database_connection() {
  admin_psql -c 'SELECT 1;' >/dev/null
}

check_applied_migrations() {
  local expected_migrations=()
  local applied_migrations=()
  local migration
  local i

  while IFS= read -r migration; do
    expected_migrations+=("$migration")
  done < <(
    awk -F '\t' 'BEGIN { OFS="\t" } /^[0-9]/ { print $2 }' "$PROJECT_ROOT/database/migrations/manifest.tsv"
  )

  while IFS= read -r migration; do
    applied_migrations+=("$migration")
  done < <(
    admin_psql -Atqc "SELECT canonical_filename FROM schema_migrations WHERE canonical_filename IS NOT NULL ORDER BY migration_id, canonical_filename;"
  )

  if [[ "${#expected_migrations[@]}" -ne "${#applied_migrations[@]}" ]]; then
    echo "Migration verification failed: expected ${#expected_migrations[@]} migrations but found ${#applied_migrations[@]}" >&2
    return 1
  fi

  for i in "${!expected_migrations[@]}"; do
    if [[ "${expected_migrations[$i]}" != "${applied_migrations[$i]}" ]]; then
      echo "Migration verification failed: migration mismatch at position $((i + 1))" >&2
      echo "Expected: ${expected_migrations[$i]}" >&2
      echo "Actual:   ${applied_migrations[$i]}" >&2
      return 1
    fi
  done

  return 0
}

check_expected_tables() {
  local expected_tables=(
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
  local missing_tables=()
  local table
  local count

  for table in "${expected_tables[@]}"; do
    count="$(admin_psql -Atqc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table';")"
    if [[ "$count" != "1" ]]; then
      missing_tables+=("$table")
    fi
  done

  if [[ "${#missing_tables[@]}" -gt 0 ]]; then
    echo "Migration verification failed: missing expected tables: ${missing_tables[*]}" >&2
    return 1
  fi

  return 0
}

check_foreign_keys() {
  local foreign_key_issues
  foreign_key_issues="$(admin_psql -Atqc "SELECT COUNT(*) FROM pg_constraint WHERE contype = 'f' AND NOT convalidated;")"
  if [[ "$foreign_key_issues" != "0" ]]; then
    echo "Migration verification failed: unvalidated foreign keys detected" >&2
    return 1
  fi

  return 0
}

ensure_app_role() {
  if [[ "$APP_DB_USER" == "$DB_USER" ]]; then
    echo "Migration verification failed: APP_DB_USER must differ from DB_USER to avoid mutating the bootstrap/admin role" >&2
    return 1
  fi

  admin_psql \
    -v app_db_user="$APP_DB_USER" \
    -v app_db_password="$APP_DB_PASSWORD" \
    -f "$SCRIPT_DIR/sql/verify_app_role.sql" >/dev/null
}

check_app_role_flags() {
  local role_state
  role_state="$(admin_psql -v app_db_user="$APP_DB_USER" -Atq -f "$SCRIPT_DIR/sql/verify_app_role_flags.sql")"

  if [[ -z "$role_state" ]]; then
    echo "Migration verification failed: app role '$APP_DB_USER' does not exist" >&2
    return 1
  fi

  local role_name
  local can_login
  local is_superuser
  local bypasses_rls
  local can_create_db
  local can_create_role
  IFS=$'\t' read -r role_name can_login is_superuser bypasses_rls can_create_db can_create_role <<<"$role_state"

  if [[ "$can_login" != "t" && "$can_login" != "true" ]] \
    || [[ "$is_superuser" != "f" && "$is_superuser" != "false" ]] \
    || [[ "$bypasses_rls" != "f" && "$bypasses_rls" != "false" ]] \
    || [[ "$can_create_db" != "f" && "$can_create_db" != "false" ]] \
    || [[ "$can_create_role" != "f" && "$can_create_role" != "false" ]]; then
    echo "Migration verification failed: app role '$role_name' must be LOGIN, non-superuser, no-bypassrls, no-createdb, and no-createrole" >&2
    echo "Observed: login=$can_login superuser=$is_superuser bypassrls=$bypasses_rls createdb=$can_create_db createrole=$can_create_role" >&2
    return 1
  fi

  return 0
}

check_rls_table_contract() {
  local bad_tables
  bad_tables="$(admin_psql -Atqc "
    WITH expected(table_name) AS (
      VALUES
        ('user_account_access'),
        ('accounts'),
        ('contacts'),
        ('donations'),
        ('volunteers'),
        ('events'),
        ('event_occurrences')
    )
    SELECT e.table_name
    FROM expected e
    LEFT JOIN pg_class c
      ON c.relname = e.table_name
    LEFT JOIN pg_namespace n
      ON n.oid = c.relnamespace
     AND n.nspname = 'public'
    WHERE c.oid IS NULL
       OR n.oid IS NULL
       OR NOT c.relrowsecurity
       OR NOT c.relforcerowsecurity
    ORDER BY e.table_name;
  ")"

  if [[ -n "$bad_tables" ]]; then
    echo "Migration verification failed: expected FORCE RLS on tables:" >&2
    printf '%s\n' "$bad_tables" >&2
    return 1
  fi

  return 0
}

seed_rls_fixtures() {
  admin_psql \
    -v fixture_user_id="$RLS_FIXTURE_USER_ID" \
    -v fixture_account_id="$RLS_FIXTURE_ACCOUNT_ID" \
    -v fixture_contact_id="$RLS_FIXTURE_CONTACT_ID" \
    -v fixture_access_id="$RLS_FIXTURE_ACCESS_ID" \
    -f "$SCRIPT_DIR/sql/verify_rls_fixtures.sql" >/dev/null
}

check_app_role_rls_behavior() {
  local scoped_counts
  scoped_counts="$(app_psql \
    -v unknown_user_id="$RLS_UNKNOWN_USER_ID" \
    -v fixture_user_id="$RLS_FIXTURE_USER_ID" \
    -v fixture_account_id="$RLS_FIXTURE_ACCOUNT_ID" \
    -v fixture_contact_id="$RLS_FIXTURE_CONTACT_ID" \
    -Atq \
    -f "$SCRIPT_DIR/sql/verify_rls_probe.sql")"

  local unknown_accounts
  local unknown_contacts
  local unknown_volunteers
  local known_accounts
  local known_contacts
  local known_volunteers
  local inserted_volunteers
  local updated_volunteers
  local deleted_volunteers
  local scoped_rows=()
  local scoped_row
  while IFS= read -r scoped_row; do
    scoped_rows+=("$scoped_row")
  done <<<"$scoped_counts"
  unknown_accounts="${scoped_rows[1]:-}"
  unknown_contacts="${scoped_rows[2]:-}"
  unknown_volunteers="${scoped_rows[3]:-}"
  known_accounts="${scoped_rows[5]:-}"
  known_contacts="${scoped_rows[6]:-}"
  known_volunteers="${scoped_rows[7]:-}"
  inserted_volunteers="${scoped_rows[8]:-}"
  updated_volunteers="${scoped_rows[9]:-}"
  deleted_volunteers="${scoped_rows[10]:-}"

  if [[ "$unknown_accounts" != "0" || "$unknown_contacts" != "0" || "$unknown_volunteers" != "0" || "$known_accounts" != "1" || "$known_contacts" != "1" || "$known_volunteers" != "0" || "$inserted_volunteers" != "1" || "$updated_volunteers" != "1" || "$deleted_volunteers" != "1" ]]; then
    echo "Migration verification failed: app role RLS behavior did not match expectations" >&2
    echo "Observed counts: unknown_accounts=$unknown_accounts unknown_contacts=$unknown_contacts unknown_volunteers=$unknown_volunteers known_accounts=$known_accounts known_contacts=$known_contacts known_volunteers=$known_volunteers inserted_volunteers=$inserted_volunteers updated_volunteers=$updated_volunteers deleted_volunteers=$deleted_volunteers" >&2
    return 1
  fi

  return 0
}

check_starter_bootstrap_seeds() {
  local missing_seeds
  missing_seeds="$(admin_psql -Atqc "
    WITH checks(label, ok) AS (
      VALUES
        ('002_starter_templates.sql :: templates.Simple Landing Page',
         EXISTS (
           SELECT 1 FROM templates
           WHERE name = 'Simple Landing Page'
             AND is_system_template = true
         )),
        ('006_theme_presets.sql :: theme_color_palettes.Nonprofit Blue',
         EXISTS (
           SELECT 1 FROM theme_color_palettes
           WHERE name = 'Nonprofit Blue'
             AND is_system = true
             AND is_active = true
         )),
        ('006_theme_presets.sql :: theme_font_pairings.Modern Sans',
         EXISTS (
           SELECT 1 FROM theme_font_pairings
           WHERE name = 'Modern Sans'
             AND is_system = true
             AND is_active = true
         )),
        ('007_data_scopes.sql :: Staff (Example) scopes',
         (
           SELECT COUNT(*)
           FROM data_scopes
           WHERE name = 'Staff (Example) - Own Records'
             AND resource IN ('accounts', 'contacts')
         ) = 2),
        ('008_outcome_definitions.sql :: reduced_criminal_justice_involvement',
         EXISTS (
           SELECT 1 FROM outcome_definitions
           WHERE key = 'reduced_criminal_justice_involvement'
             AND is_active = true
             AND is_reportable = true
         ))
    )
    SELECT label
    FROM checks
    WHERE NOT ok
    ORDER BY label;
  ")"

  if [[ -n "$missing_seeds" ]]; then
    echo "Migration verification failed: missing starter bootstrap rows:" >&2
    printf '%s\n' "$missing_seeds" >&2
    return 1
  fi

  return 0
}

check_forbidden_duplicate_indexes() {
  local forbidden_indexes
  forbidden_indexes="$(admin_psql -Atqc "
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = ANY (ARRAY[
        'idx_meeting_agenda_items_meeting',
        'idx_opportunities_stage',
        'idx_opportunities_status',
        'idx_opportunities_assigned',
        'idx_site_analytics_site_id'
      ])
    ORDER BY indexname;
  ")"

  if [[ -n "$forbidden_indexes" ]]; then
    echo "Migration verification failed: superseded indexes still exist:" >&2
    printf '%s\n' "$forbidden_indexes" >&2
    return 1
  fi

  return 0
}

check_audit_log_partition_window() {
  local missing_partitions
  local has_default_partition

  missing_partitions="$(admin_psql -Atqc "
    WITH required_partitions AS (
      SELECT format('audit_log_%s', to_char(month_start, 'YYYYMM')) AS partition_name
      FROM generate_series(
        date_trunc('month', CURRENT_DATE)::date,
        (date_trunc('month', CURRENT_DATE) + (('$AUDIT_PARTITION_MONTHS_AHEAD'::int - 1) * INTERVAL '1 month'))::date,
        INTERVAL '1 month'
      ) AS month_start
    ),
    existing_partitions AS (
      SELECT child.relname AS partition_name
      FROM pg_inherits i
      JOIN pg_class parent
        ON parent.oid = i.inhparent
      JOIN pg_class child
        ON child.oid = i.inhrelid
      JOIN pg_namespace namespace
        ON namespace.oid = child.relnamespace
      WHERE parent.relname = 'audit_log'
        AND namespace.nspname = 'public'
    )
    SELECT required_partitions.partition_name
    FROM required_partitions
    LEFT JOIN existing_partitions
      ON existing_partitions.partition_name = required_partitions.partition_name
    WHERE existing_partitions.partition_name IS NULL
    ORDER BY required_partitions.partition_name;
  ")"

  if [[ -n "$missing_partitions" ]]; then
    echo "Migration verification failed: audit_log is missing required future partitions:" >&2
    printf '%s\n' "$missing_partitions" >&2
    return 1
  fi

  has_default_partition="$(admin_psql -Atqc "
    SELECT COUNT(*)
    FROM pg_inherits i
    JOIN pg_class parent
      ON parent.oid = i.inhparent
    JOIN pg_class child
      ON child.oid = i.inhrelid
    JOIN pg_namespace namespace
      ON namespace.oid = child.relnamespace
    WHERE parent.relname = 'audit_log'
      AND namespace.nspname = 'public'
      AND child.relname = 'audit_log_default';
  ")"

  if [[ "$has_default_partition" != "1" ]]; then
    echo "Migration verification failed: audit_log_default partition is missing" >&2
    return 1
  fi

  return 0
}

run_check "Migration manifest policy matches manifest/initdb contract" check_manifest_policy
run_check "Verification target is an isolated test database" check_isolated_target
run_check "Database connection successful" check_database_connection
run_check "All canonical migration files are applied in manifest order" check_applied_migrations
run_check "All expected core tables exist" check_expected_tables
run_check "All foreign keys are validated" check_foreign_keys
run_check "Starter bootstrap rows from 002/006/007/008 are present" check_starter_bootstrap_seeds
run_check "Verification app role is provisioned for RLS checks" ensure_app_role
run_check "Verification app role is non-superuser and cannot bypass RLS" check_app_role_flags
run_check "Expected tables have FORCE RLS enabled" check_rls_table_contract
run_check "RLS verification fixtures are seeded" seed_rls_fixtures
run_check "Verification app role observes the RLS contract" check_app_role_rls_behavior
run_check "Known superseded indexes have been removed" check_forbidden_duplicate_indexes
run_check "Audit log partition window covers the required future range" check_audit_log_partition_window

if [[ "$FAILURES" -gt 0 ]]; then
  echo "Migration verification completed with ${FAILURES} failure(s)." >&2
  exit 1
fi

echo "Migration verification completed successfully!"
