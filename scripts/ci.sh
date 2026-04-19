#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: scripts/ci.sh [--fast] [--audit] [--coverage] [--build] [--unit-only] [--db-verify]

Run the repo-local validation flow that backs the Makefile CI targets.

  --coverage    Run the coverage-focused test path (backend/frontend coverage plus host and Docker Playwright smoke)
  --unit-only   Run backend/frontend unit coverage only, skipping integration and Playwright
EOF
}

fast=0
audit=0
coverage=0
build=0
unit_only=0
db_verify=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --fast)
      fast=1
      shift
      ;;
    --audit)
      audit=1
      shift
      ;;
    --coverage)
      coverage=1
      shift
      ;;
    --build)
      build=1
      shift
      ;;
    --unit-only)
      unit_only=1
      shift
      ;;
    --db-verify)
      db_verify=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

cd "$PROJECT_ROOT"

if [[ "$db_verify" -eq 1 ]]; then
  run env \
    COMPOSE_MODE="${COMPOSE_MODE:-ci}" \
    DB_NAME="${DB_NAME:-nonprofit_manager_test}" \
    DB_PORT="${DB_PORT:-8012}" \
    DB_PASSWORD="${DB_PASSWORD:-postgres}" \
    make db-verify
  exit 0
fi

run make lint
run make typecheck

if [[ "$fast" -eq 1 ]]; then
  exit 0
fi

if [[ "$unit_only" -eq 1 ]]; then
  run bash -lc 'cd backend && npm run test:unit:coverage'
  run bash -lc 'cd frontend && npm run test:coverage'
else
  if [[ "$coverage" -eq 1 ]]; then
    run make test-coverage
  else
    run make test
  fi
fi

if [[ "$build" -eq 1 ]]; then
  run make build
fi

if [[ "$audit" -eq 1 ]]; then
  run make security-audit
fi
