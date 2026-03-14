#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PSQL_BIN="${PSQL_BIN:-$(command -v psql || true)}"
JQ_BIN="${JQ_BIN:-$(command -v jq || true)}"
DOCKER_BIN="${DOCKER_BIN:-$(command -v docker || true)}"

if [[ -z "$PSQL_BIN" || -z "$JQ_BIN" || -z "$DOCKER_BIN" ]]; then
  echo "psql, jq, and docker are required" >&2
  exit 1
fi

CONTAINER_NAME="${P4_T9H_PERF_CONTAINER:-nonprofit-p4-t9h-perf-postgres}"
PORT="${P4_T9H_PERF_PORT:-55432}"
DB_NAME="${P4_T9H_PERF_DB:-nonprofit_manager_perf}"
DB_USER="${P4_T9H_PERF_USER:-postgres}"
DB_PASSWORD="${P4_T9H_PERF_PASSWORD:-postgres}"
ARTIFACT_DIR="${P4_T9H_PERF_ARTIFACT_DIR:-$ROOT_DIR/docs/performance/artifacts/p4-t9h}"
RAW_DIR="$ARTIFACT_DIR/raw"
SEED_SQL="$ROOT_DIR/scripts/perf/p4-t9h-seed.sql"
SEARCH_PATTERN="${P4_T9H_SEARCH_PATTERN:-%supportwave%}"

mkdir -p "$RAW_DIR"

cleanup() {
  if [[ "${KEEP_PERF_CONTAINER:-0}" != "1" ]]; then
    "$DOCKER_BIN" rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

"$DOCKER_BIN" rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
"$DOCKER_BIN" run -d \
  --name "$CONTAINER_NAME" \
  -e POSTGRES_PASSWORD="$DB_PASSWORD" \
  -p "$PORT:5432" \
  postgres:16 >/dev/null

for attempt in $(seq 1 30); do
  if PGPASSWORD="$DB_PASSWORD" "$PSQL_BIN" -h 127.0.0.1 -p "$PORT" -U "$DB_USER" -d postgres -c 'SELECT 1' >/dev/null 2>&1; then
    break
  fi

  if [[ "$attempt" == "30" ]]; then
    echo "Postgres did not become ready on port $PORT" >&2
    exit 1
  fi

  sleep 1
done

if ! PGPASSWORD="$DB_PASSWORD" "$PSQL_BIN" -h 127.0.0.1 -p "$PORT" -U "$DB_USER" -d postgres -Atqc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1; then
  PGPASSWORD="$DB_PASSWORD" "$PSQL_BIN" -h 127.0.0.1 -p "$PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\"" >/dev/null
fi

DIRECT_DB_CONNECTION=1 \
DB_HOST=127.0.0.1 \
DB_PORT="$PORT" \
DB_NAME="$DB_NAME" \
DB_USER="$DB_USER" \
DB_PASSWORD="$DB_PASSWORD" \
"$ROOT_DIR/scripts/db-migrate.sh" >/dev/null

PGPASSWORD="$DB_PASSWORD" "$PSQL_BIN" -h 127.0.0.1 -p "$PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SEED_SQL" >/dev/null
PGPASSWORD="$DB_PASSWORD" "$PSQL_BIN" -h 127.0.0.1 -p "$PORT" -U "$DB_USER" -d "$DB_NAME" -c 'ANALYZE;' >/dev/null

run_explain() {
  local name="$1"
  local sql="$2"
  local target="$RAW_DIR/${name}.json"

  PGPASSWORD="$DB_PASSWORD" "$PSQL_BIN" \
    -X -A -t -P pager=off \
    -h 127.0.0.1 -p "$PORT" -U "$DB_USER" -d "$DB_NAME" \
    -c "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}" >"$target"
}

execution_time() {
  "$JQ_BIN" '.[0]["Execution Time"]' "$1"
}

plan_signals() {
  "$JQ_BIN" -r '
    def walkplans: ., (.Plans[]? | walkplans);
    [
      .[0].Plan
      | walkplans
      | .["Node Type"]
      + (if .["Relation Name"] then " on " + .["Relation Name"] else "" end)
      + (if .["Index Name"] then " via " + .["Index Name"] else "" end)
    ]
    | unique
    | join("; ")
  ' "$1"
}

ACCOUNT_OLD_COUNT_SQL=$(cat <<SQL
SELECT COUNT(*)
FROM accounts
WHERE (
  account_name ILIKE '${SEARCH_PATTERN}' OR
  email ILIKE '${SEARCH_PATTERN}' OR
  account_number ILIKE '${SEARCH_PATTERN}'
)
SQL
)

ACCOUNT_OLD_DATA_SQL=$(cat <<SQL
SELECT
  id AS account_id,
  account_number,
  account_name,
  account_type,
  category,
  email,
  phone,
  website,
  description,
  address_line1,
  address_line2,
  city,
  state_province,
  postal_code,
  country,
  tax_id,
  is_active,
  created_at,
  updated_at,
  created_by,
  modified_by
FROM accounts
WHERE (
  account_name ILIKE '${SEARCH_PATTERN}' OR
  email ILIKE '${SEARCH_PATTERN}' OR
  account_number ILIKE '${SEARCH_PATTERN}'
)
ORDER BY created_at DESC
LIMIT 20 OFFSET 0
SQL
)

ACCOUNT_NEW_SQL=$(cat <<SQL
WITH filtered_accounts AS (
  SELECT
    id AS account_id,
    account_number,
    account_name,
    account_type,
    category,
    email,
    phone,
    website,
    description,
    address_line1,
    address_line2,
    city,
    state_province,
    postal_code,
    country,
    tax_id,
    is_active,
    created_at,
    updated_at,
    created_by,
    modified_by
  FROM accounts
  WHERE coalesce(account_name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(account_number, '') ILIKE '${SEARCH_PATTERN}'
),
paged_accounts AS (
  SELECT
    fa.*,
    COUNT(*) OVER()::int AS total_count
  FROM filtered_accounts fa
  ORDER BY created_at DESC
  LIMIT 20 OFFSET 0
)
SELECT *
FROM paged_accounts
ORDER BY created_at DESC
SQL
)

CONTACT_OLD_COUNT_SQL=$(cat <<SQL
SELECT COUNT(*)
FROM contacts c
WHERE (
  c.first_name ILIKE '${SEARCH_PATTERN}' OR
  c.preferred_name ILIKE '${SEARCH_PATTERN}' OR
  c.last_name ILIKE '${SEARCH_PATTERN}' OR
  c.email ILIKE '${SEARCH_PATTERN}' OR
  c.phone ILIKE '${SEARCH_PATTERN}' OR
  c.mobile_phone ILIKE '${SEARCH_PATTERN}' OR
  CONCAT(c.first_name, ' ', c.last_name) ILIKE '${SEARCH_PATTERN}' OR
  CONCAT(COALESCE(c.preferred_name, ''), ' ', c.last_name) ILIKE '${SEARCH_PATTERN}'
)
SQL
)

CONTACT_OLD_DATA_SQL=$(cat <<SQL
SELECT
  c.id AS contact_id,
  c.account_id,
  c.first_name,
  c.preferred_name,
  c.last_name,
  c.middle_name,
  c.salutation,
  c.suffix,
  c.birth_date,
  c.gender,
  c.pronouns,
  c.phn_encrypted,
  c.email,
  c.phone,
  c.mobile_phone,
  c.job_title,
  c.department,
  c.preferred_contact_method,
  c.do_not_email,
  c.do_not_phone,
  c.do_not_text,
  c.do_not_voicemail,
  c.address_line1,
  c.address_line2,
  c.city,
  c.state_province,
  c.postal_code,
  c.country,
  c.no_fixed_address,
  c.notes,
  c.tags,
  c.is_active,
  c.created_at,
  c.updated_at,
  a.account_name,
  COALESCE(phone_counts.cnt, 0) AS phone_count,
  COALESCE(email_counts.cnt, 0) AS email_count,
  COALESCE(rel_counts.cnt, 0) AS relationship_count,
  COALESCE(note_counts.cnt, 0) AS note_count,
  COALESCE(
    (
      SELECT ARRAY_AGG(cr.name)
      FROM contact_role_assignments cra
      JOIN contact_roles cr ON cr.id = cra.role_id
      WHERE cra.contact_id = c.id
    ),
    ARRAY[]::text[]
  ) AS roles
FROM contacts c
LEFT JOIN accounts a ON c.account_id = a.id
LEFT JOIN (
  SELECT contact_id, COUNT(*) AS cnt
  FROM contact_phone_numbers
  GROUP BY contact_id
) phone_counts ON phone_counts.contact_id = c.id
LEFT JOIN (
  SELECT contact_id, COUNT(*) AS cnt
  FROM contact_email_addresses
  GROUP BY contact_id
) email_counts ON email_counts.contact_id = c.id
LEFT JOIN (
  SELECT contact_id, COUNT(*) AS cnt
  FROM contact_relationships
  WHERE is_active = true
  GROUP BY contact_id
) rel_counts ON rel_counts.contact_id = c.id
LEFT JOIN (
  SELECT contact_id, COUNT(*) AS cnt
  FROM contact_notes
  GROUP BY contact_id
) note_counts ON note_counts.contact_id = c.id
WHERE (
  c.first_name ILIKE '${SEARCH_PATTERN}' OR
  c.preferred_name ILIKE '${SEARCH_PATTERN}' OR
  c.last_name ILIKE '${SEARCH_PATTERN}' OR
  c.email ILIKE '${SEARCH_PATTERN}' OR
  c.phone ILIKE '${SEARCH_PATTERN}' OR
  c.mobile_phone ILIKE '${SEARCH_PATTERN}' OR
  CONCAT(c.first_name, ' ', c.last_name) ILIKE '${SEARCH_PATTERN}' OR
  CONCAT(COALESCE(c.preferred_name, ''), ' ', c.last_name) ILIKE '${SEARCH_PATTERN}'
)
ORDER BY c.created_at DESC
LIMIT 20 OFFSET 0
SQL
)

CONTACT_NEW_SQL=$(cat <<SQL
WITH filtered_contacts AS (
  SELECT
    c.id AS contact_id,
    c.account_id,
    c.first_name,
    c.preferred_name,
    c.last_name,
    c.middle_name,
    c.salutation,
    c.suffix,
    c.birth_date,
    c.gender,
    c.pronouns,
    c.phn_encrypted,
    c.email,
    c.phone,
    c.mobile_phone,
    c.job_title,
    c.department,
    c.preferred_contact_method,
    c.do_not_email,
    c.do_not_phone,
    c.do_not_text,
    c.do_not_voicemail,
    c.address_line1,
    c.address_line2,
    c.city,
    c.state_province,
    c.postal_code,
    c.country,
    c.no_fixed_address,
    c.notes,
    c.tags,
    c.is_active,
    c.created_at,
    c.updated_at,
    c.created_by,
    c.modified_by,
    a.account_name
  FROM contacts c
  LEFT JOIN accounts a ON c.account_id = a.id
  WHERE coalesce(c.first_name, '') || ' ' || coalesce(c.preferred_name, '') || ' ' || coalesce(c.last_name, '') || ' ' || coalesce(c.email, '') || ' ' || coalesce(c.phone, '') || ' ' || coalesce(c.mobile_phone, '') ILIKE '${SEARCH_PATTERN}'
),
paged_contacts AS (
  SELECT
    fc.*,
    COUNT(*) OVER()::int AS total_count
  FROM filtered_contacts fc
  ORDER BY created_at DESC
  LIMIT 20 OFFSET 0
),
phone_counts AS (
  SELECT contact_id, COUNT(*)::int AS cnt
  FROM contact_phone_numbers
  WHERE contact_id IN (SELECT contact_id FROM paged_contacts)
  GROUP BY contact_id
),
email_counts AS (
  SELECT contact_id, COUNT(*)::int AS cnt
  FROM contact_email_addresses
  WHERE contact_id IN (SELECT contact_id FROM paged_contacts)
  GROUP BY contact_id
),
rel_counts AS (
  SELECT contact_id, COUNT(*)::int AS cnt
  FROM contact_relationships
  WHERE is_active = true
    AND contact_id IN (SELECT contact_id FROM paged_contacts)
  GROUP BY contact_id
),
note_counts AS (
  SELECT contact_id, COUNT(*)::int AS cnt
  FROM contact_notes
  WHERE contact_id IN (SELECT contact_id FROM paged_contacts)
  GROUP BY contact_id
),
role_agg AS (
  SELECT
    cra.contact_id,
    ARRAY_AGG(cr.name ORDER BY cr.name) AS roles
  FROM contact_role_assignments cra
  JOIN contact_roles cr ON cr.id = cra.role_id
  WHERE cra.contact_id IN (SELECT contact_id FROM paged_contacts)
  GROUP BY cra.contact_id
)
SELECT
  pc.*,
  COALESCE(phone_counts.cnt, 0) AS phone_count,
  COALESCE(email_counts.cnt, 0) AS email_count,
  COALESCE(rel_counts.cnt, 0) AS relationship_count,
  COALESCE(note_counts.cnt, 0) AS note_count,
  COALESCE(role_agg.roles, ARRAY[]::text[]) AS roles
FROM paged_contacts pc
LEFT JOIN phone_counts ON phone_counts.contact_id = pc.contact_id
LEFT JOIN email_counts ON email_counts.contact_id = pc.contact_id
LEFT JOIN rel_counts ON rel_counts.contact_id = pc.contact_id
LEFT JOIN note_counts ON note_counts.contact_id = pc.contact_id
LEFT JOIN role_agg ON role_agg.contact_id = pc.contact_id
ORDER BY pc.created_at DESC
SQL
)

TASK_OLD_COUNT_SQL=$(cat <<SQL
SELECT COUNT(*)
FROM tasks t
WHERE (t.subject ILIKE '${SEARCH_PATTERN}' OR t.description ILIKE '${SEARCH_PATTERN}')
SQL
)

TASK_OLD_DATA_SQL=$(cat <<SQL
SELECT
  t.*,
  u.first_name || ' ' || u.last_name AS assigned_to_name,
  CASE
    WHEN t.related_to_type = 'account' THEN a.account_name
    WHEN t.related_to_type = 'contact' THEN c.first_name || ' ' || c.last_name
    ELSE NULL
  END AS related_to_name
FROM tasks t
LEFT JOIN users u ON t.assigned_to = u.id
LEFT JOIN accounts a ON t.related_to_type = 'account' AND t.related_to_id = a.id
LEFT JOIN contacts c ON t.related_to_type = 'contact' AND t.related_to_id = c.id
WHERE (t.subject ILIKE '${SEARCH_PATTERN}' OR t.description ILIKE '${SEARCH_PATTERN}')
ORDER BY
  CASE WHEN t.status IN ('completed', 'cancelled') THEN 1 ELSE 0 END,
  CASE t.priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'normal' THEN 3
    WHEN 'low' THEN 4
  END,
  t.due_date ASC NULLS LAST,
  t.created_at DESC
LIMIT 20 OFFSET 0
SQL
)

TASK_NEW_SQL=$(cat <<SQL
WITH paged_tasks AS (
  SELECT
    t.*,
    COUNT(*) OVER()::int AS total_count
  FROM tasks t
  WHERE coalesce(t.subject, '') || ' ' || coalesce(t.description, '') ILIKE '${SEARCH_PATTERN}'
  ORDER BY
    CASE WHEN t.status IN ('completed', 'cancelled') THEN 1 ELSE 0 END,
    CASE t.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    t.due_date ASC NULLS LAST,
    t.created_at DESC
  LIMIT 20 OFFSET 0
)
SELECT
  pt.*,
  u.first_name || ' ' || u.last_name AS assigned_to_name,
  CASE
    WHEN pt.related_to_type = 'account' THEN a.account_name
    WHEN pt.related_to_type = 'contact' THEN c.first_name || ' ' || c.last_name
    ELSE NULL
  END AS related_to_name
FROM paged_tasks pt
LEFT JOIN users u ON pt.assigned_to = u.id
LEFT JOIN accounts a ON pt.related_to_type = 'account' AND pt.related_to_id = a.id
LEFT JOIN contacts c ON pt.related_to_type = 'contact' AND pt.related_to_id = c.id
ORDER BY
  CASE WHEN pt.status IN ('completed', 'cancelled') THEN 1 ELSE 0 END,
  CASE pt.priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'normal' THEN 3
    WHEN 'low' THEN 4
  END,
  pt.due_date ASC NULLS LAST,
  pt.created_at DESC
SQL
)

CASE_OLD_COUNT_SQL=$(cat <<SQL
SELECT COUNT(*)
FROM cases c
WHERE (
  c.case_number ILIKE '${SEARCH_PATTERN}' OR
  c.title ILIKE '${SEARCH_PATTERN}' OR
  c.description ILIKE '${SEARCH_PATTERN}'
)
SQL
)

CASE_OLD_DATA_SQL=$(cat <<SQL
SELECT
  c.id,
  c.case_number,
  c.contact_id,
  c.account_id,
  c.case_type_id,
  c.status_id,
  c.priority,
  c.title,
  c.description,
  c.source,
  c.referral_source,
  c.intake_date,
  c.opened_date,
  c.closed_date,
  c.due_date,
  c.assigned_to,
  c.assigned_team,
  c.outcome,
  c.outcome_notes,
  c.closure_reason,
  c.intake_data,
  c.custom_data,
  c.is_urgent,
  c.requires_followup,
  c.followup_date,
  c.tags,
  c.client_viewable,
  c.created_at,
  c.updated_at,
  c.created_by,
  c.modified_by,
  ct.name AS case_type_name,
  ct.color AS case_type_color,
  ct.icon AS case_type_icon,
  cs.name AS status_name,
  cs.color AS status_color,
  cs.status_type,
  con.first_name AS contact_first_name,
  con.last_name AS contact_last_name,
  con.email AS contact_email,
  con.phone AS contact_phone,
  u.first_name AS assigned_first_name,
  u.last_name AS assigned_last_name,
  (SELECT COUNT(*) FROM case_notes WHERE case_id = c.id) AS notes_count,
  (SELECT COUNT(*) FROM case_documents WHERE case_id = c.id) AS documents_count
FROM cases c
LEFT JOIN case_types ct ON c.case_type_id = ct.id
LEFT JOIN case_statuses cs ON c.status_id = cs.id
LEFT JOIN contacts con ON c.contact_id = con.id
LEFT JOIN users u ON c.assigned_to = u.id
WHERE (
  c.case_number ILIKE '${SEARCH_PATTERN}' OR
  c.title ILIKE '${SEARCH_PATTERN}' OR
  c.description ILIKE '${SEARCH_PATTERN}'
)
ORDER BY c.created_at DESC
LIMIT 20 OFFSET 0
SQL
)

CASE_NEW_SQL=$(cat <<SQL
WITH filtered_cases AS (
  SELECT
    c.id,
    c.case_number,
    c.contact_id,
    c.account_id,
    c.case_type_id,
    c.status_id,
    c.priority,
    c.title,
    c.description,
    c.source,
    c.referral_source,
    c.intake_date,
    c.opened_date,
    c.closed_date,
    c.due_date,
    c.assigned_to,
    c.assigned_team,
    c.outcome,
    c.outcome_notes,
    c.closure_reason,
    c.intake_data,
    c.custom_data,
    c.is_urgent,
    c.requires_followup,
    c.followup_date,
    c.tags,
    c.client_viewable,
    c.created_at,
    c.updated_at,
    c.created_by,
    c.modified_by
  FROM cases c
  WHERE coalesce(c.case_number, '') || ' ' || coalesce(c.title, '') || ' ' || coalesce(c.description, '') ILIKE '${SEARCH_PATTERN}'
),
paged_cases AS (
  SELECT
    fc.*,
    COUNT(*) OVER()::int AS total_count
  FROM filtered_cases fc
  ORDER BY created_at DESC
  LIMIT 20 OFFSET 0
),
note_counts AS (
  SELECT case_id, COUNT(*)::int AS notes_count
  FROM case_notes
  WHERE case_id IN (SELECT id FROM paged_cases)
  GROUP BY case_id
),
document_counts AS (
  SELECT case_id, COUNT(*)::int AS documents_count
  FROM case_documents
  WHERE case_id IN (SELECT id FROM paged_cases)
  GROUP BY case_id
)
SELECT
  pc.*,
  ct.name AS case_type_name,
  ct.color AS case_type_color,
  ct.icon AS case_type_icon,
  cs.name AS status_name,
  cs.color AS status_color,
  cs.status_type,
  con.first_name AS contact_first_name,
  con.last_name AS contact_last_name,
  con.email AS contact_email,
  con.phone AS contact_phone,
  u.first_name AS assigned_first_name,
  u.last_name AS assigned_last_name,
  COALESCE(note_counts.notes_count, 0) AS notes_count,
  COALESCE(document_counts.documents_count, 0) AS documents_count
FROM paged_cases pc
LEFT JOIN case_types ct ON pc.case_type_id = ct.id
LEFT JOIN case_statuses cs ON pc.status_id = cs.id
LEFT JOIN contacts con ON pc.contact_id = con.id
LEFT JOIN users u ON pc.assigned_to = u.id
LEFT JOIN note_counts ON note_counts.case_id = pc.id
LEFT JOIN document_counts ON document_counts.case_id = pc.id
ORDER BY pc.created_at DESC
SQL
)

run_explain "accounts-old-count" "$ACCOUNT_OLD_COUNT_SQL"
run_explain "accounts-old-data" "$ACCOUNT_OLD_DATA_SQL"
run_explain "accounts-new" "$ACCOUNT_NEW_SQL"

run_explain "contacts-old-count" "$CONTACT_OLD_COUNT_SQL"
run_explain "contacts-old-data" "$CONTACT_OLD_DATA_SQL"
run_explain "contacts-new" "$CONTACT_NEW_SQL"

run_explain "tasks-old-count" "$TASK_OLD_COUNT_SQL"
run_explain "tasks-old-data" "$TASK_OLD_DATA_SQL"
run_explain "tasks-new" "$TASK_NEW_SQL"

run_explain "cases-old-count" "$CASE_OLD_COUNT_SQL"
run_explain "cases-old-data" "$CASE_OLD_DATA_SQL"
run_explain "cases-new" "$CASE_NEW_SQL"

format_sum() {
  awk -v a="$1" -v b="$2" 'BEGIN {printf "%.3f", a + b}'
}

format_diff() {
  awk -v a="$1" -v b="$2" 'BEGIN {printf "%.3f", a - b}'
}

write_summary_row() {
  local domain="$1"
  local old_count_file="$2"
  local old_data_file="$3"
  local new_file="$4"
  local note="$5"

  local old_count_ms old_data_ms old_total_ms new_ms
  local old_signals new_signals

  old_count_ms="$(execution_time "$old_count_file")"
  old_data_ms="$(execution_time "$old_data_file")"
  old_total_ms="$(format_sum "$old_count_ms" "$old_data_ms")"
  new_ms="$(execution_time "$new_file")"
  old_signals="$(plan_signals "$old_count_file") + $(plan_signals "$old_data_file")"
  new_signals="$(plan_signals "$new_file")"

  printf '| %s | %.3f | %.3f | %.3f | %s | %s | %s |\n' \
    "$domain" \
    "$old_total_ms" \
    "$new_ms" \
    "$(format_diff "$old_total_ms" "$new_ms")" \
    "$old_signals" \
    "$new_signals" \
    "$note" >>"$ARTIFACT_DIR/summary.md"
}

cat >"$ARTIFACT_DIR/summary.md" <<EOF
# P4-T9H Explain Summary

Generated: $(date -u '+%Y-%m-%d %H:%M:%SZ')
Search pattern: \`${SEARCH_PATTERN}\`

| Domain | Old count+list ms | New list ms | Improvement ms | Old plan signals | New plan signals | Notes |
| --- | ---: | ---: | ---: | --- | --- | --- |
EOF

write_summary_row \
  "Accounts" \
  "$RAW_DIR/accounts-old-count.json" \
  "$RAW_DIR/accounts-old-data.json" \
  "$RAW_DIR/accounts-new.json" \
  "Old path measures separate count + page query. New path folds total into one filtered dataset."

write_summary_row \
  "Contacts" \
  "$RAW_DIR/contacts-old-count.json" \
  "$RAW_DIR/contacts-old-data.json" \
  "$RAW_DIR/contacts-new.json" \
  "New path scopes phone/email/relationship/note/role aggregates to the current page."

write_summary_row \
  "Tasks" \
  "$RAW_DIR/tasks-old-count.json" \
  "$RAW_DIR/tasks-old-data.json" \
  "$RAW_DIR/tasks-new.json" \
  "Summary query still exists separately; this comparison isolates the old count+list path versus the new combined page query."

write_summary_row \
  "Cases" \
  "$RAW_DIR/cases-old-count.json" \
  "$RAW_DIR/cases-old-data.json" \
  "$RAW_DIR/cases-new.json" \
  "New path replaces correlated note/document counts with page-scoped aggregate joins."

echo "Perf artifacts written to $ARTIFACT_DIR"
