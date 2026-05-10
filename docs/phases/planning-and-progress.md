# Planning & Progress

**Last Updated:** 2026-05-10

Use this file only for live tracked work. Historical phase closeouts, earlier workboard material, and completed-row proof live in [archive/README.md](archive/README.md), [archive/WORKBOARD_HISTORY_2026.md](archive/WORKBOARD_HISTORY_2026.md), and [../validation/README.md](../validation/README.md).

## At A Glance

| Snapshot | Value |
|---|---:|
| Current phase | Phase 5 - Email, Website, Portal, and Reliability |
| Active rows | 7 |
| In Progress | 0 |
| Review | 6 |
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

- Completed coordinated exception, 2026-05-09: the original 26 Review rows were split across validation-only review lanes and reconciled by the lead. Proof-complete rows were removed from this live board and preserved in [archive/P5_REVIEW_SUBAGENT_WAVE_CLOSEOUT_2026-05-09.md](archive/P5_REVIEW_SUBAGENT_WAVE_CLOSEOUT_2026-05-09.md); current blockers and remaining review rows use [../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) as the current revalidation note. `P5-T93` appeared after the initial wave baseline and remains live but was not part of the 26-row closeout.
- Coordinated exception, 2026-05-10: the remaining blocker wave is split into disjoint subagent lanes for `P5-T90` backend-size cleanup, `P5-T91` queue Knip cleanup, `P5-T92` frontend reject-click proof, `P5-T93` read-only case-form diagnostics review, `P5-T71`/`P5-T78` host E2E fixture recovery, and `P5-T85` Docker evidence reconciliation. The lead lane owns this board, validation notes, and archive/index updates; `P5-T75` remains time-gated and out of scope for this wave.
- Coordinated exception, 2026-05-10: `P5-T95` worker-container parity and hardening is split into deployment-runtime and backend-worker subagent lanes in a clean sibling worktree. The lead lane owns this board, proof note, validation index, and final reconciliation; async report exports remain out of scope.
- Coordinated exception, 2026-05-10: `P5-T96` small-VPS refactor is split into backend/export-worker, frontend initial-load, and deployment-runtime subagent lanes. The lead lane owns this board, proof note, validation index, and final reconciliation.
- Coordinated exception, 2026-05-10: `P5-T97` controller helper modularity is split into reports-controller and saved/scheduled-report controller adoption lanes in the clean sibling worktree `codex/p5-t97-controller-helper-modularity`. The lead lane owns this board, the shared helper API, proof note, validation index, and final reconciliation; route registrars, frontend code, Docker/runtime files, and database migrations remain out of scope.

## Priority Board

| Status | ID | Task | Immediate Next Move | Evidence |
|---|---|---|---|---|
| Review | P5-T95 | Worker container parity and hardening | Review the clean sibling branch `codex/p5-t95-worker-container-parity` and its proof note, then merge after signoff. Async report exports remain out of scope. | [../validation/P5-T95_WORKER_CONTAINER_PARITY_PROOF_2026-05-10.md](../validation/P5-T95_WORKER_CONTAINER_PARITY_PROOF_2026-05-10.md) |
| Review | P5-T93 | Case-form authoring diagnostics | Review the fixed single-checkbox diagnostics false-positive and refreshed focused proof; the documented Vitest command now passes without the serial flag. | [../validation/P5-T93_CASE_FORM_AUTHORING_DIAGNOSTICS_PROOF_2026-05-10.md](../validation/P5-T93_CASE_FORM_AUTHORING_DIAGNOSTICS_PROOF_2026-05-10.md), [../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) |
| Review | P5-T94 | Residual local validation gate cleanup | Review the completed Mailchimp campaign-dialog modularity extraction, scoped semantic cleanup, and passing local gates; `npm run knip`, `make lint`, and `make typecheck` are green in this checkout. | [../validation/P5-T94_MAILCHIMP_MODULARITY_GATE_CLEANUP_PROOF_2026-05-10.md](../validation/P5-T94_MAILCHIMP_MODULARITY_GATE_CLEANUP_PROOF_2026-05-10.md), [../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) |
| Review | P5-T97 | Controller helper modularity | Review the clean sibling branch `codex/p5-t97-controller-helper-modularity` after the shared backend controller auth/org-context helper landed with focused Jest, policy, lint, typecheck, and link proof. | [../validation/P5-T97_CONTROLLER_HELPER_MODULARITY_PROOF_2026-05-10.md](../validation/P5-T97_CONTROLLER_HELPER_MODULARITY_PROOF_2026-05-10.md) |
| Review | P5-T6 | Follow-on backlog: workflow/customization, memberships/appeals, finance/program ops | Keep live as the scope-control gate. May 9 revalidation confirmed the backlog/reference docs still reject unscoped runtime implementation and direct source copying; future typed appeals, restrictions, donation batches, memberships, finance breadth, service-site routing, closure continuity, local communications follow-through, and generic workflow tooling need separately signed-out rows. | [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md), [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md), [../development/reference-patterns/P5-T6-reference-repo-consolidation-2026-05-01.md](../development/reference-patterns/P5-T6-reference-repo-consolidation-2026-05-01.md), [../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) |
| Review | P5-T96 | Small-VPS runtime and export refactor | Review the completed worker-owned queued report export and small-VPS runtime proof, including the passing Docker overlay/build/validation/smoke gates. | [../validation/P5-T96_SMALL_VPS_RUNTIME_EXPORT_PROOF_2026-05-10.md](../validation/P5-T96_SMALL_VPS_RUNTIME_EXPORT_PROOF_2026-05-10.md) |
| Blocked | P5-T75 | Auth alias deprecation gate | Managed time-gated blocker. Review telemetry and exceptions on June 17, 2026; July 1, 2026 is the earliest enforcement date. | [../security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md](../security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md), [../validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md](../validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md), [../validation/P5-T75_AUTH_ALIAS_GATE_HANDOFF_2026-05-05.md](../validation/P5-T75_AUTH_ALIAS_GATE_HANDOFF_2026-05-05.md) |

## Ready Queue

- No ready rows are currently queued; `P5-T94` is in review after the Mailchimp modularity, semantic cleanup, and local-gate proof.

## Current Phase Shape

- The Phase 5 roadmap lives in [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md).
- Completed Phase 5 planning, validation, runtime, cleanup, email, website, portal, review, and Docker rows are archived under [archive/README.md](archive/README.md).
- Durable validation and audit proof is indexed from [../validation/README.md](../validation/README.md).
- `P5-T6` remains the backlog-scope gate. Treat all future product expansion as new signed-out rows unless this board explicitly says otherwise.
- The 2026-05-09 subagent review wave removed proof-complete `P5-T63`, `P5-T64`, `P5-T65`, `P5-T67`, `P5-T70`, `P5-T72`, `P5-T73`, `P5-T74`, `P5-T76`, `P5-T79` through `P5-T84`, and `P5-T86` through `P5-T89`; see [archive/P5_REVIEW_SUBAGENT_WAVE_CLOSEOUT_2026-05-09.md](archive/P5_REVIEW_SUBAGENT_WAVE_CLOSEOUT_2026-05-09.md).
- The 2026-05-10 remaining-blocker wave removed proof-complete `P5-T71`, `P5-T78`, `P5-T85`, `P5-T90`, `P5-T91`, and `P5-T92`; see [archive/P5_REVIEW_SUBAGENT_WAVE_CLOSEOUT_2026-05-09.md](archive/P5_REVIEW_SUBAGENT_WAVE_CLOSEOUT_2026-05-09.md) and [../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md).
- The safe-current dependency refresh proof from the sibling branch is indexed in validation as merged consolidation evidence; final branch validation now owns its remaining gate proof instead of keeping a duplicate live `P5-T93` row.
- The testing-strategy overhaul proof from the sibling branch is indexed in validation as merged consolidation evidence; final branch validation now owns its remaining gate proof instead of keeping a duplicate live `P5-T93` row.
- `P5-T93` is back in review after fixing the valid single-checkbox diagnostics false-positive and refreshing the focused Vitest proof.
- `P5-T94` is in review after Mailchimp campaign-dialog modularization and scoped semantic cleanup; `npm run knip`, `make lint`, and `make typecheck` passed in the active checkout.
- `P5-T95` is in review from the clean sibling branch; it does not move manual report exports out of API request time.
- `P5-T96` host-side and Docker runtime checks passed; row is in review for signoff.
- `P5-T97` is in review from the clean sibling branch after extracting reports-style controller auth/org-context helpers. It deliberately avoids `P5-T96`, `P5-T93`, and `P5-T94`.

## Status Keys

| Status | Meaning |
|---|---|
| `In Progress` | Signed out and being worked. |
| `Blocked` | Waiting on a dependency, date, decision, environment, or external evidence. |
| `Review` | Implementation or proof landed and needs review/signoff. |
| `Ready` | Scoped and ready to pick up. |
