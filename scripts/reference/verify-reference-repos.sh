#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MANIFEST_PATH="$ROOT_DIR/reference-repos/manifest.lock.json"
REFERENCE_REPOS_CANONICAL_ROOT="${REFERENCE_REPOS_CANONICAL_ROOT:-/Users/bryan/projects/reference-repos}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

resolve_destination() {
  local destination_raw="$1"

  if [[ "$destination_raw" = /* ]]; then
    echo "$destination_raw"
    return
  fi

  if [[ "$destination_raw" == reference-repos/local/* ]]; then
    local name="${destination_raw#reference-repos/local/}"
    echo "$REFERENCE_REPOS_CANONICAL_ROOT/nm--$name"
    return
  fi

  if [[ "$destination_raw" == reference-repos/external/* ]]; then
    local name="${destination_raw#reference-repos/external/}"
    echo "$REFERENCE_REPOS_CANONICAL_ROOT/nm--$name"
    return
  fi

  echo "$ROOT_DIR/$destination_raw"
}

require_cmd git
require_cmd jq

if [[ ! -f "$MANIFEST_PATH" ]]; then
  echo "Manifest not found: $MANIFEST_PATH" >&2
  exit 1
fi

echo "# Reference Repo Verification"
echo "Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "Manifest: ${MANIFEST_PATH#$ROOT_DIR/}"
echo "Canonical reference root: $REFERENCE_REPOS_CANONICAL_ROOT"
echo ""

errors=0

while IFS= read -r repo; do
  id="$(jq -r '.id' <<<"$repo")"
  commit="$(jq -r '.commit' <<<"$repo")"
  destination_raw="$(jq -r '.destination' <<<"$repo")"
  destination="$(resolve_destination "$destination_raw")"

  if [[ ! -d "$destination/.git" ]]; then
    echo "FAIL [$id] missing git repo at $destination"
    errors=$((errors + 1))
    continue
  fi

  resolved="$(git -C "$destination" rev-parse HEAD 2>/dev/null || true)"
  if [[ "$resolved" != "$commit" ]]; then
    echo "FAIL [$id] commit mismatch expected=$commit actual=${resolved:-<none>}"
    errors=$((errors + 1))
  else
    echo "PASS [$id] commit $resolved"
  fi

  missing_paths=()
  while IFS= read -r sparse_path; do
    [[ -z "$sparse_path" ]] && continue
    if [[ ! -e "$destination/$sparse_path" ]]; then
      missing_paths+=("$sparse_path")
    fi
  done < <(jq -r '.sparsePaths[]' <<<"$repo")

  if (( ${#missing_paths[@]} > 0 )); then
    echo "FAIL [$id] missing sparse paths: ${missing_paths[*]}"
    errors=$((errors + 1))
  else
    echo "PASS [$id] sparse paths present ($destination)"
  fi

done < <(jq -c '.repos[]' "$MANIFEST_PATH")

if (( errors > 0 )); then
  echo ""
  echo "Verification failed with $errors error(s)." >&2
  exit 1
fi

echo ""
echo "All reference repositories verified."
