#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
ARCHIVE_DIR="${ARCHIVE_DIR:-$PROJECT_ROOT/tmp/security-archives}"
TIMESTAMP="${TIMESTAMP:-$(date -u +%Y%m%d-%H%M%SZ)}"
ARCHIVE_BASENAME="logs-${TIMESTAMP}.tar.gz"
ARCHIVE_PATH="$ARCHIVE_DIR/$ARCHIVE_BASENAME"
ENCRYPTED_PATH="${ARCHIVE_PATH%.tar.gz}.tar.gz.enc"

mkdir -p "$ARCHIVE_DIR"

sources=(
  "$PROJECT_ROOT/backend/logs"
  "$PROJECT_ROOT/tmp/e2e-runner"
  "$PROJECT_ROOT/docs/ui/app-ux-audit.md"
  "$PROJECT_ROOT/docs/ui/app-ux-audit.json"
  "$PROJECT_ROOT/docs/performance/artifacts/p4-t9h"
)

existing_sources=()
for source in "${sources[@]}"; do
  if [[ -e "$source" ]]; then
    existing_sources+=("$source")
  fi
done

if [[ "${#existing_sources[@]}" -eq 0 ]]; then
  echo "No log sources found to archive." >&2
  exit 1
fi

tar -czf "$ARCHIVE_PATH" -C "$PROJECT_ROOT" "${existing_sources[@]#"$PROJECT_ROOT/"}"

if [[ -n "${ARCHIVE_ENCRYPTION_KEY:-}" ]]; then
  openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:ARCHIVE_ENCRYPTION_KEY -in "$ARCHIVE_PATH" -out "$ENCRYPTED_PATH"
  rm -f "$ARCHIVE_PATH"
  echo "Archived and encrypted logs to $ENCRYPTED_PATH"
else
  echo "Archived logs to $ARCHIVE_PATH"
fi
