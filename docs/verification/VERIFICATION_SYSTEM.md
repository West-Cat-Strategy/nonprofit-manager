# Verification System
This repository uses verification scripts, not a project bible.

## Entry points
- `./scripts/verify.sh` runs the broad repository verification gate.
- `./scripts/verify-pr.sh <PR_NUMBER>` runs PR-specific verification.

## Current PR verifier
- PR #9 checks changed files, patch summary, and targeted Playwright E2E tests documented in the PR body.
