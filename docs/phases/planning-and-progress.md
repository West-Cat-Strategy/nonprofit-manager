# 📊 Nonprofit Manager - Planning & Progress

**Current Phase:** Phase 4 - Modularity Refactor  
**Live Snapshot:** 24 active rows: 10 In Progress, 2 Blocked, 12 Review, 0 Ready.
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
| P4-T45 | Security hardening wave (auth/session invalidation, API-key/webhook controls, CORS fail-closed, public-form intake tightening) | Phase 4 | In Progress | Codex | Apr 15, 2026 | TBD | main (active 2026-04-17: approval-gated staff registration follow-through is tightening the pending-account copy so no CTA implies sign-in before approval while preserving staged-passkey setup and the signed admin review-link flow already in flight, and the current backend duplication remediation lane is extracting a shared password-reset token core for staff + portal reset flows without changing route or email contracts) |
| P4-T7E-DARK | Whole-app dark-mode accessibility remediation + route-audit closure | Phase 4 | In Progress | Codex | Mar 11, 2026 | TBD | main (active 2026-04-16: the closure wave is replacing placeholder signed-link route fixtures with deterministic invitation/reset/review/case-form builders before the next Chromium + Docker audit rerun against the generated findings report) |
| P4-T35 | Compact workspace shell navigation and responsive overflow | Phase 4 | Blocked | Codex | Apr 7, 2026 | TBD | main (blocked 2026-04-14: `npm run test:docker:ci:mobile` no longer dies immediately on the old shared-admin bootstrap step, and the auth-entry route check now passes, but the compact-nav and staff-overflow checks still time out while setting up `authenticatedPage`; dependency remains the shared `P4-T9` auth-fixture stabilization lane) |
| P4-T1R4 | Wave 2+ rollout prep (reports/analytics/dashboard then ops/comms surfaces) | Phase 4 | In Progress | Codex | Mar 2, 2026 | TBD | main (active 2026-04-18: a user-requested admin UX follow-through is removing remaining blocking alert-driven feedback from account security, groups/roles, and invitation management so approvals, access, and invite flows use the shared toast system while keeping the broader parent row scope intact, and the current CBIS hotfix lane is hardening the desktop account popover so `Admin Settings` stays reachable on short-height screens) |
| P4-T1R4W3B | Wave 3 prep: activities modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | In Progress | Codex | Mar 17, 2026 | TBD | main (active 2026-04-17: backend-first follow-through has moved the live activity service into `backend/src/modules/activities/**`, is keeping a root compatibility wrapper in place, and is closing out the wrapper-direction test plus targeted backend validation while the dedicated `frontend/src/features/activities/**` proof remains explicitly deferred) |
| P4-T1R4W3C | Wave 3 prep: webhooks modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main (triage note: [P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md) confirms the backend module and wrapper, but the frontend surface still reads as feature-state plus admin consumer wiring, so it stays in Review) |
| P4-T1R4W3D | Wave 3 prep: mailchimp modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main (triage note: [P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md) confirms the backend module and wrapper, but the visible frontend UI still lives under admin ops rather than a dedicated Mailchimp feature, so it stays in Review) |
| P4-T1R4W3E | Wave 3 prep: invitations modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main (triage note: [P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md) confirms the backend module and wrapper, but the frontend invitation flows are still split across auth/admin surfaces rather than a dedicated feature package, so it stays in Review) |
| P4-T1R4W3F | Wave 3 prep: meetings modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main (triage note: [P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md) confirms the backend meetings module, but the wrapper/frontend-feature/test package promised by the row is still missing, so it stays in Review) |
| P4-T6 | Workflow-first UI/UX polish (cases/intake + full portal) | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | main (triage note: [P4-T6_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T6_CLUSTER_CLOSEOUT_2026-04-14.md) confirms the current cases/intake and portal surfaces, but the parent row remains broader than the row-local proof, so it stays in Review) |
| P4-T6A | Shared UX primitives + follow-ups QoL | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | main (triage note: [P4-T6_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T6_CLUSTER_CLOSEOUT_2026-04-14.md) shows the shared UX primitives on `main`, but the row remains underspecified around its follow-up scope, so it stays in Review) |
| P4-T6D | Portal secondary pages hardening + verification | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | main (triage note: [P4-T6_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T6_CLUSTER_CLOSEOUT_2026-04-14.md) confirms several portal secondary-page tests, but the notes/forms/reminders proof is still incomplete, so it stays in Review) |
| P4-T7 | Full app UI/UX replacement (all themes, all routes) | Phase 4 | In Progress | Codex | Apr 16, 2026 | TBD | main (active 2026-04-18: the user-requested repo-wide UI/UX remediation wave remains in flight across framework shell and navigation hardening, portal/auth/public cleanup, and staff workflow follow-through while the shared portal password-reset contract, route-catalog updates, UX smoke coverage, and auth-fixture stabilization dependencies stay aligned with the live `P4-T9` lane) |
| P4-T7C | Core app pages migration (people/engagement/finance/analytics/admin/builder/workflows) | Phase 4 | In Progress | Codex | Apr 14, 2026 | TBD | main (active 2026-04-18: the next admin/builder modularization pass is targeting the website builder gallery as the highest-churn builder-owned surface still carrying oversized page-local orchestration, while the earlier staff events UX refresh remains in flight across `/events`, `/events/calendar`, `/events/new`, `/events/:id/edit`, and `/events/:id` with real registration batch-scope updates through the `/registrations/:id?scope=` contract, event-detail overview metrics and timing that honor the actively selected occurrence, and current follow-through on preserving calendar/detail return context through the editor path so the modularized events rollout stays safe) |
| P4-T7E | Accessibility + interaction hardening | Phase 4 | Review | Codex | Apr 18, 2026 | TBD | main (review 2026-04-18: [P4-T7E_CLOSEOUT_2026-04-18.md](P4-T7E_CLOSEOUT_2026-04-18.md) records the reproduced first-run visibility-audit failure and the isolated public-suite bootstrap fix; `cd e2e && npx playwright test tests/visibility-link-audit.spec.ts --project=chromium` and `make check-links` passed) |
| P4-T9 | Setup and launch stabilization + test expansion | Phase 4 | In Progress | Codex | Apr 14, 2026 | TBD | main (active 2026-04-14 auth-fixture stabilization lane: runtime-aware admin credential defaults and DB-backed shared-user recovery are in place, and the current-branch follow-up is finalizing the host-runtime contract so Playwright-managed runs keep strict registration disabled while E2E user creation consistently routes through the managed helper path before the mobile timeout fallout is re-evaluated) |
| P4-T9I | Auth alias telemetry dashboard/query follow-up | Phase 4 | Review | Codex | Apr 14, 2026 | TBD | main ([auth-alias report](AUTH_ALIAS_USAGE_REPORT_2026-04-14.md); dashboard/query guide in [AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md](AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md); row-local docs artifact is present on `main`) |
| P4-T10 | PHN collection + encrypted access (contacts, portal profile, vital stats, ingest mapping) | Phase 4 | In Progress | Codex | Apr 18, 2026 | TBD | main (active 2026-04-18: next-ready pickup confirmed the portal profile + ingest PHN flow was already landed, then closed the remaining contacts export gap so default exports omit `phn`, explicit PHN export is limited to privileged roles, and targeted export/service tests pass; the broader contacts integration suite still carries unrelated fixture/schema failures outside this lane) |
| P4-T16B | MFA/TOTP dependency replacement for auth flows + tests (`@otplib/preset-default` retirement) | Phase 4 | Review | Codex | Apr 18, 2026 | TBD | main (review 2026-04-18: auth MFA/TOTP now uses `speakeasy` instead of the deprecated otplib preset, shared TOTP helper coverage passes, backend type-check passes, and `DB_HOST=127.0.0.1 DB_PORT=8012 DB_NAME=nonprofit_manager_test DB_USER=postgres DB_PASSWORD=postgres npx jest src/__tests__/integration/auth.mfa.test.ts --runInBand` passed with 3/3 tests) |
| P4-T48 | Case-centric form builder (case defaults, portal/public completion, client-file recording) | Phase 4 | In Progress | Codex | Apr 16, 2026 | TBD | main (active 2026-04-18: the user-reported CBIS remediation lane is defaulting new case ownership to the active organization when the client omits `account_id`, aligning contact timeline case-note visibility with case list/detail scoping, hardening contact-side case cache refresh, and adding targeted follow-up save/error coverage while the broader case-form builder follow-through remains in flight) |
| P4-T49 | Aggressive dead-code prune + compatibility retirement | Phase 4 | Review | Codex | Apr 16, 2026 | TBD | main (review 2026-04-18: follow-up dead-code proof removed the runtime-unused activity/contact compatibility shims and the orphaned field-access middleware plus its dead-only tests, repointed surviving repository coverage to module-owned paths, and scrubbed stale docs references to retired CI/policy/retry artifacts; `npx --yes knip@6.4.1 --config knip.json --include files,dependencies,unlisted,unresolved,binaries`, `cd backend && npx jest src/__tests__/services/activityService.test.ts src/__tests__/services/contactEmailService.test.ts src/__tests__/services/contactPhoneService.test.ts src/__tests__/services/contactRelationshipService.test.ts --runInBand`, and `make check-links` passed, while backend `npm run lint` and `npm run type-check` remain blocked by unrelated pre-existing cases-module failures in the current dirty tree) |
| P4-T50 | Runtime efficiency remediation wave (reports export, startup gate, dashboard, cases, tax receipts, grants summary) | Phase 4 | Blocked | Codex | Apr 16, 2026 | TBD | main (active 2026-04-16: user-requested remediation landed the capped direct-report export fallback to export jobs, tightened the enforced startup performance budget, scoped dashboard data lanes and removed startup prefetch, rendered a single responsive case-list tree, batched annual tax-receipt item inserts, and cached/invalidation for grants summary loads; targeted unit/frontend checks passed, but final verification is blocked by pre-existing frontend typecheck errors outside this lane and MFA-required Playwright startup auth on managed test users) |
| P4-T51 | Backend duplication remediation (report-sharing dedupe + contacts compatibility cleanup) | Phase 4 | In Progress | Codex | Apr 17, 2026 | TBD | main (active 2026-04-18: contacts follow-through now hardens duplicate-phone handling behind a stable module-owned error code while preserving the public `400 VALIDATION_ERROR` contract, expands phone compatibility + route coverage, and synchronizes materialized bidirectional relationship pairs across create/update/delete with permissive no-inverse-type one-way behavior; targeted wrapper Jest, contacts integration, backend lint, and backend type-check checks are passing, while contact documents cleanup remains explicitly deferred to a later subphase) |
