#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

./scripts/validation-preflight.sh docker --compose --context "scripts/docker-validate-overlays.sh"

CADDY_DOCKER_IMAGE="${CADDY_DOCKER_IMAGE:-caddy:2-alpine@sha256:834468128c7696cec0ceea6172f7d692daf645ae51983ca76e39da54a97c570d}"

echo "Checking Docker image pinning policy..."
node scripts/check-docker-image-policy.mjs

if [[ -n "${DOCKER_COMPOSE:-}" ]]; then
  read -r -a compose_cmd <<< "$DOCKER_COMPOSE"
elif docker compose version >/dev/null 2>&1; then
  compose_cmd=(docker compose)
elif docker-compose version >/dev/null 2>&1; then
  compose_cmd=(docker-compose)
else
  echo "Docker Compose is required for overlay validation." >&2
  exit 1
fi

run_with_env() {
  local name="$1"
  shift

  echo "Validating $name..."
  env "$@"
}

prod_env=(
  DB_PASSWORD=postgres
  REDIS_URL=redis://redis:6379
  RUNTIME_ENV_FILE=.env.production.example
  NODE_ENV=production
  DB_AT_REST_ENCRYPTION_MODE=managed
  DB_AT_REST_PROVIDER=managed
  DB_AT_REST_VERIFIED=true
  DB_LUKS_MAPPING_NAME=nonprofit-manager
  POSTGRES_DATA_DIR=/tmp/nonprofit-manager-postgres
  BACKUP_DIR=/tmp/nonprofit-manager-backups
)

db_self_hosted_env=("${prod_env[@]}" DB_AT_REST_ENCRYPTION_MODE=self_hosted DB_AT_REST_PROVIDER=self_hosted)
db_encrypted_env=("${prod_env[@]}" DB_AT_REST_ENCRYPTION_MODE=luks DB_AT_REST_PROVIDER=luks)

run_with_env "dev compose config" \
  DEV_ENV_FILE=.env.development.example \
  "${compose_cmd[@]}" -p nonprofit-dev -f docker-compose.dev.yml config --quiet

run_with_env "dev+Caddy compose config" \
  DEV_ENV_FILE=.env.development.example \
  "${compose_cmd[@]}" -p nonprofit-dev -f docker-compose.dev.yml -f docker-compose.caddy.yml config --quiet

run_with_env "production compose config" \
  "${prod_env[@]}" \
  "${compose_cmd[@]}" --env-file .env.production.example -p nonprofit-prod -f docker-compose.yml config --quiet

run_with_env "production host-access compose config" \
  "${prod_env[@]}" \
  "${compose_cmd[@]}" --env-file .env.production.example -p nonprofit-prod -f docker-compose.yml -f docker-compose.host-access.yml config --quiet

run_with_env "self-hosted database compose config" \
  "${db_self_hosted_env[@]}" \
  "${compose_cmd[@]}" --env-file .env.production.example -p nonprofit-prod -f docker-compose.yml -f docker-compose.db-self-hosted.yml config --quiet

run_with_env "host-access self-hosted Postgres 14 root-layout compose config" \
  "${db_self_hosted_env[@]}" \
  "${compose_cmd[@]}" --env-file .env.production.example -p nonprofit-prod -f docker-compose.yml -f docker-compose.host-access.yml -f docker-compose.db-self-hosted.yml -f docker-compose.postgres14-root.yml config --quiet

run_with_env "encrypted database compose config" \
  "${db_encrypted_env[@]}" \
  "${compose_cmd[@]}" --env-file .env.production.example -p nonprofit-prod -f docker-compose.yml -f docker-compose.db-encrypted.yml config --quiet

run_with_env "Plausible compose config" \
  PLAUSIBLE_ENV_FILE=.env.plausible.example \
  "${compose_cmd[@]}" --env-file .env.plausible.example -p nonprofit-plausible -f docker-compose.plausible.yml config --quiet

run_with_env "OpenSearch compose config" \
  OPENSEARCH_ENV_FILE=.env.opensearch.example \
  "${compose_cmd[@]}" --env-file .env.opensearch.example -p nonprofit-opensearch -f docker-compose.opensearch.yml config --quiet

run_with_env "ELK compose config" \
  ELK_ENV_FILE=.env.elk.example \
  "${compose_cmd[@]}" --env-file .env.elk.example -p nonprofit-elk -f docker-compose.elk.yml config --quiet

echo "Validating Caddyfile..."
docker run --rm \
  -v "$PROJECT_ROOT/Caddyfile:/etc/caddy/Caddyfile:ro" \
  -e CADDY_DOMAIN=localhost \
  -e CADDY_PUBLIC_SITE_DOMAIN=sites.localhost \
  -e CADDY_BACKEND_UPSTREAM=host.docker.internal:8004 \
  -e CADDY_FRONTEND_UPSTREAM=host.docker.internal:8005 \
  -e CADDY_PUBLIC_SITE_UPSTREAM=host.docker.internal:8006 \
  "$CADDY_DOCKER_IMAGE" caddy validate --config /etc/caddy/Caddyfile
