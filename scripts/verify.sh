#!/usr/bin/env bash
set -euo pipefail

run_legacy="${NONPROFIT_MANAGER_RUN_LEGACY_VERIFY:-0}"
selector_mode="fast"
selector_base=""
selector_files=""
selector_requested=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --run-legacy)
      run_legacy=1
      shift
      ;;
    --mode)
      selector_mode="${2:-}"
      selector_requested=1
      shift 2
      ;;
    --base)
      selector_base="${2:-}"
      selector_requested=1
      shift 2
      ;;
    --files)
      selector_files="${2:-}"
      selector_requested=1
      shift 2
      ;;
    --print-only)
      selector_requested=1
      shift
      ;;
    -h|--help)
      cat <<'EOF'
Usage: scripts/verify.sh [--run-legacy]

Historical reproduction helper for the former broad verification script.
Supported verification now flows through Make and the selector:
  make test-tooling
  ./scripts/select-checks.sh --mode fast
  make ci-full

Pass --run-legacy, or set NONPROFIT_MANAGER_RUN_LEGACY_VERIFY=1, to replay
the old command sequence for historical comparison.
EOF
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if [[ "$run_legacy" != "1" && "$selector_requested" == "1" ]]; then
  selector_args=(--mode "$selector_mode")
  if [[ -n "$selector_base" ]]; then
    selector_args+=(--base "$selector_base")
  fi
  if [[ -n "$selector_files" ]]; then
    selector_args+=(--files "$selector_files")
  fi
  exec "$(dirname "$0")/select-checks.sh" "${selector_args[@]}"
fi

if [[ "$run_legacy" != "1" ]]; then
  cat <<'EOF'
=== historical verifier re-homed ===

scripts/verify.sh is kept only as a historical reproduction helper.
It is not the supported repository verification contract.

Use the current supported entry points instead:
  make test-tooling
  ./scripts/select-checks.sh --mode fast
  make ci-full

To replay the old broad verifier intentionally, run:
  ./scripts/verify.sh --run-legacy
EOF
  exit 1
fi

echo "=== nonprofit-manager legacy verification replay ==="
echo
echo "1. Git state"
git status --short
echo
echo "2. Tooling"
command -v node >/dev/null && node --version
command -v npm >/dev/null && npm --version
command -v docker >/dev/null && docker --version || true
echo
echo "3. Legacy root gates"
make lint
make typecheck
make ci-unit
echo
echo "4. Backend tests"
make test-backend
echo
echo "5. Frontend tests"
make test-frontend
echo
echo "6. E2E smoke"
cd e2e
npm run test:smoke
cd ..
echo
echo "=== legacy verification replay complete ==="
