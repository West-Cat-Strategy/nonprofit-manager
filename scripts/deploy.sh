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

get_env_file_value() {
  local file="$1"
  local key="$2"

  if [[ ! -f "$file" ]]; then
    return 0
  fi

  awk -F= -v key="$key" '$1 == key { sub(/^[^=]+=/, "", $0); print $0; exit }' "$file"
}

require_cmd docker
validate_production_db_at_rest_contract

deploy_local() {
  compose_with_project_files "${COMPOSE_PROJECT_DEV:-nonprofit-dev}" "$PROJECT_ROOT/docker-compose.dev.yml" -- up -d --build --remove-orphans
}

deploy_production_like() {
  local env_file="$PROJECT_ROOT/.env.production"
  local caddy_domain="localhost"
  local caddy_backend_upstream=""
  local caddy_frontend_upstream=""
  local caddy_public_site_upstream=""
  local caddy_public_site_domain="sites.westcat.ca"
  local use_host_caddy="${DEPLOY_USE_HOST_CADDY:-0}"
  local -a compose_files=(
    "$PROJECT_ROOT/docker-compose.yml"
    "$PROJECT_ROOT/docker-compose.host-access.yml"
  )

  if [[ "$MODE" == "staging" && -f "$PROJECT_ROOT/.env.staging" ]]; then
    env_file="$PROJECT_ROOT/.env.staging"
  fi

  local db_at_rest_mode="${DB_AT_REST_ENCRYPTION_MODE:-}"
  if [[ -z "$db_at_rest_mode" && -f "$env_file" ]]; then
    db_at_rest_mode="$(
      grep -E '^DB_AT_REST_ENCRYPTION_MODE=' "$env_file" | tail -n1 | cut -d= -f2-
    )"
  fi
  db_at_rest_mode="${db_at_rest_mode,,}"

  if [[ "$db_at_rest_mode" == "luks" ]]; then
    compose_files+=("$PROJECT_ROOT/docker-compose.db-encrypted.yml")
  fi

  if [[ "$MODE" == "production" ]]; then
    caddy_domain="${CADDY_DOMAIN:-$(get_env_file_value "$env_file" CADDY_DOMAIN)}"
    caddy_public_site_domain="${CADDY_PUBLIC_SITE_DOMAIN:-$(get_env_file_value "$env_file" CADDY_PUBLIC_SITE_DOMAIN)}"
    caddy_domain="${caddy_domain:-westcat.ca}"
    caddy_public_site_domain="${caddy_public_site_domain:-sites.westcat.ca}"

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
    compose_files+=("$PROJECT_ROOT/docker-compose.caddy.yml")
  fi

  if [[ "${DEPLOY_EXECUTE:-0}" != "1" ]]; then
    echo "Deployment mode '$MODE' validated."
    echo "Set DEPLOY_EXECUTE=1 to run the deployment command."
    echo "Planned command:"
    if [[ -n "$caddy_backend_upstream" ]]; then
      echo "  DEPLOY_USE_HOST_CADDY=$use_host_caddy CADDY_DOMAIN=$caddy_domain CADDY_PUBLIC_SITE_DOMAIN=$caddy_public_site_domain CADDY_BACKEND_UPSTREAM=$caddy_backend_upstream CADDY_FRONTEND_UPSTREAM=$caddy_frontend_upstream CADDY_PUBLIC_SITE_UPSTREAM=$caddy_public_site_upstream ${COMPOSE_CMD[*]} -p $COMPOSE_PROJECT_PROD --env-file $env_file"
    else
      echo "  DEPLOY_USE_HOST_CADDY=$use_host_caddy CADDY_DOMAIN=$caddy_domain CADDY_PUBLIC_SITE_DOMAIN=$caddy_public_site_domain ${COMPOSE_CMD[*]} -p $COMPOSE_PROJECT_PROD --env-file $env_file"
    fi
    for compose_file in "${compose_files[@]}"; do
      echo "    -f $compose_file"
    done
    echo "    up -d --build --remove-orphans"
    return 0
  fi

  if [[ -n "$caddy_backend_upstream" ]]; then
    CADDY_DOMAIN="$caddy_domain" \
    CADDY_PUBLIC_SITE_DOMAIN="$caddy_public_site_domain" \
    CADDY_BACKEND_UPSTREAM="$caddy_backend_upstream" \
    CADDY_FRONTEND_UPSTREAM="$caddy_frontend_upstream" \
    CADDY_PUBLIC_SITE_UPSTREAM="$caddy_public_site_upstream" \
    compose_with_project_files "$COMPOSE_PROJECT_PROD" "${compose_files[@]}" -- --env-file "$env_file" up -d --build --remove-orphans
  else
    CADDY_DOMAIN="$caddy_domain" \
    CADDY_PUBLIC_SITE_DOMAIN="$caddy_public_site_domain" \
    compose_with_project_files "$COMPOSE_PROJECT_PROD" "${compose_files[@]}" -- --env-file "$env_file" up -d --build --remove-orphans
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
