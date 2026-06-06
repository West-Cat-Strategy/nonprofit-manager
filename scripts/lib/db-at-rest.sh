#!/bin/bash
# Production database-at-rest guardrails shared by backup/deploy helpers.

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"

MANAGED_DB_PROVIDERS=(rds cloudsql azure other)

is_managed_db_provider() {
  local value="${1:-}"
  local lowered
  lowered="$(to_lower "$value")"
  for provider in "${MANAGED_DB_PROVIDERS[@]}"; do
    if [[ "$lowered" == "$provider" ]]; then
      return 0
    fi
  done
  return 1
}

is_local_postgres_db_mode() {
  local value="${1:-}"
  local lowered
  lowered="$(to_lower "$value")"
  [[ "$lowered" == "luks" || "$lowered" == "self_hosted" ]]
}

require_env_file() {
  local file="${1:-}"

  if [[ -z "$file" ]]; then
    echo "Env file path is required" >&2
    return 1
  fi

  if [[ ! -f "$file" ]]; then
    echo "Env file not found: $file" >&2
    return 1
  fi
}

env_file_var_names() {
  local file="${1:-}"

  awk '
    /^[[:space:]]*(export[[:space:]]+)?[A-Za-z_][A-Za-z0-9_]*=/ {
      line = $0
      sub(/^[[:space:]]*export[[:space:]]+/, "", line)
      sub(/=.*/, "", line)
      gsub(/[[:space:]]+$/, "", line)
      print line
    }
  ' "$file"
}

trim_env_value() {
  local value="${1:-}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

parse_env_file_entry() {
  local line="${1:-}"
  local line_no="${2:-0}"
  local key
  local value

  line="${line%$'\r'}"
  line="$(trim_env_value "$line")"

  if [[ -z "$line" || "${line:0:1}" == "#" ]]; then
    return 1
  fi

  if [[ "$line" == export[[:space:]]* ]]; then
    line="${line#export}"
    line="$(trim_env_value "$line")"
  fi

  if [[ "$line" != *=* ]]; then
    echo "Invalid env file entry at line $line_no" >&2
    return 2
  fi

  key="$(trim_env_value "${line%%=*}")"
  value="${line#*=}"
  value="${value#"${value%%[![:space:]]*}"}"

  if [[ ! "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
    echo "Invalid env variable name at line $line_no: $key" >&2
    return 2
  fi

  if [[ "$value" == *'$('* || "$value" == *'`'* ]]; then
    echo "Unsafe env value rejected at line $line_no: $key" >&2
    return 2
  fi

  if [[ "$value" == \"*\" && "$value" == *\" ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
    value="${value:1:${#value}-2}"
  else
    value="$(trim_env_value "$value")"
  fi

  printf '%s=%s\n' "$key" "$value"
}

load_env_file_defaults() {
  local file="${1:-}"
  local key
  local value
  local parsed
  local raw_line
  local line_no=0

  require_env_file "$file" || return 1

  while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
    line_no=$((line_no + 1))
    local parse_status
    if parsed="$(parse_env_file_entry "$raw_line" "$line_no")"; then
      parse_status=0
    else
      parse_status=$?
    fi

    if [[ "$parse_status" == "1" ]]; then
      continue
    fi

    if [[ "$parse_status" != "0" ]]; then
      echo "Unable to load env file: $file" >&2
      return 1
    fi

    key="${parsed%%=*}"
    value="${parsed#*=}"

    if [[ -z "${!key+x}" ]]; then
      export "$key=$value"
    fi
  done < "$file"
}

validate_production_db_at_rest_contract() {
  local runtime_env="${1:-${NODE_ENV:-}}"

  if [[ "$(to_lower "$runtime_env")" != "production" ]]; then
    return 0
  fi

  local mode="${DB_AT_REST_ENCRYPTION_MODE:-}"
  mode="$(to_lower "$mode")"

  if [[ -z "$mode" || ( "$mode" != "managed" && "$mode" != "luks" && "$mode" != "self_hosted" ) ]]; then
    echo 'DB_AT_REST_ENCRYPTION_MODE must be set to "managed", "luks", or "self_hosted" in production' >&2
    return 1
  fi

  if [[ "$mode" == "managed" ]]; then
    if [[ -z "${DB_HOST:-}" ]]; then
      echo "DB_HOST must be set for managed production databases" >&2
      return 1
    fi

    if [[ "${DB_HOST:-}" == "postgres" ]]; then
      echo 'DB_HOST must not be "postgres" when DB_AT_REST_ENCRYPTION_MODE=managed' >&2
      return 1
    fi

    if ! is_managed_db_provider "${DB_AT_REST_PROVIDER:-}"; then
      echo 'DB_AT_REST_PROVIDER must be one of: rds, cloudsql, azure, other when DB_AT_REST_ENCRYPTION_MODE=managed' >&2
      return 1
    fi

    if [[ "${DB_AT_REST_VERIFIED:-}" != "true" ]]; then
      echo 'DB_AT_REST_VERIFIED must be set to "true" when DB_AT_REST_ENCRYPTION_MODE=managed' >&2
      return 1
    fi
  elif [[ "$mode" == "luks" ]]; then
    if [[ "${DB_HOST:-}" != "postgres" ]]; then
      echo 'DB_HOST must be set to "postgres" when DB_AT_REST_ENCRYPTION_MODE=luks' >&2
      return 1
    fi

    if ! require_abs_path "${POSTGRES_DATA_DIR:-}"; then
      echo 'POSTGRES_DATA_DIR must be an absolute host path when DB_AT_REST_ENCRYPTION_MODE=luks' >&2
      return 1
    fi

    if [[ -z "${DB_LUKS_MAPPING_NAME:-}" ]]; then
      echo 'DB_LUKS_MAPPING_NAME must be set when DB_AT_REST_ENCRYPTION_MODE=luks' >&2
      return 1
    fi
  else
    if [[ "${DB_HOST:-}" != "postgres" ]]; then
      echo 'DB_HOST must be set to "postgres" when DB_AT_REST_ENCRYPTION_MODE=self_hosted' >&2
      return 1
    fi

    if ! require_abs_path "${POSTGRES_DATA_DIR:-}"; then
      echo 'POSTGRES_DATA_DIR must be an absolute host path when DB_AT_REST_ENCRYPTION_MODE=self_hosted' >&2
      return 1
    fi

    if ! require_abs_path "${BACKUP_DIR:-}"; then
      echo 'BACKUP_DIR must be an absolute path when DB_AT_REST_ENCRYPTION_MODE=self_hosted in production' >&2
      return 1
    fi

    if [[ "${SELF_HOSTED_DB_RISK_ACCEPTED:-}" != "true" ]]; then
      echo 'SELF_HOSTED_DB_RISK_ACCEPTED must be set to "true" when DB_AT_REST_ENCRYPTION_MODE=self_hosted' >&2
      return 1
    fi
  fi

  return 0
}

validate_backup_dir_for_local_db() {
  if [[ "${NODE_ENV:-}" == "production" ]] && is_local_postgres_db_mode "${DB_AT_REST_ENCRYPTION_MODE:-}"; then
    if ! require_abs_path "${BACKUP_DIR:-}"; then
      echo 'BACKUP_DIR must be an absolute path when DB_AT_REST_ENCRYPTION_MODE is "luks" or "self_hosted" in production' >&2
      return 1
    fi
  fi
}

validate_backup_dir_for_luks() {
  validate_backup_dir_for_local_db
}
