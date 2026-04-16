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

validate_production_db_at_rest_contract() {
  if [[ "${NODE_ENV:-}" != "production" ]]; then
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
