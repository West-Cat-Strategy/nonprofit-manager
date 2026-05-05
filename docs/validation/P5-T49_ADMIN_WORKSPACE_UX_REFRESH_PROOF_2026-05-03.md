# P5-T49 Admin Workspace UX Refresh Proof - 2026-05-03

## Scope

Frontend-only admin workspace UX/UI refresh for the full admin area.

Implemented:

- Shared admin shell with desktop sticky navigation, compact mobile navigation, and contextual compact quick actions.
- Task-oriented Admin Hub grouping with always-visible admin sections and high-impact labels instead of hidden advanced sections.
- Shared admin presentation primitives for cards, metric tiles, status pills, filter toolbars, and action groups.
- Portal Ops triage summary across loaded portal access, conversation, appointment, reminder, and slot signals.
- Responsive portal panel controls, clearer action grouping, stronger focus styling, distinct status pills, and a mobile conversation-detail return path.
- Responsive polish continuation: admin inputs, metric tiles, status pills, filter toolbars, action groups, compact navigation shortcuts, grouped Admin Hub tabs, portal row cards, raw-ID filters, conversation detail/list triage, reminder history, and slot forms now guard against small-screen horizontal expansion.

Preserved:

- Existing route IDs, paths, route components, permissions, API contracts, backend behavior, and panel prop/callback contracts.
- Existing raw ID filters for power users.
- Existing portal-admin panels for access, users, conversations, appointments, and slots.
- The separate `P5-T48` portal-admin queue-cue counts and actions.

Out of scope:

- Backend APIs, migrations, public portal runtime behavior, portal authentication changes, permission-model changes, saved-queue builders, and generic workflow tooling.

## Validation

Passed:

- `cd frontend && npm test -- --run src/features/adminOps/components/__tests__/AdminPanelLayout.test.tsx src/features/adminOps/components/__tests__/AdminPanelNav.test.tsx src/features/adminOps/pages/__tests__/AdminSettingsPage.test.tsx src/features/adminOps/pages/portalAdmin/panels/__tests__/PortalPanels.test.tsx`
  - Result: 4 files passed, 29 tests passed during the responsive polish continuation.
- `cd frontend && npm run type-check`
- `cd frontend && npm run lint`
- `node scripts/check-frontend-feature-boundary-policy.ts`
- `git diff --check`
- `cd e2e && CI=1 bash ../scripts/e2e-playwright.sh docker ../node_modules/.bin/playwright test --project="Mobile Chrome" tests/ux-regression.spec.ts --grep "mobile staff routes use compact cards and avoid horizontal overflow"`
  - Runtime setup: Docker Desktop relaunched, `nonprofit-dev` restarted with `DEV_NODE_ENV=test DEV_BYPASS_REGISTRATION_POLICY_IN_TEST=true DEV_BYPASS_MFA_FOR_TESTS=true`, and migration `116_typed_fund_designations.sql` applied to the stale dev DB volume so the pre-existing donation fixture could create records.
  - Result: first post-migration run passed on retry after an admin dashboard action timing race; immediate rerun passed cleanly, 1 test passed.

Earlier P5-T49 pass:

- `cd frontend && npm test -- --run src/features/adminOps/components/__tests__/AdminPanelLayout.test.tsx src/features/adminOps/components/__tests__/AdminPanelNav.test.tsx src/features/adminOps/pages/__tests__/AdminSettingsPage.test.tsx src/features/adminOps/pages/portalAdmin/PortalAdminPage.test.tsx src/features/adminOps/pages/portalAdmin/panels/__tests__/PortalPanels.test.tsx`
  - Result: 5 files passed, 33 tests passed.
- `cd frontend && npm run type-check`
- `node scripts/check-frontend-feature-boundary-policy.ts`
- `node scripts/check-route-catalog-drift.ts`
- `node scripts/check-frontend-legacy-page-path-policy.ts`
- `cd frontend && npm test -- --run src/features/adminOps/__tests__/adminRouteManifest.test.ts src/routes/__tests__/adminRedirects.test.tsx src/routes/__tests__/routeCatalog.test.ts`
  - Result: 3 files passed, 55 tests passed.
- `cd frontend && npm run lint`
- `git diff --check`

Notes:

- The first route-catalog test pass exposed the intended legacy communications breadcrumb change: `/settings/email-marketing` now keeps `Newsletter Campaigns` as the current page under the task-oriented `Communications` parent. The test expectation was updated and the route/catalog suite then passed.
- The continuation did not touch route/catalog metadata, so route-catalog drift and route-catalog tests were not rerun.
- Responsive E2E coverage was added to `e2e/tests/ux-regression.spec.ts` and passed against the Docker dev runtime after restoring Docker and updating the stale dev DB schema.
- No database, backend, API, schema, route ID, route path, permission, public portal runtime, or panel callback contract changed.
