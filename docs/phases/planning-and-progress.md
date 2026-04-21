# Planning & Progress

**Last Updated:** 2026-04-20

## At a Glance

- **Current Phase:** Phase 5 - Email, Website, Portal, and Reliability
- **Phase 5 Plan:** [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md)
- **History:** Historical phase closeouts, transition notes, and earlier workboard material live under [archive/README.md](archive/README.md) and [archive/WORKBOARD_HISTORY_2026.md](archive/WORKBOARD_HISTORY_2026.md).

| Snapshot | Value |
|---|---|
| Active rows | 5 |
| In Progress | 2 |
| Blocked | 0 |
| Review | 0 |
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
| In Progress | P5-T2 | Full Playwright/E2E pass plus test coverage and testing-strategy review | The dashboard UX smoke contract now matches the current `Workbench` heading and the rerun has advanced through backend/frontend coverage into the host Playwright matrix. Let the current `NODE_OPTIONS=--max-old-space-size=8192 REDIS_URL=redis://redis:6379 make ci-full` run finish, then continue with `cd e2e && npm run test:docker:ci`, `cd e2e && npm run test:docker:audit`, and the CI wrapper follow-through for `REDIS_URL` plus the backend coverage heap requirement. |
| In Progress | P5-T4 | Website surfaces wave: website builder plus public website | Run the coordinated `P5-T4` slice around one managed public form: align backend form runtime metadata, website console verification, site-aware builder cues, and targeted docs/E2E without changing route families or public endpoint shapes. |

### Ready Next

| Status | ID | Task | Immediate Next Move |
|---|---|---|---|
| Ready | P5-T3 | Email platform wave: blast email plus email builder/formatter | Scope outbound campaign flow, email authoring/formatting needs, delivery reliability, preview/testing, and reuse of existing template/mailchimp surfaces. |
| Ready | P5-T5 | Client portal wave | Plan and execute portal UX, messaging/documents/forms/appointments follow-through, with persona and workflow audit support. |
| Ready | P5-T6 | Follow-on backlog: workflow/customization, memberships/appeals, finance/program ops | Use the benchmark and repo audit to shape the later-wave backlog for metadata-driven workflows, fundraising depth, and nonprofit-specific program/finance ops. |

## Current Phase Shape

- The Phase 5 docs, archive, benchmark, and persona-skill refresh is complete and archived in [archive/P5-T1_CLOSEOUT_2026-04-20.md](archive/P5-T1_CLOSEOUT_2026-04-20.md).
- Phase 5 now enters the early full Playwright/E2E and testing-strategy review lane before the main product waves.
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
- Lane: `frontend-websites-console`
  Goal: expose one-form verification, publish-state, and public-surface actions in the website console
  Owned paths: `frontend/src/features/websites/**`, `frontend/src/types/websiteBuilder.ts`
  Forbidden shared paths: `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`
  Expected tests: targeted website overview/forms/publishing page coverage
  Handoff notes: summarize UI contract changes and any builder/doc dependencies
  Docs ownership: lead
- Lane: `frontend-builder`
  Goal: keep the site-aware builder aware of managed-form publish state and point editors back to the console follow-through
  Owned paths: `frontend/src/features/builder/**`, `frontend/src/components/editor/**`
  Forbidden shared paths: `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`
  Expected tests: targeted page-editor controller coverage
  Handoff notes: summarize site-context changes and any overlap requiring lead integration
  Docs ownership: lead
- Lane: `docs-e2e`
  Goal: align the website/public-runtime docs and targeted browser proof with the one-form managed publish loop
  Owned paths: `docs/features/TEMPLATE_SYSTEM.md`, `docs/features/FEATURE_MATRIX.md`, `docs/deployment/publishing-deployment.md`, `docs/testing/TESTING.md`, `e2e/tests/public-website.spec.ts`, `e2e/tests/publishing.spec.ts`
  Forbidden shared paths: `docs/phases/planning-and-progress.md`, `frontend/src/routes/**`, `backend/src/routes/v2/index.ts`
  Expected tests: targeted Playwright publishing/public-site coverage plus `make check-links` when docs change
  Handoff notes: summarize doc/runtime wording changes and exact browser proof added
  Docs ownership: lane
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
| P5-T2 | Full Playwright/E2E pass plus test coverage and testing-strategy review | In Progress | Codex | The dashboard UX smoke contract is fixed in `frontend/src/test/ux/RouteUxSmoke.test.tsx`, and the rerun of `NODE_OPTIONS=--max-old-space-size=8192 REDIS_URL=redis://redis:6379 make ci-full` has progressed through backend/frontend coverage into the host Playwright matrix. Finish that run, then continue with the Docker cross-browser and audit lanes and capture the follow-through around `REDIS_URL` plus the backend coverage heap requirement if the current Node runtime still needs it. | [../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md](../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md) |
| P5-T4 | Website surfaces wave: website builder plus public website | In Progress | Codex | Coordinated slice is focused on one managed public form across the existing site-aware publish loop. Lead owns the workboard, route registrars, and final integration while delegated lanes cover backend publishing/runtime metadata, website console verification, site-aware builder cues, and docs/E2E proof. Final broad signoff stays gated on the shared `P5-T2` validation lane finishing cleanly. | [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md) |
| P5-T3 | Email platform wave: blast email plus email builder/formatter | Ready | Codex | Scope outbound campaign flow, email authoring/formatting needs, delivery reliability, preview/testing, and reuse of existing template/mailchimp surfaces. | [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md) |
| P5-T5 | Client portal wave | Ready | Codex | Plan and execute portal UX, messaging/documents/forms/appointments follow-through, with persona and workflow audit support. | [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md) |
| P5-T6 | Follow-on backlog: workflow/customization, memberships/appeals, finance/program ops | Ready | Codex | Use the benchmark and repo audit to shape the later-wave backlog for metadata-driven workflows, fundraising depth, and nonprofit-specific program/finance ops. | [../product/OPEN_SOURCE_NONPROFIT_CRM_BENCHMARK_2026-04.md](../product/OPEN_SOURCE_NONPROFIT_CRM_BENCHMARK_2026-04.md) |
