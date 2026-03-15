#!/bin/bash
# Deploy a committed git ref to the live cbis.westcat.ca VPS.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
source "$SCRIPT_DIR/lib/config.sh"
source "$SCRIPT_DIR/lib/db-at-rest.sh"

HOST_ALIAS="${CBIS_SSH_HOST:-cbis-vps}"
REMOTE_APP_DIR="${CBIS_REMOTE_PATH:-/srv/nonprofit-manager}"
REMOTE_STAGE_ROOT="${CBIS_REMOTE_STAGE_ROOT:-/home/bryan/deploy-staging/nonprofit-manager}"
PUBLIC_ORIGIN="${CBIS_PUBLIC_ORIGIN:-https://cbis.westcat.ca}"
LOCAL_ENV_FILE="${CBIS_ENV_FILE:-$HOME/.secrets/nonprofit-manager-cbis.env}"
SUDO_PASSWORD_FILE="${CBIS_SUDO_PASSWORD_FILE:-$HOME/.secrets/cbis-vps-159.198.70.25.env}"
SERVICE_NAME="${CBIS_SYSTEMD_SERVICE:-nonprofit-manager.service}"
APP_USER="${CBIS_APP_USER:-nonprofit}"
APP_GROUP="${CBIS_APP_GROUP:-nonprofit}"
COMPOSE_PROJECT_NAME_VALUE="${CBIS_COMPOSE_PROJECT_NAME:-nonprofit-manager}"
COMPOSE_FILES_VALUE="${CBIS_COMPOSE_FILES:-docker-compose.yml docker-compose.vps.yml}"

DEPLOY_REF=""
LOCAL_STAGE_DIR=""
REMOTE_STAGE_DIR=""
KEEP_STAGE=false

usage() {
  cat <<'USAGE'
Usage: ./scripts/deploy-cbis.sh --ref <git-ref> [--env-file <local-env-path>] [--keep-stage]

Options:
  --ref        Git ref to deploy (required)
  --env-file   Local canonical env file (default: ~/.secrets/nonprofit-manager-cbis.env)
  --keep-stage Keep the local and remote staging directories after success
  --help       Show this help text
USAGE
}

cleanup() {
  local exit_code=$?

  if [[ $exit_code -ne 0 ]]; then
    if [[ -n "$LOCAL_STAGE_DIR" ]]; then
      log_warn "Local stage retained for inspection: $LOCAL_STAGE_DIR"
    fi
    if [[ -n "$REMOTE_STAGE_DIR" ]]; then
      log_warn "Remote stage retained for inspection: $REMOTE_STAGE_DIR"
    fi
    exit $exit_code
  fi

  if [[ "$KEEP_STAGE" != true && -n "$LOCAL_STAGE_DIR" && -d "$LOCAL_STAGE_DIR" ]]; then
    rm -rf "$LOCAL_STAGE_DIR"
  fi

  if [[ "$KEEP_STAGE" != true && -n "$REMOTE_STAGE_DIR" ]]; then
    ssh "$HOST_ALIAS" "rm -rf '$REMOTE_STAGE_DIR'" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ref)
      DEPLOY_REF="$2"
      shift 2
      ;;
    --env-file)
      LOCAL_ENV_FILE="$2"
      shift 2
      ;;
    --keep-stage)
      KEEP_STAGE=true
      shift
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

if [[ -z "$DEPLOY_REF" ]]; then
  log_error "--ref is required"
  usage
  exit 1
fi

for command_name in git ssh rsync tar mktemp curl; do
  if ! command_exists "$command_name"; then
    log_error "Required command is missing: $command_name"
    exit 1
  fi
done

if [[ ! -f "$LOCAL_ENV_FILE" ]]; then
  log_error "CBIS env file not found: $LOCAL_ENV_FILE"
  exit 1
fi

validate_production_db_at_rest_config "$LOCAL_ENV_FILE" || exit 1
if [[ "$(resolve_db_at_rest_mode "$LOCAL_ENV_FILE")" != "luks" ]]; then
  log_error "CBIS production requires DB_AT_REST_ENCRYPTION_MODE=luks"
  exit 1
fi

if [[ ! -f "$SUDO_PASSWORD_FILE" ]]; then
  log_error "CBIS sudo password file not found: $SUDO_PASSWORD_FILE"
  exit 1
fi

DEPLOY_COMMIT="$(git rev-parse --verify "${DEPLOY_REF}^{commit}")"
DEPLOY_SHORT_SHA="$(git rev-parse --short "$DEPLOY_COMMIT")"
DEPLOY_ID="deploy-$(date +%Y%m%d%H%M%S)-$DEPLOY_SHORT_SHA"
LOCAL_STAGE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/cbis-deploy-XXXXXX")"
REMOTE_STAGE_DIR="$REMOTE_STAGE_ROOT/$DEPLOY_ID"

print_header "Deploying CBIS"
log_info "Ref: $DEPLOY_REF"
log_info "Commit: $DEPLOY_COMMIT"
log_info "Host: $HOST_ALIAS"
log_info "Remote app dir: $REMOTE_APP_DIR"
log_info "Public origin: $PUBLIC_ORIGIN"

log_info "Loading sudo credential..."
# shellcheck disable=SC1090
source "$SUDO_PASSWORD_FILE"
if [[ -z "${BRYAN_PASSWORD:-}" ]]; then
  log_error "BRYAN_PASSWORD is missing in $SUDO_PASSWORD_FILE"
  exit 1
fi

log_info "Preparing clean git-archive snapshot..."
git archive "$DEPLOY_COMMIT" | tar -xf - -C "$LOCAL_STAGE_DIR"

log_info "Preparing remote staging directory..."
ssh "$HOST_ALIAS" "rm -rf '$REMOTE_STAGE_DIR' && mkdir -p '$REMOTE_STAGE_DIR/repo'"

log_info "Syncing repository snapshot..."
rsync -az --delete "$LOCAL_STAGE_DIR/" "$HOST_ALIAS:$REMOTE_STAGE_DIR/repo/"

log_info "Syncing production env file..."
rsync -az "$LOCAL_ENV_FILE" "$HOST_ALIAS:$REMOTE_STAGE_DIR/.env.production"

log_info "Promoting snapshot and reloading runtime..."
{
  printf '%s\n' "$BRYAN_PASSWORD"
  cat <<'REMOTE_SCRIPT'
set -euo pipefail

REMOTE_STAGE_DIR="$1"
REMOTE_APP_DIR="$2"
SERVICE_NAME="$3"
APP_USER="$4"
APP_GROUP="$5"
COMPOSE_PROJECT_NAME_VALUE="$6"
COMPOSE_FILES_VALUE="$7"

install -d -o "$APP_USER" -g "$APP_GROUP" -m 2770 "$REMOTE_APP_DIR"
rsync -a --delete --filter='P .env.production' --chown="$APP_USER:$APP_GROUP" "$REMOTE_STAGE_DIR/repo/" "$REMOTE_APP_DIR/"
install -o "$APP_USER" -g "$APP_GROUP" -m 0640 "$REMOTE_STAGE_DIR/.env.production" "$REMOTE_APP_DIR/.env.production"
chmod 2770 "$REMOTE_APP_DIR"
find "$REMOTE_APP_DIR" -type d -exec chmod g+s {} +

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
DB_LUKS_MAPPING_NAME="$(db_at_rest_value DB_LUKS_MAPPING_NAME "$ENV_FILE" "")"
COMPOSE_FILES_EFFECTIVE="$(compose_files_for_db_at_rest_mode "$COMPOSE_FILES_VALUE" "$ENV_FILE")"

if ! command -v cryptsetup >/dev/null 2>&1; then
  log_error "cryptsetup is required to verify the CBIS encrypted database mount"
  exit 1
fi

CRYPT_STATUS="$(cryptsetup status "$DB_LUKS_MAPPING_NAME" 2>&1 || true)"
if ! printf '%s\n' "$CRYPT_STATUS" | grep -q "^/dev/mapper/$DB_LUKS_MAPPING_NAME is active"; then
  printf '%s\n' "$CRYPT_STATUS"
  log_error "LUKS mapping $DB_LUKS_MAPPING_NAME is not active"
  exit 1
fi

validate_luks_mount_target "$POSTGRES_DATA_DIR" "$DB_LUKS_MAPPING_NAME"
validate_production_backup_target "$ENV_FILE"

systemctl reload "$SERVICE_NAME"
runuser -u "$APP_USER" -- bash -lc "set -euo pipefail; cd '$REMOTE_APP_DIR'; source ./scripts/lib/common.sh; source ./scripts/lib/config.sh; source ./scripts/lib/db-at-rest.sh; export COMPOSE_ENV_FILE=.env.production COMPOSE_PROJECT_NAME='$COMPOSE_PROJECT_NAME_VALUE' COMPOSE_MODE=prod COMPOSE_FILES_PROD='$COMPOSE_FILES_EFFECTIVE'; validate_production_db_at_rest_config ./.env.production; docker_compose_mode prod up -d postgres redis; ./scripts/db-migrate.sh; docker_compose_mode prod up -d"
REMOTE_SCRIPT
} | ssh "$HOST_ALIAS" "sudo -S -p '' bash -s -- '$REMOTE_STAGE_DIR' '$REMOTE_APP_DIR' '$SERVICE_NAME' '$APP_USER' '$APP_GROUP' '$COMPOSE_PROJECT_NAME_VALUE' '$COMPOSE_FILES_VALUE'"

log_info "Running post-deploy verification..."
"$SCRIPT_DIR/verify-cbis.sh" --host "$HOST_ALIAS" --app-dir "$REMOTE_APP_DIR" --public-origin "$PUBLIC_ORIGIN"

log_success "CBIS deploy complete: $DEPLOY_COMMIT"
