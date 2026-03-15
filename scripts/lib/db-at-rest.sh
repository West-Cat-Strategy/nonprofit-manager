#!/bin/bash
# Shared helpers for production database at-rest encryption enforcement.

env_file_value() {
    local key="$1"
    local env_file="$2"

    if [[ -z "$env_file" || ! -f "$env_file" ]]; then
        return 0
    fi

    grep -E "^${key}=" "$env_file" 2>/dev/null | tail -n 1 | cut -d'=' -f2- | sed 's/^"//' | sed 's/"$//'
}

db_at_rest_env_file() {
    local env_file="${1:-${COMPOSE_ENV_FILE:-.env.production}}"

    if [[ "$env_file" == /* ]]; then
        printf '%s\n' "$env_file"
        return 0
    fi

    printf '%s/%s\n' "$PROJECT_ROOT" "$env_file"
}

db_at_rest_value() {
    local key="$1"
    local env_file="$2"
    local fallback="${3:-}"
    local current="${!key:-}"

    if [[ -n "$current" ]]; then
        printf '%s\n' "$current"
        return 0
    fi

    local from_file
    from_file="$(env_file_value "$key" "$env_file")"
    if [[ -n "$from_file" ]]; then
        printf '%s\n' "$from_file"
        return 0
    fi

    printf '%s\n' "$fallback"
}

env_file_value_or_default() {
    local key="$1"
    local env_file="$2"
    local fallback="${3:-}"
    local from_file

    from_file="$(env_file_value "$key" "$env_file")"
    if [[ -n "$from_file" ]]; then
        printf '%s\n' "$from_file"
        return 0
    fi

    printf '%s\n' "$fallback"
}

production_db_at_rest_enforced() {
    local env_file="$1"
    local node_env

    node_env="$(db_at_rest_value NODE_ENV "$env_file" "")"
    [[ "$node_env" == "production" ]]
}

resolve_db_at_rest_mode() {
    local env_file="$1"

    db_at_rest_value DB_AT_REST_ENCRYPTION_MODE "$env_file" "" | tr '[:upper:]' '[:lower:]'
}

compose_files_for_db_at_rest_mode() {
    local base_files="$1"
    local env_file="$2"
    local db_mode

    db_mode="$(resolve_db_at_rest_mode "$env_file")"
    if production_db_at_rest_enforced "$env_file" && [[ "$db_mode" == "luks" ]]; then
        printf '%s %s\n' "$base_files" "${DB_ENCRYPTED_COMPOSE_FILE:-docker-compose.db-encrypted.yml}"
        return 0
    fi

    printf '%s\n' "$base_files"
}

validate_production_db_at_rest_config() {
    local env_file="$1"

    if ! production_db_at_rest_enforced "$env_file"; then
        return 0
    fi

    local db_mode
    db_mode="$(resolve_db_at_rest_mode "$env_file")"

    case "$db_mode" in
        managed)
            local db_host provider verified
            db_host="$(db_at_rest_value DB_HOST "$env_file" "")"
            provider="$(db_at_rest_value DB_AT_REST_PROVIDER "$env_file" "" | tr '[:upper:]' '[:lower:]')"
            verified="$(db_at_rest_value DB_AT_REST_VERIFIED "$env_file" "")"

            if [[ -z "$db_host" ]]; then
                log_error "DB_HOST must be set when DB_AT_REST_ENCRYPTION_MODE=managed"
                return 1
            fi

            if [[ "$db_host" == "postgres" ]]; then
                log_error "DB_HOST must not be 'postgres' when DB_AT_REST_ENCRYPTION_MODE=managed"
                return 1
            fi

            case "$provider" in
                rds|cloudsql|azure|other)
                    ;;
                *)
                    log_error "DB_AT_REST_PROVIDER must be one of: rds, cloudsql, azure, other when DB_AT_REST_ENCRYPTION_MODE=managed"
                    return 1
                    ;;
            esac

            if [[ "$verified" != "true" ]]; then
                log_error "DB_AT_REST_VERIFIED must be set to 'true' when DB_AT_REST_ENCRYPTION_MODE=managed"
                return 1
            fi
            ;;
        luks)
            local db_host postgres_data_dir luks_mapping_name
            db_host="$(db_at_rest_value DB_HOST "$env_file" "")"
            postgres_data_dir="$(db_at_rest_value POSTGRES_DATA_DIR "$env_file" "")"
            luks_mapping_name="$(db_at_rest_value DB_LUKS_MAPPING_NAME "$env_file" "")"

            if [[ "$db_host" != "postgres" ]]; then
                log_error "DB_HOST must be set to 'postgres' when DB_AT_REST_ENCRYPTION_MODE=luks"
                return 1
            fi

            if [[ -z "$postgres_data_dir" ]]; then
                log_error "POSTGRES_DATA_DIR must be set when DB_AT_REST_ENCRYPTION_MODE=luks"
                return 1
            fi

            if [[ "$postgres_data_dir" != /* ]]; then
                log_error "POSTGRES_DATA_DIR must be an absolute host path when DB_AT_REST_ENCRYPTION_MODE=luks"
                return 1
            fi

            if [[ -z "$luks_mapping_name" ]]; then
                log_error "DB_LUKS_MAPPING_NAME must be set when DB_AT_REST_ENCRYPTION_MODE=luks"
                return 1
            fi
            ;;
        *)
            log_error "DB_AT_REST_ENCRYPTION_MODE must be set to 'managed' or 'luks' in production"
            return 1
            ;;
    esac

    return 0
}

find_mount_source_for_target() {
    local target_path="$1"
    local probe="$target_path"

    if ! command_exists findmnt; then
        log_error "findmnt is required to verify encrypted mount targets"
        return 1
    fi

    while [[ ! -e "$probe" && "$probe" != "/" ]]; do
        probe="$(dirname "$probe")"
    done

    if [[ ! -e "$probe" ]]; then
        log_error "Cannot resolve an existing mount target for $target_path"
        return 1
    fi

    findmnt -n -o SOURCE --target "$probe"
}

validate_luks_mount_target() {
    local target_path="$1"
    local luks_mapping_name="$2"
    local expected_source="/dev/mapper/$luks_mapping_name"
    local actual_source

    actual_source="$(find_mount_source_for_target "$target_path")" || return 1
    if [[ "$actual_source" != "$expected_source" ]]; then
        log_error "$target_path must be mounted from $expected_source (found: ${actual_source:-unknown})"
        return 1
    fi

    return 0
}

validate_production_backup_target() {
    local env_file="$1"

    if ! production_db_at_rest_enforced "$env_file"; then
        return 0
    fi

    local db_mode backup_dir luks_mapping_name
    db_mode="$(resolve_db_at_rest_mode "$env_file")"

    if [[ "$db_mode" == "managed" ]]; then
        log_error "Local database backups are disabled when DB_AT_REST_ENCRYPTION_MODE=managed; use provider-encrypted snapshots/backups instead"
        return 1
    fi

    if [[ "$db_mode" != "luks" ]]; then
        log_error "Cannot validate backup target without a supported DB_AT_REST_ENCRYPTION_MODE"
        return 1
    fi

    backup_dir="$(db_at_rest_value BACKUP_DIR "$env_file" "")"
    if [[ -z "$backup_dir" ]]; then
        log_error "BACKUP_DIR must be set to an absolute path on the encrypted host mount when DB_AT_REST_ENCRYPTION_MODE=luks"
        return 1
    fi

    if [[ "$backup_dir" != /* ]]; then
        log_error "BACKUP_DIR must be an absolute path when DB_AT_REST_ENCRYPTION_MODE=luks"
        return 1
    fi

    luks_mapping_name="$(db_at_rest_value DB_LUKS_MAPPING_NAME "$env_file" "")"
    if [[ -z "$luks_mapping_name" ]]; then
        log_error "DB_LUKS_MAPPING_NAME must be set when DB_AT_REST_ENCRYPTION_MODE=luks"
        return 1
    fi

    validate_luks_mount_target "$backup_dir" "$luks_mapping_name"
}
