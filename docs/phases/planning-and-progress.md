# Planning & Progress

**Last Updated:** 2026-05-12

Use this file only for live tracked work. Historical phase closeouts, earlier workboard material, and completed-row proof live in [archive/README.md](archive/README.md), [archive/WORKBOARD_HISTORY_2026.md](archive/WORKBOARD_HISTORY_2026.md), and [../validation/README.md](../validation/README.md).

## At A Glance

| Snapshot | Value |
|---|---:|
| Current phase | Phase 5 - Email, Website, Portal, and Reliability |
| Active rows | 14 |
| In Progress | 0 |
| Review | 10 |
| Ready | 3 |
| Blocked | 1 |
| Phase 4 carry-over rows | 0 |
| Recent thread follow-through rows | 0 |

## Start Here

1. Check `Recent Thread Follow-through` first when resuming recent interrupted or disposed work.
2. Update the row before editing tracked work if owner, status, blocker, or next step changed.
3. Keep one canonical row per live task. Do not add summary-only rows.
4. When a row no longer owns a concrete next step, archive its proof and remove it from this live board.

## Recent Thread Follow-through

- No unfinished recent thread follow-through is currently tracked. Reopen this overlay only when a disposed or interrupted thread leaves a concrete next action.

## Coordination

- Completed coordinated exception, 2026-05-09: the original 26 Review rows were split across validation-only review lanes and reconciled by the lead. Proof-complete rows were removed from this live board and preserved in [archive/P5_REVIEW_SUBAGENT_WAVE_CLOSEOUT_2026-05-09.md](archive/P5_REVIEW_SUBAGENT_WAVE_CLOSEOUT_2026-05-09.md); current blockers and remaining review rows use [../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) as the current revalidation note.
- Coordinated exception, 2026-05-10: the remaining blocker wave is split into disjoint subagent lanes for `P5-T90` backend-size cleanup, `P5-T91` queue Knip cleanup, `P5-T92` frontend reject-click proof, `P5-T93` read-only case-form diagnostics review, `P5-T71`/`P5-T78` host E2E fixture recovery, and `P5-T85` Docker evidence reconciliation. The lead lane owns this board, validation notes, and archive/index updates; `P5-T75` remains time-gated and out of scope for this wave.
- Coordinated exception, 2026-05-10: `P5-T95` worker-container parity and hardening was split into deployment-runtime and backend-worker subagent lanes. The lead lane owned this board, proof note, validation index, and final reconciliation; async report exports remained out of scope.
- Coordinated exception, 2026-05-10: `P5-T96` small-VPS refactor is split into backend/export-worker, frontend initial-load, and deployment-runtime subagent lanes. The lead lane owns this board, proof note, validation index, and final reconciliation.
- Coordinated exception, 2026-05-10: `P5-T97` controller helper modularity was split into reports-controller and saved/scheduled-report controller adoption lanes. The lead lane owned this board, the shared helper API, proof note, validation index, and final reconciliation; route registrars, frontend code, Docker/runtime files, and database migrations remained out of scope.
- Main reconciliation, 2026-05-11: yesterday's merges landed `P5-T93`, `P5-T94`, `P5-T95`, `P5-T96`, and `P5-T97` on `main`. Those rows are no longer live review work; their proof remains indexed in [../validation/README.md](../validation/README.md) and summarized in [archive/P5_REVIEW_SUBAGENT_WAVE_CLOSEOUT_2026-05-09.md](archive/P5_REVIEW_SUBAGENT_WAVE_CLOSEOUT_2026-05-09.md).
- Coordinated exception, 2026-05-12: the remediation wave for the May 11 application/workboard review is split into `P5-T98` portal action-clarity follow-through, `P5-T99` site-scoped Mautic runtime wiring, `P5-T100` legacy workbench route disposition/no-op control cleanup, and `P5-T101` validation artifact hygiene. The lead lane owns this board, proof notes, validation index, and final reconciliation; `P5-T6` remains planning-only and `P5-T75` remains time-gated/out of scope.
- Read-only candidate review, 2026-05-12: a codebase/workboard scan added `P5-T102` through `P5-T108` as new signed-out Ready rows. Existing review/blocker rows were preserved; `P5-T6` remains the planning-only scope gate, and the current CI/shared-state follow-up remains owned by `P5-T101`.
- Coordinated exception, 2026-05-12: the workboard implementation batch is split into disjoint subagent lanes for `P5-T102` demo-route environment scoping, `P5-T105` report PDF export de-scoping, and `P5-T108` dashboard customization polish/browser proof. The lead lane owns this board, row-local proof notes, validation index updates, and final reconciliation; existing dirty `P5-T98` through `P5-T101` review work is preserved, `P5-T103` waits for Mautic credential policy after `P5-T99`, `P5-T106` waits until after `P5-T105`, and `P5-T107` remains a separate case-continuity slice.
- Coordinated exception, 2026-05-12: the follow-on implementation batch is split into disjoint subagent lanes for `P5-T103` site-scoped Mautic credential masking and `P5-T106` worker-owned manual report export processing. The lead lane owns this board, row-local proof notes, validation index updates, and final reconciliation; existing dirty `P5-T98` through `P5-T102`, `P5-T105`, and `P5-T108` review work is preserved, while `P5-T104`, `P5-T107`, and encrypted-at-rest Mautic credential migration remain separate Ready rows.
- Branch consolidation, 2026-05-12: the `p5-t99-mixed-modularity` sibling worktree was merged to `main`; its behavior-preserving proof is indexed separately from the live `P5-T99` Mautic runtime row to avoid duplicating a workboard ID.

## Priority Board

| Status | ID | Task | Immediate Next Move | Evidence |
|---|---|---|---|---|
| Review | P5-T98 | Client portal action-clarity audit and enhancement | Review the completed action-only dashboard empty-state fix, action-kind-aware Needs Attention CTA, focused portal tests, backend action proof, and host Playwright link proof. | [../validation/P5-T98_CLIENT_PORTAL_ACTION_CLARITY_AUDIT_2026-05-11.md](../validation/P5-T98_CLIENT_PORTAL_ACTION_CLARITY_AUDIT_2026-05-11.md) |
| Review | P5-T99 | Site-scoped Mautic provider runtime wiring | Review the complete site-scoped Mautic provider runtime wiring, env fallback behavior, fail-closed URL handling, focused backend tests, type-check, lint, and policy proof. | [../validation/P5-T99_SITE_SCOPED_MAUTIC_PROVIDER_PROOF_2026-05-12.md](../validation/P5-T99_SITE_SCOPED_MAUTIC_PROVIDER_PROOF_2026-05-12.md) |
| Review | P5-T100 | Legacy workbench route disposition and no-op control cleanup | Review the retained route disposition docs, `/demo/*` fixture posture, Linking/Outreach search behavior, focused frontend tests, route checks, lint, type-check, and docs proof. | [../validation/P5-T100_LEGACY_WORKBENCH_ROUTE_DISPOSITION_PROOF_2026-05-12.md](../validation/P5-T100_LEGACY_WORKBENCH_ROUTE_DISPOSITION_PROOF_2026-05-12.md) |
| Review | P5-T101 | Validation artifact hygiene and host-gate reconciliation | Review the updated validation-artifact hygiene proof, Docker/runtime policy ownership notes, recovered backend coverage gate, repaired Playwright Firefox/WebKit cache, and cross-browser smoke proof. | [../validation/P5-T101_VALIDATION_ARTIFACT_HYGIENE_PROOF_2026-05-12.md](../validation/P5-T101_VALIDATION_ARTIFACT_HYGIENE_PROOF_2026-05-12.md) |
| Review | P5-T102 | Demo fixture route environment gate | Review the completed explicit `VITE_DEMO_ROUTES_ENABLED` gate for `/demo/*`, preserved test-mode fixture coverage, route-catalog drift proof, and feature-matrix update. | [../validation/P5-T102_DEMO_FIXTURE_ROUTE_GATE_PROOF_2026-05-12.md](../validation/P5-T102_DEMO_FIXTURE_ROUTE_GATE_PROOF_2026-05-12.md) |
| Review | P5-T103 | Site-scoped Mautic credential masking and secret storage policy | Review the completed masked Mautic read responses, unchanged-password preservation, masked-sentinel write protection, nested backup redaction, separate `P5-T109` encrypted-at-rest row, and focused backend proof. | [../validation/P5-T103_MAUTIC_CREDENTIAL_MASKING_PROOF_2026-05-12.md](../validation/P5-T103_MAUTIC_CREDENTIAL_MASKING_PROOF_2026-05-12.md) |
| Ready | P5-T104 | Mautic newsletter content import | Add a provider-scoped import path for Mautic newsletter or campaign content into the existing website/newsletter authoring model while preserving local-email and provider-neutral defaults. | [../validation/P5-T99_SITE_SCOPED_MAUTIC_PROVIDER_PROOF_2026-05-12.md](../validation/P5-T99_SITE_SCOPED_MAUTIC_PROVIDER_PROOF_2026-05-12.md) |
| Review | P5-T105 | Report PDF export and scheduling parity | Review the completed direct browser PDF export de-scope, CSV/XLSX job-backed export preservation, reporting-guide update, and focused report tests/typecheck proof. | [../validation/P5-T105_REPORT_PDF_EXPORT_DISPOSITION_PROOF_2026-05-12.md](../validation/P5-T105_REPORT_PDF_EXPORT_DISPOSITION_PROOF_2026-05-12.md) |
| Review | P5-T106 | Worker-owned manual report export processing | Review the completed removal of the request-time manual export bypass, preserved queued create/poll/download path, route-construction regression, API/reporting docs update, focused tests, type-checks, and policy proof. | [../validation/P5-T106_WORKER_OWNED_MANUAL_REPORT_EXPORT_PROOF_2026-05-12.md](../validation/P5-T106_WORKER_OWNED_MANUAL_REPORT_EXPORT_PROOF_2026-05-12.md) |
| Ready | P5-T107 | Case continuity and handoff workflow slice | Turn the case-manager persona gap into a scoped case-detail flow for reassessment rigor, handoff packets, and closure-continuity cues without hiding runtime work under `P5-T6`. | [../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md](../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md), [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md) |
| Review | P5-T108 | Dashboard customization polish and browser regression coverage | Review the completed dashboard refresh/cache controls, responsive layout regression hooks, focused dashboard tests/typecheck proof, and passing targeted Chromium browser proof. | [../validation/P5-T108_DASHBOARD_CUSTOMIZATION_POLISH_PROOF_2026-05-12.md](../validation/P5-T108_DASHBOARD_CUSTOMIZATION_POLISH_PROOF_2026-05-12.md) |
| Ready | P5-T109 | Encrypted-at-rest site-scoped Mautic credential migration | Add encrypted storage and migration for saved site-scoped Mautic credentials without changing the P5-T103 read-masking/runtime contract. | [../validation/P5-T103_MAUTIC_CREDENTIAL_MASKING_PROOF_2026-05-12.md](../validation/P5-T103_MAUTIC_CREDENTIAL_MASKING_PROOF_2026-05-12.md) |
| Review | P5-T6 | Follow-on backlog: workflow/customization, memberships/appeals, finance/program ops | Keep live as the scope-control gate. May 9 revalidation confirmed the backlog/reference docs still reject unscoped runtime implementation and direct source copying; future typed appeals, restrictions, donation batches, memberships, finance breadth, service-site routing, closure continuity, local communications follow-through, and generic workflow tooling need separately signed-out rows. | [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md), [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md), [../development/reference-patterns/P5-T6-reference-repo-consolidation-2026-05-01.md](../development/reference-patterns/P5-T6-reference-repo-consolidation-2026-05-01.md), [../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) |
| Blocked | P5-T75 | Auth alias deprecation gate | Managed time-gated blocker. Review telemetry and exceptions on June 17, 2026; July 1, 2026 is the earliest enforcement date. | [../security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md](../security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md), [../validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md](../validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md), [../validation/P5-T75_AUTH_ALIAS_GATE_HANDOFF_2026-05-05.md](../validation/P5-T75_AUTH_ALIAS_GATE_HANDOFF_2026-05-05.md) |

## Ready Queue

- `P5-T104` - Mautic newsletter content import.
- `P5-T107` - Case continuity and handoff workflow slice.
- `P5-T109` - Encrypted-at-rest site-scoped Mautic credential migration.

## Current Phase Shape

- The Phase 5 roadmap lives in [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md).
- Completed Phase 5 planning, validation, runtime, cleanup, email, website, portal, review, and Docker rows are archived under [archive/README.md](archive/README.md).
- Durable validation and audit proof is indexed from [../validation/README.md](../validation/README.md).
- `P5-T6` remains the backlog-scope gate. Treat all future product expansion as new signed-out rows unless this board explicitly says otherwise.
- The 2026-05-09 subagent review wave removed proof-complete `P5-T63`, `P5-T64`, `P5-T65`, `P5-T67`, `P5-T70`, `P5-T72`, `P5-T73`, `P5-T74`, `P5-T76`, `P5-T79` through `P5-T84`, and `P5-T86` through `P5-T89`; see [archive/P5_REVIEW_SUBAGENT_WAVE_CLOSEOUT_2026-05-09.md](archive/P5_REVIEW_SUBAGENT_WAVE_CLOSEOUT_2026-05-09.md).
- The 2026-05-10 remaining-blocker wave removed proof-complete `P5-T71`, `P5-T78`, `P5-T85`, `P5-T90`, `P5-T91`, and `P5-T92`; see [archive/P5_REVIEW_SUBAGENT_WAVE_CLOSEOUT_2026-05-09.md](archive/P5_REVIEW_SUBAGENT_WAVE_CLOSEOUT_2026-05-09.md) and [../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md).
- `P5-T93`, `P5-T94`, `P5-T95`, `P5-T96`, and `P5-T97` are merged on `main` and removed from this live board. Their row-local proof remains in [../validation/README.md](../validation/README.md); open any future follow-up as a new signed-out row.

## Status Keys

| Status | Meaning |
|---|---|
| `In Progress` | Signed out and being worked. |
| `Blocked` | Waiting on a dependency, date, decision, environment, or external evidence. |
| `Review` | Implementation or proof landed and needs review/signoff. |
| `Ready` | Scoped and ready to pick up. |
