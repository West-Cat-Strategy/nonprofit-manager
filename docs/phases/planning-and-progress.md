# Planning & Progress

**Last Updated:** 2026-05-16

Use this file only for live tracked work. Historical phase closeouts, earlier workboard material, and completed-row proof live in [archive/README.md](archive/README.md), [archive/WORKBOARD_HISTORY_2026.md](archive/WORKBOARD_HISTORY_2026.md), and [../validation/README.md](../validation/README.md).

## At A Glance

| Snapshot | Value |
|---|---:|
| Current phase | Phase 5 - Email, Website, Portal, and Reliability |
| Active rows | 4 |
| In Progress | 0 |
| Review | 3 |
| Ready | 0 |
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
- Read-only reference-repo improvement synthesis, 2026-05-12: central reference profiles, `reference-repos/manifest.lock.json`, and the live repo were compared without rehydrating clone caches or copying source. `P5-T111` through `P5-T119` are signed-out Ready rows for the next improvement wave; `P5-T6` remains the scope-control gate, and runtime implementation still requires picking one row at a time.
- Metadata-first reference-corpus expansion, 2026-05-12: central profiles and nonprofit manifest entries were added for Houdini, OpenBoxes, KoboToolbox KPI, DHIS2 Core, OpenMRS Core, openIMIS Backend, and openIMIS Docker Distribution. These additions sharpen `P5-T112` through `P5-T119` plus future program-operations rows without cloning source, creating compatibility aliases, or authorizing runtime implementation.
- Coordinated exception, 2026-05-12: `P5-T120` CBIS import/dedupe and app-wiring follow-through is split into app importer integration, CBIS data-prep cleanup, contact notes/search UX, and validation/ops proof lanes. The lead lane owns this board, validation note, final reconciliation, and the production boundary; production remains out of scope until separately approved.
- Production follow-up, 2026-05-12: after the approved P5-T120 code deploy, Dora Ogden's imported contact Notes rendered, but the linked imported case `49f7f188-be03-4cd7-b4ce-be48aea9703c` / `CBIS-TICIPANT2709` returned "Case not found." Continue under `P5-T120` by fixing imported null-account case visibility without production import, production dry-run, support SQL, or a new tracked row.
- Completed coordinated exception, 2026-05-12: `P5-T121` CBIS duplicate-contact decision overlay was split into read-only duplicate-name classification subagent lanes plus a lead-owned implementation lane. The lead owned this board, the decision CSV, bundle-builder changes, generated proof, validation note, and closeout; subagents inspected only assigned single-anchor duplicate-name groups and did not edit files. Production import, production dry-run, production read, support SQL, schema migration, app merge action, and deployment remained out of scope.
- Completed production data application, 2026-05-12: `P5-T122` applied the completed `P5-T121` decision overlay to `cbis.westcat.ca` with explicit backups, exact bundle fingerprint/schema proof, required production dry-runs before apply, the 194 accepted held-contact merges, and a follow-up same-name legacy production merge for 212 pre-provenance active duplicates such as Cherie Knight. Public endpoints, migrations, and support-data edits remained out of scope.
- Completed coordinated exception, 2026-05-12: `P5-T123` CBIS empty-contact direct merge pass was split into backend operator-merge implementation, redacted candidate audit/proof, and WCS production ops lanes. The lead lane owned this board, hard-delete safety policy, production dry-run/apply decision, validation note, and final reconciliation; public API/frontend merge features, broad MPI/full dedupe, schema changes, and support SQL remained out of scope.
- Review queue reconciliation, 2026-05-15: `P5-T124` archived proof-complete Review rows `P5-T98` through `P5-T110`, `P5-T112`, `P5-T113`, `P5-T116` through `P5-T118`, and `P5-T120` through `P5-T123` in [archive/P5_REVIEW_QUEUE_RECONCILIATION_CLOSEOUT_2026-05-15.md](archive/P5_REVIEW_QUEUE_RECONCILIATION_CLOSEOUT_2026-05-15.md). `P5-T114`, `P5-T115`, and `P5-T119` remained Review after that cleanup because their proof notes still recorded unresolved environment or inherited type-check caveats; `P5-T75` remains time-gated, `P5-T111` remains Ready, and `P5-T125` through `P5-T129` capture the scoped subagent review follow-ups without runtime implementation in this docs-only cleanup. The later comprehensive-strengthening pass cleared the inherited `P5-T119` type-check caveat while leaving it in Review for signoff.
- Coordinated exception, 2026-05-15: the comprehensive strengthening implementation batch is split into `P5-T111` reference-corpus posture, `P5-T125` publishing admin cache guard alignment, `P5-T126` `/api/v2` auth posture policy, `P5-T127` board-packet route catalog coverage, `P5-T128` case-form builder label association hardening, and `P5-T129` selector/docs tooling hygiene. The lead lane owns this board, validation notes, reference synthesis, archive/index updates, and final reconciliation. Newly discovered but not yet implemented follow-ups are tracked separately as `P5-T130` through `P5-T134`.
- Coordinated exception, 2026-05-15: the Phase 5 strengthening continuation is split into disjoint implementation lanes for `P5-T130` WCS deploy contract tracking, `P5-T131` webhook organization scoping, `P5-T132` DB audit request-context propagation, `P5-T133` dense-control/report-builder accessibility hardening, and `P5-T134` volunteer/event-operations persona discovery. The lead lane owns this board, row-local proof notes, validation index updates, and final reconciliation; existing dirty proof/work from `P5-T124`, `P5-T111`, and `P5-T125` through `P5-T129` must be preserved.
- Cleanup audit pickup, 2026-05-16: `P5-T135` owns the conservative repo-health audit, ignored local runtime clutter cleanup, Review-row reconciliation, validation artifact, and final proof. No runtime feature work, migrations, production reads/writes, deploy action, or broad legacy-retirement refactor is authorized by this row.
- Codebase cleanup reconciliation, 2026-05-16: `P5-T135` removed proof-complete Review rows `P5-T111`, `P5-T114`, `P5-T115`, `P5-T119`, and `P5-T124` through `P5-T134` from this live board after current Docker/test-DB proof cleared the prior caveats; see [archive/P5_CODEBASE_REVIEW_CLEANUP_CLOSEOUT_2026-05-16.md](archive/P5_CODEBASE_REVIEW_CLEANUP_CLOSEOUT_2026-05-16.md) and [../validation/CODEBASE_REVIEW_CLEANUP_AUDIT_2026-05-16.md](../validation/CODEBASE_REVIEW_CLEANUP_AUDIT_2026-05-16.md). `P5-T6` remains the scope-control gate, `P5-T75` remains time-gated, and `P5-T135` remains Review for final signoff.
- Security-focused improvement batch, 2026-05-16: `P5-T136` extends the read-only codebase improvement review into authorized runtime work while preserving the existing dirty `P5-T135` cleanup/audit checkout. The active batch is limited to security and reliability hardening for tenant boundaries, provider/webhook contracts, public-token abuse controls, and supporting DB/tooling safety proof. Lower-risk frontend accessibility polish and broad product expansion remain deferred candidate backlog items in the validation note.

## Priority Board

| Status | ID | Task | Immediate Next Move | Evidence |
|---|---|---|---|---|
| Review | P5-T6 | Follow-on backlog: workflow/customization, memberships/appeals, finance/program ops | Keep live as the scope-control gate. May 9 revalidation confirmed the backlog/reference docs still reject unscoped runtime implementation and direct source copying; future typed appeals, restrictions, donation batches, memberships, finance breadth, service-site routing, closure continuity, local communications follow-through, and generic workflow tooling need separately signed-out rows. | [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md), [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md), [../development/reference-patterns/P5-T6-reference-repo-consolidation-2026-05-01.md](../development/reference-patterns/P5-T6-reference-repo-consolidation-2026-05-01.md), [../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) |
| Review | P5-T136 | Security-focused codebase improvement batch | Review the completed focused security/tooling batch: webhook event validation and API-key org guard parity, public report token rate limiting, payment/customer permission and tenant checks, communications provider contact-scope enforcement, exact migration-readiness checks, verifier target-safety tightening, Docker selector policy routing, and `.mjs` Knip visibility are implemented with focused proof. Meeting tenant-boundary schema work, Mautic DNS pinning, side-effect-free tooling fixtures, and frontend accessibility polish remain deferred candidate follow-ups in the validation note. | [../validation/P5-T136_SECURITY_FOCUSED_CODEBASE_IMPROVEMENT_PROOF_2026-05-16.md](../validation/P5-T136_SECURITY_FOCUSED_CODEBASE_IMPROVEMENT_PROOF_2026-05-16.md) |
| Review | P5-T135 | Full codebase audit and conservative cleanup | Review the conservative cleanup audit: proof-complete Review rows were archived out of the live board, ignored local runtime clutter was removed, the stale publishing integration expectation was corrected, and current DB/Docker/static proof is recorded without runtime feature work. | [../validation/CODEBASE_REVIEW_CLEANUP_AUDIT_2026-05-16.md](../validation/CODEBASE_REVIEW_CLEANUP_AUDIT_2026-05-16.md), [archive/P5_CODEBASE_REVIEW_CLEANUP_CLOSEOUT_2026-05-16.md](archive/P5_CODEBASE_REVIEW_CLEANUP_CLOSEOUT_2026-05-16.md) |
| Blocked | P5-T75 | Auth alias deprecation gate | Managed time-gated blocker. Review telemetry and exceptions on June 17, 2026; July 1, 2026 is the earliest enforcement date. | [../security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md](../security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md), [../validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md](../validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md), [../validation/P5-T75_AUTH_ALIAS_GATE_HANDOFF_2026-05-05.md](../validation/P5-T75_AUTH_ALIAS_GATE_HANDOFF_2026-05-05.md) |

## Ready Queue

- No Ready rows are currently queued.

## Current Phase Shape

- The Phase 5 roadmap lives in [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md).
- Completed Phase 5 planning, validation, runtime, cleanup, email, website, portal, review, and Docker rows are archived under [archive/README.md](archive/README.md).
- Durable validation and audit proof is indexed from [../validation/README.md](../validation/README.md).
- `P5-T6` remains the backlog-scope gate. Treat all future product expansion as new signed-out rows unless this board explicitly says otherwise.
- The 2026-05-09 subagent review wave removed proof-complete `P5-T63`, `P5-T64`, `P5-T65`, `P5-T67`, `P5-T70`, `P5-T72`, `P5-T73`, `P5-T74`, `P5-T76`, `P5-T79` through `P5-T84`, and `P5-T86` through `P5-T89`; see [archive/P5_REVIEW_SUBAGENT_WAVE_CLOSEOUT_2026-05-09.md](archive/P5_REVIEW_SUBAGENT_WAVE_CLOSEOUT_2026-05-09.md).
- The 2026-05-10 remaining-blocker wave removed proof-complete `P5-T71`, `P5-T78`, `P5-T85`, `P5-T90`, `P5-T91`, and `P5-T92`; see [archive/P5_REVIEW_SUBAGENT_WAVE_CLOSEOUT_2026-05-09.md](archive/P5_REVIEW_SUBAGENT_WAVE_CLOSEOUT_2026-05-09.md) and [../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md).
- `P5-T93`, `P5-T94`, `P5-T95`, `P5-T96`, and `P5-T97` are merged on `main` and removed from this live board. Their row-local proof remains in [../validation/README.md](../validation/README.md); open any future follow-up as a new signed-out row.
- `P5-T98` through `P5-T110`, `P5-T112`, `P5-T113`, `P5-T116` through `P5-T118`, and `P5-T120` through `P5-T123` were removed from this live board by `P5-T124`; see [archive/P5_REVIEW_QUEUE_RECONCILIATION_CLOSEOUT_2026-05-15.md](archive/P5_REVIEW_QUEUE_RECONCILIATION_CLOSEOUT_2026-05-15.md).
- `P5-T111`, `P5-T114`, `P5-T115`, `P5-T119`, and `P5-T124` through `P5-T134` were removed from this live board by `P5-T135`; see [archive/P5_CODEBASE_REVIEW_CLEANUP_CLOSEOUT_2026-05-16.md](archive/P5_CODEBASE_REVIEW_CLEANUP_CLOSEOUT_2026-05-16.md).

## Status Keys

| Status | Meaning |
|---|---|
| `In Progress` | Signed out and being worked. |
| `Blocked` | Waiting on a dependency, date, decision, environment, or external evidence. |
| `Review` | Implementation or proof landed and needs review/signoff. |
| `Ready` | Scoped and ready to pick up. |
