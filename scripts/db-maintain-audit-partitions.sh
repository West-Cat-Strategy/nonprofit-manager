#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-8002}"
DB_NAME="${DB_NAME:-nonprofit_manager}"
DB_ADMIN_USER="${DB_ADMIN_USER:-postgres}"
DB_ADMIN_PASSWORD="${DB_ADMIN_PASSWORD:-postgres}"
AUDIT_PARTITION_MONTHS_BACK="${AUDIT_PARTITION_MONTHS_BACK:-12}"
AUDIT_PARTITION_MONTHS_FORWARD="${AUDIT_PARTITION_MONTHS_FORWARD:-24}"

PGPASSWORD="$DB_ADMIN_PASSWORD" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_ADMIN_USER" \
  -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 \
  -c "SELECT ensure_audit_log_partitions(${AUDIT_PARTITION_MONTHS_BACK}, ${AUDIT_PARTITION_MONTHS_FORWARD});" >/dev/null

log_success "Ensured audit_log partitions from ${AUDIT_PARTITION_MONTHS_BACK} months back through ${AUDIT_PARTITION_MONTHS_FORWARD} months ahead."
