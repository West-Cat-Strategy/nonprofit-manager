#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

scan_audit() {
  local dir="$1"
  if [[ -d "$dir" ]]; then
    if run bash -lc "cd '$dir' && npm audit --omit=dev --audit-level=moderate"; then
      return 0
    fi
    return 1
  fi
}

create_gitleaks_scan_root() {
  local scan_root
  scan_root="$(mktemp -d "${TMPDIR:-/tmp}/nonprofit-manager-gitleaks.XXXXXX")"

  while IFS= read -r -d '' file; do
    local source_path="$PROJECT_ROOT/$file"
    local target_path="$scan_root/$file"
    mkdir -p "$(dirname "$target_path")"
    cp -p "$source_path" "$target_path"
  done < <(git -C "$PROJECT_ROOT" ls-files -co --exclude-standard -z)

  printf '%s' "$scan_root"
}

scan_secrets_with_gitleaks() {
  local scan_root
  scan_root="$(create_gitleaks_scan_root)"
  trap "rm -rf -- '$scan_root'" RETURN

  if command -v gitleaks >/dev/null 2>&1; then
    (
      cd "$scan_root"
      run gitleaks detect --no-git --no-banner --redact --source . --config .gitleaks.toml --gitleaks-ignore-path .gitleaksignore
    )
    return 0
  fi

  if command -v docker >/dev/null 2>&1; then
    if ! docker info >/dev/null 2>&1; then
      echo "gitleaks is not installed and Docker is unavailable, so the secret scan cannot run." >&2
      return 1
    fi

    run docker run --rm \
      -v "$scan_root:/repo" \
      -w /repo \
      ghcr.io/gitleaks/gitleaks:latest \
      detect --no-git --no-banner --redact --source . --config .gitleaks.toml --gitleaks-ignore-path .gitleaksignore
    return 0
  fi

  echo "gitleaks is required for secret scanning. Install gitleaks or make Docker available, then rerun make security-scan." >&2
  return 1
}

cd "$PROJECT_ROOT"

overall_status=0

if ! scan_audit backend; then
  overall_status=1
fi

if ! scan_audit frontend; then
  overall_status=1
fi

if ! run scan_secrets_with_gitleaks; then
  overall_status=1
fi

echo "Security scan complete."
exit "$overall_status"
