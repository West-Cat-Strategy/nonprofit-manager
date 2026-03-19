#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REFERENCE_REPOS_DIR="${REFERENCE_REPOS_DIR:-$ROOT_DIR/reference-repos}"

if [[ ! -d "$REFERENCE_REPOS_DIR" ]]; then
  echo "Reference repositories are not available in this checkout; skipping verification."
  exit 0
fi

echo "Reference repository verification is not configured in this checkout; nothing to do."

