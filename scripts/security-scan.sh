#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

GITLEAKS_DOCKER_IMAGE="${GITLEAKS_DOCKER_IMAGE:-ghcr.io/gitleaks/gitleaks:latest@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f}"

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
    [[ -e "$source_path" || -L "$source_path" ]] || continue
    mkdir -p "$(dirname "$target_path")"
    cp -p "$source_path" "$target_path"
  done < <(git -C "$PROJECT_ROOT" ls-files -co --exclude-standard -z)

  printf '%s' "$scan_root"
}

run_gitleaks_worktree_scan() {
  local scan_root
  local status
  scan_root="$(create_gitleaks_scan_root)"

  if command -v gitleaks >/dev/null 2>&1; then
    status=0
    (
      cd "$scan_root"
      run gitleaks detect --no-git --no-banner --redact --source . --config .gitleaks.toml --gitleaks-ignore-path .gitleaksignore
    ) || status=$?
    rm -rf -- "$scan_root"
    return "$status"
  fi

  if command -v docker >/dev/null 2>&1; then
    if ! docker info >/dev/null 2>&1; then
      echo "gitleaks is not installed and Docker is unavailable, so the secret scan cannot run." >&2
      rm -rf -- "$scan_root"
      return 1
    fi

    status=0
    run docker run --rm \
      -v "$scan_root:/repo" \
      -w /repo \
      "$GITLEAKS_DOCKER_IMAGE" \
      detect --no-git --no-banner --redact --source . --config .gitleaks.toml --gitleaks-ignore-path .gitleaksignore || status=$?
    rm -rf -- "$scan_root"
    return "$status"
  fi

  echo "gitleaks is required for secret scanning. Install gitleaks or make Docker available, then rerun make security-scan." >&2
  rm -rf -- "$scan_root"
  return 1
}

run_gitleaks_history_scan() {
  if command -v gitleaks >/dev/null 2>&1; then
    (
      cd "$PROJECT_ROOT"
      run gitleaks detect --no-banner --redact --source . --config .gitleaks.toml --gitleaks-ignore-path .gitleaksignore
    )
    return 0
  fi

  if command -v docker >/dev/null 2>&1; then
    if ! docker info >/dev/null 2>&1; then
      echo "gitleaks is not installed and Docker is unavailable, so the git-history secret scan cannot run." >&2
      return 1
    fi

    run docker run --rm \
      -v "$PROJECT_ROOT:/repo" \
      -w /repo \
      "$GITLEAKS_DOCKER_IMAGE" \
      detect --no-banner --redact --source . --config .gitleaks.toml --gitleaks-ignore-path .gitleaksignore
    return 0
  fi

  echo "gitleaks is required for git-history secret scanning. Install gitleaks or make Docker available, then rerun make security-scan." >&2
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

if ! run run_gitleaks_worktree_scan; then
  overall_status=1
fi

if ! run run_gitleaks_history_scan; then
  overall_status=1
fi

echo "Security scan complete."
exit "$overall_status"
