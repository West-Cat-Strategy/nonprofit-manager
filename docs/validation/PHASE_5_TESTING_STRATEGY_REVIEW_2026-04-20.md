# Phase 5 Testing Strategy Review

**Last Updated:** 2026-04-20


**Date:** 2026-04-20  
**Task:** `P5-T2`

## Status

Phase 5's full Playwright/E2E and testing-strategy review is in progress.

The dashboard UX smoke blocker is fixed. The current broad-lane blockers now sit deeper in the host Playwright matrix inside `make ci-full`, and the follow-on Docker cross-browser and audit lanes remain pending.

## Environment Notes

- Local shell runtime during this review: `node v25.9.0`
- Docker Desktop was not running at the start of the review and had to be launched before the compose-backed parts of `make ci-full` could run.
- The repo-local CI wrapper currently needs `REDIS_URL` exported in the shell for the `docker compose ... up -d redis` step inside `make test-coverage-full`.
- Exporting the entire `.env.development` contract leaked `DB_HOST=postgres`, which conflicts with the isolated test DB helper. Injecting only `REDIS_URL=redis://redis:6379` preserved the expected `127.0.0.1:8012` test DB contract.

## Command Log

- `make check-links`
  - Result: Passed on 2026-04-20. Checked `123` files and `990` local links with no broken active-doc links.
- `make lint-doc-api-versioning`
  - Result: Passed on 2026-04-20. Checked `123` active-doc files with no stale API-version references.
- `make test-tooling`
  - Result: Passed on 2026-04-20. `22` tooling-contract tests passed.
- `make ci-full`
  - Result: Failed on 2026-04-20 before coverage because the compose bootstrap required `REDIS_URL` in the shell environment.
- `make ci-full` after launching Docker Desktop and exporting the full `.env.development`
  - Result: Failed on 2026-04-20 during isolated test DB prep because the exported dev env leaked `DB_HOST=postgres`, causing `./scripts/db-migrate.sh` to wait on `postgres:8012` instead of `127.0.0.1:8012`.
- `REDIS_URL=redis://redis:6379 make ci-full`
  - Result: Failed on 2026-04-20 during backend coverage with a Node heap OOM.
- `NODE_OPTIONS=--max-old-space-size=8192 REDIS_URL=redis://redis:6379 make ci-full`
  - Result: Reached the host Playwright matrix on 2026-04-20 after backend and frontend coverage completed successfully with the larger Node heap and exported `REDIS_URL`.
  - Frontend blocker cleared during this rerun:

```text
frontend/src/test/ux/RouteUxSmoke.test.tsx
dashboard heading expectation updated from /workbench overview/i to /^workbench$/i
```

  - Broad host Playwright then surfaced unrelated failures in shared areas, including:

```text
tests/admin.spec.ts
Admin & Settings Module › legacy settings compatibility routes are not supported

tests/analytics.spec.ts
Analytics Module › should navigate to report templates

tests/auth.spec.ts
Authentication Flow › dashboard startup loads workbench summary endpoints without duplicate refetches

tests/contacts.spec.ts
Contacts Module › should search contacts and filter by inactive status
Contacts Module › should persist contacts list filters in the URL after reload
Contacts Module › should merge a contact into an inactive target without losing linked records
```

  - The broad run was interrupted after those failures to free the host runtime for the narrower `P5-T4` browser proof.
  - Backend coverage result under this rerun: targeted publishing/backend slices remained green after the larger-heap rerun.
  - Frontend coverage result under this rerun: the dashboard smoke blocker was cleared and the host review lane moved into Playwright.
- `cd frontend && npm test -- --run src/test/ux/RouteUxSmoke.test.tsx`
  - Result: Passed on 2026-04-20 after updating the dashboard heading expectation to the current `Workbench` copy.
- `cd e2e && bash ../scripts/e2e-playwright.sh host ./node_modules/.bin/playwright test --project=chromium tests/publishing.spec.ts tests/public-website.spec.ts`
  - Result: Passed on 2026-04-20. `4` tests green for the narrowed `P5-T4` website builder/forms/publishing/public-runtime loop after restoring `tests/publishing.spec.ts` and fixing same-host public-form CORS for published-site origins in host mode.
- `cd e2e && npm run test:docker:ci`
  - Result: Not run because the command sequence stops at the failing `make ci-full` lane.
- `cd e2e && npm run test:docker:audit`
  - Result: Not run because the command sequence stops at the failing `make ci-full` lane.

## Host Vs Docker Runtime Observations

- The host review lane is not purely host-local: `make ci-full` still depends on Docker for the CI Redis sidecar and the isolated test database bootstrap before it reaches frontend coverage or Playwright.
- The current CI shell contract is fragile. `REDIS_URL` must be exported for compose to start, but exporting the full development env breaks the isolated test DB helper by carrying `DB_HOST=postgres` into a lane that expects `127.0.0.1:8012`.
- The Docker development stack itself was healthy once Docker Desktop started; `docker ps` showed the dev frontend, backend, public site, Postgres, and Redis containers running on `8005/8004/8006/8002/8003`.
- Host-mode Playwright serves published-site requests through the main backend runtime on `127.0.0.1:3001`, so public-site form submission in this mode depends on the backend route stack allowing same-host origins for `/api/v2/public/*` and `/api/v2/sites/:siteId/track`.
- The planned Docker cross-browser and audit runs remain unverified because the host `ci-full` lane is still red in broader Playwright coverage.

## Coverage And Blind Spots

- Backend and frontend coverage both clear when the process is given a larger heap and the shell exports only `REDIS_URL`, which suggests the remaining broad-lane issues are now primarily Playwright/runtime regressions rather than coverage blockers.
- The dashboard UX smoke contract is now aligned with the current `Workbench` heading, so that earlier copy drift is no longer the gating failure.
- The narrowed `P5-T4` publishing/public-site browser proof is now green in host mode, which reduces uncertainty for the website builder plus public website slice even though the broad shared Playwright lane is still red.
- Because the host lane still does not complete cleanly, the follow-on Docker Playwright cross-browser and audit commands remain intentionally deferred.

## Recommended Next Steps

1. Re-run `NODE_OPTIONS=--max-old-space-size=8192 REDIS_URL=redis://redis:6379 make ci-full` and triage the current host Playwright failures in `admin`, `analytics`, `auth`, and `contacts` instead of spending more time on the cleared dashboard smoke contract.
2. Keep the shell contract narrow: export `REDIS_URL=redis://redis:6379` without exporting the entire development env, and keep the larger backend coverage heap until Node/runtime behavior is revisited.
3. Once the broad host lane is green again, continue with `cd e2e && npm run test:docker:ci` and `cd e2e && npm run test:docker:audit`.
4. Consider hardening the CI wrapper so `make ci-full` documents or injects the required `REDIS_URL` without relying on a caller to export it manually.
5. Consider formalizing the backend coverage heap requirement if Node `v25.9.0` remains the active local runtime for this repo.

## Implications For Phase 5 Waves

- `P5-T3` Email platform work should not expand until the shared `ci-full` lane is stable again, because delivery, preview, and template changes will need the same backend-plus-frontend coverage baseline.
- `P5-T4` Website surfaces work now has a narrow host Playwright proof for the managed-form publish loop, but it is still missing the broader Docker cross-browser and audit follow-through.
- `P5-T5` Client portal work should assume the current UX smoke layer is sensitive to product-copy drift; route-level UX contracts need to stay aligned with intentional content changes or they will block the validation lane early.
