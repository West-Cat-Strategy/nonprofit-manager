# 📊 Nonprofit Manager - Planning & Progress

**Current Phase:** Phase 4 - Modularity Refactor  
**Live Snapshot:** 83 active rows: 12 In Progress, 1 Blocked, 64 Review, 6 Ready.  
**History:** Historical roadmap, logs, trackers, and legacy reference sections moved to [archive/WORKBOARD_HISTORY_2026.md](archive/WORKBOARD_HISTORY_2026.md).

## 🤝 Coordination

- Update this file before editing tracked work.
- Keep one active task per agent by default unless a coordinated exception is documented here.
- Move blocked work to Blocked with a reason and next step.
- Use task IDs in commits and PR titles.

## Status Keys

- In Progress: signed out and being worked.
- Blocked: waiting on a dependency or decision.
- Review: ready for review or QA.
- Ready: scoped and ready to pick up.

## 🧭 Active Workboard

| ID | Task | Phase | Status | Owner | Started | Target | PR/Branch |
|----|------|-------|--------|-------|---------|--------|-----------|
| P4-T7E-DARK | Whole-app dark-mode accessibility remediation + route-audit closure | Phase 4 | In Progress | Codex | Mar 11, 2026 | TBD | main |
| P4-T9A | Efficiency remediation pack (Top 15 findings) | Phase 4 | In Progress | Codex | Mar 5, 2026 | TBD | main |
| P4-T9E | Cross-surface startup + navigation efficiency wave | Phase 4 | In Progress | Codex | Mar 7, 2026 | TBD | codex/p4-t9e-startup-navigation-wave |
| P4-T18 | Provider-agnostic donation processing via website forms + Stripe/PayPal/Square | Phase 4 | In Progress | Codex | Mar 15, 2026 | TBD | main (carries `P4-T9H` `lint-implementation-size` unblock for `recurringDonationService.ts` and `publicWebsiteFormService.ts`) |
| P4-T29 | Internal grants tracking platform | Phase 4 | In Progress | Codex | Mar 20, 2026 | TBD | main (carries `P4-T35` grants smoke-harness Chromium regression from `e2e/tests/grants.spec.ts:561`) |
| P4-T30 | Dependency review and multi-package upgrade pass | Phase 4 | In Progress | Codex | Mar 28, 2026 | TBD | codex/p4-t30-dependency-upgrades |
| P4-T37 | Organizational admin panel refactor + canonical role wiring | Phase 4 | In Progress | Antigravity | Apr 10, 2026 | TBD | main |
| P4-T38 | Contacts module redesign + legacy alignment | Phase 4 | In Progress | Antigravity | Apr 10, 2026 | TBD | main (carries `P4-T35` contacts delete-from-list Chromium regression from `e2e/tests/contacts.spec.ts:1082` and `P4-T9H` `lint-implementation-size` unblock for `contactMergeService.ts`) |
| P4-T39 | Reliability and efficiency remediation sweep | Phase 4 | In Progress | Codex | Apr 11, 2026 | TBD | main |
| P4-T39A | Backend reliability hardening (reconciliation, payments, webhooks) | Phase 4 | In Progress | Antigravity | Apr 11, 2026 | TBD | main (carries `P4-T9H` `lint-implementation-size` unblock for `webhookService.ts`) |
| P4-T43 | Contacts/cases paired module split follow-up | Phase 4 | In Progress | Codex | Apr 13, 2026 | TBD | main |
| P4-T44 | Root script wrapper refactor (shared shell helpers, compose/E2E cleanup, dead duplicate removal) | Phase 4 | In Progress | Codex | Apr 13, 2026 | TBD | main |
| P4-T5 | Structural refactor wave (validation/auth/envelope/frontend/docs guardrails) | Phase 4 | Review | Codex | Mar 2, 2026 | Mar 2, 2026 | main (former implementation-size blocker cleared on 2026-04-13: `UserSettingsPage.tsx` is `930` lines against baseline `931`, and `PortalSection.tsx` is `165` lines) |
| P4-T9H | Staff backend efficiency wave (stable contracts, query-path + search/index refactor) | Phase 4 | Blocked | Codex | Mar 15, 2026 | TBD | main (strict closure blocked by `lint-implementation-size`: `P4-T38` `contactMergeService.ts`; `P4-T18` `recurringDonationService.ts` + `publicWebsiteFormService.ts`; `P4-T33` `siteOperationsService.ts` + `websitesCore.ts`; `P4-T39A` `webhookService.ts`; `P4-T7C-WEB3` `EditorCanvas.tsx`; `P4-T36` `EmailMarketingPage.tsx`) |
| P4-T35 | Compact workspace shell navigation and responsive overflow | Phase 4 | Review | Codex | Apr 7, 2026 | TBD | main (shell-specific verification passed on 2026-04-13: desktop compact-nav Chromium slice green, `npm run test:docker:ci:mobile` green; broader alerts/contacts/grants Chromium failures rerouted to `P4-T1R4W3A` / `P4-T38` / `P4-T29`) |
| P4-T1 | Full-stack modularity refactor recovery (dual-stack modularization waves) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main ([closeout](P4-T1_CLOSEOUT_2026-04-13.md)) |
| P4-T1R4 | Wave 2+ rollout prep (reports/analytics/dashboard then ops/comms surfaces) | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | codex/p4-t1r4-wave2-modularization |
| P4-T1R4A | Wave 2 backend modules + dual-stack wrappers (`analytics/reports/saved-reports/scheduled-reports/dashboard/follow-ups`) | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | codex/p4-t1r4-wave2-modularization |
| P4-T1R4B | Wave 2 frontend feature migration + slice shim cutover (analytics/reporting/dashboard/follow-ups) | Phase 4 | Review | Codex | Mar 2, 2026 | main | main |
| P4-T1R4C | Wave 2 contract alignment + e2e updates (`/api/v2/*` wave-2 surfaces) | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | codex/p4-t1r4-wave2-modularization ([closeout](P4-T1R4C_CLOSEOUT_2026-04-13.md)) |
| P4-T1R4D | Wave 3 decision lock and workboard subtask seeding (alerts/activities/webhooks/mailchimp/invitations/meetings/admin+portal ops) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main |
| P4-T1R4W3A | Wave 3 prep: alerts modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 5, 2026 | Mar 5, 2026 | codex/p4-wave-close-direct-cutover (carries `P4-T35` alerts import regression from `frontend/src/features/alerts/pages/AlertsConfigPage.tsx:21` / `e2e/tests/alerts.spec.ts:12`) |
| P4-T1R4W3B | Wave 3 prep: activities modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main |
| P4-T1R4W3C | Wave 3 prep: webhooks modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main |
| P4-T1R4W3D | Wave 3 prep: mailchimp modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main |
| P4-T1R4W3E | Wave 3 prep: invitations modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main |
| P4-T1R4W3F | Wave 3 prep: meetings modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main |
| P4-T1R4W3G | Wave 3 prep: remaining admin/portal operational surfaces modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Apr 9, 2026 | TBD | main ([closeout](P4-T1_CLOSEOUT_2026-04-13.md)) |
| P4-T1R7A | Backend contacts/cases/outcomes seam extraction (module-owned contact-note + outcomes-report orchestration) | Phase 4 | Review | Codex | Mar 14, 2026 | TBD | main |
| P4-T1R7B | Frontend notes/report feature ownership cutover (`ContactNotes`, `CaseNotes`, `InteractionNote`, `OutcomesReport`) | Phase 4 | Review | Codex | Mar 14, 2026 | TBD | main |
| P4-T1R7C | Scoped verification + importer sweep for the cases/contacts/outcomes wave | Phase 4 | Review | Codex | Mar 15, 2026 | TBD | main ([closeout](P4-T1_CLOSEOUT_2026-04-13.md)) |
| P4-T1R7D | Remaining dead shim and wrapper retirement (`backend/src/routes/*`, orphan frontend page/route wrappers) | Phase 4 | Review | Codex | Mar 15, 2026 | Mar 15, 2026 | main ([closeout](P4-T1_CLOSEOUT_2026-04-13.md)) |
| P4-T1R7 | Compatibility hardening + ownership-map ratchet sweep for remaining seams (`payments`, `finance`, `builder`, `opportunities` seams) | Phase 4 | Review | Codex | Mar 11, 2026 | Jun 30, 2026 | main ([closeout](P4-T1_CLOSEOUT_2026-04-13.md)) |
| P4-T1R8 | Repo-wide modularization sweep (frontend ownership inversion + route/policy/docs closure + publishing/runtime consolidation) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main |
| P4-T1R8A | Frontend ownership inversion (`pages/**` residual seams + shared UI/service relocation) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main |
| P4-T1R8B | Route/store composition cleanup (thin root routes + feature-owned selectors/export surfaces) | Phase 4 | Review | Codex | Mar 18, 2026 | TBD | main |
| P4-T3B | Repository hygiene follow-up for generated upload artifacts (`backend/uploads/**`) | Phase 4 | Review | Codex | Mar 14, 2026 | Mar 14, 2026 | main |
| P4-T4F | CRM + cases reporting expansion (parallel subtask of P4-T4; reporting-only enhancement stream; team-chat delivery unaffected.) | Phase 4 | Review | Codex | Mar 2, 2026 | Mar 2, 2026 | codex/p4-t4f-crm-cases-reporting |
| P4-T4G | Team messenger split + realtime staff dock follow-up (separate staff messenger from case chat/client chat) | Phase 4 | Review | Codex | Mar 15, 2026 | TBD | main |
| P4-T4H | Messaging hardening + composer upgrade across Team Messenger, Case Chat, and Portal Conversations | Phase 4 | Review | Codex | Mar 15, 2026 | Mar 15, 2026 | main |
| P4-T4I | Team chat stability pass (setup-aware auth redirect, duplicate-submit guards, failure feedback) | Phase 4 | Review | Codex | Mar 19, 2026 | TBD | main |
| P4-T6 | Workflow-first UI/UX polish (cases/intake + full portal) | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | codex/p4-t6-workflow-ux |
| P4-T6A | Shared UX primitives + follow-ups QoL | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | codex/p4-t6-workflow-ux |
| P4-T6B | Cases + intake workflow pass | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | codex/p4-t6-workflow-ux |
| P4-T6C | Portal core layout + high-traffic pages pass | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | codex/p4-t6-workflow-ux |
| P4-T6D | Portal secondary pages hardening + verification | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | codex/p4-t6-workflow-ux |
| P4-T7A | Design token + theme system replacement | Phase 4 | Review | Codex | Mar 3, 2026 | Mar 3, 2026 | codex/p4-t7-ui-ux-full-replacement |
| P4-T7B | Global app shell + navigation replacement | Phase 4 | Review | Codex | Mar 8, 2026 | TBD | main |
| P4-T7C-ADMIN-UX | Admin panels UI/UX refresh + portal route split + settings redirect integrity | Phase 4 | Review | Codex | Mar 3, 2026 | TBD | main (scoped route + redirect verification 2026-04-13) |
| P4-T7C-EVTPUB | Website builder public events page + live event-list rendering | Phase 4 | Review | Codex | Mar 3, 2026 | TBD | main (public events + runtime event-list verification 2026-04-13) |
| P4-T7C-PROFILE | Staff profile settings avatar flow hardening (`/settings/user` + `/api/v2/auth/profile`) | Phase 4 | Review | Codex | Mar 11, 2026 | Mar 11, 2026 | main |
| P4-T7C-RPT1 | Reporting module expansion (builder UX + scheduled management + saved-report sharing/public snapshots) | Phase 4 | Review | Codex | Mar 3, 2026 | TBD | main (saved/scheduled/public-report verification 2026-04-13) |
| P4-T7C-WEB2 | Website builder v2 org-scope, public runtime, and nonprofit data integrations | Phase 4 | Review | Codex | Mar 5, 2026 | Mar 5, 2026 | codex/p4-t7i-staff-ux-audit |
| P4-T7C-WEB3 | Website site console + conversion stack (overview/content/forms/integrations/publishing + site-aware builder launch) | Phase 4 | Review | Codex | Mar 6, 2026 | Mar 7, 2026 | codex/p4-t7i-staff-ux-audit (carries `P4-T9H` `lint-implementation-size` unblock for `EditorCanvas.tsx`) |
| P4-T7D | Portal + auth/public pages migration | Phase 4 | Review | Codex | Mar 3, 2026 | TBD | main (portal/auth verification 2026-04-13) |
| P4-T7E-INPUT | Whole-app input draft-preservation audit + hydration guardrails (admin settings + builder modal confirmed-risk surfaces) | Phase 4 | Review | Codex | Mar 11, 2026 | Mar 11, 2026 | main |
| P4-T7E-STAFFQA | Staff behavioral verification + regression hardening | Phase 4 | Review | Codex | Mar 11, 2026 | Mar 11, 2026 | main |
| P4-T7E-VALID | Strict request-validation hardening + fresh-install SMTP defaults (email normalization, boolean/date parsers, admin email guidance) | Phase 4 | Review | Codex | Mar 12, 2026 | Mar 12, 2026 | main |
| P4-T7F | Regression tests + docs update | Phase 4 | Review | Codex | Mar 4, 2026 | Mar 4, 2026 | main (docs + scoped regression verification 2026-04-13) |
| P4-T7G | Appointments/reminders/check-in infrastructure upgrade (admin-first; links: P3-T1, P3-T2C, P3-T2E) | Phase 4 | Review | Codex | Mar 3, 2026 | TBD | main (appointments/reminders/check-in verification 2026-04-13) |
| P4-T7H | Menus + admin settings UX redesign (pinned navigation + admin quick actions + legacy route cleanup) | Phase 4 | Review | Codex | Mar 5, 2026 | Mar 5, 2026 | codex/p4-t7h-menu-admin-redesign |
| P4-T7J | Reporting + navigation modularization (feature-owned report controllers + route-catalog/nav composition split) | Phase 4 | Review | Codex | Mar 15, 2026 | TBD | main |
| P4-T9G | Staff data-load hydration hardening (stale filter sanitization + canonical load errors) | Phase 4 | Review | Codex | Mar 11, 2026 | Mar 11, 2026 | main |
| P4-T12 | CRM + case workflow coverage recovery (outcomes, conversations, appointments, attendance, reminders, reporting) | Phase 4 | Review | Codex | Mar 8, 2026 | TBD | main |
| P4-T13 | Canadianize default examples + defaults (UI, seeds, docs, tests) | Phase 4 | Review | Codex | Mar 10, 2026 | TBD | main |
| P4-T14 | Staff help center manual (HTML quick start + stable workflow guides) | Phase 4 | Review | Codex | Mar 11, 2026 | Mar 11, 2026 | main |
| P4-T15 | README-centric development documentation restructure | Phase 4 | Review | Codex | Mar 11, 2026 | Mar 11, 2026 | main |
| P4-T16 | Dependency maintenance refresh (backend/frontend/e2e/data-intake) | Phase 4 | Review | Codex | Mar 14, 2026 | Mar 14, 2026 | main |
| P4-T16A | Detached package retirement + backend dependency pruning (`data-intake`, `csv-writer`) | Phase 4 | Review | Codex | Mar 15, 2026 | Mar 15, 2026 | main (unused package retirement verified; `otplib` split to P4-T16B) |
| P4-T31 | Dockerfile refactor and build optimization follow-up | Phase 4 | Review | Codex | Apr 11, 2026 | TBD | main |
| P4-T32 | Multi-type / multi-outcome cases refactor | Phase 4 | Review | Codex | Mar 29, 2026 | TBD | main |
| P4-T33 | Website console management cockpit upgrade | Phase 4 | Review | Codex | Mar 29, 2026 | TBD | main (carries `P4-T9H` `lint-implementation-size` unblock for `siteOperationsService.ts` and `websitesCore.ts`) |
| P4-T34 | Repo-local Codex skill suite for contributor workflows | Phase 4 | Review | Codex | Apr 1, 2026 | TBD | main |
| P4-T36 | Newsletter + communications hub UX upgrade | Phase 4 | Review | Codex | Apr 10, 2026 | TBD | main (carries `P4-T9H` `lint-implementation-size` unblock for `EmailMarketingPage.tsx`) |
| P4-T40 | LUKS-aware production deploy wrapper alignment | Phase 4 | Review | Codex | Apr 13, 2026 | TBD | main |
| P4-T41 | Live Docker auth/setup CORS origin alignment | Phase 4 | Review | Codex | Apr 13, 2026 | TBD | main |
| P4-T42 | Repo-local Codex skill suite rebuild | Phase 4 | Review | Codex | Apr 13, 2026 | TBD | main |
| P4-T7 | Full app UI/UX replacement (all themes, all routes) | Phase 4 | Ready | — | — | TBD | — |
| P4-T7C | Core app pages migration (people/engagement/finance/analytics/admin/builder/workflows) | Phase 4 | Ready | — | — | TBD | — |
| P4-T7E | Accessibility + interaction hardening | Phase 4 | Ready | — | — | TBD | — |
| P4-T9 | Setup and launch stabilization + test expansion | Phase 4 | Ready | — | — | TBD | main |
| P4-T10 | PHN collection + encrypted access (contacts, portal profile, vital stats, ingest mapping) | Phase 4 | Ready | — | — | TBD | codex/p4-t10-phn-collection-encryption |
| P4-T16B | MFA/TOTP dependency replacement for auth flows + tests (`@otplib/preset-default` retirement) | Phase 4 | Ready | — | — | TBD | — |
