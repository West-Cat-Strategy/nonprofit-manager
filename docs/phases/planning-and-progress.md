# 📊 Nonprofit Manager - Planning & Progress

**Last Updated:** 2026-04-20


**Current Phase:** Phase 4 - Modularity Refactor  
**Live Snapshot:** 27 active rows: 0 In Progress, 0 Blocked, 27 Review, 0 Ready.
**History:** Historical roadmap, logs, trackers, and legacy reference sections moved to [archive/WORKBOARD_HISTORY_2026.md](archive/WORKBOARD_HISTORY_2026.md).
**Recent thread follow-through:** 5 rows: 0 In Progress, 1 Blocked, 4 Review.

## How To Use This Workboard

- Use this file only for tracked work. If the task is not tracked, you do not need to edit the workboard.
- Before editing tracked work, find the active row, confirm ownership and status, and update it first if the scope, blocker, or handoff state changed.
- When resuming recent interrupted work, check `Recent Thread Follow-through` before scanning the larger active table.
- For current status, use this file instead of archived phase notes or closeout artifacts.

## 🤝 Coordination

- Update this file before editing tracked work.
- Keep one active task per agent by default unless a coordinated exception is documented here.
- Coordinated exception, 2026-04-19: `P4-T7C` is split across parallel lanes.
  Lead: `Codex`
  Backend lanes: `event-fixtures`
  Frontend lanes: `events-ui`, `publishing-builder`
  Other lanes: `none`
  Integration owner: `Codex`
- Coordinated exception, 2026-04-19: `P4-T45` is split across parallel lanes.
  Lead: `Codex`
  Backend lanes: `security-context`
  Frontend lanes: `none`
  Other lanes: `none`
  Integration owner: `Codex`
- Coordinated exception, 2026-04-19: `P4-T9` is split across parallel lanes.
  Lead: `Codex`
  Backend lanes: `portal-signup-admin`, `portal-admin-size`
  Frontend lanes: `portal-runtime`
  Other lanes: `route-trust-docs`, `e2e-contract`, `coverage-proof-backend`, `coverage-proof-frontend`
  Integration owner: `Codex`
- Coordinated exception, 2026-04-19: `P4-T1R4` is split across parallel lanes.
  Lead: `Codex`
  Backend lanes: `admin-analytics-contracts`
  Frontend lanes: `admin-analytics-ui`
  Other lanes: `reports-admin-browser-proof`
  Integration owner: `Codex`
- Coordinated exception, 2026-04-19: `P4-T51` is split across parallel lanes.
  Lead: `Codex`
  Backend lanes: `contacts-import-export`, `contact-notes-timeline`
  Frontend lanes: `none`
  Other lanes: `none`
  Integration owner: `Codex`
- Coordinated exception, 2026-04-19: `P4-T54` is split across parallel lanes.
  Lead: `Codex`
  Backend lanes: `report-template-packs`
  Frontend lanes: `reports-home`, `fundraiser-workflow`
  Other lanes: `persona-auth-proof`
  Integration owner: `Codex`
- Coordinated exception, 2026-04-20: `P4-T50` is split across parallel lanes.
  Lead: `Codex`
  Backend lanes: `none`
  Frontend lanes: `none`
  Other lanes: `startup-bootstrap`
  Integration owner: `Codex`
- Coordinated exception, 2026-04-20: `P4-T7E-DARK` is split across parallel lanes.
  Lead: `Codex`
  Backend lanes: `auth-public-fixtures`
  Frontend lanes: `dark-runtime-ui`, `dark-preview-runtime`
  Other lanes: `dark-audit-artifact`
  Integration owner: `Codex`
- Coordinated exception, 2026-04-19: `P4-T7` is split across parallel lanes.
  Lead: `Codex`
  Backend lanes: `none`
  Frontend lanes: `framework-shell`, `portal-auth-public`, `staff-ux-core`
  Other lanes: `staff-ux-audit`
  Integration owner: `Codex`
- Coordinated exception, 2026-04-19: `P4-T48` is split across parallel lanes.
  Lead: `Codex`
  Backend lanes: `cases-form-defaults`
  Frontend lanes: `cases-form-completion`
  Other lanes: `none`
  Integration owner: `Codex`
- For future modularization exceptions, use the lane contract and workboard format in [../development/SUBAGENT_MODULARIZATION_GUIDE.md](../development/SUBAGENT_MODULARIZATION_GUIDE.md).
- Move blocked work to Blocked with a reason and next step.
- Use task IDs in commits and PR titles.

### Coordinated Exception Template

Use this temporary note format before any tracked modularization task is split across subagents:

```md
- Coordinated exception, YYYY-MM-DD: `<TASK-ID>` is split across parallel lanes.
  Lead: `<owner>`
  Backend lanes: `<lane list>`
  Frontend lanes: `<lane list>`
  Other lanes: `<docs/validation/scripts lanes or none>`
  Integration owner: `<owner>`
```

## Status Keys

- In Progress: signed out and being worked.
- Blocked: waiting on a dependency or decision.
- Review: ready for review or QA.
- Ready: scoped and ready to pick up.

## Recent Thread Follow-through

- Phase snapshot counts remain phase-row only.
- Recent thread follow-through rows are a separate overlay for disposition-level unfinished work.

| Thread | Session | Disposition Date | Status | Existing Owner | Remaining Follow-through |
|---|---|---|---|---|---|
| Audit unnecessary dependencies (019da303) | top-level | Apr 18, 2026 | Blocked | — | Dependency cleanup landed, `make typecheck` is green in the current tree, and the fresh-workspace MFA/browser-path follow-through is now green again under `P4-T54`. The only remaining closure risk on this disposition is the unrelated broader backend route/integration verification that is still not green. |
| Review test coverage (019da39f) | top-level | Apr 18, 2026 | Review | `P4-T9` | The coordinated `coverage-proof-backend` and `coverage-proof-frontend` lanes are landed. Targeted backend/frontend coverage reruns are green, high-risk auth/route/bootstrap assertions were refreshed, and the narrow-run threshold handling now keeps full-run gates intact while still counting untouched files. |
| Implement CI/E2E contract lane (019da34a-d770) | top-level | Apr 18, 2026 | Review | `P4-T9` | Mobile Safari and Tablet compact-route reruns are green on the integrated tree, and the Tablet project guard now covers the same assertions as the mobile project instead of skipping them. The remaining dark-mode failures are real route/runtime/contrast defects plus a missing markdown artifact, so that follow-through stays with `P4-T7E-DARK` rather than this contract-trust lane. |
| Harden deploy containers (019da3c3-8b11) | top-level | Apr 18, 2026 | Review | Codex | The direct Docker build flow remains centralized through `scripts/docker-build-images.sh`, `make docker-validate` still exercises the workspace-root `npm ci` stages end to end, and the archive helper follow-through is now landed: `scripts/db-export-archive.sh` mirrors restore-side risky-target confirmation with `DB_EXPORT_RISK_CONFIRM=export:<host>:<port>/<db>`, the tooling regression suite covers the new guard, and `node --test scripts/tests/tooling-contracts.test.cjs` passed. |
| Review UI/UX usability (019da3ce) | top-level | Apr 18, 2026 | Review | `P4-T7` | The staff-UX follow-through is landed. The audit/backlog artifact now records the aligned default staff destinations, queue-first Workbench pass, trimmed above-the-fold list density, and the remaining route/accessibility defects that the full dark-mode audit exposed. Any further fixes stay with `P4-T7` / `P4-T7E-DARK`, not this review thread. |

## 🧭 Active Workboard

| ID | Task | Phase | Status | Owner | Started | Target | PR/Branch |
|----|------|-------|--------|-------|---------|--------|-----------|
| P4-T47 | Public history scrub and `.gitignore` hardening | Phase 4 | Review | Codex | Apr 15, 2026 | TBD | main (review 2026-04-20: the repo-side scrub is complete. `.gitignore` now ignores `.codex/` plus local AI/editor workspace artifacts, `.codex/**` is removed from the tracked tip, the mirror-clone `git-filter-repo` rewrite was force-pushed to `origin/main`, `HEAD` and `origin/main` both resolve to `92faa207c0adac6e21563b9e3fe5f486e15eb784`, fresh-clone audits plus `git rev-list --objects origin/main | rg '\\.codex'` show no reachable `.codex` objects on `main`, and the repository currently has no forks. The prepared purge payload remains archived in [P4-T47_GITHUB_SUPPORT_PURGE_2026-04-19.md](P4-T47_GITHUB_SUPPORT_PURGE_2026-04-19.md), but no further GitHub Support escalation is planned after reviewing current policy and the known PR evidence: PR `#2` directly exposed only autogenerated `.codex/environments/*.toml` contributor-tooling metadata, PRs `#3`-`#9` were rewrite-collateral refs, and the residual cached PR exposure is accepted as non-sensitive metadata rather than a row-blocking risk.) |
| P4-T45 | Security hardening wave (auth/session invalidation, API-key/webhook controls, CORS fail-closed, public-form intake tightening) | Phase 4 | Review | Codex | Apr 15, 2026 | TBD | main (review 2026-04-19: the remediation wave is landed across coordinated backend/frontend/verification lanes. The pass removed the duplicate `paymentController.ts` import build break, locked production CORS back to the explicit `CORS_ORIGIN` allowlist, separated portal actor request context from staff `userId`, moved portal profile reads/writes behind portal-scoped SQL helpers, redesigned portal signup resolution for `0/1/many` duplicate-email matches with audit state, repointed the portal forms UI to `/api/v2/portal/forms/assignments/*`, synced portal self-service auth/bootstrap state after profile edits, and tightened link-health/dark-mode harness assertions around final client location and runtime failures. Targeted backend/frontend tests plus `make db-verify`, `make check-links`, the host Chromium portal route-health rerun, and the dark-mode audit `--list` pass are green in the current tree.) |
| P4-T7E-DARK | Whole-app dark-mode accessibility remediation + route-audit closure | Phase 4 | Review | Codex | Mar 11, 2026 | TBD | main (review 2026-04-20: the dark-mode route/runtime remediation rerun is closed in the current tree. The coordinated frontend lanes landed the header-free public case-form client split with route-local API proof, the compiled-CSS-safe opportunities workflow-card contrast/focus hardening, the builder-preview script and inline-handler stripping with a fully sandboxed `srcDoc` iframe, and the lead-owned admin communications runtime stabilization plus route-health coverage. `cd frontend && npm test -- --run src/features/engagement/opportunities/pages/__tests__/OpportunitiesPage.test.tsx src/features/portal/api/publicCaseFormsApiClient.test.ts src/services/__tests__/httpClient.test.ts src/features/builder/pages/__tests__/TemplatePreviewPage.test.tsx src/features/adminOps/pages/__tests__/AdminSettingsPage.test.tsx src/features/adminOps/pages/__tests__/EmailMarketingPage.test.tsx`, `cd frontend && npm run build`, `cd e2e && bash ../scripts/e2e-playwright.sh host ./node_modules/.bin/playwright test tests/link-health.spec.ts --project=chromium --grep 'loads /settings/admin/communications'`, and `cd e2e && bash ../scripts/e2e-playwright.sh host ./node_modules/.bin/playwright test tests/dark-mode-accessibility-audit.spec.ts --project=chromium` passed. The refreshed report at `e2e/test-results/dark-mode-accessibility-report.md` now audits all 152 cataloged routes with 27 moderate findings, 0 critical, 0 blocked; `public`, `portal`, and `demo` surfaces report zero findings, and the remaining moderate-only staff findings are advisory backlog rather than row-blocking runtime defects.) |
| P4-T35 | Compact workspace shell navigation and responsive overflow | Phase 4 | Review | Codex | Apr 7, 2026 | TBD | main (review 2026-04-19: the ready rerun is closed. The framework-shell lane restored staff local navigation on mobile, aligned Workbench naming across the dashboard/shell, trimmed mobile header/workbench hero spacing, and added an `/events` no-date fallback so the compact-card route tour reaches the mobile agenda cards again. `cd frontend && npm test -- --run src/components/workspace/__tests__/WorkspaceHeader.test.tsx src/features/dashboard/pages/__tests__/WorkbenchDashboardPage.test.tsx src/features/events/pages/__tests__/EventsHubPage.test.tsx` plus `cd e2e && npm run test:ci:mobile` passed.) |
| P4-T1R4 | Wave 2+ rollout prep (reports/analytics/dashboard then ops/comms surfaces) | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | main (review 2026-04-19: the coordinated UI follow-through is landed across reports, analytics, alerts, dashboard entry points, and admin branding. The pass added related-workspace navigation on analytics/alerts, clarified the branding preview/editor layout, and kept `/reports` plus `/reports/templates?category=&tag=` behavior stable. The planned frontend suites plus `cd frontend && npm run type-check` passed in the integrated tree. The remaining admin-branding dark-mode contrast issue stays tracked under `P4-T7E-DARK`, not this rollout-prep row.) |
| P4-T1R4W3B | Wave 3 prep: activities modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main (review 2026-04-19: the frontend activities boundary now matches the live `/api/v2/activities` success envelope, uses the backend field contract, and repoints the dashboard/contact activity consumers onto `frontend/src/features/activities/**` instead of legacy direct calls. `cd frontend && npm run type-check` plus `cd frontend && npm test -- --run src/features/activities/__tests__/activitiesApiClient.test.ts src/features/activities/__tests__/useRecentActivities.test.ts src/features/activities/__tests__/useEntityActivities.test.ts src/features/contacts/components/__tests__/ContactActivityPanel.test.tsx src/components/dashboard/__tests__/ActivityFeedWidget.test.tsx` passed.) |
| P4-T1R4W3C | Wave 3 prep: webhooks modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main (review 2026-04-18: the frontend follow-through confirmed the feature-owned `frontend/src/features/webhooks/**` page/hook boundary, kept admin route wiring as a thin entry seam, repointed shared admin/UX smoke imports to the feature-owned page, and `cd frontend && npm test -- --run src/features/webhooks/pages/__tests__/ApiSettingsPage.test.tsx src/test/ux/RouteUxSmokeExtended.test.tsx` plus `cd frontend && npm run type-check` passed) |
| P4-T1R4W3D | Wave 3 prep: mailchimp modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main (review 2026-04-18: the newsletter campaigns workspace now lives under `frontend/src/features/mailchimp/**`, the admin page/components are thin compatibility re-exports, the admin route path stayed stable, the repo-audit follow-through added explicit admin-settings permission gates to the Mailchimp backend routes, and `cd frontend && npm test -- --run src/features/adminOps/pages/__tests__/EmailMarketingPage.test.tsx src/test/ux/RouteUxSmokeExtended.test.tsx`, `cd frontend && npm run type-check`, and `cd backend && npm test -- --runInBand src/__tests__/modules/mailchimp.routes.security.test.ts` passed) |
| P4-T1R4W3E | Wave 3 prep: invitations modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main (review 2026-04-19: the staff invitation-management slice now lives under `frontend/src/features/invitations/**` via feature-owned hook, types, utilities, and pending-invitations panel, while public accept-invitation pages and portal-admin invitation flows stayed stable. `cd frontend && npm run type-check` plus `cd frontend && npm test -- --run src/features/adminOps/pages/adminSettings/hooks/__tests__/adminSettingsHooks.test.ts src/test/ux/RouteUxSmokeExtended.test.tsx src/features/invitations/hooks/__tests__/useStaffInvitations.test.ts` passed.) |
| P4-T1R4W3F | Wave 3 prep: meetings modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Antigravity | Apr 19, 2026 | TBD | main (review 2026-04-19: frontend feature package, backend integration wrapper, and row-local test suites are landed and verified; backend unit/integration tests moved to module, frontend smoke tests added) |
| P4-T6 | Workflow-first UI/UX polish (cases/intake + full portal) | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | main (triage note: [P4-T6_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T6_CLUSTER_CLOSEOUT_2026-04-14.md) confirms the current cases/intake and portal surfaces, but the parent row remains broader than the row-local proof, so it stays in Review) |
| P4-T6A | Shared UX primitives + follow-ups QoL | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | main (review 2026-04-19: the ready auth-drift follow-through did not need another code patch in the current tree. The viewer create request now matches the canonical forbidden contract, and `cd backend && npm test -- --testPathPatterns=src/__tests__/integration/followUps.test.ts --testNamePattern='returns forbidden for viewer-role create requests'` plus `cd backend && npm test -- --testPathPatterns='src/__tests__/integration/(followUps|portalAppointments).test.ts'` passed.) |
| P4-T6D | Portal secondary pages hardening + verification | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | main (review 2026-04-19: the ready portal secondary-pages proof is landed. Portal forms now keep `submitted` assignments in the active bucket until staff review closes them, the public/portal form flows show receipt messaging while still allowing resubmission, and the row-local proof now covers notes/reminders paging plus the updated forms behavior. `cd frontend && npm test -- --run src/features/portal/pages/__tests__/PublicCaseFormPage.test.tsx src/features/portal/pages/__tests__/PortalFormsPage.test.tsx src/features/portal/pages/__tests__/PortalSecondaryListPages.test.tsx` plus `cd frontend && npm run type-check` passed.) |
| P4-T7 | Full app UI/UX replacement (all themes, all routes) | Phase 4 | Review | Codex | Apr 16, 2026 | TBD | main (review 2026-04-20: the remaining parent-row follow-through moved through `P4-T7E-DARK` and is now closed in the integrated tree. Default staff destinations remain aligned across desktop/mobile, Workbench stays queue-first, portal/auth/public entry screens keep mobile forms and navigation above the fold, and the full Chromium dark-mode audit no longer has blocking runtime or critical accessibility findings. Remaining moderate-only accessibility findings stay documented in the refreshed dark-mode audit artifact rather than keeping the parent UI replacement row in progress.) |
| P4-T7C | Core app pages migration (people/engagement/finance/analytics/admin/builder/workflows) | Phase 4 | Review | Codex | Apr 14, 2026 | TBD | main (review 2026-04-19: the leftover hardcoded website/builder navigation targets in the owned `P4-T7C` slice now use existing feature-owned route helpers without changing public URLs. The pass covered the websites console tabs, website management/action href generation, publishing/newsletters/integrations page actions, and the builder header publishing target. `cd frontend && npm run type-check`, `cd frontend && npm test -- --run src/features/websites/pages/__tests__/WebsitePublishingPage.test.tsx src/features/websites/pages/__tests__/WebsiteNewslettersPage.test.tsx src/features/websites/pages/__tests__/WebsiteIntegrationsPage.test.tsx src/features/websites/pages/__tests__/WebsiteOverviewPage.test.tsx src/features/websites/pages/__tests__/WebsitesListPage.test.tsx`, and `cd frontend && npm test -- --run src/features/builder/pages/__tests__/usePageEditorController.test.tsx` passed. Shared route/catalog/navigation follow-through stays with the lead under broader `P4-T7`.) |
| P4-T7E | Accessibility + interaction hardening | Phase 4 | Review | Codex | Apr 18, 2026 | TBD | main (review 2026-04-18: [P4-T7E_CLOSEOUT_2026-04-18.md](P4-T7E_CLOSEOUT_2026-04-18.md) records the reproduced first-run visibility-audit failure and the isolated public-suite bootstrap fix; `cd e2e && npx playwright test tests/visibility-link-audit.spec.ts --project=chromium` and `make check-links` passed) |
| P4-T9 | Setup and launch stabilization + test expansion | Phase 4 | Review | Codex | Apr 14, 2026 | TBD | main (review 2026-04-19: the coordinated coverage-proof and `e2e-contract` lanes are landed. Targeted backend/frontend coverage reruns are green, the stricter Mobile Safari compact-route proof passed, and the Tablet rerun now executes the same assertions after widening the `e2e/tests/ux-regression.spec.ts` project guard. `backend/src/modules/portalAdmin/controllers/portalAdminController.ts` remains a thin export seam over focused shared/account/conversation/appointment controller files, and the remaining full dark-mode audit failures are real product issues tracked under `P4-T7E-DARK`, not a `P4-T9` harness-trust gap.) |
| P4-T9I | Auth alias telemetry dashboard/query follow-up | Phase 4 | Review | Codex | Apr 14, 2026 | TBD | main ([auth-alias report](AUTH_ALIAS_USAGE_REPORT_2026-04-14.md); dashboard/query guide in [AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md](AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md); row-local docs artifact is present on `main`) |
| P4-T10 | PHN collection + encrypted access (contacts, portal profile, vital stats, ingest mapping) | Phase 4 | Review | Codex | Apr 18, 2026 | TBD | main (review 2026-04-19: next-ready pickup confirmed the portal profile plus ingest PHN flow was already landed, then closed the remaining contacts export gap so default exports omit `phn`, explicit PHN export is limited to privileged roles, and targeted export/service tests passed. Remaining contacts integration failures are outside this lane.) |
| P4-T16B | MFA/TOTP dependency replacement for auth flows + tests (`@otplib/preset-default` retirement) | Phase 4 | Review | Codex | Apr 18, 2026 | TBD | main (review 2026-04-18: auth MFA/TOTP now uses `speakeasy` instead of the deprecated otplib preset, shared TOTP helper coverage passes, backend type-check passes, and `DB_HOST=127.0.0.1 DB_PORT=8012 DB_NAME=nonprofit_manager_test DB_USER=postgres DB_PASSWORD=postgres npx jest src/__tests__/integration/auth.mfa.test.ts --runInBand` passed with 3/3 tests) |
| P4-T48 | Case-centric form builder (case defaults, portal/public completion, client-file recording) | Phase 4 | Review | Codex | Apr 16, 2026 | TBD | main (review 2026-04-19: the coordinated backend default-instantiation follow-through is landed. Case-form assignment creation now resolves and stores `source_default_version` when `source_default_id` is present, submission recording keeps that provenance, and the targeted `backend/src/modules/cases/usecases/__tests__/caseForms.usecase.test.ts` coverage passed. The earlier portal/public completion proof remains green, so this row now has both halves closed.) |
| P4-T49 | Aggressive dead-code prune + compatibility retirement | Phase 4 | Review | Codex | Apr 16, 2026 | TBD | main (review 2026-04-19: the `p49-legacy-prune` follow-through is landed. The deleted-path guard scripts now fail if `frontend/src/pages`, `frontend/src/store/slices`, or `backend/src/controllers` reappear, `backend/prisma/migrations/README.md` and its empty retirement-note-only shim directory are removed, the Makefile plus scripts docs now describe the absence-guard behavior, and the active startup request map no longer points at the old contact-detail page path. The three node guard scripts and `make check-links` are green. The nearby admin-settings compatibility-wrapper follow-through remains deferred because that surface is active elsewhere in the dirty tree.) |
| P4-T50 | Runtime efficiency remediation wave (reports export, startup gate, dashboard, cases, tax receipts, grants summary) | Phase 4 | Review | Codex | Apr 16, 2026 | TBD | main (review 2026-04-20: the runtime-efficiency changes remain landed, `make typecheck` is green, and the host Chromium startup/bootstrap proof is closed in the current tree. The coordinated `startup-bootstrap` lane aligned `tests/performance.startup.spec.ts` with the current `Workbench` dashboard heading and taught the shared E2E login helper to reuse the mounted `/dashboard` shell instead of forcing an extra reload inside the startup loop, which removed the stale heading assertion and the inflated request-count regression. `cd e2e && npm test -- --project=chromium tests/auth-bootstrap.contract.spec.ts tests/performance.startup.spec.ts` passed.) |
| P4-T51 | Backend duplication remediation (report-sharing dedupe + contacts compatibility cleanup) | Phase 4 | Review | Codex | Apr 17, 2026 | TBD | main (review 2026-04-19: the coordinated `contacts-import-export` and `contact-notes-timeline` backend lanes are landed. Contact export/preview/commit now use the canonical `bad_request` / `No organization context` contract without treating ambient token organization context as an explicit org target, and the contact-notes timeline now falls back to the contact organization when linked case account ownership is null. `cd backend && npm run type-check` passed. The exact row-local backend commands are still blocked by unrelated existing backend lint errors in `auth.test.ts`, `portalWorkspace.test.ts`, `accountService.test.ts`, `middleware/auth.ts`, and `followUpService.test.ts`, plus the current Jest test-database setup `AggregateError` that prevents `peopleImportExport.test.ts` and `contacts.test.ts` from finishing locally.) |
| P4-T52 | Contributor docs navigation refactor + runtime guide cleanup | Phase 4 | Review | Codex | Apr 18, 2026 | TBD | main (review 2026-04-19: follow-through refreshed `agents.md`, added `docs/validation/README.md` as the audit and validation index, tightened resumed-work routing around `Recent Thread Follow-through` across contributor entry docs, removed stale feature-matrix workboard and role-source drift, and aligned the nonprofit-manager local docs/maintainer skill references with the tracked contributor docs. `make check-links` and `git diff --check` passed, and a local path sanity check confirmed the new `.codex` reference targets. No `/api/v2` examples changed, so `make lint-doc-api-versioning` was not needed.) |
| P4-T53 | Backend monolith decomposition wave (grants, tax receipts, volunteer import/export, team chat, portal messaging) | Phase 4 | Review | Codex | Apr 19, 2026 | TBD | main (review 2026-04-19: the remaining contacts-owned import/export follow-through is landed on the shared `P4-T51` import/export surface. The explicit-org guard/message-proof now matches the canonical `No organization context` contract already pinned by integration coverage, and `cd backend && npm run type-check` passed in the current tree. The exact middleware and `peopleImportExport` proof command is still blocked locally by the same unrelated backend lint issues plus the current Jest test-database `AggregateError`. The post-wave `make quality-baseline` failure remains the `portalAdminController.ts` size policy under `P4-T9`, not a row-local `P4-T53` regression.) |
| P4-T54 | Persona workflow remediation wave (MFA-aware onboarding proof + reports kickoff + fundraiser stewardship kickoff) | Phase 4 | Review | Codex | Apr 19, 2026 | TBD | main (review 2026-04-20: the persona reports/fundraiser kickoff code remains landed, and the previously blocked fresh-workspace MFA proof is now closed. A separate starter-only Docker project (`nonprofit-dev-fresh`) was brought up with `DEV_BYPASS_MFA_FOR_TESTS=false`; the first proof run exposed that `setupFirstUser` created the first admin account without syncing its role mapping, so the subsequent password login skipped the role-enforced MFA enrollment gate. The fix now calls `syncUserRole` during first-admin setup, the targeted `cd backend && npm test -- --runInBand src/__tests__/auth.test.ts` proof passed, and after resetting only the temporary stack the full fresh-workspace persona proof passed with `cd e2e && E2E_BACKEND_PORT=8114 E2E_FRONTEND_PORT=8115 E2E_PUBLIC_SITE_PORT=8116 E2E_DB_PORT=8112 SKIP_WEBSERVER=1 BYPASS_MFA_FOR_TESTS=false npm run test:docker -- tests/fresh-workspace-multi-user.spec.ts --project=chromium`. Active corrections and backlog boundaries remain in [../validation/executive-director-persona-findings-2026-04-20-remediation.md](../validation/executive-director-persona-findings-2026-04-20-remediation.md).) |
