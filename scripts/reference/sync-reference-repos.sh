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

echo "Syncing reference repositories from $(realpath "$MANIFEST_PATH")"
echo "Canonical reference root: $REFERENCE_REPOS_CANONICAL_ROOT"

while IFS= read -r repo; do
  id="$(jq -r '.id' <<<"$repo")"
  source="$(jq -r '.urlOrPath' <<<"$repo")"
  branch="$(jq -r '.branch // ""' <<<"$repo")"
  commit="$(jq -r '.commit' <<<"$repo")"
  destination_raw="$(jq -r '.destination' <<<"$repo")"
  destination="$(resolve_destination "$destination_raw")"

  echo ""
  echo "==> [$id] $destination"

  mkdir -p "$(dirname "$destination")"

  if [[ ! -d "$destination/.git" ]]; then
    if ! git clone --filter=blob:none --no-checkout "$source" "$destination" >/dev/null 2>&1; then
      git clone --no-checkout "$source" "$destination" >/dev/null
    fi
  else
    if git -C "$destination" remote get-url origin >/dev/null 2>&1; then
      current_origin="$(git -C "$destination" remote get-url origin)"
      if [[ "$current_origin" != "$source" ]]; then
        git -C "$destination" remote set-url origin "$source" >/dev/null
      fi
    else
      git -C "$destination" remote add origin "$source" >/dev/null
    fi
  fi

  mapfile -t sparse_paths < <(jq -r '.sparsePaths[]' <<<"$repo")
  if (( ${#sparse_paths[@]} > 0 )); then
    git -C "$destination" sparse-checkout init --no-cone >/dev/null 2>&1 || true
    printf '%s\n' "${sparse_paths[@]}" | git -C "$destination" sparse-checkout set --stdin >/dev/null
  else
    git -C "$destination" sparse-checkout disable >/dev/null 2>&1 || true
  fi

  if [[ -n "$branch" ]]; then
    git -C "$destination" fetch --depth=1 origin "$branch" >/dev/null 2>&1 || true
  fi

  if ! git -C "$destination" cat-file -e "${commit}^{commit}" 2>/dev/null; then
    if ! git -C "$destination" fetch --depth=1 origin "$commit" >/dev/null 2>&1; then
      git -C "$destination" fetch origin "$commit" >/dev/null
    fi
  fi

  git -C "$destination" checkout --detach --force "$commit" >/dev/null

  resolved="$(git -C "$destination" rev-parse HEAD)"
  if [[ "$resolved" != "$commit" ]]; then
    echo "ERROR: [$id] expected $commit but resolved $resolved" >&2
    exit 1
  fi

  echo "OK: [$id] $resolved"
done < <(jq -c '.repos[]' "$MANIFEST_PATH")

echo ""
echo "Reference sync complete."
