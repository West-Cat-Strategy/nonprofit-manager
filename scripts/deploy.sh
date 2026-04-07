#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/lib/config.sh"
source "$ROOT_DIR/scripts/lib/db-at-rest.sh"

MODE="${1:-}"
if [[ -z "$MODE" ]]; then
  echo "Usage: scripts/deploy.sh <local|staging|production>" >&2
  exit 2
fi

require_cmd docker
validate_production_db_at_rest_contract

deploy_local() {
  compose -f "$ROOT_DIR/docker-compose.dev.yml" up -d --build --remove-orphans
}

deploy_production_like() {
  local env_file="$ROOT_DIR/.env.production"
  local caddy_domain="localhost"
  local caddy_backend_upstream="backend:8000"
  local caddy_frontend_upstream="frontend:8001"
  local caddy_public_site_upstream="public-site:8006"
  local caddy_public_site_domain="sites.westcat.ca"
  if [[ "$MODE" == "staging" && -f "$ROOT_DIR/.env.staging" ]]; then
    env_file="$ROOT_DIR/.env.staging"
  fi

  if [[ "$MODE" == "production" ]]; then
    caddy_domain="${CADDY_DOMAIN:-westcat.ca}"
    caddy_public_site_domain="${CADDY_PUBLIC_SITE_DOMAIN:-sites.westcat.ca}"
  fi

  if [[ "${DEPLOY_EXECUTE:-0}" != "1" ]]; then
    echo "Deployment mode '$MODE' validated."
    echo "Set DEPLOY_EXECUTE=1 to run the deployment command."
    echo "Planned command:"
    echo "  CADDY_DOMAIN=$caddy_domain CADDY_BACKEND_UPSTREAM=$caddy_backend_upstream CADDY_FRONTEND_UPSTREAM=$caddy_frontend_upstream CADDY_PUBLIC_SITE_UPSTREAM=$caddy_public_site_upstream CADDY_PUBLIC_SITE_DOMAIN=$caddy_public_site_domain ${COMPOSE_CMD[*]} -p ${COMPOSE_PROJECT_PROD:-nonprofit-prod} --env-file $env_file -f docker-compose.yml -f docker-compose.host-access.yml -f docker-compose.caddy.yml up -d --build --remove-orphans"
    return 0
  fi

  CADDY_DOMAIN="$caddy_domain" \
  CADDY_BACKEND_UPSTREAM="$caddy_backend_upstream" \
  CADDY_FRONTEND_UPSTREAM="$caddy_frontend_upstream" \
  CADDY_PUBLIC_SITE_UPSTREAM="$caddy_public_site_upstream" \
  CADDY_PUBLIC_SITE_DOMAIN="$caddy_public_site_domain" \
  "${COMPOSE_CMD[@]}" \
    -p "${COMPOSE_PROJECT_PROD:-nonprofit-prod}" \
    --env-file "$env_file" \
    -f "$ROOT_DIR/docker-compose.yml" \
    -f "$ROOT_DIR/docker-compose.host-access.yml" \
    -f "$ROOT_DIR/docker-compose.caddy.yml" \
    up -d --build --remove-orphans
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
