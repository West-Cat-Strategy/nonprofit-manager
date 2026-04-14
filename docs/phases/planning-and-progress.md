# 📊 Nonprofit Manager - Planning & Progress

**Current Phase:** Phase 4 - Modularity Refactor  
**Live Snapshot:** 21 active rows: 2 In Progress, 0 Blocked, 13 Review, 6 Ready.
**History:** Historical roadmap, logs, trackers, and legacy reference sections moved to [archive/WORKBOARD_HISTORY_2026.md](archive/WORKBOARD_HISTORY_2026.md).

## 🤝 Coordination

- Update this file before editing tracked work.
- Keep one active task per agent by default unless a coordinated exception is documented here.
- Coordinated exception, 2026-04-14: the rescue wave is split across parallel frontend, backend/integrations, scripts/skills, and validation tracks; Codex has closed `P4-T37` and `P4-T38` to Review, while `P4-T39A` remains backend-owned by Antigravity.
- Coordinated exception, 2026-04-14: Codex is handling a narrow user-requested contacts UX follow-up under `P4-T7C` while the existing `P4-T9I` docs/telemetry work remains in progress in the current tree.
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
| P4-T45 | Security hardening wave (auth/session invalidation, API-key/webhook controls, CORS fail-closed, public-form intake tightening) | Phase 4 | Ready | — | — | TBD | — |
| P4-T7E-DARK | Whole-app dark-mode accessibility remediation + route-audit closure | Phase 4 | Review | Codex | Mar 11, 2026 | TBD | main (2026-04-14 rerun of `npm run test:docker:audit` failed before the audit assertions because the Docker-backed admin bootstrap returned invalid credentials; keep this row in Review until the E2E auth fixture is stable again) |
| P4-T35 | Compact workspace shell navigation and responsive overflow | Phase 4 | Review | Codex | Apr 7, 2026 | TBD | main (2026-04-14 rerun of `npm run test:docker:ci:mobile` failed in the compact-nav and staff-overflow checks before the UI assertions because the shared admin bootstrap returned invalid credentials; keep this row in Review until the E2E auth fixture is stable again) |
| P4-T1R4 | Wave 2+ rollout prep (reports/analytics/dashboard then ops/comms surfaces) | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | main (triage note: [P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md) confirms the wave-2 analytics/dashboard/report surfaces on `main`, but the parent row still spans later ops/comms work, so it stays in Review) |
| P4-T1R4W3B | Wave 3 prep: activities modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main (triage note: [P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md) confirms the backend activities module on `main`, but the dedicated wrapper/frontend-feature proof is still missing, so it stays in Review) |
| P4-T1R4W3C | Wave 3 prep: webhooks modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main (triage note: [P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md) confirms the backend module and wrapper, but the frontend surface still reads as feature-state plus admin consumer wiring, so it stays in Review) |
| P4-T1R4W3D | Wave 3 prep: mailchimp modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main (triage note: [P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md) confirms the backend module and wrapper, but the visible frontend UI still lives under admin ops rather than a dedicated Mailchimp feature, so it stays in Review) |
| P4-T1R4W3E | Wave 3 prep: invitations modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main (triage note: [P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md) confirms the backend module and wrapper, but the frontend invitation flows are still split across auth/admin surfaces rather than a dedicated feature package, so it stays in Review) |
| P4-T1R4W3F | Wave 3 prep: meetings modularization package (backend module + wrapper + frontend feature + tests/policies) | Phase 4 | Review | Codex | Mar 17, 2026 | TBD | main (triage note: [P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md) confirms the backend meetings module, but the wrapper/frontend-feature/test package promised by the row is still missing, so it stays in Review) |
| P4-T6 | Workflow-first UI/UX polish (cases/intake + full portal) | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | main (triage note: [P4-T6_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T6_CLUSTER_CLOSEOUT_2026-04-14.md) confirms the current cases/intake and portal surfaces, but the parent row remains broader than the row-local proof, so it stays in Review) |
| P4-T6A | Shared UX primitives + follow-ups QoL | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | main (triage note: [P4-T6_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T6_CLUSTER_CLOSEOUT_2026-04-14.md) shows the shared UX primitives on `main`, but the row remains underspecified around its follow-up scope, so it stays in Review) |
| P4-T6D | Portal secondary pages hardening + verification | Phase 4 | Review | Codex | Mar 2, 2026 | TBD | main (triage note: [P4-T6_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T6_CLUSTER_CLOSEOUT_2026-04-14.md) confirms several portal secondary-page tests, but the notes/forms/reminders proof is still incomplete, so it stays in Review) |
| P4-T7J | Reporting + navigation modularization (feature-owned report controllers + route-catalog/nav composition split) | Phase 4 | Review | Codex | Mar 15, 2026 | TBD | main (2026-04-14 review pass confirmed feature-owned report routes and route-catalog composition in the current tree, but this row still lacks a dedicated closeout artifact, so it stays in Review) |
| P4-T12 | CRM + case workflow coverage recovery (outcomes, conversations, appointments, attendance, reminders, reporting) | Phase 4 | Review | Codex | Mar 8, 2026 | TBD | main (2026-04-14 review pass confirmed the current workflow/report/team-chat coverage surfaces, but this umbrella row still lacks a row-local closeout artifact, so it stays in Review) |
| P4-T7 | Full app UI/UX replacement (all themes, all routes) | Phase 4 | Ready | — | — | TBD | — |
| P4-T7C | Core app pages migration (people/engagement/finance/analytics/admin/builder/workflows) | Phase 4 | In Progress | Codex | Apr 14, 2026 | TBD | main (user-requested contacts detail sticky-header follow-up) |
| P4-T7E | Accessibility + interaction hardening | Phase 4 | Ready | — | — | TBD | — |
| P4-T9 | Setup and launch stabilization + test expansion | Phase 4 | Ready | — | — | TBD | main |
| P4-T9I | Auth alias telemetry dashboard/query follow-up | Phase 4 | In Progress | Codex | Apr 14, 2026 | TBD | main ([auth-alias report](AUTH_ALIAS_USAGE_REPORT_2026-04-14.md); dashboard/query guide in [AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md](AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md)) |
| P4-T10 | PHN collection + encrypted access (contacts, portal profile, vital stats, ingest mapping) | Phase 4 | Ready | — | — | TBD | codex/p4-t10-phn-collection-encryption |
| P4-T16B | MFA/TOTP dependency replacement for auth flows + tests (`@otplib/preset-default` retirement) | Phase 4 | Ready | — | — | TBD | — |
