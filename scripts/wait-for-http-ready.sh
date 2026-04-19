#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

if [[ "$#" -eq 0 ]]; then
  echo "Usage: $0 <url> [url...]" >&2
  exit 2
fi

e2e_wait_for_http_urls "$@"
log_success "HTTP readiness passed for: $*"
