# Phase 5 Testing Strategy Review

**Last Updated:** 2026-04-24


**Date:** 2026-04-20  
**Task:** `P5-T2`

## Status

Phase 5's full Playwright/E2E and testing-strategy review has moved to review. The `P5-T2B` gate is now proof-complete after the final uninterrupted broad Docker-matrix rerun passed on 2026-04-24.

The host coverage blocker that was active on 2026-04-22 is cleared in targeted proof, the `P5-T2C` remediation slice is functionally proof-complete, the auth-alias operations handoff is published, and the Docker smoke and dark-mode audit follow-ons are green on the corrected Docker review contract.

- `make ci-full` remains self-sufficient for lint, UI audit, typecheck, backend coverage, and frontend coverage without manual shell exports.
- The earlier broad host regressions in `admin`, `analytics`, `auth`, `contacts`, `donations`, and `events` have been fixed in the current tree and revalidated in their targeted slices.
- The host Playwright launcher still survives locally occupied frontend ports by auto-falling back off `5173` instead of killing unrelated system listeners.
- The isolated Docker smoke gate is still green after explicit startup-failure cleanup hardening.
- The volunteer/contact-scope and database-config blockers are now fixed and green in their narrow backend proofs.
- The 2026-04-23 backend coverage repro passed with `223` suites and `1874` tests, and the later host rerun re-proved backend coverage, frontend coverage, and the changed host Playwright slices before it was intentionally stopped.
- The full Docker CI matrix now has a clean end-to-end artifact on the corrected review stack. Earlier reproduced failures all remained covered by targeted green proof: route-health `/outreach`, portal case-detail auth-bootstrap noise, persona MFA-bypass handling, contact filter URL sync, dashboard startup duplicate analytics fetches, WebKit-only lazy-module import recovery bursts on `/people`, `/settings/user`, `/dashboard`, the short desktop user-menu flow, compact/expanded navigation, and core route headings/actions, plus Firefox auth-fixture navigation abort, authenticated route render-settle recovery, WebKit contact cancel navigation, and WebKit contact validation timing.

The final `P5-T2B` proof command was `cd e2e && npm run test:docker:ci`. It passed with `982` desktop Docker cross-browser tests passed, `11` skipped in `51.3m`, followed by the Mobile Chrome Docker follow-on with `3` passed in `13.8s`. The only notable warnings were accepted occupied Docker ports and Node `NO_COLOR` / `FORCE_COLOR` warnings.

## Environment Notes

- Local shell runtime during this review: `node v25.9.0`
- Docker Desktop had to be relaunched once after the old host E2E preflight killed an unrelated `com.docke` listener on `127.0.0.1:5173`.
- The repo now bakes the Redis URL and backend coverage heap into the validation wrappers, so `make ci-full` no longer depends on caller-exported `REDIS_URL` or `NODE_OPTIONS`.
- The host Playwright wrapper now auto-selects an alternate frontend port starting with `5317` when `5173` is already occupied locally.
- The host Playwright backend startup now opts into `DB_REUSE_IF_READY=1`, so a ready isolated test DB can be reused instead of always forcing a Docker-backed rebuild during the `webServer` bootstrap.
- `tests/fresh-workspace-multi-user.spec.ts` is a Docker-only proof. It requires `SKIP_WEBSERVER=1`, `BYPASS_MFA_FOR_TESTS=false`, and a truly fresh starter-only Docker volume.
- The 2026-04-22 host rerun used `E2E_FRONTEND_PORT=5317` and refreshed the checked-in UI audit baseline after legitimate repo-wide style-count drift.
- The Docker review wrapper now exports `BYPASS_MFA_FOR_TESTS=true` by default in Docker mode, while preserving an explicit `BYPASS_MFA_FOR_TESTS=false` override for the separate fresh-workspace MFA proof.
- Docker dev/review stacks now keep Mailchimp unconfigured by default unless `DEV_MAILCHIMP_API_KEY` and `DEV_MAILCHIMP_SERVER_PREFIX` are explicitly set, so checked-in placeholder credentials no longer produce false configured-provider failures.
- The latest corrected Docker review stack used `18804` backend, `18805` frontend, `18806` public site, and `18802` Postgres with blank Mailchimp env and `BYPASS_MFA_FOR_TESTS=true`.
- The 2026-04-24 focused WebKit recovery proof used the documented `nonprofit-dev` Docker review stack on `8004` backend, `8005` frontend, and `8006` public site with `DEV_NODE_ENV=test`, `DEV_BYPASS_REGISTRATION_POLICY_IN_TEST=true`, and `DEV_BYPASS_MFA_FOR_TESTS=true`.
- The 2026-04-24 final Docker CI proof used the same documented `nonprofit-dev` Docker review stack. The standard Playwright report files reflect the final Mobile Chrome follow-on because `test:docker:ci` runs desktop first and then mobile; the desktop summary is recorded in this command log.

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
- `cd backend && npm run type-check`
  - Result: Passed on 2026-04-22 for the `P5-T5` portal forms contract follow-through.
- `cd backend && npm exec -- jest src/__tests__/integration/volunteers.test.ts --runInBand`
  - Result: Passed on 2026-04-22 after aligning the volunteer fixture with the current scoped-account contract by seeding `user_account_access` for the created test account before contact creation.
- `cd backend && npm run test:unit -- --runInBand --runTestsByPath src/__tests__/config/database.test.ts`
  - Result: Passed on 2026-04-22 after updating the test to assert `TEST_DATABASE_DEFAULTS` for Jest/test fallback connections instead of the old non-production app-role defaults.
- `cd backend && SKIP_INTEGRATION_DB_PREP=1 npm test -- --runInBand src/modules/cases/usecases/__tests__/caseForms.usecase.test.ts`
  - Result: Passed on 2026-04-22 with the broadened assignment-status bucket support and portal `submitted` semantics.
- `cd backend && SKIP_INTEGRATION_DB_PREP=1 npm test -- --runInBand src/modules/cases/repositories/__tests__/caseFormsRepository.assignments.test.ts`
  - Result: Passed on 2026-04-22 with repository coverage for `active` and `completed` assignment buckets.
- `cd backend && npm test -- --runInBand src/__tests__/integration/portalVisibility.test.ts`
  - Result: Passed on 2026-04-22 after adding assignment-backed portal forms integration coverage, including the assignment detail path.
- `cd frontend && npm test -- --run src/features/portal/api/portalCaseFormsApiClient.test.ts src/features/portal/pages/__tests__/PortalFormsPage.test.tsx`
  - Result: Passed on 2026-04-22 for canonical bucket-driven portal inbox fetching and assignment summary rendering.
- `make check-links`
  - Result: Passed again on 2026-04-22 after the portal docs wording updates.
- `cd e2e && E2E_RUNNER_ACTION=kill bash ../scripts/e2e-playwright.sh host ../node_modules/.bin/playwright test --project=chromium tests/portal-workspace.spec.ts`
  - Result: Passed on 2026-04-22. The focused portal workspace proof now covers the assignment-backed forms inbox, default active view, completed toggle, due-date summary, and response packet link.
- `E2E_FRONTEND_PORT=5317 make ci-full`
  - Result: On 2026-04-22, the host lane advanced past the old runner-contract issues after refreshing `docs/ui/archive/app-ux-audit.json` for legitimate style-count drift and moving the exported email-builder default factory into `frontend/src/features/builder/components/emailCampaignBuilderDefaults.ts`.
  - Result: The rerun then surfaced real backend coverage failures and was intentionally stopped before any wider Docker reruns:

```text
src/__tests__/integration/volunteers.test.ts
Volunteer Module Integration Tests › should create a volunteer and automatically create a contact record

src/__tests__/config/database.test.ts
database config › uses non-production defaults outside production
```

  - The volunteer failure reported `Failed to create volunteer test contact` after `Selected account is outside the current request scope` during contact creation, which points to a contact-scope regression in that test path rather than a shared runner bug.
  - The database-config failure showed expectation drift between the asserted non-production defaults and the current isolated test contract (`127.0.0.1:8012/nonprofit_manager_test`, `postgres/postgres`).
- `E2E_FRONTEND_PORT=5317 make ci-full`
  - Result: On 2026-04-22, the host lane moved past the volunteer/contact-scope and database-config blockers and then stopped in the lint/policy stage on a fresh UI audit mismatch:

```text
UI audit failed:
- Style audit mismatch. Expected 1262/9443/58, got 1262/9391/58.
```

  - The rerun did not reach typecheck, backend coverage, frontend coverage, or Playwright because `node scripts/ui-audit.ts --enforce-baseline` failed inside `make lint`.
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

- `cd e2e && CI=1 bash ../scripts/e2e-playwright.sh host ../node_modules/.bin/playwright test tests/link-health.spec.ts --project=chromium --grep "loads /accept-invitation/test-token"`
  - Result: Passed on 2026-04-21 after teaching the public invitation page to defer placeholder-token validation the same way the portal invite surface already did.
- `cd e2e && CI=1 bash ../scripts/e2e-playwright.sh host --direct ../node_modules/.bin/playwright test --list --project=chromium --grep-invert "Dark Mode Accessibility Audit|Fresh workspace multi-user session"`
  - Result: Confirmed on 2026-04-21 that the Docker-only fresh-workspace MFA proof is now excluded from the host matrix.
- `make test-e2e-docker-smoke`
  - Result: Passed on 2026-04-21 after explicitly purging partial containers and named volumes on smoke-stack startup failure.
- `make docker-up-dev && cd e2e && npm run test:docker -- tests/fresh-workspace-multi-user.spec.ts --project=chromium`
  - Result: Failed on 2026-04-21 because the long-lived dev Docker volume was already initialized (`setupRequired=false`, `userCount=6`), not because of a product regression.
  - The proof still needs a separate fresh starter-only Docker project or a freshly reset starter volume.
- `cd frontend && npm test -- --run src/test/ux/RouteUxSmoke.test.tsx`
  - Result: Passed on 2026-04-20 after updating the dashboard heading expectation to the current `Workbench` copy.
- `cd e2e && bash ../scripts/e2e-playwright.sh host ../node_modules/.bin/playwright test --project=chromium tests/publishing.spec.ts tests/public-website.spec.ts`
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
- `cd frontend && npm test -- --run src/features/builder/pages/__tests__/useBuilderSiteContext.test.tsx src/features/builder/pages/__tests__/usePageEditorKeyboardShortcuts.test.tsx src/features/builder/pages/__tests__/usePageEditorController.test.tsx`
  - Result: Passed on 2026-04-23 for the `P5-T2C` builder remediation closeout proof.
- `cd backend && npm test -- --runInBand src/__tests__/services/scheduledReportService.test.ts src/__tests__/services/reportTemplateService.test.ts`
  - Result: Passed on 2026-04-23 for the `P5-T2C` scheduled-report and report-template closeout proof.
- `cd frontend && npm run type-check`
  - Result: Passed on 2026-04-23 for the `P5-T2C` closeout proof and again after the Docker review fixes.
- `cd backend && npm run type-check`
  - Result: Passed on 2026-04-23 for the `P5-T2C` closeout proof.
- `cd backend && REDIS_URL=redis://redis:6379 NODE_OPTIONS=--max-old-space-size=8192 SKIP_INTEGRATION_DB_PREP=1 npm run test:coverage`
  - Result: Passed on 2026-04-23. Backend coverage completed with `223` suites and `1874` tests green.
- `make test-coverage-full`
  - Result: Partially rerun on 2026-04-23. Backend coverage, frontend coverage, and the changed host Playwright slices re-proved green before the command was intentionally stopped because the earlier same-day full host Playwright artifact was already green and the Docker follow-ons needed the remaining time.
- `node scripts/check-auth-guard-policy.ts`
  - Result: Passed on 2026-04-23 after the auth-alias operations handoff update.
- `node scripts/check-rate-limit-key-policy.ts`
  - Result: Passed on 2026-04-23 after the auth-alias operations handoff update.
- `make test-e2e-docker-smoke`
  - Result: Passed on 2026-04-23 against an isolated smoke stack. `4` Chromium smoke/public-website tests passed.
- `cd e2e && SKIP_WEBSERVER=1 BYPASS_MFA_FOR_TESTS=false BYPASS_REGISTRATION_POLICY_IN_TEST=true E2E_DB_NAME=nonprofit_manager ... ../node_modules/.bin/playwright test tests/fresh-workspace-multi-user.spec.ts --project=chromium`
  - Result: Passed on 2026-04-23 against a fresh starter-only Docker stack. This remains intentionally separate from `test:docker:ci`.
- `cd e2e && E2E_BACKEND_PORT=18804 E2E_FRONTEND_PORT=18805 E2E_PUBLIC_SITE_PORT=18806 E2E_DB_PORT=18802 BASE_URL=http://127.0.0.1:18805 API_URL=http://127.0.0.1:18804 npm run test:docker -- tests/link-health.spec.ts --project=chromium --grep 'loads /outreach|loads /portal/cases/:id' --retries=0`
  - Result: Passed on 2026-04-23 after fixing the outreach key warning and allowing expected auth-bootstrap noise for the portal case-detail route-health assertion.
- `cd e2e && E2E_BACKEND_PORT=18804 E2E_FRONTEND_PORT=18805 E2E_PUBLIC_SITE_PORT=18806 E2E_DB_PORT=18802 BASE_URL=http://127.0.0.1:18805 API_URL=http://127.0.0.1:18804 npm run test:docker -- tests/persona-workflows.spec.ts --project=chromium --grep 'fundraiser-prospect-research-to-pipeline' --retries=0`
  - Result: Passed on 2026-04-23 after aligning Docker wrapper MFA-bypass env with the review-stack runtime contract.
- `cd e2e && E2E_BACKEND_PORT=18804 E2E_FRONTEND_PORT=18805 E2E_PUBLIC_SITE_PORT=18806 E2E_DB_PORT=18802 BASE_URL=http://127.0.0.1:18805 API_URL=http://127.0.0.1:18804 npm run test:docker -- tests/contacts.spec.ts --project=chromium --retries=0`
  - Result: Passed on 2026-04-23. `18` Chromium contacts tests passed after fixing contact-list URL sync and tightening the E2E filter flow.
- `cd e2e && E2E_BACKEND_PORT=18804 E2E_FRONTEND_PORT=18805 E2E_PUBLIC_SITE_PORT=18806 E2E_DB_PORT=18802 BASE_URL=http://127.0.0.1:18805 API_URL=http://127.0.0.1:18804 npm run test:docker -- tests/auth.spec.ts --project=chromium --grep 'dashboard startup loads workbench summary endpoints without duplicate refetches' --retries=0`
  - Result: Passed on 2026-04-23 after deferring dashboard lane loading until an authenticated user id is available.
- `cd frontend && npm test -- --run src/features/dashboard/context/__tests__/DashboardDataContext.test.tsx src/features/dashboard/pages/__tests__/WorkbenchDashboardPage.test.tsx src/features/contacts/pages/__tests__/ContactListPage.test.tsx src/features/neoBrutalist/pages/__tests__/OutreachCenterPage.test.tsx`
  - Result: Passed on 2026-04-23. `14` tests passed across dashboard context, workbench, contacts, and outreach coverage.
- `cd e2e && E2E_BACKEND_PORT=18804 E2E_FRONTEND_PORT=18805 E2E_PUBLIC_SITE_PORT=18806 E2E_DB_PORT=18802 BASE_URL=http://127.0.0.1:18805 API_URL=http://127.0.0.1:18804 npm run test:docker:audit`
  - Result: Passed on 2026-04-23. The dark-mode accessibility audit covered all cataloged routes in `3.1m`.
- `cd e2e && E2E_BACKEND_PORT=18804 E2E_FRONTEND_PORT=18805 E2E_PUBLIC_SITE_PORT=18806 E2E_DB_PORT=18802 BASE_URL=http://127.0.0.1:18805 API_URL=http://127.0.0.1:18804 npm run test:docker:ci`
  - Result: Attempted multiple times on 2026-04-23 but not completed end-to-end. Each reproduced failure was narrowed and fixed in targeted proof; the final broad rerun still needs to be repeated after the dashboard duplicate-fetch fix.
- `DEV_NODE_ENV=test DEV_BYPASS_REGISTRATION_POLICY_IN_TEST=true DEV_BYPASS_MFA_FOR_TESTS=true make docker-up-dev`
  - Result: Passed on 2026-04-24. The `nonprofit-dev` Docker review stack built and reached HTTP readiness on `8004`, `8005`, and `8006`.
- `cd e2e && npm run test:docker -- tests/link-health.spec.ts tests/setup-launch.spec.ts tests/visibility-link-audit.spec.ts --project=webkit --grep "dashboard|people|settings/user|launch-critical authenticated|staff route audit|staff navigation links"`
  - Result: Passed on 2026-04-24. `16` focused WebKit route-health, launch, and visibility/link tests passed against the Docker review stack.
- `cd e2e && npm run test:docker:ci`
  - Result: Attempted on 2026-04-24 after the focused WebKit route recovery proof. The desktop matrix ran for `50.9m` with `978` passed, `11` skipped, and `4` failed; the mobile follow-on did not start because the desktop matrix failed. The broad rerun proved the earlier WebKit route-health/module-import failures green and narrowed the remaining follow-through to Firefox dashboard summary counting, Firefox auth-fixture `NS_BINDING_ABORTED`, Firefox authenticated `/cases` render settle, and the WebKit short desktop user-menu recoverable import burst.
- `cd e2e && npm run test:docker -- tests/auth.spec.ts tests/linking-operations-outreach.spec.ts tests/setup-launch.spec.ts --project=firefox --grep "dashboard startup loads workbench summary endpoints without duplicate refetches|displays linking module and supports creating a partnership record|launch-critical authenticated routes have no unhandled runtime errors"`
  - Result: Passed on 2026-04-24. `3` focused Firefox recovery tests passed after counting successful dashboard summary responses only after API-auth bootstrap, retrying only recoverable root-navigation aborts, and allowing the shared route-render blocker to wait for either visible route content or an app error boundary.
- `cd e2e && npm run test:docker -- tests/ux-regression.spec.ts --project=webkit --grep "short desktop viewport keeps admin settings reachable from the user menu"`
  - Result: Passed on 2026-04-24. `1` WebKit focused test passed after limiting recovery to proven visible admin-route content with no persistent loading shell or app error boundary.
- `cd e2e && npm run test:docker:ci`
  - Result: Attempted on 2026-04-24 after the first Firefox/WebKit recovery pass. The desktop matrix ran for `55.1m` with `978` passed, `11` skipped, and `4` failed; the mobile follow-on did not start because the desktop matrix failed. The rerun proved the prior Firefox auth/linking failures and WebKit route-health/setup-launch failures green, then narrowed the remaining follow-through to Firefox setup-launch `/contacts` opaque React boundary console recovery, WebKit contact edit-form cancel targeting, and two WebKit UX regression module-import recovery sites.
- `cd e2e && npm run test:docker -- tests/setup-launch.spec.ts tests/contacts.spec.ts tests/ux-regression.spec.ts --project=firefox --project=webkit --grep "launch-critical authenticated routes have no unhandled runtime errors|should support cancel navigation in create and edit forms|global navigation stays compact below lg and expands at lg|core app route headings and primary actions remain available"`
  - Result: Passed on 2026-04-24. `8` focused Firefox/WebKit tests passed in `1.1m` after the setup-launch route-proof recovery, precise contact form cancel targeting, and expanded WebKit UX module-import recovery guards.
- `cd e2e && npm run test:docker:ci`
  - Result: Attempted again on 2026-04-24 after the focused 8-test Firefox/WebKit recovery proof. The desktop matrix ran for roughly `1.0h` with `979` passed, `11` skipped, and `3` failed; the mobile follow-on did not start because the desktop matrix failed. This rerun proved the previous Firefox setup-launch, WebKit contact cancel-navigation, and WebKit UX module-import failures green, then narrowed the remaining follow-through to Firefox dashboard summary response de-duping, Firefox admin/portal opaque React boundary console recovery, and WebKit contact create-form validation timing.
- `cd e2e && npm run test:docker -- tests/auth.spec.ts tests/ux-regression.spec.ts tests/contacts.spec.ts --project=firefox --project=webkit --grep "dashboard startup loads workbench summary endpoints without duplicate refetches|admin settings and portal routes keep headings/actions and redirect contracts|should validate create form required and format errors"`
  - Result: Passed on 2026-04-24. `6` focused Firefox/WebKit tests passed in `46.8s` after de-duping repeated Playwright response notifications for the same Firefox request object, adding final-route proof for the Firefox admin/portal opaque boundary pair, and scoping contact create-form validation assertions to the actual form.
- `cd e2e && npm run test:docker:ci`
  - Result: Passed on 2026-04-24 as the final uninterrupted Docker CI artifact for `P5-T2B`.
  - Desktop Docker cross-browser matrix: `982` passed, `11` skipped in `51.3m`.
  - Mobile Chrome follow-on: `3` passed in `13.8s`.
  - Failure summary: no failing tests or product/runtime errors.
  - Generated local artifacts: `e2e/playwright-report/index.html`, `e2e/test-results.json`, and `e2e/test-results/.last-run.json`. These files are ignored local Playwright outputs rather than durable repo evidence; the durable proof for this note is the dated command summary above. The standard report/test-result files now reflect the Mobile Chrome follow-on because the wrapper runs that slice after the desktop matrix.
  - Non-failure warnings: occupied Docker ports were accepted by the wrapper, and Node printed `NO_COLOR` / `FORCE_COLOR` warnings.

## Host Vs Docker Runtime Observations

- The host review lane is still not purely host-local: `make ci-full` depends on Docker for the CI Redis sidecar and isolated test DB contract before it reaches Playwright.
- The shell contract is much less fragile now that the repo-local wrappers inject `REDIS_URL=redis://redis:6379` and `NODE_OPTIONS=--max-old-space-size=8192` directly.
- The host launcher bug was a true runner issue, not an app failure: preflight killed an unrelated Docker Desktop listener on `5173`. The wrapper now auto-falls back to `5317`+ and leaves unrelated processes alone.
- The backend `webServer` startup now prefers reusing a ready isolated test DB instead of always forcing a Docker-backed rebuild.
- Host-mode Playwright serves published-site requests through the main backend runtime on `127.0.0.1:3001`, so public-site form submission in this mode depends on the backend route stack allowing same-host origins for `/api/v2/public/*` and `/api/v2/sites/:siteId/track`.
- The isolated Docker smoke gate is now back to green.
- The fresh-workspace MFA proof is not a host-lane responsibility. It belongs to an externally managed Docker runtime with MFA bypass disabled and a fresh starter-only volume.
- Docker review stacks now default Mailchimp off instead of inheriting checked-in placeholder credentials from `.env.development`.
- The Docker wrapper now makes the review-stack MFA bypass explicit for normal `test:docker:*` commands, while the fresh-workspace MFA proof can still opt out by running directly with `BYPASS_MFA_FOR_TESTS=false`.
- Route-runtime capture now ignores same-origin `ERR_ABORTED` script/stylesheet cancellations from benign Vite navigation churn, while still failing on real page errors, console errors, and failed responses.

## Coverage And Blind Spots

- The targeted `P5-T5` portal forms slice is green across backend, frontend, docs, and focused Playwright proof.
- Backend and frontend coverage are no longer blocked by the old shared runner contract.
- The targeted Phase 5 regressions in avatar persistence, legacy admin redirects, analytics templates, workbench auth startup, contacts filters/merge/delete/pagination, donations receipts/filters, and events hybrid check-in all now have green targeted proof in the host runtime.
- The public `/accept-invitation/:token` surface now behaves cleanly for placeholder preview tokens, which removes the route-health false negative without weakening real-token validation.
- The smoke-stack startup failure mode is hardened, and the broader Docker cross-browser and audit lanes are now green in current proof.
- The Docker smoke gate, fresh-volume MFA proof, Docker dark-mode audit, and final Docker CI artifact are green in current proof.
- The prior blind spot, the absence of one uninterrupted `npm run test:docker:ci` artifact after the latest Firefox and WebKit broad-matrix recovery fixes, is now closed.
- The final broad Docker CI attempts surfaced real or test-contract issues in route health, persona MFA handling, contacts filter sync, dashboard startup fetching, Firefox navigation/render settle, WebKit contact cancel navigation, WebKit contact validation timing, Firefox admin/portal opaque React boundary recovery, and WebKit lazy-module import recovery. Those are now fixed, targeted-green, and covered by the passing full Docker CI artifact.

## Recommended Next Steps

1. Keep `P5-T2B` in review against this artifact and avoid reopening shared validation unless a future feature/runtime change produces new evidence.
2. Keep `P5-T2D` in review against the restored report and portal frontend persona-proof slice without reclassifying persona support.
3. Keep the fresh-workspace MFA proof separate from `test:docker:ci`; it should continue to run only against a fresh starter-only stack with `BYPASS_MFA_FOR_TESTS=false`.

## Implications For Phase 5 Waves

- `P5-T3` Email platform work is no longer waiting on the final host-plus-Docker validation pass, but any next send, schedule, preview, or outbound widening should keep targeted route-security, preview-sanitization, and SSRF-sensitive integration proof current.
- `P5-T4` Website surfaces proof remains green and is no longer the main validation blocker.
- `P5-T5` Client portal work now has a green first slice for the assignment-backed forms inbox, and broader phase signoff no longer depends on `P5-T2B`; the next portal proof should stay focused on the landed case-aware appointments continuity slice.
