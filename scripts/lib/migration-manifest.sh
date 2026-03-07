#!/usr/bin/env bash

MIGRATION_MANIFEST_FILE_NAME="${MIGRATION_MANIFEST_FILE_NAME:-manifest.tsv}"

MIGRATION_IDS=()
MIGRATION_CANONICAL_FILES=()
MIGRATION_ALIASES=()

trim_string() {
  local value="${1:-}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

join_csv() {
  local result=""
  local value

  for value in "$@"; do
    if [[ -z "$result" ]]; then
      result="$value"
    else
      result="$result,$value"
    fi
  done

  printf '%s' "$result"
}

manifest_path_for_dir() {
  local migrations_dir="$1"
  printf '%s/%s' "$migrations_dir" "$MIGRATION_MANIFEST_FILE_NAME"
}

find_manifest_index_by_id() {
  local target="$1"
  local i

  for ((i = 0; i < ${#MIGRATION_IDS[@]}; i++)); do
    if [[ "${MIGRATION_IDS[$i]}" == "$target" ]]; then
      printf '%s' "$i"
      return 0
    fi
  done

  return 1
}

find_manifest_index_by_canonical_filename() {
  local target="$1"
  local i

  for ((i = 0; i < ${#MIGRATION_CANONICAL_FILES[@]}; i++)); do
    if [[ "${MIGRATION_CANONICAL_FILES[$i]}" == "$target" ]]; then
      printf '%s' "$i"
      return 0
    fi
  done

  return 1
}

find_manifest_index_by_known_filename() {
  local target="$1"
  local i
  local alias_csv
  local alias
  local -a alias_parts=()

  for ((i = 0; i < ${#MIGRATION_IDS[@]}; i++)); do
    if [[ "${MIGRATION_CANONICAL_FILES[$i]}" == "$target" ]]; then
      printf '%s' "$i"
      return 0
    fi

    alias_csv="${MIGRATION_ALIASES[$i]}"
    if [[ -z "$alias_csv" ]]; then
      continue
    fi

    IFS=',' read -r -a alias_parts <<< "$alias_csv"
    if (( ${#alias_parts[@]} > 0 )); then
      for alias in "${alias_parts[@]}"; do
        if [[ "$alias" == "$target" ]]; then
          printf '%s' "$i"
          return 0
        fi
      done
    fi
  done

  return 1
}

canonical_filename_for_migration_id() {
  local migration_id="$1"
  local index

  index="$(find_manifest_index_by_id "$migration_id")" || return 1
  printf '%s' "${MIGRATION_CANONICAL_FILES[$index]}"
}

aliases_csv_for_migration_id() {
  local migration_id="$1"
  local index

  index="$(find_manifest_index_by_id "$migration_id")" || return 1
  printf '%s' "${MIGRATION_ALIASES[$index]}"
}

sql_quote() {
  local value="$1"
  value="${value//\'/\'\'}"
  printf "'%s'" "$value"
}

current_time_millis() {
  if command -v node >/dev/null 2>&1; then
    node -e 'process.stdout.write(String(Date.now()))'
    return 0
  fi

  printf '%s000' "$(date +%s)"
}

format_duration_millis() {
  local start_ms="${1:-0}"
  local end_ms="${2:-0}"
  local delta_ms=$((end_ms - start_ms))
  local seconds
  local millis

  if ((delta_ms < 0)); then
    delta_ms=0
  fi

  seconds=$((delta_ms / 1000))
  millis=$((delta_ms % 1000))

  printf '%s.%03ds' "$seconds" "$millis"
}

calculate_file_checksum() {
  local file_path="$1"

  if command -v md5sum >/dev/null 2>&1; then
    md5sum "$file_path" | cut -d' ' -f1
    return 0
  fi

  if command -v md5 >/dev/null 2>&1; then
    md5 -q "$file_path"
    return 0
  fi

  printf ''
}

load_migration_manifest() {
  local migrations_dir="$1"
  local manifest_path
  local line_no=0
  local raw_id=""
  local raw_filename=""
  local raw_aliases=""
  local extra=""

  migrations_dir="$(cd "$migrations_dir" && pwd)"
  manifest_path="$(manifest_path_for_dir "$migrations_dir")"

  if [[ ! -f "$manifest_path" ]]; then
    echo "Migration manifest not found: $manifest_path" >&2
    return 1
  fi

  MIGRATION_IDS=()
  MIGRATION_CANONICAL_FILES=()
  MIGRATION_ALIASES=()

  while IFS=$'\t' read -r raw_id raw_filename raw_aliases extra || [[ -n "${raw_id}${raw_filename}${raw_aliases}${extra}" ]]; do
    line_no=$((line_no + 1))

    if [[ -z "${raw_id}${raw_filename}${raw_aliases}${extra}" ]]; then
      continue
    fi

    if [[ "$raw_id" == \#* ]]; then
      continue
    fi

    if [[ "$raw_id" == "migration_id" && "$raw_filename" == "canonical_filename" ]]; then
      continue
    fi

    local migration_id
    local canonical_filename
    local aliases_csv
    local -a alias_parts=()
    local alias
    local -a normalized_aliases=()
    local actual_path
    local known_index

    if [[ -n "$extra" ]]; then
      echo "Invalid migration manifest row at line $line_no: expected 3 columns" >&2
      return 1
    fi

    migration_id="$(trim_string "$raw_id")"
    canonical_filename="$(trim_string "$raw_filename")"

    if [[ -z "$migration_id" || -z "$canonical_filename" ]]; then
      echo "Invalid migration manifest row at line $line_no: missing migration_id or canonical_filename" >&2
      return 1
    fi

    if [[ "$canonical_filename" != "${migration_id}_"*.sql ]]; then
      echo "Invalid migration manifest row at line $line_no: canonical filename must start with '${migration_id}_'" >&2
      return 1
    fi

    if find_manifest_index_by_id "$migration_id" >/dev/null 2>&1; then
      echo "Duplicate migration id in manifest: $migration_id" >&2
      return 1
    fi

    if find_manifest_index_by_known_filename "$canonical_filename" >/dev/null 2>&1; then
      echo "Duplicate canonical filename in manifest: $canonical_filename" >&2
      return 1
    fi

    actual_path="$migrations_dir/$canonical_filename"
    if [[ ! -f "$actual_path" ]]; then
      echo "Manifest canonical file does not exist: $canonical_filename" >&2
      return 1
    fi

    IFS=',' read -r -a alias_parts <<< "${raw_aliases:-}"
    if (( ${#alias_parts[@]} > 0 )); then
      for alias in "${alias_parts[@]}"; do
        alias="$(trim_string "$alias")"
        if [[ -z "$alias" ]]; then
          continue
        fi

        if [[ "$alias" == "$canonical_filename" ]]; then
          echo "Manifest alias duplicates canonical filename for $migration_id: $alias" >&2
          return 1
        fi

        known_index="$(find_manifest_index_by_known_filename "$alias" || true)"
        if [[ -n "$known_index" ]]; then
          echo "Manifest alias collides with another known filename: $alias" >&2
          return 1
        fi

        normalized_aliases+=("$alias")
      done
    fi

    if (( ${#normalized_aliases[@]} > 0 )); then
      aliases_csv="$(join_csv "${normalized_aliases[@]}")"
    else
      aliases_csv=""
    fi

    MIGRATION_IDS+=("$migration_id")
    MIGRATION_CANONICAL_FILES+=("$canonical_filename")
    MIGRATION_ALIASES+=("$aliases_csv")
  done < "$manifest_path"

  if [[ ${#MIGRATION_IDS[@]} -eq 0 ]]; then
    echo "Migration manifest is empty: $manifest_path" >&2
    return 1
  fi

  local actual_file=""
  local actual_basename=""

  while IFS= read -r actual_file; do
    actual_basename="$(basename "$actual_file")"
    if ! find_manifest_index_by_canonical_filename "$actual_basename" >/dev/null 2>&1; then
      echo "Migration SQL file is not declared in manifest: $actual_basename" >&2
      return 1
    fi
  done < <(find "$migrations_dir" -maxdepth 1 -type f -name '*.sql' | sort)
}

emit_schema_migrations_bootstrap_sql() {
  cat <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  checksum VARCHAR(64)
);

ALTER TABLE schema_migrations
  ADD COLUMN IF NOT EXISTS migration_id TEXT,
  ADD COLUMN IF NOT EXISTS canonical_filename TEXT;

CREATE INDEX IF NOT EXISTS idx_schema_migrations_migration_id
  ON schema_migrations(migration_id);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_canonical_filename
  ON schema_migrations(canonical_filename);
SQL
}

emit_manifest_known_filename_values_sql() {
  local separator=""
  local i
  local alias_csv
  local -a alias_parts=()
  local alias

  for ((i = 0; i < ${#MIGRATION_IDS[@]}; i++)); do
    printf '%s(%s, %s, %s)\n' \
      "$separator" \
      "$(sql_quote "${MIGRATION_IDS[$i]}")" \
      "$(sql_quote "${MIGRATION_CANONICAL_FILES[$i]}")" \
      "$(sql_quote "${MIGRATION_CANONICAL_FILES[$i]}")"
    separator=",      "

    alias_csv="${MIGRATION_ALIASES[$i]}"
    if [[ -z "$alias_csv" ]]; then
      continue
    fi

    IFS=',' read -r -a alias_parts <<< "$alias_csv"
    if (( ${#alias_parts[@]} > 0 )); then
      for alias in "${alias_parts[@]}"; do
        if [[ -z "$alias" ]]; then
          continue
        fi

        printf '%s(%s, %s, %s)\n' \
          "$separator" \
          "$(sql_quote "${MIGRATION_IDS[$i]}")" \
          "$(sql_quote "${MIGRATION_CANONICAL_FILES[$i]}")" \
          "$(sql_quote "$alias")"
        separator=",      "
      done
    fi
  done
}

emit_schema_migrations_backfill_sql() {
  cat <<SQL
WITH manifest(migration_id, canonical_filename, known_filename) AS (
      VALUES
      $(emit_manifest_known_filename_values_sql)
),
resolved AS (
  SELECT DISTINCT ON (sm.id)
    sm.id AS schema_migration_id,
    manifest.migration_id,
    manifest.canonical_filename
  FROM schema_migrations sm
  JOIN manifest
    ON sm.filename = manifest.known_filename
    OR sm.migration_id = manifest.migration_id
  ORDER BY
    sm.id,
    CASE WHEN sm.filename = manifest.canonical_filename THEN 0 ELSE 1 END,
    manifest.known_filename
)
UPDATE schema_migrations sm
SET migration_id = resolved.migration_id,
    canonical_filename = resolved.canonical_filename
FROM resolved
WHERE sm.id = resolved.schema_migration_id
  AND (
    sm.migration_id IS DISTINCT FROM resolved.migration_id
    OR sm.canonical_filename IS DISTINCT FROM resolved.canonical_filename
  );
SQL
}

emit_schema_migration_record_sql() {
  local migration_id="$1"
  local canonical_filename="$2"
  local checksum="$3"
  local checksum_sql="NULL"

  if [[ -n "$checksum" ]]; then
    checksum_sql="$(sql_quote "$checksum")"
  fi

  cat <<SQL
$(emit_schema_migrations_backfill_sql)

INSERT INTO schema_migrations (filename, checksum, migration_id, canonical_filename)
SELECT
  $(sql_quote "$canonical_filename"),
  $checksum_sql,
  $(sql_quote "$migration_id"),
  $(sql_quote "$canonical_filename")
WHERE NOT EXISTS (
  SELECT 1
  FROM schema_migrations
  WHERE migration_id = $(sql_quote "$migration_id")
     OR filename = $(sql_quote "$canonical_filename")
     OR canonical_filename = $(sql_quote "$canonical_filename")
);
SQL
}
