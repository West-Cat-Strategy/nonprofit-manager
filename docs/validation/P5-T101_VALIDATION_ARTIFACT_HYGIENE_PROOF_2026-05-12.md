# P5-T101 Validation Artifact Hygiene Proof

**Date:** 2026-05-12  
**Status:** Review  
**Workboard row:** [P5-T101](../phases/planning-and-progress.md)

## Scope

Clean up validation/doc hygiene exposed by the May 11 application/workboard review while preserving the historical audit trail.

Included:

- Track and index the new P5-T98 proof artifact and backend dashboard-action test as part of the active worktree.
- Refresh P5-T98 blocker wording with current Docker/E2E-lock state.
- Add supersession notes for stale P5-T93, P5-T40, and P5-T4 validation artifacts.
- Reclassify website-builder duplicate/move controls as no longer hidden live obligations.
- Decide the `make ci-full` disposition after active implementation lanes stabilize.
- Preserve Docker/runtime image policy ownership for the active validation-hygiene wave so the Dockerfile, Compose, and policy-script updates are not orphaned from the proof trail.

Excluded:

- New feature runtime code changes outside the active validation, Docker, and policy hygiene surfaces.
- Rewriting older proof logs to pretend their original outcomes were different.
- Closing `P5-T75` or authorizing any `P5-T6` runtime expansion.

## Current Environment Snapshot

- Docker responds locally with version `29.4.3`.
- `/tmp/nonprofit-manager-e2e.lock` is not present after the focused Playwright wrapper proof.
- `make ci-full` was run after the active P5-T98/P5-T99/P5-T100 implementation lanes stabilized.
- Backend coverage was rerun after the earlier shared-state failure, and `src/__tests__/integration/authorization.test.ts` passed inside the full backend coverage run.
- The host Playwright Firefox/WebKit cache was repaired after the broad host gate exposed missing browser executables.

## Implementation Notes

- `P5-T98_CLIENT_PORTAL_ACTION_CLARITY_AUDIT_2026-05-11.md` now records that the Docker-unavailable blocker is superseded by the current Docker-available/E2E-lock state.
- `P5-T93_SAFE_CURRENT_DEPENDENCY_REFRESH_PROOF_2026-05-09.md` now records that its E2E-lock blocker is historical and superseded by the May 11 revalidation.
- `P5-T93_TESTING_STRATEGY_OVERHAUL_PROOF_2026-05-09.md` now records that its backend blocked state is historical and superseded by the May 11 revalidation.
- `P5-T40_UI_UX_PLAIN_LANGUAGE_AUDIT_2026-05-01.md` and `P5-T4_MANAGED_FORM_PUBLISH_LOOP_REVIEW_2026-04-20.md` now state their archived proof-complete disposition.
- `WEBSITE_BUILDER_FUNCTIONS_AUDIT_2026-04-30.md` now distinguishes current duplicate/move controls from future authoring polish.
- `docs/ui/archive/app-ux-audit.json` was refreshed from `1524/9936/60` to `1530/9981/60` after the current frontend remediation changed the measured style-audit baseline. The enforced UI audit now passes with those counts.
- Docker/runtime policy updates are part of this validation-hygiene cleanup: the Dockerfile, Compose files, and Docker image policy checks now align with the current review wave instead of remaining detached tool churn.

## Validation Proof

- Pass: `make check-links` (225 files, 1453 local links).
- Pass: `make lint-doc-api-versioning`.
- Pass: `node scripts/ui-audit.ts --enforce-baseline` (`1530/9981/60`).
- Pass: `make lint` after the UI audit baseline refresh.
- Pass: `git diff --check`.
- Partial: `make ci-full` passed `make lint`, `make typecheck`, backend coverage (275 suites, 2231 tests), frontend coverage (250 files, 1371 tests), and the host Playwright Chromium project. It then failed during the Firefox/WebKit host Playwright projects because local browser executables were missing from `/Users/bryan/Library/Caches/ms-playwright`.
- Host-gate blocker captured: Firefox failures reported `browserType.launch: Executable doesn't exist at /Users/bryan/Library/Caches/ms-playwright/firefox-1511/firefox/Nightly.app/Contents/MacOS/firefox`; WebKit failures reported `browserType.launch: Executable doesn't exist at /Users/bryan/Library/Caches/ms-playwright/webkit-2272/pw_run.sh`. The Playwright summary for that run was 340 passed, 7 skipped, and 80 did not run before the command exited non-zero.
- Historical blocker: the earlier `make ci-full` backend coverage failure was 1 test out of 2231: `src/__tests__/integration/authorization.test.ts`, `Authorization Integration Tests > Contact CRUD Authorization > GET /api/v2/contacts > should allow authenticated users to list contacts`, expected `200`, received `401`.
- Recheck: `cd backend && npx jest src/__tests__/integration/authorization.test.ts --runInBand` passed by itself (1 suite, 42 tests). This leaves an order-sensitive full-coverage/shared-state blocker rather than a deterministic failure in the implementation lanes.
- Recheck pass: `cd backend && SKIP_INTEGRATION_DB_PREP=1 npm run test:coverage` passed (275 suites, 2231 tests), including `src/__tests__/integration/authorization.test.ts` inside the full backend coverage order.
- Repair pass: `cd e2e && npx playwright install firefox webkit` restored Firefox `1511` and WebKit `2272` under `/Users/bryan/Library/Caches/ms-playwright`.
- Launch recheck pass: `cd e2e && npx playwright test tests/smoke-public.spec.ts --project=firefox --project=webkit` passed (4 tests), confirming the repaired Firefox/WebKit executables launch and can load public routes.

## Host-Gate Disposition

The earlier `GET /api/v2/contacts` 401 was not reproduced after the backend coverage rerun. Treat it as a stale shared-state failure unless it reappears in the next full host gate.

The later `make ci-full` failure was an environment-cache failure, not an application regression: the Firefox/WebKit browser binaries expected by Playwright were missing locally. The cache has been repaired and a cross-browser smoke passed.

Next broad confirmation command, if a full gate rerun is desired after the cache repair: `make ci-full`.
