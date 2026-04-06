#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

run() {
  echo "==> $*"
  "$@"
}

scan_audit() {
  local dir="$1"
  if [[ -d "$dir" ]]; then
    run bash -lc "cd '$dir' && npm audit --omit=dev --audit-level=moderate"
  fi
}

scan_secrets_with_gitleaks() {
  if command -v gitleaks >/dev/null 2>&1; then
    run gitleaks detect --no-git --no-banner --redact --source . --config .gitleaks.toml --gitleaks-ignore-path .gitleaksignore
    return 0
  fi

  if command -v docker >/dev/null 2>&1; then
    if ! docker info >/dev/null 2>&1; then
      echo "gitleaks is not installed and Docker is unavailable, so the secret scan cannot run." >&2
      return 1
    fi

    run docker run --rm \
      -v "$ROOT_DIR:/repo" \
      -w /repo \
      ghcr.io/gitleaks/gitleaks:latest \
      detect --no-git --no-banner --redact --source . --config .gitleaks.toml --gitleaks-ignore-path .gitleaksignore
    return 0
  fi

  echo "gitleaks is required for secret scanning. Install gitleaks or make Docker available, then rerun make security-scan." >&2
  return 1
}

cd "$ROOT_DIR"

scan_audit backend
scan_audit frontend

run scan_secrets_with_gitleaks

echo "Security scan complete."
