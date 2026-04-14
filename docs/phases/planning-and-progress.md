# 📊 Nonprofit Manager - Planning & Progress

**Current Phase:** Phase 4 - Modularity Refactor  
**Live Snapshot:** 40 active rows: 1 In Progress, 0 Blocked, 32 Review, 7 Ready.
**History:** Historical roadmap, logs, trackers, and legacy reference sections moved to [archive/WORKBOARD_HISTORY_2026.md](archive/WORKBOARD_HISTORY_2026.md).

## 🤝 Coordination

- Update this file before editing tracked work.
- Keep one active task per agent by default unless a coordinated exception is documented here.
- Coordinated exception, 2026-04-14: the rescue wave is split across parallel frontend, backend/integrations, scripts/skills, and validation tracks; Codex has closed `P4-T37` and `P4-T38` to Review, while `P4-T39A` remains backend-owned by Antigravity.
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
| P4-T45 | Security hardening wave (auth/session invalidation, API-key/webhook controls, CORS fail-closed, public-form intake tightening) | Phase 4 | In Progress | Codex | Apr 14, 2026 | TBD | codex/p4-t45-security-hardening |
| P4-T7E-DARK | Whole-app dark-mode accessibility remediation + route-audit closure | Phase 4 | Review | Codex | Mar 11, 2026 | TBD | main (Docker-backed Chromium dark-mode audit passed on 2026-04-14; no code changes were required once the app stack was available) |
| P4-T30 | Dependency review and multi-package upgrade pass | Phase 4 | Review | Codex | Mar 28, 2026 | TBD | codex/p4-t30-dependency-upgrades (recorded dependency-upgrade commits are already on `main`; the shared frontend validation debt that was holding honest closure now passes in targeted route/messaging/accounts/cases/events/finance slices, so remaining review is task bookkeeping and broader repo gates) |
| P4-T37 | Organizational admin panel refactor + canonical role wiring | Phase 4 | Review | Codex | Apr 10, 2026 | TBD | main (closure note: manifest cleanup plus canonical role normalization are captured in [P4-T37_T38_CLOSEOUT_2026-04-14.md](P4-T37_T38_CLOSEOUT_2026-04-14.md); frontend type-check, the targeted admin/settings Vitest slice (`8` files, `68` tests), and docs link validation passed on 2026-04-14; the repo-wide `make ci-full` rerun is now green on 2026-04-14 after the shared `P4-T9H` dependency-audit follow-up, so there is no standing shared blocker against this row) |
| P4-T38 | Contacts module redesign + legacy alignment | Phase 4 | Review | Codex | Apr 10, 2026 | TBD | main (closure note: contacts ownership cleanup, the feature-owned documents/case-association seam, and the remaining contacts->cases boundary cleanup are captured in [P4-T37_T38_CLOSEOUT_2026-04-14.md](P4-T37_T38_CLOSEOUT_2026-04-14.md); frontend type-check, the targeted contacts Vitest slice (`6` files, `14` tests), backend type-check, and `documents.controller` Jest coverage (`1` suite, `3` tests) passed on 2026-04-14; the repo-wide `make ci-full` rerun is now green on 2026-04-14 after the shared `P4-T9H` dependency-audit follow-up, so there is no standing shared blocker against this row) |
| P4-T44 | Root script wrapper refactor (shared shell helpers, compose/E2E cleanup, dead duplicate removal) | Phase 4 | Review | Codex | Apr 13, 2026 | TBD | main (`scripts/e2e-playwright.sh` now centralizes host/docker Playwright defaults, `e2e/package.json` uses the shared wrapper, `Makefile` reuses a shared E2E npm-run entry, and shell syntax checks are green on 2026-04-14) |
| P4-T5 | Structural refactor wave (validation/auth/envelope/frontend/docs guardrails) | Phase 4 | Review | Codex | Mar 2, 2026 | Mar 2, 2026 | main (former implementation-size blocker cleared on 2026-04-13: `UserSettingsPage.tsx` is `930` lines against baseline `931`, and `PortalSection.tsx` is `165` lines) |
| P4-T9H | Staff backend efficiency wave (stable contracts, query-path + search/index refactor) | Phase 4 | Review | Codex | Mar 15, 2026 | TBD | main (strict closure rerun passed on 2026-04-14: the UI-audit mismatch was stale in the current tree, backend/runtime dependency advisories were cleared via `nodemailer` `^8.0.5`, `axios` `^1.15.0`, and `follow-redirects` `1.16.0`, and `make ci-full` is now green with the existing perf artifacts still authoritative for this row) |
| P4-T35 | Compact workspace shell navigation and responsive overflow | Phase 4 | Review | Codex | Apr 7, 2026 | TBD | main (shell-specific verification passed on 2026-04-13: desktop compact-nav Chromium slice green, `npm run test:docker:ci:mobile` green; broader alerts/contacts/grants Chromium failures rerouted to `P4-T1R4W3A` / `P4-T38` / `P4-T29`) |
| P4-T1R4 | Wave 2+ rollout prep (reports/analytics/dashboard then ops/comms surfaces) | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | codex/p4-t1r4-wave2-modularization |
| P4-T1R4W3B | Wave 3 prep: activities modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main |
| P4-T1R4W3C | Wave 3 prep: webhooks modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main |
| P4-T1R4W3D | Wave 3 prep: mailchimp modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main |
| P4-T1R4W3E | Wave 3 prep: invitations modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main |
| P4-T1R4W3F | Wave 3 prep: meetings modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main |
| P4-T3B | Repository hygiene follow-up for generated upload artifacts (`backend/uploads/**`) | Phase 4 | Review | Codex | Mar 14, 2026 | Mar 14, 2026 | main |
| P4-T4H | Messaging hardening + composer upgrade across Team Messenger, Case Chat, and Portal Conversations | Phase 4 | Review | Codex | Mar 15, 2026 | Mar 15, 2026 | main |
| P4-T4I | Team chat stability pass (setup-aware auth redirect, duplicate-submit guards, failure feedback) | Phase 4 | Review | Codex | Mar 19, 2026 | TBD | main |
| P4-T6 | Workflow-first UI/UX polish (cases/intake + full portal) | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | codex/p4-t6-workflow-ux |
| P4-T6A | Shared UX primitives + follow-ups QoL | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | codex/p4-t6-workflow-ux |
| P4-T6B | Cases + intake workflow pass | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | codex/p4-t6-workflow-ux |
| P4-T6D | Portal secondary pages hardening + verification | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | codex/p4-t6-workflow-ux |
| P4-T7C-RPT1 | Reporting module expansion (builder UX + scheduled management + saved-report sharing/public snapshots) | Phase 4 | Review | Codex | Mar 3, 2026 | TBD | main (saved/scheduled/public-report verification 2026-04-13) |
| P4-T7F | Regression tests + docs update | Phase 4 | Review | Codex | Mar 4, 2026 | Mar 4, 2026 | main (docs + scoped regression verification 2026-04-13) |
| P4-T7G | Appointments/reminders/check-in infrastructure upgrade (admin-first; links: P3-T1, P3-T2C, P3-T2E) | Phase 4 | Review | Codex | Mar 3, 2026 | TBD | main (appointments/reminders/check-in verification 2026-04-13) |
| P4-T7J | Reporting + navigation modularization (feature-owned report controllers + route-catalog/nav composition split) | Phase 4 | Review | Codex | Mar 15, 2026 | TBD | main |
| P4-T12 | CRM + case workflow coverage recovery (outcomes, conversations, appointments, attendance, reminders, reporting) | Phase 4 | Review | Codex | Mar 8, 2026 | TBD | main |
| P4-T13 | Canadianize default examples + defaults (UI, seeds, docs, tests) | Phase 4 | Review | Codex | Mar 10, 2026 | TBD | main |
| P4-T14 | Staff help center manual (HTML quick start + stable workflow guides) | Phase 4 | Review | Codex | Mar 11, 2026 | Mar 11, 2026 | main |
| P4-T15 | README-centric development documentation restructure | Phase 4 | Review | Codex | Mar 11, 2026 | Mar 11, 2026 | main |
| P4-T16 | Dependency maintenance refresh (backend/frontend/e2e/data-intake) | Phase 4 | Review | Codex | Mar 14, 2026 | Mar 14, 2026 | main |
| P4-T31 | Dockerfile refactor and build optimization follow-up | Phase 4 | Review | Codex | Apr 11, 2026 | TBD | main |
| P4-T32 | Multi-type / multi-outcome cases refactor | Phase 4 | Review | Codex | Mar 29, 2026 | TBD | main |
| P4-T7 | Full app UI/UX replacement (all themes, all routes) | Phase 4 | Ready | — | — | TBD | — |
| P4-T7C | Core app pages migration (people/engagement/finance/analytics/admin/builder/workflows) | Phase 4 | Ready | — | — | TBD | — |
| P4-T7E | Accessibility + interaction hardening | Phase 4 | Ready | — | — | TBD | — |
| P4-T9 | Setup and launch stabilization + test expansion | Phase 4 | Ready | — | — | TBD | main |
| P4-T9I | Auth alias telemetry dashboard/query follow-up | Phase 4 | Ready | — | — | TBD | main ([auth-alias report](AUTH_ALIAS_USAGE_REPORT_2026-04-14.md)) |
| P4-T10 | PHN collection + encrypted access (contacts, portal profile, vital stats, ingest mapping) | Phase 4 | Ready | — | — | TBD | codex/p4-t10-phn-collection-encryption |
| P4-T16B | MFA/TOTP dependency replacement for auth flows + tests (`@otplib/preset-default` retirement) | Phase 4 | Ready | — | — | TBD | — |
