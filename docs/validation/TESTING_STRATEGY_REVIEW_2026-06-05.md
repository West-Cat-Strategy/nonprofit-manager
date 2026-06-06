# Testing Strategy Review - 2026-06-05

**Status:** Active review note

## Scope

This pass refreshes the repo-local testing strategy around confidence per change. It updates contributor-facing command guidance and selector contract coverage, plus one date-stable frontend test fixture exposed during validation. It does not change application runtime behavior, public API shape, database schema, package dependencies, Make target names, package scripts, or Playwright specs.

The implementation ran in the sibling worktree `/Users/bryan/projects/nonprofit-manager-testing-strategy-refresh` on branch `codex/testing-strategy-refresh-2026-06-05`, based on `85a44703`. The dirty `package-lock.json` in the primary checkout was intentionally left untouched.

## Baseline

- Current tracked test/spec inventory before this refresh: 592 files across backend, frontend, E2E, and tooling.
- Baseline tooling contract before this refresh: `make test-tooling` passed with 58 tests.
- Existing selector behavior already matched the intended command routing, so `scripts/select-checks.sh` did not need behavior changes.

## Implementation

- Updated [../testing/TESTING.md](../testing/TESTING.md) with a five-step confidence ladder: docs/static, package surface, cross-layer behavior, coverage/full, and release/security.
- Clarified selector `fast` versus `strict` mode, including when to pass an explicit `--files` list and why selector output must stay static repo-owned command strings.
- Clarified that `make ci-full` already includes the isolated Docker smoke gate, so a standalone `make test-e2e-docker-smoke` rerun is only needed for a fresh artifact, a missed smoke step, or a narrower host proof.
- Updated contributor/agent/script summaries so they point back to the same testing strategy without becoming competing command maps.
- Added tooling-contract coverage for representative selector lanes: runtime docs strict mode, backend-only, frontend-only, E2E-only, database/migration, root dependency, orchestration, Docker/public-site, and release/security tooling.
- Moved the scheduled-report attention fixture's healthy `next_run_at` value from `2026-06-05T17:00:00.000Z` to a future-stable timestamp after the full coverage gate exposed that the fixture had become date-sensitive on June 5, 2026.

## Validation

- Representative strict runtime-docs selector probe passed and emitted:
  - `make check-links`
  - `make lint-doc-api-versioning`
  - `make lint-openapi`
  - `make test-tooling`
  - `make test-coverage-full`
- Final strict selector over the actual implementation diff emitted:
  - `make check-links`
  - `make test-tooling`
  - `make lint`
  - `make typecheck`
  - `make test-coverage-full`
- `make test-tooling` passed with 59 tests after adding the selector lane contract cases.
- `make check-links` passed after this note was finalized: 261 files and 1506 local links checked.
- `make lint` passed.
- `make typecheck` passed.
- `git diff --check` passed.
- `cd frontend && npm test -- --run src/features/scheduledReports/hooks/__tests__/useScheduledReportsController.test.tsx` passed after the date-stable fixture update: 1 file, 2 tests.
- `make test-coverage-full` was attempted twice:
  - First attempt reached frontend coverage and failed because `healthy-schedule.next_run_at` had become overdue on June 5, 2026. The fixture was updated to a future-stable timestamp and the focused frontend test passed.
  - Second attempt passed backend coverage (`286` suites, `2315` tests) and frontend coverage (`253` files, `1399` tests), then failed in the host Playwright WebKit leg. The E2E runner reported `899 passed`, `15 skipped`, and `94 failed`; failures were concentrated in WebKit route/runtime checks with repeated console errors reading `Failed to load resource: The Internet connection appears to be offline.` Because the host matrix exited there, the later isolated Docker smoke stage in the full gate did not run.

## Residual Risk

- The broad full gate did not complete because of the WebKit offline-resource failures above. This docs-plus-tooling slice does not change WebKit route behavior, but a future release/security/orchestration closeout should rerun the host matrix after that environment/runtime blocker is cleared, then run the isolated Docker smoke gate if it is not reached through `make test-coverage-full` or `make ci-full`.
- `make check-changed ARGS=--run` still executes selector output through the shell. This remains acceptable only because selector output is static repo-owned command text and is covered by `make test-tooling`.
