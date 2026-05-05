#!/usr/bin/env bash
set -euo pipefail

run_legacy="${NONPROFIT_MANAGER_RUN_LEGACY_VERIFY:-0}"
PR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --run-legacy)
      run_legacy=1
      shift
      ;;
    -h|--help)
      cat <<'EOF'
Usage: scripts/verify-pr.sh [--run-legacy] [PR_NUMBER]

Historical reproduction helper for the former PR-number verifier.
Supported verification now flows through the local Make and selector contract:
  make test-tooling
  ./scripts/select-checks.sh --mode fast
  make ci-full

Pass --run-legacy, or set NONPROFIT_MANAGER_RUN_LEGACY_VERIFY=1, to replay
the old GitHub CLI metadata and file-presence checks.
EOF
      exit 0
      ;;
    *)
      if [[ -n "$PR" ]]; then
        echo "Unexpected extra argument: $1" >&2
        exit 2
      fi
      PR="$1"
      shift
      ;;
  esac
done

PR="${PR:-9}"

if [[ "$run_legacy" != "1" ]]; then
  cat <<EOF
=== historical PR verifier re-homed ===

scripts/verify-pr.sh is kept only as a historical reproduction helper.
It is not the supported PR or repository verification contract.

Use the current supported entry points instead:
  make test-tooling
  ./scripts/select-checks.sh --mode fast
  make ci-full

To replay the old PR metadata/file-presence verifier intentionally, run:
  ./scripts/verify-pr.sh --run-legacy $PR
EOF
  exit 1
fi

echo "=== PR verification: #$PR ==="

echo
echo "1. PR metadata"
gh pr view "$PR" --json number,title,state,url,files

echo
echo "2. PR changed files"
gh pr diff "$PR" --name-only

echo
echo "3. PR patch summary"
gh pr diff "$PR" --patch | git apply --stat

echo
echo "4. Verify PR files exist in current checkout"
missing=0
while IFS= read -r file; do
  if [[ -f "$file" ]]; then
    echo "OK: $file"
  else
    echo "MISSING: $file"
    missing=1
  fi
done < <(gh pr diff "$PR" --name-only)

if [[ "$missing" -ne 0 ]]; then
  echo
  echo "Verification failed: one or more PR files are missing from current checkout."
  exit 1
fi

echo
echo "5. Docker-dependent E2E execution"
echo "SKIPPED: Playwright webServer requires Docker migration scripts on this repo."

echo
echo "=== PR verification complete: metadata, patch, and file-presence checks passed ==="
