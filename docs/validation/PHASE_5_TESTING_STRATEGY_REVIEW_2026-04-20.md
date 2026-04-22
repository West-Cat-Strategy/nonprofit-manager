# Phase 5 Testing Strategy Review

**Last Updated:** 2026-04-21


**Date:** 2026-04-20  
**Task:** `P5-T2`

## Status

Phase 5's full Playwright/E2E and testing-strategy review is in progress.

The shared validation lane is materially healthier than it was on 2026-04-20.

- `make ci-full` is now self-sufficient for lint, UI audit, typecheck, backend coverage, and frontend coverage without manual shell exports.
- The earlier broad host regressions in `admin`, `analytics`, `auth`, `contacts`, `donations`, and `events` have been fixed in the current tree and revalidated in their targeted slices.
- The host Playwright launcher now survives locally occupied frontend ports by auto-falling back off `5173` instead of killing unrelated system listeners.
- The isolated Docker smoke gate is green again after explicit startup-failure cleanup hardening.

The remaining open lane gap is narrower now: finish the full host matrix rerun on the refreshed tree, then run the Docker cross-browser and audit follow-ons. A separate fresh-volume Docker proof is still needed for `tests/fresh-workspace-multi-user.spec.ts`, which is intentionally excluded from the host lane.

## Environment Notes

- Local shell runtime during this review: `node v25.9.0`
- Docker Desktop had to be relaunched once after the old host E2E preflight killed an unrelated `com.docke` listener on `127.0.0.1:5173`.
- The repo now bakes the Redis URL and backend coverage heap into the validation wrappers, so `make ci-full` no longer depends on caller-exported `REDIS_URL` or `NODE_OPTIONS`.
- The host Playwright wrapper now auto-selects an alternate frontend port starting with `5317` when `5173` is already occupied locally.
- The host Playwright backend startup now opts into `DB_REUSE_IF_READY=1`, so a ready isolated test DB can be reused instead of always forcing a Docker-backed rebuild during the `webServer` bootstrap.
- `tests/fresh-workspace-multi-user.spec.ts` is a Docker-only proof. It requires `SKIP_WEBSERVER=1`, `BYPASS_MFA_FOR_TESTS=false`, and a truly fresh starter-only Docker volume.

## Command Log

- `make check-links`
  - Result: Passed on 2026-04-20. Checked `123` files and `990` local links with no broken active-doc links.
- `make lint-doc-api-versioning`
  - Result: Passed on 2026-04-20. Checked `123` active-doc files with no stale API-version references.
- `make test-tooling`
  - Result: Passed on 2026-04-20. `22` tooling-contract tests passed.
- `make ci-full`
  - Result: On 2026-04-21, lint, UI audit, typecheck, backend coverage, and frontend coverage all passed on the refreshed lane contract.
  - Backend coverage result: `220` suites passed, `1784` tests passed.
  - Frontend coverage result: `223` files passed, `1140` tests passed.
  - The first rerun still failed at the host Playwright startup boundary because the old preflight killed a local `com.docke` listener on `5173`, which in turn made Docker unavailable before Playwright's backend `webServer` boot completed.
- `cd backend && DB_HOST=127.0.0.1 DB_PORT=8012 DB_NAME=nonprofit_manager_test DB_USER=postgres DB_PASSWORD=postgres REDIS_URL=redis://redis:6379 REQUIRE_TEST_DB=true SKIP_INTEGRATION_DB_PREP=1 npm exec -- jest src/__tests__/integration/adminRegistrationReview.test.ts --runInBand`
  - Result: Passed on 2026-04-21 after seeding the reviewer admin user directly in the test fixture.
- `cd e2e && npm run test:ci`
  - Result: Reached real host Playwright execution on 2026-04-21 with the repaired launcher, automatically moving the frontend runtime to `5317` while `5173` was occupied by Docker Desktop.
  - The earlier targeted failures in `admin`, `analytics`, `auth`, `contacts`, `donations`, and `events` were green in the partial Chromium rerun before it was stopped for focused remediation and artifact updates.
  - Two remaining early failures were identified during that partial run:

```text
tests/fresh-workspace-multi-user.spec.ts
Fresh workspace multi-user session › boots a fresh workspace and proves MFA-aware persona auth on canonical API surfaces

tests/link-health.spec.ts
Public route health › loads /accept-invitation/test-token
```

- `cd e2e && CI=1 bash ../scripts/e2e-playwright.sh host ./node_modules/.bin/playwright test tests/link-health.spec.ts --project=chromium --grep "loads /accept-invitation/test-token"`
  - Result: Passed on 2026-04-21 after teaching the public invitation page to defer placeholder-token validation the same way the portal invite surface already did.
- `cd e2e && CI=1 bash ../scripts/e2e-playwright.sh host --direct ./node_modules/.bin/playwright test --list --project=chromium --grep-invert "Dark Mode Accessibility Audit|Fresh workspace multi-user session"`
  - Result: Confirmed on 2026-04-21 that the Docker-only fresh-workspace MFA proof is now excluded from the host matrix.
- `make test-e2e-docker-smoke`
  - Result: Passed on 2026-04-21 after explicitly purging partial containers and named volumes on smoke-stack startup failure.
- `make docker-up-dev && cd e2e && npm run test:docker -- tests/fresh-workspace-multi-user.spec.ts --project=chromium`
  - Result: Failed on 2026-04-21 because the long-lived dev Docker volume was already initialized (`setupRequired=false`, `userCount=6`), not because of a product regression.
  - The proof still needs a separate fresh starter-only Docker project or a freshly reset starter volume.
- `cd frontend && npm test -- --run src/test/ux/RouteUxSmoke.test.tsx`
  - Result: Passed on 2026-04-20 after updating the dashboard heading expectation to the current `Workbench` copy.
- `cd e2e && bash ../scripts/e2e-playwright.sh host ./node_modules/.bin/playwright test --project=chromium tests/publishing.spec.ts tests/public-website.spec.ts`
  - Result: Passed on 2026-04-20. `4` tests green for the narrowed `P5-T4` website builder/forms/publishing/public-runtime loop after restoring `tests/publishing.spec.ts` and fixing same-host public-form CORS for published-site origins in host mode.
- `cd e2e && npm run test:docker:ci`
  - Result: Not run because the command sequence stops at the failing `make ci-full` lane.
- `cd e2e && npm run test:docker:audit`
  - Result: Not run because the command sequence stops at the failing `make ci-full` lane.
- `cd e2e && E2E_FRONTEND_PORT=5317 npm run test:ci:report`
  - Result: Reached the preserved host CI lane on 2026-04-20 after Docker stabilized and the frontend port moved off the locally occupied `5173` socket.
  - The rerun reproduced current shared failures before the sweep was intentionally stopped to finish the workboard split and `P5-T4` closeout:

```text
tests/admin.spec.ts
Admin & Settings Module › user settings uploads and persists the profile avatar
Admin & Settings Module › legacy settings compatibility routes are not supported

tests/analytics.spec.ts
Analytics Module › should navigate to report templates

tests/auth.spec.ts
Authentication Flow › dashboard startup loads workbench summary endpoints without duplicate refetches
```

  - Contacts coverage had advanced into `tests/contacts.spec.ts` before the rerun was stopped, but the earlier contacts failures were not re-confirmed in this shorter pass.

## Host Vs Docker Runtime Observations

- The host review lane is still not purely host-local: `make ci-full` depends on Docker for the CI Redis sidecar and isolated test DB contract before it reaches Playwright.
- The shell contract is much less fragile now that the repo-local wrappers inject `REDIS_URL=redis://redis:6379` and `NODE_OPTIONS=--max-old-space-size=8192` directly.
- The host launcher bug was a true runner issue, not an app failure: preflight killed an unrelated Docker Desktop listener on `5173`. The wrapper now auto-falls back to `5317`+ and leaves unrelated processes alone.
- The backend `webServer` startup now prefers reusing a ready isolated test DB instead of always forcing a Docker-backed rebuild.
- Host-mode Playwright serves published-site requests through the main backend runtime on `127.0.0.1:3001`, so public-site form submission in this mode depends on the backend route stack allowing same-host origins for `/api/v2/public/*` and `/api/v2/sites/:siteId/track`.
- The isolated Docker smoke gate is now back to green.
- The fresh-workspace MFA proof is not a host-lane responsibility. It belongs to an externally managed Docker runtime with MFA bypass disabled and a fresh starter-only volume.

## Coverage And Blind Spots

- Backend and frontend coverage are no longer the blocker.
- The targeted Phase 5 regressions in avatar persistence, legacy admin redirects, analytics templates, workbench auth startup, contacts filters/merge/delete/pagination, donations receipts/filters, and events hybrid check-in all now have green targeted proof in the host runtime.
- The public `/accept-invitation/:token` surface now behaves cleanly for placeholder preview tokens, which removes the route-health false negative without weakening real-token validation.
- The smoke-stack startup failure mode is hardened, but the broader Docker cross-browser and audit lanes are still pending.
- The remaining blind spot is the fresh-volume MFA proof: we confirmed it is excluded from the host matrix and still valid as a Docker concern, but we have not yet rerun it on a truly fresh starter-only Docker project in this pass.

## Recommended Next Steps

1. Rerun the full host matrix on the refreshed tree now that the launcher fallback and placeholder invitation fix are in place.
2. Bring up a separate fresh starter-only Docker project for `tests/fresh-workspace-multi-user.spec.ts` using isolated ports and `BYPASS_MFA_FOR_TESTS=false`, rather than reusing the long-lived dev volume.
3. Once the host rerun and fresh-volume MFA proof are both green, continue with `cd e2e && npm run test:docker:ci` and `cd e2e && npm run test:docker:audit`.
4. Refresh the Phase 5 validation/workboard artifacts one more time after those final reruns land.

## Implications For Phase 5 Waves

- `P5-T3` Email platform work should still wait for the final host-plus-Docker validation pass, but the lane is no longer blocked at lint, typecheck, or coverage.
- `P5-T4` Website surfaces proof remains green and is no longer the main validation blocker.
- `P5-T5` Client portal and auth-facing work should keep route-health placeholder-token behavior aligned across public and portal invite/reset surfaces, because those routes are exercised by strict runtime health checks.
