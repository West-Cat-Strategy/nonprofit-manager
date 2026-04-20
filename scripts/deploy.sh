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

  if [[ "${DEPLOY_EXECUTE:-0}" != "1" ]]; then
    echo "Deployment mode '$MODE' validated."
    echo "Set DEPLOY_EXECUTE=1 to run the deployment command."
    echo "Planned command:"
    if [[ -n "$caddy_backend_upstream" ]]; then
      echo "  RUNTIME_ENV_FILE=$env_file DEPLOY_USE_HOST_CADDY=$use_host_caddy CADDY_DOMAIN=$caddy_domain CADDY_PUBLIC_SITE_DOMAIN=$caddy_public_site_domain CADDY_BACKEND_UPSTREAM=$caddy_backend_upstream CADDY_FRONTEND_UPSTREAM=$caddy_frontend_upstream CADDY_PUBLIC_SITE_UPSTREAM=$caddy_public_site_upstream ${COMPOSE_CMD[*]} -p $compose_project --env-file $env_file"
    else
      echo "  RUNTIME_ENV_FILE=$env_file DEPLOY_USE_HOST_CADDY=$use_host_caddy CADDY_DOMAIN=$caddy_domain CADDY_PUBLIC_SITE_DOMAIN=$caddy_public_site_domain ${COMPOSE_CMD[*]} -p $compose_project --env-file $env_file"
    fi
    for compose_file in "${compose_files[@]}"; do
      echo "    -f $compose_file"
    done
    echo "    up -d --build --remove-orphans"
    return 0
  fi

  if [[ -n "$caddy_backend_upstream" ]]; then
    RUNTIME_ENV_FILE="$env_file" \
    CADDY_DOMAIN="$caddy_domain" \
    CADDY_PUBLIC_SITE_DOMAIN="$caddy_public_site_domain" \
    CADDY_BACKEND_UPSTREAM="$caddy_backend_upstream" \
    CADDY_FRONTEND_UPSTREAM="$caddy_frontend_upstream" \
    CADDY_PUBLIC_SITE_UPSTREAM="$caddy_public_site_upstream" \
    compose_with_project_files "$compose_project" "${compose_files[@]}" -- --env-file "$env_file" up -d --build --remove-orphans
  else
    RUNTIME_ENV_FILE="$env_file" \
    CADDY_DOMAIN="$caddy_domain" \
    CADDY_PUBLIC_SITE_DOMAIN="$caddy_public_site_domain" \
    compose_with_project_files "$compose_project" "${compose_files[@]}" -- --env-file "$env_file" up -d --build --remove-orphans
  fi
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
