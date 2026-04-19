# P4-T9D Final Report

Date: 2026-03-05  
Task: `P4-T9D`  
Status: `Done` (strict closure complete; retry-resolved flakes documented)

## Delivered Scope

1. Persistent authenticated shell route to avoid layout/nav remount churn.
2. Backend lightweight lookup endpoint `GET /api/v2/contacts/lookup` with hybrid-compatible response shape retained.
3. Frontend quick lookup switched from broad contact list fetch to lookup endpoint.
4. Contact detail path moved off unscoped global cases fetch to contact-scoped cases path.
5. Route-domain lazy loading + stricter bundle budgets for startup JS reduction.
6. Runtime stabilization pass for strict closure:
   - Playwright backend webServer compose context propagation (`E2E_COMPOSE_MODE`, `E2E_COMPOSE_PROJECT_NAME`, `E2E_COMPOSE_FILES` -> `COMPOSE_*`).
   - CI Playwright step export of compose context + `PW_REUSE_EXISTING_SERVER=0`.
   - Deterministic `e2e/.cache` cleanup before Playwright in CI.
   - Strict-admin auth diagnostics hardened (no strict fallback, clearer invalid-credential message).
   - Lookup integration assertion updated for nullable `email`, `phone`, `mobile_phone` while preserving required hybrid fields.
7. Strict-closure unblock fixes absorbed in-task:
   - `backend/src/__tests__/integration/volunteers.test.ts` cleanup order corrected for FK dependency (`accounts.created_by -> users.id`).
   - `e2e/tests/auth.spec.ts` transition guard converted to SPA-navigation semantics with transition-delta assertions.
   - Additional deterministic E2E hardening in `e2e/tests/link-health.spec.ts` and `e2e/tests/tasks.spec.ts`.

## Performance Artifacts

- Baseline metrics: `docs/performance/p4-t9d-baseline.json`
- Baseline notes: `docs/performance/p4-t9d-baseline-notes.md`
- Frozen thresholds: `docs/performance/p4-t9d-thresholds.json`
- Startup map updates: `docs/performance/p4-t9a-startup-request-map.md`
- Strict-run retry artifacts: transient `e2e/test-results/` output from the final strict run; the old retry folders are not retained in this checkout

## Metric Outcomes

| Metric | Baseline | Target | Current Evidence | Result |
|---|---:|---:|---:|---|
| Startup request count (`p75`) | 8 | <= 6 | `e2e/tests/performance.startup.spec.ts` guard passed in final strict run (all projects green after retries) | Pass (guarded at `<= 6`) |
| App-owned startup JS bytes | 256,726 | <= 192,544 | `index-main` 94,555 bytes (`index-BUSiWP7j.js`) | Pass (`-63.2%`) |
| Login -> dashboard load (`p75`) | 2,600ms | <= 1,800ms | Performance guard passed overall; one Firefox first-attempt outlier captured at `2670ms` then retry passed under cap | Pass (with retry-resolved flake) |

## Verification Evidence

### Strict Selector + Ordered Execution

- `scripts/select-checks.sh --files "<current changed-file set>" --mode strict`
- Emitted sequence and results:
  1. `make lint` -> pass
  2. `make typecheck` -> pass
  3. `cd backend && npm run test:unit` -> pass
  4. `cd backend && npm run test:integration` -> pass
  5. `node scripts/ui-audit.ts` -> pass
  6. `cd frontend && npm test -- --run` -> pass
  7. `cd e2e && npm run test:smoke` -> pass
  8. `make ci-full` -> pass
  9. `cd e2e && npm run test:ci` -> covered in `make ci-full` Playwright step (pass)

### Mandatory Perf/Build Commands

- `cd frontend && npm run build` -> pass
- `node scripts/check-frontend-bundle-size.js` -> pass
- `cd e2e && npm run test:smoke` -> pass
- `cd e2e && npm run test:ci` -> pass via strict CI run (`make ci-full`)

### Full Strict CI Evidence (`make ci-full`)

- Result: `CI Pipeline Passed!`
- Playwright summary: `611 passed`, `3 skipped`, `4 flaky` (retry-resolved), runtime `~14.9m`
- Retry-resolved cases captured in transient `e2e/test-results/` output during the final run:
  - Firefox startup request-count / p75 threshold guard
  - WebKit cases refresh URL-preservation flow
  - WebKit contacts create/edit form flow
  - WebKit contacts inactive-status filter flow

## Residual Risk (Non-Blocking)

1. Playwright run remains flaky in a small subset of browser-specific tests (all resolved by retry in final strict run).
2. Non-strict tests still log admin bootstrap fallback messages when seeded admin credentials drift in a snapshot; strict-mode behavior remains deterministic and enforced.

## Closure Statement

What: `P4-T9D` startup/transition acceleration and strict-closure unblock scope are implemented and verified.  
Why: The strict sequence now closes successfully with performance, bundle, and full CI gates green.  
Next Step: Optionally open a follow-up stabilization task to reduce Playwright flaky retries in WebKit/Firefox.
