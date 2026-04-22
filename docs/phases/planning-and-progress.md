# Planning & Progress

**Last Updated:** 2026-04-21

## At a Glance

- **Current Phase:** Phase 5 - Email, Website, Portal, and Reliability
- **Phase 5 Plan:** [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md)
- **History:** Historical phase closeouts, transition notes, and earlier workboard material live under [archive/README.md](archive/README.md) and [archive/WORKBOARD_HISTORY_2026.md](archive/WORKBOARD_HISTORY_2026.md).

| Snapshot | Value |
|---|---|
| Active rows | 6 |
| In Progress | 1 |
| Blocked | 0 |
| Review | 2 |
| Ready | 3 |
| Phase 4 carry-over rows | 0 |
| Recent thread follow-through rows | 0 |

## Start Here

1. Use this file only for tracked work.
2. Check `Recent Thread Follow-through` first when resuming recent interrupted or disposed work.
3. Update the canonical ledger row before editing tracked work if the owner, status, blocker, or next step changed.

## Recent Thread Follow-through

- No unfinished recent thread follow-through is currently tracked. Reopen this overlay only when a disposed or interrupted thread leaves a concrete next action.

## Priority Board

Maintenance rules:

- The canonical ledger sections below are the source of truth.
- Update the snapshot counts and `Ready Next` in the same edit as any row change.
- Do not create summary-only tasks.
- If a task no longer owns a concrete next step, archive its proof and remove it from the live ledger.

### Needs Attention Now

| Status | ID | Task | Immediate Next Move |
|---|---|---|---|
| In Progress | P5-T2B | Shared validation lane stabilization | The repo-local lane contract, stale host expectations, and the avatar / contacts / donations / events regressions are now fixed in the current tree. Next finish the full host rerun, validate `fresh-workspace-multi-user` on a truly fresh Docker starter stack, then run `cd e2e && npm run test:docker:ci`, `cd e2e && npm run test:docker:audit`, and refresh the Phase 5 validation artifact. |

### Review Queue

| Status | ID | Task | Immediate Next Move |
|---|---|---|---|
| Review | P5-T2A | Testing-strategy review artifact and findings | Keep [../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md](../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md) as the canonical artifact while `P5-T2B` finishes the final host rerun, the fresh-volume Docker MFA proof, and the Docker cross-browser/audit follow-through. |
| Review | P5-T4 | Website surfaces wave: website builder plus public website | Use [../validation/P5-T4_MANAGED_FORM_PUBLISH_LOOP_REVIEW_2026-04-20.md](../validation/P5-T4_MANAGED_FORM_PUBLISH_LOOP_REVIEW_2026-04-20.md) as the row-local proof note for the one-form managed publish loop. Final broad signoff still depends on `P5-T2B`. |

### Ready Next

| Status | ID | Task | Immediate Next Move |
|---|---|---|---|
| Ready | P5-T3 | Email platform wave: blast email plus email builder/formatter | Scope outbound campaign flow, email authoring/formatting needs, delivery reliability, preview/testing, and reuse of existing template/mailchimp surfaces. |
| Ready | P5-T5 | Client portal wave | Plan and execute portal UX, messaging/documents/forms/appointments follow-through, with persona and workflow audit support. |
| Ready | P5-T6 | Follow-on backlog: workflow/customization, memberships/appeals, finance/program ops | Use the benchmark and repo audit to shape the later-wave backlog for metadata-driven workflows, fundraising depth, and nonprofit-specific program/finance ops. |

## Current Phase Shape

- The Phase 5 docs, archive, benchmark, and persona-skill refresh is complete and archived in [archive/P5-T1_CLOSEOUT_2026-04-20.md](archive/P5-T1_CLOSEOUT_2026-04-20.md).
- Phase 5 is still inside the shared Playwright/E2E and testing-strategy review lane, but the remaining work is now concentrated in final reruns and Docker proof follow-through rather than core lint/typecheck/coverage breakage.
- Product execution then centers on blast email plus the email builder/formatter, website builder plus public website, and the client portal.
- Follow-on backlog from repo review and external benchmarking stays visible as later Phase 5 work rather than hidden in archive notes.

## Coordination

- Update this file before editing tracked work.
- Keep one active task per agent by default unless a coordinated exception is documented here.
- Coordinated exception, 2026-04-20: `P5-T4` is split across parallel lanes.
  Lead: Codex
  Backend lanes: `backend-publishing-runtime`
  Frontend lanes: `frontend-websites-console`, `frontend-builder`
  Other lanes: `docs-e2e`
  Integration owner: Codex
- Lane: `backend-publishing-runtime`
  Goal: make one managed public form consistent across publishing metadata, public runtime verification, and staff-facing form details without changing route shapes
  Owned paths: `backend/src/modules/publishing/**`, `backend/src/services/publishing/**`, `backend/src/public-site.ts`, `backend/src/types/publishing.ts`
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, `docs/phases/planning-and-progress.md`, `frontend/src/routes/**`
  Expected tests: targeted publishing service and integration coverage for form metadata and public submission/runtime
  Handoff notes: summarize contract additions, cache/runtime assumptions, and any follow-up needed in frontend or docs
  Docs ownership: lead
  Disposition: `Review`
- Lane: `frontend-websites-console`
  Goal: expose one-form verification, publish-state, and public-surface actions in the website console
  Owned paths: `frontend/src/features/websites/**`, `frontend/src/types/websiteBuilder.ts`
  Forbidden shared paths: `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`
  Expected tests: targeted website overview/forms/publishing page coverage
  Handoff notes: summarize UI contract changes and any builder/doc dependencies
  Docs ownership: lead
  Disposition: `Review`
- Lane: `frontend-builder`
  Goal: keep the site-aware builder aware of managed-form publish state and point editors back to the console follow-through
  Owned paths: `frontend/src/features/builder/**`, `frontend/src/components/editor/**`
  Forbidden shared paths: `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`
  Expected tests: targeted page-editor controller coverage
  Handoff notes: summarize site-context changes and any overlap requiring lead integration
  Docs ownership: lead
  Disposition: `Review`
- Lane: `docs-e2e`
  Goal: align the website/public-runtime docs and targeted browser proof with the one-form managed publish loop
  Owned paths: `docs/features/TEMPLATE_SYSTEM.md`, `docs/features/FEATURE_MATRIX.md`, `docs/deployment/publishing-deployment.md`, `docs/testing/TESTING.md`, `e2e/tests/public-website.spec.ts`, `e2e/tests/publishing.spec.ts`
  Forbidden shared paths: `docs/phases/planning-and-progress.md`, `frontend/src/routes/**`, `backend/src/routes/v2/index.ts`
  Expected tests: targeted Playwright publishing/public-site coverage plus `make check-links` when docs change
  Handoff notes: summarize doc/runtime wording changes and exact browser proof added
  Docs ownership: lane
  Disposition: `Review`
- For future modularization exceptions, use the lane contract and workboard format in [../development/SUBAGENT_MODULARIZATION_GUIDE.md](../development/SUBAGENT_MODULARIZATION_GUIDE.md).
- Move blocked work to `Blocked` with a reason and next step.
- Use task IDs in commits and pull request titles.

## Status Keys

| Status | Meaning |
|---|---|
| `In Progress` | Signed out and being worked. |
| `Blocked` | Waiting on a dependency or decision. |
| `Review` | Implementation landed and needs review or validation signoff. |
| `Ready` | Scoped and ready to pick up. |

## Phase 4 Carry-over

No live Phase 4 carry-over rows remain. Proof for the retired rows now lives in [archive/P4_FINAL_CLOSEOUT_2026-04-20.md](archive/P4_FINAL_CLOSEOUT_2026-04-20.md), [archive/P4_CLOSEOUT_BATCH_2026-04-20.md](archive/P4_CLOSEOUT_BATCH_2026-04-20.md), and [../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md](../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md).

## Phase 5 Canonical Workboard

| ID | Task | Status | Owner | Next Step / Blocker | Evidence |
|---|---|---|---|---|---|
| P5-T2A | Testing-strategy review artifact and findings | Review | Codex | The Phase 5 testing-strategy review artifact is published. Keep the validation note current as reruns land, but leave the remaining runtime stabilization and failure triage to `P5-T2B`. | [../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md](../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md) |
| P5-T2B | Shared validation lane stabilization | In Progress | Codex | The repo-local lane contract is now baked in, smoke cleanup is hardened, UI audit drift is refreshed, stale host expectations are aligned, and the avatar / contacts / donations / events regressions are fixed. Remaining work: rerun the full host matrix, validate the fresh-workspace MFA proof on a fresh Docker starter stack, then finish `npm run test:docker:ci`, `npm run test:docker:audit`, and the final validation closeout. | [../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md](../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md) |
| P5-T4 | Website surfaces wave: website builder plus public website | Review | Codex | The one-form managed public publish-loop proof is now green across the website console, builder, publish flow, and public runtime. Keep the row in `Review` while `P5-T2B` finishes the broader host-plus-Docker validation lane. | [../validation/P5-T4_MANAGED_FORM_PUBLISH_LOOP_REVIEW_2026-04-20.md](../validation/P5-T4_MANAGED_FORM_PUBLISH_LOOP_REVIEW_2026-04-20.md) |
| P5-T3 | Email platform wave: blast email plus email builder/formatter | Ready | Codex | Scope outbound campaign flow, email authoring/formatting needs, delivery reliability, preview/testing, and reuse of existing template/mailchimp surfaces. | [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md) |
| P5-T5 | Client portal wave | Ready | Codex | Plan and execute portal UX, messaging/documents/forms/appointments follow-through, with persona and workflow audit support. | [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md) |
| P5-T6 | Follow-on backlog: workflow/customization, memberships/appeals, finance/program ops | Ready | Codex | Use the benchmark and repo audit to shape the later-wave backlog for metadata-driven workflows, fundraising depth, and nonprofit-specific program/finance ops. | [../product/OPEN_SOURCE_NONPROFIT_CRM_BENCHMARK_2026-04.md](../product/OPEN_SOURCE_NONPROFIT_CRM_BENCHMARK_2026-04.md) |
