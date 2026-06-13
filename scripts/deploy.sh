#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
source "$PROJECT_ROOT/scripts/lib/db-at-rest.sh"

MODE="${1:-}"
if [[ -z "$MODE" ]]; then
  echo "Usage: scripts/deploy.sh <local|staging|production>" >&2
  exit 2
fi

require_cmd docker

deploy_local() {
  compose_with_project_files "${COMPOSE_PROJECT_DEV:-nonprofit-dev}" "$PROJECT_ROOT/docker-compose.dev.yml" -- up -d --build --remove-orphans
}

trim_whitespace() {
  local value="${1:-}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

append_extra_compose_files() {
  local extra_files="${DEPLOY_EXTRA_COMPOSE_FILES:-}"
  local entry
  local resolved_file
  local -a extra_compose_entries=()

  if [[ -z "$extra_files" ]]; then
    return 0
  fi

  IFS=',' read -r -a extra_compose_entries <<< "$extra_files"
  for entry in "${extra_compose_entries[@]}"; do
    entry="$(trim_whitespace "$entry")"
    if [[ -z "$entry" ]]; then
      continue
    fi

    if [[ "${entry:0:1}" == "/" ]]; then
      resolved_file="$entry"
    else
      resolved_file="$PROJECT_ROOT/$entry"
    fi

    if [[ ! -f "$resolved_file" ]]; then
      echo "Extra compose file not found: $resolved_file" >&2
      return 1
    fi

    compose_files+=("$resolved_file")
  done
}

validate_self_hosted_app_role_env() {
  local db_at_rest_mode
  db_at_rest_mode="$(to_lower "${DB_AT_REST_ENCRYPTION_MODE:-}")"

  if [[ "$MODE" != "production" || "$db_at_rest_mode" != "self_hosted" ]]; then
    return 0
  fi

  if [[ -z "${DB_USER:-}" ]]; then
    echo "DB_USER must be set to the self-hosted production app role, for example nonprofit_app_user_prod" >&2
    return 1
  fi

  if [[ "$DB_USER" == "postgres" ]]; then
    echo "DB_USER must not be postgres for self-hosted production app connections" >&2
    return 1
  fi

  if [[ -z "${DB_ADMIN_PASSWORD:-}" ]]; then
    echo "DB_ADMIN_PASSWORD must be set separately from DB_PASSWORD for the self-hosted postgres bootstrap/admin role" >&2
    return 1
  fi

  if [[ -z "${DB_PASSWORD:-}" ]]; then
    echo "DB_PASSWORD must be set for the self-hosted production app role" >&2
    return 1
  fi
}

validate_self_hosted_app_role_after_deploy() {
  local db_at_rest_mode
  local role_count
  local postgres_admin_user="${DB_ADMIN_USER:-postgres}"
  db_at_rest_mode="$(to_lower "${DB_AT_REST_ENCRYPTION_MODE:-}")"

  if [[ "$MODE" != "production" || "$db_at_rest_mode" != "self_hosted" ]]; then
    return 0
  fi

  role_count="$(
    compose_with_project_files "$compose_project" "${compose_files[@]}" -- \
      --env-file "$env_file" exec -T postgres \
      psql -U "$postgres_admin_user" -d "${DB_NAME:-nonprofit_manager}" \
        -v app_db_user="$DB_USER" \
        -Atq <<'SQL'
SELECT COUNT(*)
FROM pg_roles
WHERE rolname = :'app_db_user';
SQL
  )"

  if [[ "$role_count" != "1" ]]; then
    echo "Self-hosted production DB role '$DB_USER' does not exist." >&2
    echo "For a fresh data directory, docker-compose.db-self-hosted.yml provisions it with scripts/sql/provision_self_hosted_app_role.sh." >&2
    echo "For an existing data directory, run the provisioning helper as the postgres admin role before rerunning deploy." >&2
    return 1
  fi

  log_success "Self-hosted production DB role '$DB_USER' exists."
}

deploy_production_like() {
  local env_file=""
  local compose_project=""
  local caddy_domain=""
  local caddy_backend_upstream=""
  local caddy_frontend_upstream=""
  local caddy_public_site_upstream=""
  local caddy_public_site_domain=""
  local use_host_caddy="0"
  local -a compose_files=(
    "$PROJECT_ROOT/docker-compose.yml"
    "$PROJECT_ROOT/docker-compose.host-access.yml"
  )

  case "$MODE" in
    staging)
      env_file="${DEPLOY_STAGING_ENV_FILE:-$PROJECT_ROOT/.env.staging}"
      compose_project="${COMPOSE_PROJECT_STAGING:-nonprofit-staging}"
      ;;
    production)
      env_file="${DEPLOY_PRODUCTION_ENV_FILE:-$PROJECT_ROOT/.env.production}"
      compose_project="$COMPOSE_PROJECT_PROD"
      ;;
  esac

  require_env_file "$env_file"
  load_env_file_defaults "$env_file"

  export NODE_ENV=production
  validate_production_db_at_rest_contract "production"
  validate_self_hosted_app_role_env

  use_host_caddy="${DEPLOY_USE_HOST_CADDY:-0}"

  local db_at_rest_mode
  db_at_rest_mode="$(to_lower "${DB_AT_REST_ENCRYPTION_MODE:-}")"

  case "$db_at_rest_mode" in
    luks)
      compose_files+=("$PROJECT_ROOT/docker-compose.db-encrypted.yml")
      ;;
    self_hosted)
      compose_files+=("$PROJECT_ROOT/docker-compose.db-self-hosted.yml")
      ;;
  esac

  append_extra_compose_files

  if [[ "$MODE" == "production" ]]; then
    caddy_domain="${CADDY_DOMAIN:-app.example.org}"
    caddy_public_site_domain="${CADDY_PUBLIC_SITE_DOMAIN:-sites.example.org}"

    if [[ "$caddy_domain" == "$caddy_public_site_domain" ]]; then
      caddy_public_site_domain="sites.${caddy_domain}"
      log_warn "CADDY_PUBLIC_SITE_DOMAIN matched CADDY_DOMAIN; using fallback $caddy_public_site_domain."
    fi

    if [[ "$use_host_caddy" != "1" ]]; then
      compose_files+=("$PROJECT_ROOT/docker-compose.caddy.yml")
    else
      caddy_backend_upstream="${CADDY_BACKEND_UPSTREAM:-host.docker.internal:8000}"
      caddy_frontend_upstream="${CADDY_FRONTEND_UPSTREAM:-host.docker.internal:8001}"
      caddy_public_site_upstream="${CADDY_PUBLIC_SITE_UPSTREAM:-host.docker.internal:8006}"
    fi
  else
    caddy_domain="${CADDY_DOMAIN:-localhost}"
    caddy_public_site_domain="${CADDY_PUBLIC_SITE_DOMAIN:-sites.localhost}"
    compose_files+=("$PROJECT_ROOT/docker-compose.caddy.yml")
  fi

  if [[ -z "${SITE_BASE_URL:-}" ]]; then
    if [[ "$MODE" == "production" ]]; then
      export SITE_BASE_URL="https://$caddy_public_site_domain"
    else
      export SITE_BASE_URL="http://$caddy_public_site_domain"
    fi
  fi
  export PUBLIC_SITE_API_ORIGIN="${PUBLIC_SITE_API_ORIGIN:-$SITE_BASE_URL}"

  if [[ "${DEPLOY_EXECUTE:-0}" != "1" ]]; then
    echo "Deployment mode '$MODE' validated."
    echo "Set DEPLOY_EXECUTE=1 to run the deployment command."
    echo "Planned command:"
    if [[ -n "$caddy_backend_upstream" ]]; then
      echo "  RUNTIME_ENV_FILE=$env_file DEPLOY_USE_HOST_CADDY=$use_host_caddy SITE_BASE_URL=$SITE_BASE_URL PUBLIC_SITE_API_ORIGIN=$PUBLIC_SITE_API_ORIGIN CADDY_DOMAIN=$caddy_domain CADDY_PUBLIC_SITE_DOMAIN=$caddy_public_site_domain CADDY_BACKEND_UPSTREAM=$caddy_backend_upstream CADDY_FRONTEND_UPSTREAM=$caddy_frontend_upstream CADDY_PUBLIC_SITE_UPSTREAM=$caddy_public_site_upstream ${COMPOSE_CMD[*]} -p $compose_project --env-file $env_file"
    else
      echo "  RUNTIME_ENV_FILE=$env_file DEPLOY_USE_HOST_CADDY=$use_host_caddy SITE_BASE_URL=$SITE_BASE_URL PUBLIC_SITE_API_ORIGIN=$PUBLIC_SITE_API_ORIGIN CADDY_DOMAIN=$caddy_domain CADDY_PUBLIC_SITE_DOMAIN=$caddy_public_site_domain ${COMPOSE_CMD[*]} -p $compose_project --env-file $env_file"
    fi
    for compose_file in "${compose_files[@]}"; do
      echo "    -f $compose_file"
    done
    echo "    up -d --build --remove-orphans"
    if [[ "$MODE" == "production" && "$db_at_rest_mode" == "self_hosted" ]]; then
      echo "Self-hosted DB role preflight:"
      echo "  DB_USER=$DB_USER must already exist on existing data directories and is provisioned on fresh data directories by scripts/sql/provision_self_hosted_app_role.sh."
    fi
    return 0
  fi

  if [[ -n "$caddy_backend_upstream" ]]; then
    RUNTIME_ENV_FILE="$env_file" \
    SITE_BASE_URL="$SITE_BASE_URL" \
    PUBLIC_SITE_API_ORIGIN="$PUBLIC_SITE_API_ORIGIN" \
    CADDY_DOMAIN="$caddy_domain" \
    CADDY_PUBLIC_SITE_DOMAIN="$caddy_public_site_domain" \
    CADDY_BACKEND_UPSTREAM="$caddy_backend_upstream" \
    CADDY_FRONTEND_UPSTREAM="$caddy_frontend_upstream" \
    CADDY_PUBLIC_SITE_UPSTREAM="$caddy_public_site_upstream" \
    compose_with_project_files "$compose_project" "${compose_files[@]}" -- --env-file "$env_file" up -d --build --remove-orphans
  else
    RUNTIME_ENV_FILE="$env_file" \
    SITE_BASE_URL="$SITE_BASE_URL" \
    PUBLIC_SITE_API_ORIGIN="$PUBLIC_SITE_API_ORIGIN" \
    CADDY_DOMAIN="$caddy_domain" \
    CADDY_PUBLIC_SITE_DOMAIN="$caddy_public_site_domain" \
    compose_with_project_files "$compose_project" "${compose_files[@]}" -- --env-file "$env_file" up -d --build --remove-orphans
  fi

  validate_self_hosted_app_role_after_deploy
}

case "$MODE" in
  local)
    deploy_local
    ;;
  staging|production)
    deploy_production_like
    ;;
  *)
    echo "Unknown deploy mode: $MODE" >&2
    exit 2
    ;;
esac

echo "Deployment mode '$MODE' completed."
