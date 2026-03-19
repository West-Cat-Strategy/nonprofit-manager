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
    (cd "$dir" && npm audit --omit=dev --audit-level=moderate) || true
  fi
}

scan_secrets_with_gitleaks() {
  if command -v gitleaks >/dev/null 2>&1; then
    gitleaks detect --no-banner --redact --source "$ROOT_DIR" --config "$ROOT_DIR/.gitleaks.toml"
    return 0
  fi

  if command -v docker >/dev/null 2>&1 && docker image inspect ghcr.io/gitleaks/gitleaks:latest >/dev/null 2>&1; then
    docker run --rm \
      -v "$ROOT_DIR:/repo" \
      -w /repo \
      ghcr.io/gitleaks/gitleaks:latest \
      detect --no-banner --redact --source /repo --config /repo/.gitleaks.toml
    return 0
  fi

  echo "gitleaks is not installed and a local container image was not available; running a lightweight fallback scan."

  local patterns=(
    'AKIA[0-9A-Z]{16}'
    'ASIA[0-9A-Z]{16}'
    'ghp_[A-Za-z0-9]{20,}'
    'github_pat_[A-Za-z0-9_]{20,}'
    'sk_live_[A-Za-z0-9]{10,}'
    'whsec_[A-Za-z0-9]{10,}'
    'xox[baprs]-[A-Za-z0-9-]{10,}'
    '-----BEGIN (RSA |EC |OPENSSH |PRIVATE )?KEY-----'
  )

  local issues=()
  while IFS= read -r match; do
    issues+=("$match")
  done < <(
    rg -n --hidden --glob '!**/.git/**' --glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/coverage/**' --glob '!**/output/**' --glob '!**/tmp/**' --glob '!**/*.example' --glob '!**/*.md' --glob '!**/*.toml' -e "${patterns[0]}" -e "${patterns[1]}" -e "${patterns[2]}" -e "${patterns[3]}" -e "${patterns[4]}" -e "${patterns[5]}" -e "${patterns[6]}" -e "${patterns[7]}" "$ROOT_DIR" || true
  )

  if [[ "${#issues[@]}" -gt 0 ]]; then
    printf '%s\n' "Potential secret matches found:" >&2
    printf '%s\n' "${issues[@]}" >&2
    return 1
  fi

  return 0
}

cd "$ROOT_DIR"

scan_audit backend
scan_audit frontend

run scan_secrets_with_gitleaks

echo "Security scan complete."

