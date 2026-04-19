# 📊 Nonprofit Manager - Planning & Progress

**Current Phase:** Phase 4 - Modularity Refactor  
**Live Snapshot:** 25 active rows: 11 In Progress, 2 Blocked, 12 Review, 0 Ready.
**History:** Historical roadmap, logs, trackers, and legacy reference sections moved to [archive/WORKBOARD_HISTORY_2026.md](archive/WORKBOARD_HISTORY_2026.md).

## 🤝 Coordination

- Update this file before editing tracked work.
- Keep one active task per agent by default unless a coordinated exception is documented here.
- Coordinated exception, 2026-04-14: Codex is handling a narrow user-requested contacts UX follow-up under `P4-T7C` while `P4-T9` owns the Docker-backed E2E admin-bootstrap/auth-fixture stabilization lane in the current tree.
- Coordinated exception, 2026-04-15: `P4-T7C` is split across parallel lanes for the events series/calendar/waitlist/check-in overhaul.
  Lead: `Codex`
  Backend lanes: `event occurrences + series enrollments + occurrence-aware registration/check-in contracts`, `confirmation email + QR delivery + portal/public event contract follow-through`
  Frontend lanes: `staff events hub/detail/calendar refactor + occurrence workflows + waitlist/confirmation UI`
  Other lanes: `targeted backend/frontend/E2E coverage and validation reruns`
  Integration owner: `Codex`
- Coordinated exception, 2026-04-15: `P4-T45` is split across parallel lanes for approval-gated registration, staged passkeys, and admin access management.
  Lead: `Codex`
  Backend lanes: `pending-registration passkey staging + approval transaction + group/access authorization contracts`
  Frontend lanes: `register passkey flow + admin users/groups unified management workspace`
  Other lanes: `targeted backend/frontend validation reruns`
  Integration owner: `Codex`
- Coordinated exception, 2026-04-16: `P4-T48` is a user-requested cases-owned implementation lane proceeding in parallel to the existing `P4-T45`, `P4-T7C`, and `P4-T9` work.
  Lead: `Codex`
  Backend lanes: `case form persistence + staff/portal/public contracts + client-file writeback`
  Frontend lanes: `staff case forms workspace + portal assigned forms + public secure-link completion`
  Other lanes: `targeted migration/contracts validation + backend/frontend type coverage + DB/docs/QA follow-through`
  Integration owner: `Codex`
- Coordinated exception, 2026-04-16: `P4-T9` is split across parallel lanes for Playwright harness runtime-contract stabilization.
  Lead: `Codex`
  Backend lanes: `none`
  Frontend lanes: `none`
  Other lanes: `shell wrapper/runtime entrypoint normalization`, `Playwright/auth fixture contract stabilization`, `lead-owned docs/workboard/validation follow-through`
  Integration owner: `Codex`
- Coordinated exception, 2026-04-16: `P4-T45`, `P4-T7E-DARK`, `P4-T1R4`, and `P4-T1R4W3B` are split across a user-requested remediation wave for findings 1-6.
  Lead: `Codex`
  Backend lanes: `activities organization scoping`, `pending-registration passkey capability`
  Frontend lanes: `admin redirect + outreach CTA cleanup`, `dashboard donation trends widget`
  Other lanes: `dark-mode signed-link fixtures + targeted docs/validation follow-through`
  Integration owner: `Codex`
- Coordinated exception, 2026-04-17: `P4-T1R4W3B` is split across a backend-first ownership extraction pass.
  Lead: `Codex`
  Backend lanes: `activities module-owned service extraction + compatibility wrapper follow-through`
  Frontend lanes: `none; dedicated frontend feature proof explicitly deferred`
  Other lanes: `targeted backend lint/type-check/Jest + module-ownership-policy reruns`
  Integration owner: `Codex`
- Coordinated exception, 2026-04-17: `P4-T45`, `P4-T1R4W3B`, and `P4-T51` are split across a backend duplication remediation wave.
  Lead: `Codex`
  Backend lanes: `auth reset shared core`, `reports shared controller extraction`, `contacts emails/phones/relationships ownership cleanup`
  Frontend lanes: `none`
  Other lanes: `activities closeout + targeted backend validation`
  Integration owner: `Codex`
- Coordinated exception, 2026-04-16: `P4-T7` is split across a user-requested repo-wide UI/UX remediation wave.
  Lead: `Codex`
  Backend lanes: `portal password-reset contract + shared auth fixture follow-through`
  Frontend lanes: `framework shell + navigation hardening`, `portal/auth/public remediation`, `staff workflow remediation`
  Other lanes: `route catalog + UX smoke coverage + targeted validation reruns`
  Integration owner: `Codex`
- Coordinated exception, 2026-04-18: `P4-T48` and `P4-T1R4` are split across a user-reported CBIS remediation wave.
  Lead: `Codex`
  Backend lanes: `case ownership defaulting + contact timeline scoping + scoped support audit artifact`
  Frontend lanes: `desktop account-menu overflow hardening`, `contact case-cache invalidation + follow-up error surfacing`
  Other lanes: `targeted backend/frontend/E2E reproduction coverage + validation reruns`
  Integration owner: `Codex`
- Coordinated exception, 2026-04-18: `P4-T10` and `P4-T16B` are split across a user-requested next-ready pickup wave.
  Lead: `Codex`
  Backend lanes: `PHN access + ingest/vital-stats contract follow-through`, `TOTP dependency replacement + auth compatibility updates`
  Frontend lanes: `none unless PHN contract gaps require feature-owned follow-through`
  Other lanes: `targeted backend/auth/ingest validation + workboard integration`
  Integration owner: `Codex`
- Coordinated exception, 2026-04-18: `P4-T9` is split across the testing-strategy remediation wave.
  Lead: `Codex`
  Backend lanes: `backend-jest-integration-contract-and-guard-depth`
  Frontend lanes: `frontend-vitest-harness-fail-fast-route-ux-smoke-signal-hardening`
  Other lanes: `P4-T9 repo CI/E2E contract remediation`
  Integration owner: `Codex`
- Coordinated exception, 2026-04-18: `P4-T52` is split across a user-requested documentation refactor wave.
  Lead: `Codex`
  Backend lanes: `none`
  Frontend lanes: `none`
  Other lanes: `contributor entrypoint audit + rewrite`, `docs landing/catalog/runtime-navigation refactor`, `lead-owned workboard/style-guide/validation closeout`
  Integration owner: `Codex`
- Coordinated exception, 2026-04-18: `P4-T45`, `P4-T1R4W3D`, `P4-T48`, `P4-T7C`, `P4-T7`, `P4-T7E-DARK`, and `P4-T9` are split across the repo-audit remediation wave.
  Lead: `Codex`
  Backend lanes: `cases compile stabilization + reminder contract follow-through`, `staff/portal auth hardening + API-key/portal-admin guard remediation`, `mailchimp/payments authorization + webhook replay hardening`
  Frontend lanes: `user-settings fallback safety + navigation-cache logout reset + portal client org-header isolation`
  Other lanes: `route-health/runtime harness hardening`, `dependency audit closure + remediation docs/workboard follow-through`
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

## 🧭 Active Workboard

| ID | Task | Phase | Status | Owner | Started | Target | PR/Branch |
|----|------|-------|--------|-------|---------|--------|-----------|
| P4-T47 | Public history scrub and `.gitignore` hardening | Phase 4 | Review | Codex | Apr 15, 2026 | TBD | main (review 2026-04-15: scrubbed history is force-pushed to `origin/main`, fresh-clone audits are clean, the full `.codex` tree is versioned, local Docker database artifacts are ignored, and the remaining follow-through is the GitHub cache/support purge request using the filter-repo changed-refs output) |
| P4-T45 | Security hardening wave (auth/session invalidation, API-key/webhook controls, CORS fail-closed, public-form intake tightening) | Phase 4 | In Progress | Codex | Apr 15, 2026 | TBD | main (active 2026-04-18: the repo-audit remediation wave landed membership-derived staff org claims, portal-session current-state checks, API-key query rejection plus in-request rate-limit enforcement, portal-admin kernel alignment, Mailchimp admin-settings permission gates, payment-intent read/cancel guards plus donation ownership checks, webhook replay hardening, and the frontend DOMPurify 3.4.0 audit closure with `node scripts/check-auth-guard-policy.ts`, `node scripts/check-rate-limit-key-policy.ts`, `cd backend && DB_HOST=127.0.0.1 DB_PORT=8012 DB_NAME=nonprofit_manager_test DB_USER=postgres DB_PASSWORD=postgres npx jest src/__tests__/integration/authorization.test.ts src/__tests__/integration/portalAuth.test.ts src/__tests__/middleware/apiKeyAuth.test.ts src/__tests__/services/authGuardService.test.ts src/__tests__/utils/permissions.test.ts --runInBand`, `cd backend && npm test -- --runInBand src/__tests__/modules/mailchimp.routes.security.test.ts src/__tests__/modules/payments.routes.security.test.ts src/__tests__/modules/payments.intentOwnership.test.ts`, `cd backend && npm test -- --runInBand src/__tests__/integration/routeGuardrails.test.ts -t "replay and duplicate paths"`, and `cd frontend && npm audit --omit=dev --audit-level=moderate` passing) |
| P4-T7E-DARK | Whole-app dark-mode accessibility remediation + route-audit closure | Phase 4 | In Progress | Codex | Mar 11, 2026 | TBD | main (active 2026-04-18: route-health now fails on same-origin console/network/runtime errors, legacy redirect expectations come from the admin route manifest instead of a hard-coded drift list, and the dark-mode audit flow now documents the compiled preview runtime used for long-running audits; `cd frontend && npm test -- --run src/routes/__tests__/adminRedirects.test.tsx`, `cd e2e && bash ../scripts/e2e-playwright.sh host ./node_modules/.bin/playwright test tests/link-health.spec.ts --project=chromium --list`, and `make check-links` passed, and the live Chromium rerun is now surfacing real public demo 401/console failures plus staff-route issues instead of false greens) |
| P4-T35 | Compact workspace shell navigation and responsive overflow | Phase 4 | Blocked | Codex | Apr 7, 2026 | TBD | main (blocked 2026-04-14: `npm run test:docker:ci:mobile` no longer dies immediately on the old shared-admin bootstrap step, and the auth-entry route check now passes, but the compact-nav and staff-overflow checks still time out while setting up `authenticatedPage`; dependency remains the shared `P4-T9` auth-fixture stabilization lane) |
| P4-T1R4 | Wave 2+ rollout prep (reports/analytics/dashboard then ops/comms surfaces) | Phase 4 | In Progress | Codex | Mar 2, 2026 | TBD | main (active 2026-04-18: the mixed modularization follow-through landed a module-owned reports service implementation under `backend/src/modules/reports/services/**`, shrank the root reports service/support files to compatibility wrappers, and passed targeted report-service + reports-controller Jest coverage while the active admin UX fixes around account security, groups/roles, invitation management, and the CBIS account-menu hotfix remain in flight under the broader parent row) |
| P4-T1R4W3B | Wave 3 prep: activities modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | In Progress | Codex | Mar 17, 2026 | TBD | main (active 2026-04-17: backend-first follow-through has moved the live activity service into `backend/src/modules/activities/**`, is keeping a root compatibility wrapper in place, and is closing out the wrapper-direction test plus targeted backend validation while the dedicated `frontend/src/features/activities/**` proof remains explicitly deferred) |
| P4-T1R4W3C | Wave 3 prep: webhooks modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main (review 2026-04-18: the frontend follow-through confirmed the feature-owned `frontend/src/features/webhooks/**` page/hook boundary, kept admin route wiring as a thin entry seam, repointed shared admin/UX smoke imports to the feature-owned page, and `cd frontend && npm test -- --run src/features/webhooks/pages/__tests__/ApiSettingsPage.test.tsx src/test/ux/RouteUxSmokeExtended.test.tsx` plus `cd frontend && npm run type-check` passed) |
| P4-T1R4W3D | Wave 3 prep: mailchimp modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main (review 2026-04-18: the newsletter campaigns workspace now lives under `frontend/src/features/mailchimp/**`, the admin page/components are thin compatibility re-exports, the admin route path stayed stable, the repo-audit follow-through added explicit admin-settings permission gates to the Mailchimp backend routes, and `cd frontend && npm test -- --run src/features/adminOps/pages/__tests__/EmailMarketingPage.test.tsx src/test/ux/RouteUxSmokeExtended.test.tsx`, `cd frontend && npm run type-check`, and `cd backend && npm test -- --runInBand src/__tests__/modules/mailchimp.routes.security.test.ts` passed) |
| P4-T1R4W3E | Wave 3 prep: invitations modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main (triage note: [P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md) confirms the backend module and wrapper, but the frontend invitation flows are still split across auth/admin surfaces rather than a dedicated feature package, so it stays in Review) |
| P4-T1R4W3F | Wave 3 prep: meetings modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main (triage note: [P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md) confirms the backend meetings module, but the wrapper/frontend-feature/test package promised by the row is still missing, so it stays in Review) |
| P4-T6 | Workflow-first UI/UX polish (cases/intake + full portal) | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | main (triage note: [P4-T6_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T6_CLUSTER_CLOSEOUT_2026-04-14.md) confirms the current cases/intake and portal surfaces, but the parent row remains broader than the row-local proof, so it stays in Review) |
| P4-T6A | Shared UX primitives + follow-ups QoL | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | main (triage note: [P4-T6_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T6_CLUSTER_CLOSEOUT_2026-04-14.md) shows the shared UX primitives on `main`, but the row remains underspecified around its follow-up scope, so it stays in Review) |
| P4-T6D | Portal secondary pages hardening + verification | Phase 4 | In Progress | Codex | Mar 2, 2026 | TBD | main (active 2026-04-18: the portal secondary-pages follow-through landed a controller/adapters/sidebar split for `frontend/src/features/portal/pages/PortalCalendarPage.tsx` without changing portal URLs or API contracts, and `cd frontend && npm test -- --run src/features/portal/pages/__tests__/PortalCalendarPage.test.tsx` plus `cd frontend && npm run type-check` passed while the broader notes/forms/reminders proof remains incomplete) |
| P4-T7 | Full app UI/UX replacement (all themes, all routes) | Phase 4 | In Progress | Codex | Apr 16, 2026 | TBD | main (active 2026-04-18: the repo-audit follow-through now clears navigation-preference caches on real logout/auth rejection and isolates the portal API client from staff org-header carryover, with `cd frontend && npm test -- --run src/hooks/__tests__/useNavigationPreferences.test.tsx src/services/__tests__/httpClient.test.ts` passing while the broader framework shell, portal/auth/public cleanup, and route-catalog follow-through remain aligned with the live `P4-T9` lane) |
| P4-T7C | Core app pages migration (people/engagement/finance/analytics/admin/builder/workflows) | Phase 4 | In Progress | Codex | Apr 14, 2026 | TBD | main (active 2026-04-18: the repo-audit remediation wave made `UserSettingsPage` fallback-safe so failed profile loads no longer establish a destructive save baseline and instead surface a retry path, with `cd frontend && npm test -- --run src/features/adminOps/pages/__tests__/UserSettingsPage.test.tsx` and `cd frontend && npm run type-check` passing, while the broader admin/builder modularization and events follow-through remain in flight across `/events`, `/events/calendar`, `/events/new`, `/events/:id/edit`, and `/events/:id`) |
| P4-T7E | Accessibility + interaction hardening | Phase 4 | Review | Codex | Apr 18, 2026 | TBD | main (review 2026-04-18: [P4-T7E_CLOSEOUT_2026-04-18.md](P4-T7E_CLOSEOUT_2026-04-18.md) records the reproduced first-run visibility-audit failure and the isolated public-suite bootstrap fix; `cd e2e && npx playwright test tests/visibility-link-audit.spec.ts --project=chromium` and `make check-links` passed) |
| P4-T9 | Setup and launch stabilization + test expansion | Phase 4 | In Progress | Codex | Apr 14, 2026 | TBD | main (active 2026-04-18: the repo-audit route-health follow-through now shifts long-running host audits onto the compiled preview runtime instead of reusing a fragile dev server, keeps the host-vs-docker wrapper split intact, and passed `cd e2e && bash ../scripts/e2e-playwright.sh host ./node_modules/.bin/playwright test tests/link-health.spec.ts --project=chromium --list`; the current follow-through is triaging the real route/runtime failures that the live Chromium rerun is now exposing on public demo and selected staff routes) |
| P4-T9I | Auth alias telemetry dashboard/query follow-up | Phase 4 | Review | Codex | Apr 14, 2026 | TBD | main ([auth-alias report](AUTH_ALIAS_USAGE_REPORT_2026-04-14.md); dashboard/query guide in [AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md](AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md); row-local docs artifact is present on `main`) |
| P4-T10 | PHN collection + encrypted access (contacts, portal profile, vital stats, ingest mapping) | Phase 4 | In Progress | Codex | Apr 18, 2026 | TBD | main (active 2026-04-18: next-ready pickup confirmed the portal profile + ingest PHN flow was already landed, then closed the remaining contacts export gap so default exports omit `phn`, explicit PHN export is limited to privileged roles, and targeted export/service tests pass; the broader contacts integration suite still carries unrelated fixture/schema failures outside this lane) |
| P4-T16B | MFA/TOTP dependency replacement for auth flows + tests (`@otplib/preset-default` retirement) | Phase 4 | Review | Codex | Apr 18, 2026 | TBD | main (review 2026-04-18: auth MFA/TOTP now uses `speakeasy` instead of the deprecated otplib preset, shared TOTP helper coverage passes, backend type-check passes, and `DB_HOST=127.0.0.1 DB_PORT=8012 DB_NAME=nonprofit_manager_test DB_USER=postgres DB_PASSWORD=postgres npx jest src/__tests__/integration/auth.mfa.test.ts --runInBand` passed with 3/3 tests) |
| P4-T48 | Case-centric form builder (case defaults, portal/public completion, client-file recording) | Phase 4 | In Progress | Codex | Apr 16, 2026 | TBD | main (active 2026-04-18: the repo-audit release-blocker follow-through cleared the cases-module type drift in `lifecycleQueries`, `caseServicesRepository`, and `caseService`, realigned stale case-type test/setup queries with the current schema, and passed `cd backend && npm run type-check`, `cd backend && npx jest src/__tests__/services/eventReminderAutomationService.test.ts --runInBand`, and `cd backend && DB_HOST=127.0.0.1 DB_PORT=8012 DB_NAME=nonprofit_manager_test DB_USER=postgres DB_PASSWORD=postgres npx jest src/__tests__/integration/cases.test.ts --runInBand`, while the broader case-form builder work stays in flight) |
| P4-T49 | Aggressive dead-code prune + compatibility retirement | Phase 4 | Review | Codex | Apr 16, 2026 | TBD | main (review 2026-04-18: follow-up dead-code proof removed the runtime-unused activity/contact compatibility shims and the orphaned field-access middleware plus its dead-only tests, repointed surviving repository coverage to module-owned paths, and scrubbed stale docs references to retired CI/policy/retry artifacts; `npx --yes knip@6.4.1 --config knip.json --include files,dependencies,unlisted,unresolved,binaries`, `cd backend && npx jest src/__tests__/services/activityService.test.ts src/__tests__/services/contactEmailService.test.ts src/__tests__/services/contactPhoneService.test.ts src/__tests__/services/contactRelationshipService.test.ts --runInBand`, and `make check-links` passed, while backend `npm run lint` and `npm run type-check` remain blocked by unrelated pre-existing cases-module failures in the current dirty tree) |
| P4-T50 | Runtime efficiency remediation wave (reports export, startup gate, dashboard, cases, tax receipts, grants summary) | Phase 4 | Blocked | Codex | Apr 16, 2026 | TBD | main (active 2026-04-16: user-requested remediation landed the capped direct-report export fallback to export jobs, tightened the enforced startup performance budget, scoped dashboard data lanes and removed startup prefetch, rendered a single responsive case-list tree, batched annual tax-receipt item inserts, and cached/invalidation for grants summary loads; targeted unit/frontend checks passed, but final verification is blocked by pre-existing frontend typecheck errors outside this lane and MFA-required Playwright startup auth on managed test users) |
| P4-T51 | Backend duplication remediation (report-sharing dedupe + contacts compatibility cleanup) | Phase 4 | In Progress | Codex | Apr 17, 2026 | TBD | main (active 2026-04-18: contacts follow-through now hardens duplicate-phone handling behind a stable module-owned error code while preserving the public `400 VALIDATION_ERROR` contract, expands phone compatibility + route coverage, and synchronizes materialized bidirectional relationship pairs across create/update/delete with permissive no-inverse-type one-way behavior; targeted wrapper Jest, contacts integration, backend lint, and backend type-check checks are passing, while contact documents cleanup remains explicitly deferred to a later subphase) |
| P4-T52 | Contributor docs navigation refactor + runtime guide cleanup | Phase 4 | Review | Codex | Apr 18, 2026 | TBD | main (review 2026-04-18: user-requested extensive docs sweep tightened contributor entrypoints, development/runtime/testing guides, API/deployment/Postman docs, service and database references, and long-tail feature/product/performance/security/history framing; `make check-links`, `make lint-doc-api-versioning`, and `git diff --check` passed) |
