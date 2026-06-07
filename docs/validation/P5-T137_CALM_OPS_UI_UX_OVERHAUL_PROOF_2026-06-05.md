# P5-T137 Calm Ops UI/UX Overhaul Proof

**Date:** 2026-06-05  
**Status:** Review  
**Workboard row:** [P5-T137](../phases/planning-and-progress.md)

## Scope

Whole-app frontend UI/UX overhaul around the approved Calm Ops direction:

- Desktop concept: `/Users/bryan/.codex/generated_images/019e9678-aecb-71c2-abcb-86ba564eed8b/ig_0bfb1e291180ad03016a226dc36ee081989ce34ea010d7c928.png`
- Mobile concept: `/Users/bryan/.codex/generated_images/019e9678-aecb-71c2-abcb-86ba564eed8b/ig_0bfb1e291180ad03016a226e1e1f1c81988180f1c4021f34da.png`

Included:

- Shared Calm Ops design tokens and user-facing shell presentation.
- Shared UI primitives for navigation, page scaffolds, status, state, list/table, filter, form, modal, and toast-adjacent surfaces where existing components already provide the behavior.
- Route-family migration across auth/setup, dashboard, people, cases, events/tasks/follow-ups, finance, analytics/reports, websites/builder, admin/settings, portal/public, and route QA surfaces.
- Functional confirmation through frontend route UX, component, browser, and backend tests; backend changes only for proven workflow defects.

Excluded:

- Production deploys, migrations, schema expansion, paid dependencies, route-path changes, permission-model changes, `/api/v2` contract changes, and product expansion beyond the existing route catalog.
- Unrelated `package-lock.json` churn from the preserved dirty main checkout.

## Implementation Summary

Completed in sibling worktree `/Users/bryan/projects/nonprofit-manager-calm-ops` on branch `p5-t137-calm-ops-overhaul` to preserve the existing dirty checkout lane.

Frontend:

- Replaced the old user-facing neo-brutalist shell presentation with Calm Ops tokens in `frontend/src/index.css`: neutral surfaces, compact spacing, subtle borders, 6-8px radii, restrained teal/indigo/green accents, semantic status colors, and no decorative gradient/orb treatment.
- Added shared Calm Ops primitives in `frontend/src/components/ui/CalmOps.tsx` and exported them from the UI barrel.
- Reworked shared shell/navigation through `Navigation`, `AppShell`, `Layout`, `StaffSideNavigation`, `MobileNavigationDrawer`, and `SurfaceContextBar` while preserving route paths.
- Calmed shared primitives and compatibility surfaces: buttons, cards, tables, forms, page headers, state components, workbench panels, dashboard pages, and legacy `neo-brutalist` component wrappers.
- Migrated route QA expectations for the new side rail/top bar contract in frontend component tests and E2E route/navigation tests.
- Ported date-stability fixes into this clean lane without carrying unrelated source-checkout `package-lock.json` churn.

Backend:

- No production backend behavior or `/api/v2` response contract was changed.
- Backend edits are test-only date-stability updates in the portal-auth controller test.
- Dependency hardening reduced production audit findings by updating the lockfile-resolved `qs` and `tmp` transitive versions. Supersession update, 2026-06-06: the current root override keeps `exceljs@4.4.0` while resolving `uuid@11.1.1`, and the production audit is green.

Test/bootstrap repair:

- Made the migration verifier's RLS probe disposable in `scripts/verify-migrations.sh`: deterministic `rls-*@example.test` / `verification-only` users, access rows, contact, and fixture accounts are removed after the app-role RLS probe, and the verifier now asserts no RLS verification bootstrap users remain.
- Added a host-only Playwright bootstrap guard in `e2e/helpers/auth.ts` for the isolated-test-DB state where the only admin row is the deterministic `rls-admin@example.test` verification fixture. The guard clears only those fixture rows, invalidates E2E auth caches, and lets the existing first-admin setup path create the normal `admin@example.com` host admin. Explicit `ADMIN_USER_EMAIL` / `ADMIN_USER_PASSWORD` overrides and externally managed Docker auth keep the existing behavior.
- Added pure contract coverage in `e2e/tests/auth-bootstrap.contract.spec.ts` for RLS-only recovery, real-admin refusal, explicit-credential refusal, and externally managed runtime refusal.

Route families covered by the migrated route catalog/tests and browser proof: auth/setup, staff dashboard/workbench, people/contacts, cases/intake, events/tasks/follow-ups, finance/donations/reconciliation, analytics/reports, websites/builder/public runtime, admin/settings, portal/public flows, and demo/test-only QA surfaces.

## Validation Log

Baseline from the dirty source checkout before branch isolation:

- Pass: `cd frontend && npm test -- --run src/test/ux/RouteUxSmoke.test.tsx src/features/adminOps/pages/__tests__/EmailMarketingPage.test.tsx`.
- Pass: `cd backend && npm test -- --runInBand src/modules/portalAuth/controllers/__tests__/portalAuthController.test.ts`.
- Pass: `cd frontend && npm run type-check`.
- Pass: `cd backend && npm run type-check`.

Focused implementation checks:

- Pass after dependency install: `cd frontend && npm run type-check`.
- Pass: `cd frontend && npm test -- --run src/test/ux/RouteUxSmoke.test.tsx src/test/ux/PersonaRouteUxSmoke.test.tsx src/features/dashboard/pages/__tests__/WorkbenchDashboardPage.test.tsx src/features/dashboard/pages/__tests__/CustomDashboardPage.test.tsx src/components/neo-brutalist/__tests__/PeopleCard.test.tsx` (5 files, 51 tests).
- Pass: `cd backend && npm test -- --runInBand src/modules/portalAuth/controllers/__tests__/portalAuthController.test.ts` (23 tests).
- Pass: `cd frontend && npm test -- --run src/routes/__tests__/routeCatalog.test.ts src/routes/__tests__/routeFamilies.test.ts src/test/ux/RouteUxSmokeExtended.test.tsx src/components/__tests__/Navigation.test.tsx src/components/workspace/__tests__/WorkspaceHeader.test.tsx src/components/ui/__tests__/uiPrimitives.test.tsx src/features/auth/pages/__tests__/LoginPage.test.tsx src/features/auth/pages/__tests__/SetupPasswordValidation.test.tsx src/features/neoBrutalist/pages/__tests__/PeopleDirectoryPage.test.tsx src/features/neoBrutalist/pages/__tests__/OperationsBoardPage.test.tsx src/features/neoBrutalist/pages/__tests__/OutreachCenterPage.test.tsx` (11 files, 81 tests).
- Pass: `cd frontend && npm run type-check`.
- Pass: `git diff --check`.

Root gates and broad checks:

- Pass: `make lint`.
- Pass: `make typecheck`.
- Pass: `make db-verify`.
- Pass: `npm run knip`.
- Pass after dependency hardening: `cd backend && npm test -- --runInBand src/ingest/__tests__/ingestEnhanced.test.ts src/modules/shared/export/__tests__/tabularExport.test.ts` (2 files, 11 tests).
- Pass after scheduled-report fixture stabilization: `cd frontend && npm test -- --run src/features/scheduledReports/hooks/__tests__/useScheduledReportsController.test.tsx` (1 file, 2 tests).
- Pass after mobile compactness spacing adjustment: `cd e2e && npm run test:ci:mobile` (Mobile Chrome, 3 tests).
- Pass: `make test` completed the full host/mobile/Docker gate. Backend Jest passed 286 suites / 2315 tests; frontend Vitest passed 253 files / 1398 tests; host Playwright passed with 992 passed, 15 skipped, and 1 retry-passed Firefox dynamic-import flake in `tests/ux-regression.spec.ts`; integrated Mobile Chrome passed 3 tests; integrated Docker-backed Playwright smoke passed 4 tests after HTTP readiness on ports 18004/18005/18006. The prior admin bootstrap cascade did not recur.
- Pass, earlier clean reduced reproduction of the prior E2E failure point: `CI=1 E2E_RUNNER_MAX_ATTEMPTS=1 bash scripts/e2e-playwright.sh host ../node_modules/.bin/playwright test --project=chromium tests/link-health.spec.ts tests/navigation-links.spec.ts tests/opportunities.spec.ts` (92 tests).
- Pass, earlier standalone Docker smoke: `make test-e2e-docker-smoke` (Docker-backed Playwright smoke, 4 tests). The final `make test` run also executed this Docker smoke subgate, so no separate closeout rerun was required.
- Historical snapshot, superseded on 2026-06-06: the original UI/UX overhaul closeout expected `make security-audit` / `npm audit --omit=dev --workspaces --include-workspace-root --audit-level=moderate` to fail on `exceljs >=3.5.0 -> uuid <11.1.1` after reducing the audit from four advisories to two. The current checkout now resolves `uuid@11.1.1` for `exceljs@4.4.0`, and `make security-audit` reports `found 0 vulnerabilities`.

Host admin bootstrap repair closeout:

- Pass: `node --test scripts/tests/tooling-contracts.test.cjs` (58 tests). This covered wrapper/selector tooling while preserving the repo-local command contract.
- Pass: `cd e2e && SKIP_WEBSERVER=1 ../node_modules/.bin/playwright test --project=chromium tests/auth-bootstrap.contract.spec.ts` (9 tests). This covered the RLS-only bootstrap recovery decision boundary without starting a browser runtime.
- Pass: `make db-verify`. New checks reported `Disposable RLS verification fixtures are removed` and `RLS verification fixture cleanup left no bootstrap users behind`.
- Pass: `PGPASSWORD=postgres psql -h 127.0.0.1 -p 8012 -U postgres -d nonprofit_manager_test -Atqc "SELECT COUNT(*) FROM users WHERE email LIKE 'rls-%@example.test' OR password_hash = 'verification-only';"` returned `0`.
- Pass: `CI=1 E2E_RUNNER_MAX_ATTEMPTS=1 bash scripts/e2e-playwright.sh host ../node_modules/.bin/playwright test --project=chromium tests/link-health.spec.ts tests/navigation-links.spec.ts tests/opportunities.spec.ts` (92 tests, 3.5m). Public route health, authenticated staff route health, authenticated portal route health, staff navigation, portal navigation, and opportunities creation all passed; the `Invalid credentials (email: admin@example.com)` admin bootstrap cascade did not recur.
- Pass: `git diff --check`.

## Browser Proof

Browser/IAB was used for local interactive proof against `VITE_DEMO_ROUTES_ENABLED=true npm run dev -- --host 127.0.0.1 --port 5321`.

Desktop IAB:

- `/demo/dashboard`: loaded `Workbench`, no Vite overlay, no console errors/warnings, no horizontal overflow.
- Quick lookup accepted `riley` and preserved focus/value.
- Route-family sweep: `/login`, `/portal/login`, `/demo/people`, `/demo/operations`, and `/demo/outreach` loaded expected headings with no overlay, console noise, or horizontal overflow.

Mobile IAB:

- `/demo/dashboard` at 390x844: loaded `Workbench`, stacked correctly, no horizontal overflow.
- `/login` at 390x844: auth form visible, no overlay or horizontal overflow.

Screenshots inspected with `view_image`:

- Accepted desktop concept: `/Users/bryan/.codex/generated_images/019e9678-aecb-71c2-abcb-86ba564eed8b/ig_0bfb1e291180ad03016a226dc36ee081989ce34ea010d7c928.png`
- Accepted mobile concept: `/Users/bryan/.codex/generated_images/019e9678-aecb-71c2-abcb-86ba564eed8b/ig_0bfb1e291180ad03016a226e1e1f1c81988180f1c4021f34da.png`
- IAB desktop dark/system proof: `/var/folders/lx/hbzj2_d508s5yyz06grfk3s40000gn/T/p5-t137-demo-dashboard-desktop-loaded.png`
- IAB desktop lookup interaction: `/var/folders/lx/hbzj2_d508s5yyz06grfk3s40000gn/T/p5-t137-demo-dashboard-lookup.png`
- IAB mobile dashboard: `/var/folders/lx/hbzj2_d508s5yyz06grfk3s40000gn/T/p5-t137-demo-dashboard-mobile.png`
- IAB mobile login: `/var/folders/lx/hbzj2_d508s5yyz06grfk3s40000gn/T/p5-t137-login-mobile.png`
- Playwright light desktop fallback: `/tmp/p5-t137-demo-dashboard-desktop-light.png`
- Playwright light mobile fallback: `/tmp/p5-t137-demo-dashboard-mobile-light.png`

IAB used the system dark color scheme and did not expose localStorage for theme forcing, so Playwright light contexts were used only for light-mode fidelity screenshots.

## Fidelity Ledger

- Layout: matches the accepted Calm Ops direction with neutral workspace surfaces, compact cards, stable spacing, and non-decorative background treatment. Authenticated side rail/top bar are covered by component/E2E proof; `/demo/dashboard` intentionally bypasses the authenticated shell.
- Typography: shifted toward readable sans-serif operations typography with reduced uppercase/tracking and calmer weights.
- Color: neutral base with restrained teal/indigo/green accents and semantic soft status colors; old harsh yellow/red/black treatment is normalized through tokens and compatibility wrappers.
- Density: cards, workbench panels, tables, form rows, and state blocks are tighter and more operations-oriented than the prior oversized/brutal presentation.
- Navigation: staff route families now sit in a grouped side rail with search, alert, user, and mobile access preserved; old top primary nav expectations were updated.
- Mobile: content stacks cleanly without horizontal overflow; mobile drawer/search remain covered by tests. The demo route does not show the authenticated mobile nav because it is intentionally unauthenticated.
- Interaction states: Quick lookup, route navigation, portal links, filters, forms, theme controls, and Docker public flows were exercised by focused tests, host E2E slices, IAB, and Docker smoke.

## Residual Risks And Follow-Ups

- `make test` now completes as a single command including backend Jest, frontend Vitest, host Playwright, Mobile Chrome, and Docker-backed public smoke. The host Playwright matrix recorded one retry-passed Firefox dynamic-import flake for `StaffNavigationQuickLookupDialog-ConvgCeE.js`; it did not fail the gate, but it should be watched if Firefox/Vite chunk-loading flakes recur.
- The stale `exceljs -> uuid@8` audit caveat is resolved in the current checkout: `make security-audit` reports `found 0 vulnerabilities`, `npm explain uuid --workspaces --include-workspace-root` reports `uuid@11.1.1`, and the lockfile keeps `exceljs@4.4.0`. `npm ls exceljs uuid --workspaces --include-workspace-root --depth=10` still exits with `ELSPROBLEMS` because the deliberate override places `uuid@11.1.1` outside ExcelJS's declared `^8.3.0` range; treat that as an override-shape caveat, not an active production audit vulnerability.
- Browser/IAB proof was performed on demo/public routes rather than a real authenticated IAB session. Authenticated shell behavior is covered by component tests and Playwright route-health/navigation E2E.
- The dashboard content remains the existing workbench experience rather than a wholesale replacement with the concept's exact dense table/right-action-rail composition. This preserves working flows while landing the shared Calm Ops system.
