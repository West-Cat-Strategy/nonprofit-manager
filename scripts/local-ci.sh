#!/bin/bash
# Compatibility wrapper for local CI commands referenced by docs/Makefile.
# Delegates to scripts/ci.sh and supports legacy flags.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CI_SCRIPT="$SCRIPT_DIR/ci.sh"

if [[ ! -x "$CI_SCRIPT" ]]; then
  echo "Error: $CI_SCRIPT is missing or not executable."
  exit 1
fi

RUN_AUDIT=false
RUN_DB_VERIFY=false
CI_ARGS=()

for arg in "$@"; do
  case "$arg" in
    --fast)
      CI_ARGS+=(--quick)
      ;;
    --audit)
      RUN_AUDIT=true
      ;;
    --db-verify)
      RUN_DB_VERIFY=true
      ;;
    --unit-only)
      CI_ARGS+=(--no-e2e)
      ;;
    *)
      CI_ARGS+=("$arg")
      ;;
  esac
done

"$CI_SCRIPT" "${CI_ARGS[@]}"

if [[ "$RUN_DB_VERIFY" == "true" ]]; then
  "$SCRIPT_DIR/verify-migrations.sh"
fi

if [[ "$RUN_AUDIT" == "true" ]]; then
  echo ""
  echo "Running npm audit (high+)..."
  (cd "$ROOT_DIR/backend" && npm audit --audit-level=high) || true
  (cd "$ROOT_DIR/frontend" && npm audit --audit-level=high) || true
fi
