#!/usr/bin/env bash
set -euo pipefail

PR="${1:-9}"

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
