#!/bin/bash
# Production database-at-rest guardrails shared by backup/deploy helpers.

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"

MANAGED_DB_PROVIDERS=(rds cloudsql azure other)

is_managed_db_provider() {
  local value="${1:-}"
  local lowered="${value,,}"
  for provider in "${MANAGED_DB_PROVIDERS[@]}"; do
    if [[ "$lowered" == "$provider" ]]; then
      return 0
    fi
  done
  return 1
}

validate_production_db_at_rest_contract() {
  if [[ "${NODE_ENV:-}" != "production" ]]; then
    return 0
  fi

  local mode="${DB_AT_REST_ENCRYPTION_MODE:-}"
  mode="${mode,,}"

  if [[ -z "$mode" || ( "$mode" != "managed" && "$mode" != "luks" ) ]]; then
    echo 'DB_AT_REST_ENCRYPTION_MODE must be set to "managed" or "luks" in production' >&2
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
  else
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
  fi

  return 0
}

validate_backup_dir_for_luks() {
  if [[ "${NODE_ENV:-}" == "production" && "${DB_AT_REST_ENCRYPTION_MODE:-}" == "luks" ]]; then
    if ! require_abs_path "${BACKUP_DIR:-}"; then
      echo 'BACKUP_DIR must be an absolute path when DB_AT_REST_ENCRYPTION_MODE=luks in production' >&2
      return 1
    fi
  fi
}

