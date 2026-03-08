#!/bin/bash
# Read-only verification for the live cbis.westcat.ca deployment.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
source "$SCRIPT_DIR/lib/config.sh"

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

print_header "CBIS Deployment Verification"
log_info "Host: $HOST_ALIAS"
log_info "Remote app dir: $REMOTE_APP_DIR"
log_info "Public origin: $PUBLIC_ORIGIN"

log_info "Checking service state..."
run_remote "systemctl is-active '$SERVICE_NAME' && systemctl is-enabled '$SERVICE_NAME'"

log_info "Checking compose services..."
run_remote "cd '$REMOTE_APP_DIR' && docker compose --env-file .env.production -p '$COMPOSE_PROJECT_NAME_VALUE' -f docker-compose.yml -f docker-compose.vps.yml ps"

log_info "Checking internal backend health..."
run_remote "curl -fsS http://127.0.0.1:8000/health >/dev/null && echo 'backend /health ok'"
run_remote "curl -fsS http://127.0.0.1:8000/api/health >/dev/null && echo 'backend /api/health ok'"
run_remote "curl -fsS http://127.0.0.1:8000/api/v2/health >/dev/null && echo 'backend /api/v2/health ok'"

log_info "Checking internal frontend health and proxying..."
run_remote "curl -fsS http://127.0.0.1:8001/health >/dev/null && echo 'frontend /health ok'"
run_remote "curl -fsS http://127.0.0.1:8001/api/health >/dev/null && echo 'frontend /api/health ok'"
run_remote "curl -fsS http://127.0.0.1:8001/api/v2/health >/dev/null && echo 'frontend /api/v2/health ok'"

log_info "Checking migration status..."
run_remote "cd '$REMOTE_APP_DIR' && COMPOSE_ENV_FILE=.env.production COMPOSE_PROJECT_NAME='$COMPOSE_PROJECT_NAME_VALUE' COMPOSE_MODE=prod COMPOSE_FILES_PROD='$COMPOSE_FILES_VALUE' ./scripts/db-migrate.sh --status"

log_info "Checking public HTTPS and health endpoints..."
curl -fsSI "$PUBLIC_ORIGIN"
curl -fsS "$PUBLIC_ORIGIN/health" >/dev/null
curl -fsS "$PUBLIC_ORIGIN/api/health" >/dev/null
curl -fsS "$PUBLIC_ORIGIN/api/v2/health" >/dev/null

log_success "CBIS verification passed"
