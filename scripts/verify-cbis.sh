#!/bin/bash
# Read-only verification for the live cbis.westcat.ca deployment.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
source "$SCRIPT_DIR/lib/config.sh"
source "$SCRIPT_DIR/lib/db-at-rest.sh"

HOST_ALIAS="${CBIS_SSH_HOST:-cbis-vps}"
REMOTE_APP_DIR="${CBIS_REMOTE_PATH:-/srv/nonprofit-manager}"
PUBLIC_ORIGIN="${CBIS_PUBLIC_ORIGIN:-https://cbis.westcat.ca}"
SERVICE_NAME="${CBIS_SYSTEMD_SERVICE:-nonprofit-manager.service}"
COMPOSE_PROJECT_NAME_VALUE="${CBIS_COMPOSE_PROJECT_NAME:-nonprofit-manager}"
COMPOSE_FILES_VALUE="${CBIS_COMPOSE_FILES:-docker-compose.yml docker-compose.vps.yml}"

usage() {
  cat <<'USAGE'
Usage: ./scripts/verify-cbis.sh [--host <ssh-alias>] [--app-dir <remote-path>] [--public-origin <origin>]

Options:
  --host           SSH host alias or target (default: cbis-vps)
  --app-dir        Remote application directory (default: /srv/nonprofit-manager)
  --public-origin  Public site origin (default: https://cbis.westcat.ca)
  --help           Show this help text
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)
      HOST_ALIAS="$2"
      shift 2
      ;;
    --app-dir)
      REMOTE_APP_DIR="$2"
      shift 2
      ;;
    --public-origin)
      PUBLIC_ORIGIN="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      log_error "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

run_remote() {
  ssh "$HOST_ALIAS" "$@"
}

run_remote_script() {
  ssh "$HOST_ALIAS" "bash -s -- '$REMOTE_APP_DIR' '$SERVICE_NAME' '$COMPOSE_PROJECT_NAME_VALUE' '$COMPOSE_FILES_VALUE'" <<'REMOTE_SCRIPT'
set -euo pipefail

REMOTE_APP_DIR="$1"
SERVICE_NAME="$2"
COMPOSE_PROJECT_NAME_VALUE="$3"
COMPOSE_FILES_VALUE="$4"

cd "$REMOTE_APP_DIR"
source ./scripts/lib/common.sh
source ./scripts/lib/config.sh
source ./scripts/lib/db-at-rest.sh

ENV_FILE="$REMOTE_APP_DIR/.env.production"
validate_production_db_at_rest_config "$ENV_FILE"

if [[ "$(resolve_db_at_rest_mode "$ENV_FILE")" != "luks" ]]; then
  log_error "CBIS production requires DB_AT_REST_ENCRYPTION_MODE=luks"
  exit 1
fi

POSTGRES_DATA_DIR="$(db_at_rest_value POSTGRES_DATA_DIR "$ENV_FILE" "")"
BACKUP_DIR="$(db_at_rest_value BACKUP_DIR "$ENV_FILE" "")"
DB_LUKS_MAPPING_NAME="$(db_at_rest_value DB_LUKS_MAPPING_NAME "$ENV_FILE" "")"
COMPOSE_FILES_EFFECTIVE="$(compose_files_for_db_at_rest_mode "$COMPOSE_FILES_VALUE" "$ENV_FILE")"

systemctl is-active "$SERVICE_NAME"
systemctl is-enabled "$SERVICE_NAME"

if ! command -v cryptsetup >/dev/null 2>&1; then
  log_error "cryptsetup is required to verify the CBIS encrypted database mount"
  exit 1
fi

if command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1; then
  CRYPT_STATUS="$(sudo -n cryptsetup status "$DB_LUKS_MAPPING_NAME" 2>&1 || true)"
else
  CRYPT_STATUS="$(cryptsetup status "$DB_LUKS_MAPPING_NAME" 2>&1 || true)"
fi
if ! printf '%s\n' "$CRYPT_STATUS" | grep -q "^/dev/mapper/$DB_LUKS_MAPPING_NAME is active"; then
  printf '%s\n' "$CRYPT_STATUS"
  log_error "LUKS mapping $DB_LUKS_MAPPING_NAME is not active"
  exit 1
fi

validate_luks_mount_target "$POSTGRES_DATA_DIR" "$DB_LUKS_MAPPING_NAME"
validate_production_backup_target "$ENV_FILE"

export COMPOSE_ENV_FILE=.env.production
export COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT_NAME_VALUE"
export COMPOSE_MODE=prod
export COMPOSE_FILES_PROD="$COMPOSE_FILES_EFFECTIVE"

docker_compose_mode prod ps

POSTGRES_CONTAINER_ID="$(docker_compose_mode prod ps -q postgres | head -n 1)"
if [[ -z "$POSTGRES_CONTAINER_ID" ]]; then
  log_error "Postgres compose service is not running"
  exit 1
fi

POSTGRES_DATA_MOUNT="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Type}}|{{.Source}}{{end}}{{end}}' "$POSTGRES_CONTAINER_ID")"
POSTGRES_DATA_MOUNT_TYPE="${POSTGRES_DATA_MOUNT%%|*}"
POSTGRES_DATA_MOUNT_SOURCE="${POSTGRES_DATA_MOUNT#*|}"

if [[ "$POSTGRES_DATA_MOUNT_TYPE" != "bind" ]]; then
  log_error "Postgres data mount must be a bind mount (found: ${POSTGRES_DATA_MOUNT_TYPE:-none})"
  exit 1
fi

if [[ "$POSTGRES_DATA_MOUNT_SOURCE" != "$POSTGRES_DATA_DIR" ]]; then
  log_error "Postgres data bind mount must use $POSTGRES_DATA_DIR (found: ${POSTGRES_DATA_MOUNT_SOURCE:-unknown})"
  exit 1
fi

./scripts/db-migrate.sh --status
REMOTE_SCRIPT
}

print_header "CBIS Deployment Verification"
log_info "Host: $HOST_ALIAS"
log_info "Remote app dir: $REMOTE_APP_DIR"
log_info "Public origin: $PUBLIC_ORIGIN"

log_info "Checking service state..."
run_remote_script

log_info "Checking internal backend health..."
run_remote "curl -fsS http://127.0.0.1:8000/health >/dev/null && echo 'backend /health ok'"
run_remote "curl -fsS http://127.0.0.1:8000/api/health >/dev/null && echo 'backend /api/health ok'"
run_remote "curl -fsS http://127.0.0.1:8000/api/v2/health >/dev/null && echo 'backend /api/v2/health ok'"

log_info "Checking internal frontend health and proxying..."
run_remote "curl -fsS http://127.0.0.1:8001/health >/dev/null && echo 'frontend /health ok'"
run_remote "curl -fsS http://127.0.0.1:8001/api/health >/dev/null && echo 'frontend /api/health ok'"
run_remote "curl -fsS http://127.0.0.1:8001/api/v2/health >/dev/null && echo 'frontend /api/v2/health ok'"

log_info "Checking public HTTPS and health endpoints..."
curl -fsSI "$PUBLIC_ORIGIN"
curl -fsS "$PUBLIC_ORIGIN/health" >/dev/null
curl -fsS "$PUBLIC_ORIGIN/api/health" >/dev/null
curl -fsS "$PUBLIC_ORIGIN/api/v2/health" >/dev/null

log_success "CBIS verification passed"
