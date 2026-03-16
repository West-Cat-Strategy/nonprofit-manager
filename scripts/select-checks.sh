#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="fast"
BASE_REF=""
FILES_INPUT=""

usage() {
  cat <<USAGE
Usage: scripts/select-checks.sh [--base <ref>] [--files "a,b,c"] [--mode <fast|strict>]

Examples:
  scripts/select-checks.sh --base HEAD~1 --mode fast
  scripts/select-checks.sh --files "backend/src/modules/accounts/routes/index.ts,frontend/src/features/events/state/index.ts" --mode strict

Environment:
  UI_AUDIT_ENFORCE=true  # run ui-audit in enforce mode (default: report mode)
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)
      BASE_REF="${2:-}"
      shift 2
      ;;
    --files)
      FILES_INPUT="${2:-}"
      shift 2
      ;;
    --mode)
      MODE="${2:-fast}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ "$MODE" != "fast" && "$MODE" != "strict" ]]; then
  echo "Invalid mode: $MODE"
  exit 1
fi

declare -a CHANGED_FILES=()

if [[ -n "$FILES_INPUT" ]]; then
  IFS=',' read -r -a CHANGED_FILES <<<"$FILES_INPUT"
else
  if [[ -z "$BASE_REF" ]]; then
    BASE_REF="HEAD~1"
  fi
  while IFS= read -r line; do
    [[ -n "$line" ]] && CHANGED_FILES+=("$line")
  done < <(git -C "$ROOT_DIR" diff --name-only "$BASE_REF"...HEAD)
fi

if [[ ${#CHANGED_FILES[@]} -eq 0 ]]; then
  echo "make lint"
  echo "make typecheck"
  exit 0
fi

needs_backend=false
needs_frontend=false
needs_e2e=false
needs_db_verify=false
needs_security=false

for raw in "${CHANGED_FILES[@]}"; do
  file="$(echo "$raw" | xargs)"
  [[ -z "$file" ]] && continue

  case "$file" in
    backend/*)
      needs_backend=true
      ;;
    frontend/*)
      needs_frontend=true
      ;;
    e2e/*)
      needs_e2e=true
      ;;
  esac

  case "$file" in
    backend/src/routes/*|backend/src/middleware/*|backend/src/controllers/*|backend/src/services/*|backend/src/modules/*)
      needs_backend=true
      ;;
    frontend/src/routes/*|frontend/src/features/*|frontend/src/store/*|frontend/src/services/*)
      needs_frontend=true
      ;;
    database/migrations/*|database/initdb/*|scripts/db-migrate.sh|scripts/verify-migrations.sh|scripts/check-migration-manifest-policy.ts)
      needs_db_verify=true
      ;;
    docs/security/*|backend/src/middleware/*rate*|backend/src/middleware/*auth*|backend/src/modules/auth/*)
      needs_security=true
      ;;
  esac
done

commands=()
commands+=("make lint")
commands+=("make typecheck")

if [[ "$needs_backend" == true ]]; then
  commands+=("cd backend && npm run test:unit")
  commands+=("cd backend && npm run test:integration")
fi

if [[ "$needs_frontend" == true ]]; then
  if [[ "${UI_AUDIT_ENFORCE:-false}" == "true" ]]; then
    commands+=("node scripts/ui-audit.ts --enforce-baseline")
  else
    commands+=("node scripts/ui-audit.ts")
  fi
  commands+=("cd frontend && npm test -- --run")
fi

if [[ "$needs_db_verify" == true ]]; then
  commands+=("make db-verify")
fi

if [[ "$needs_e2e" == true || "$needs_security" == true || "$MODE" == "strict" ]]; then
  commands+=("cd e2e && npm run test:smoke")
fi

if [[ "$MODE" == "strict" ]]; then
  commands+=("make ci-full")
  commands+=("cd e2e && npm run test:ci")
fi

printf '%s\n' "${commands[@]}" | awk '!seen[$0]++'
