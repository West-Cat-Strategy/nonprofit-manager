# Planning & Progress

**Last Updated:** 2026-04-22

## At a Glance

- **Current Phase:** Phase 5 - Email, Website, Portal, and Reliability
- **Phase 5 Plan:** [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md)
- **History:** Historical phase closeouts, transition notes, and earlier workboard material live under [archive/README.md](archive/README.md) and [archive/WORKBOARD_HISTORY_2026.md](archive/WORKBOARD_HISTORY_2026.md).

| Snapshot | Value |
|---|---|
| Active rows | 6 |
| In Progress | 4 |
| Blocked | 0 |
| Review | 2 |
| Ready | 0 |
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
| In Progress | P5-T2B | Shared validation lane stabilization | The repo-local lane contract, stale host expectations, UI audit baseline drift, and the avatar / contacts / donations / events regressions are now fixed in the current tree, but the 2026-04-22 host rerun surfaced new owning-surface blockers in `src/__tests__/integration/volunteers.test.ts` and `src/__tests__/config/database.test.ts`. Route those failures back to their owners and rerun `E2E_FRONTEND_PORT=5317 make ci-full` before widening into the fresh Docker MFA proof or Docker cross-browser/audit follow-ons. |
| In Progress | P5-T3 | Email platform wave: blast email plus email builder/formatter | Start the coordinated email wave: extend the existing `/api/v2/mailchimp/*` campaign surface for draft/schedule/preview-ready authoring, add an email-safe formatter/preview path that reuses current builder primitives, keep `/settings/communications` canonical, and land targeted backend/frontend/docs proof without widening shared route seams. |
| In Progress | P5-T5 | Client portal wave | The first portal forms slice is now green in targeted backend/frontend/docs/E2E proof: `/api/v2/portal/forms/assignments*` is the canonical active/completed inbox contract with case-aware summary metadata, due dates, and packet links. Keep the broader portal wave active for the next scoped pickup while shared final signoff remains coupled to `P5-T2B`. |
| In Progress | P5-T6 | Follow-on backlog: workflow/customization, memberships/appeals, finance/program ops | Keep [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md) as the canonical later-wave backlog artifact, and hold any runtime implementation behind the active `P5-T3` and `P5-T5` product waves. |

### Review Queue

| Status | ID | Task | Immediate Next Move |
|---|---|---|---|
| Review | P5-T2A | Testing-strategy review artifact and findings | Keep [../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md](../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md) as the canonical artifact while `P5-T2B` resolves the newly surfaced volunteer/contact-scope and database-config host blockers, then finishes the fresh-volume Docker MFA proof and the Docker cross-browser/audit follow-through. |
| Review | P5-T4 | Website surfaces wave: website builder plus public website | Use [../validation/P5-T4_MANAGED_FORM_PUBLISH_LOOP_REVIEW_2026-04-20.md](../validation/P5-T4_MANAGED_FORM_PUBLISH_LOOP_REVIEW_2026-04-20.md) as the row-local proof note for the one-form managed publish loop. Final broad signoff still depends on `P5-T2B`. |

### Ready Next

- No live ready rows remain. Keep new pickups behind the active `P5-T2B`, `P5-T3`, `P5-T5`, and `P5-T6` lanes unless the workboard is updated again.

## Current Phase Shape

- The Phase 5 docs, archive, benchmark, and persona-skill refresh is complete and archived in [archive/P5-T1_CLOSEOUT_2026-04-20.md](archive/P5-T1_CLOSEOUT_2026-04-20.md).
- Phase 5 is still inside the shared Playwright/E2E and testing-strategy review lane, but the remaining work is now concentrated in targeted owning-surface follow-through from the latest host rerun plus the final Docker proof sequence rather than core lint/typecheck/coverage breakage.
- Product execution then centers on blast email plus the email builder/formatter, website builder plus public website, and the client portal.
- The first `P5-T5` portal forms inbox slice is now green in targeted backend/frontend/docs/E2E proof, so the remaining portal wave work can stay scoped while shared broad signoff remains with `P5-T2B`.
- Follow-on backlog from repo review and external benchmarking stays visible as later Phase 5 work rather than hidden in archive notes.
- `P5-T3` is now active as the dedicated email platform wave, while `P5-T6` runs in parallel as analysis-only backlog synthesis rather than runtime implementation.

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
- Coordinated exception, 2026-04-22: `P5-T5` is split across parallel lanes while `P5-T2B` stays in final rerun/validation follow-through.
  Lead: Codex
  Backend lanes: `portal-forms-contract`
  Frontend lanes: `portal-forms-inbox`
  Other lanes: `portal-docs-e2e`
  Integration owner: Codex
- Coordinated exception, 2026-04-22: `P5-T3` and `P5-T6` are active in parallel while shared route/workboard seams stay lead-owned.
  Lead: Codex
  Backend lanes: `backend-mailchimp-campaigns`, `backend-email-renderer`
  Frontend lanes: `frontend-communications-workspace`, `frontend-email-builder`
  Other lanes: `docs-email-wave`, `workflow-customization-backlog`, `memberships-appeals-backlog`, `finance-program-ops-backlog`
  Integration owner: Codex
- Lane: `portal-forms-contract`
  Goal: make the assignment-backed portal forms payload the canonical inbox contract and expose case-aware summary metadata without widening shared route seams
  Owned paths: `backend/src/modules/portal/**`, `backend/src/modules/cases/usecases/caseForms.usecase.portal.ts`, `backend/src/modules/cases/repositories/caseFormsRepository.ts`, `backend/src/validations/caseForms.ts`
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, `docs/phases/planning-and-progress.md`, `frontend/src/routes/**`
  Expected tests: targeted portal/case-forms integration coverage plus module-local case-form portal tests
  Handoff notes: summarize canonical list/detail contract changes, added assignment summary metadata, and any frontend/doc follow-up
  Docs ownership: lead
  Disposition: `Review`
- Lane: `portal-forms-inbox`
  Goal: make `/portal/forms` a case-aware assignment inbox with clearer active/completed workflow, case context, due dates, and canonical assignment-client usage
  Owned paths: `frontend/src/features/portal/**`, `frontend/src/types/caseForms.ts`
  Forbidden shared paths: `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`
  Expected tests: targeted portal forms page and portal case-forms client coverage
  Handoff notes: summarize UI contract assumptions, filter/empty-state behavior, and any doc/E2E follow-up
  Docs ownership: lead
  Disposition: `Review`
- Lane: `portal-docs-e2e`
  Goal: align portal docs and focused browser proof with the assignment-backed portal forms inbox and case-aware workflow wording
  Owned paths: `docs/features/FEATURE_MATRIX.md`, `docs/features/PORTAL_REALTIME_FILTERING.md`, `docs/features/CASE_CLIENT_VISIBILITY_AND_FILES.md`, `e2e/tests/portal-workspace.spec.ts`
  Forbidden shared paths: `docs/phases/planning-and-progress.md`, `frontend/src/routes/**`, `backend/src/routes/v2/index.ts`
  Expected tests: targeted Playwright portal workspace coverage plus `make check-links` when docs change
  Handoff notes: summarize doc wording changes and exact portal forms proof added
  Docs ownership: lane
  Disposition: `Review`
- Lane: `backend-mailchimp-campaigns`
  Goal: extend the existing Mailchimp campaign surface for draft, schedule, send, and preview-ready authoring without adding a new top-level API namespace
  Owned paths: `backend/src/modules/mailchimp/**`, `backend/src/services/mailchimpService.ts`, `backend/src/types/mailchimp.ts`
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, `docs/phases/planning-and-progress.md`, `frontend/src/routes/**`
  Expected tests: targeted Mailchimp route-security and service coverage plus `cd backend && npm run type-check`
  Handoff notes: summarize contract additions, outbound delivery assumptions, and any frontend/doc follow-up
  Docs ownership: lead
  Disposition: `In Progress`
- Lane: `backend-email-renderer`
  Goal: create an email-safe formatter and preview path by reusing template/rendering primitives without coupling blast-email behavior to website runtime assumptions
  Owned paths: `backend/src/services/template/**`, `backend/src/services/site-generator/**`, `backend/src/services/publishing/newsletterHtmlSanitizer.ts`
  Forbidden shared paths: `backend/src/modules/mailchimp/**`, `backend/src/routes/v2/index.ts`, `docs/phases/planning-and-progress.md`, `frontend/src/routes/**`
  Expected tests: targeted template helper and sanitization coverage plus `cd backend && npm run type-check`
  Handoff notes: summarize preview/sanitization contracts and any frontend integration requirements
  Docs ownership: lead
  Disposition: `In Progress`
- Lane: `frontend-communications-workspace`
  Goal: turn the current communications workspace into the canonical blast-email operations surface while preserving `/settings/communications` and legacy `/settings/email-marketing`
  Owned paths: `frontend/src/features/mailchimp/**`, `frontend/src/features/adminOps/pages/**`, `frontend/src/features/adminOps/components/**`, `frontend/src/features/adminOps/api/adminHubApiClient.ts`
  Forbidden shared paths: `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`
  Expected tests: targeted communications/admin page coverage plus `cd frontend && npm run type-check`
  Handoff notes: summarize UI contract changes, preview flow assumptions, and any docs follow-up
  Docs ownership: lead
  Disposition: `In Progress`
- Lane: `frontend-email-builder`
  Goal: reuse editor and builder primitives for email composition and preview while keeping email composition data distinct from website template records
  Owned paths: `frontend/src/components/editor/**`, `frontend/src/features/builder/**`
  Forbidden shared paths: `frontend/src/features/mailchimp/**`, `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`
  Expected tests: targeted builder/editor preview coverage plus `cd frontend && npm run type-check`
  Handoff notes: summarize reusable editor primitives, email-safe preview assumptions, and any overlap requiring lead integration
  Docs ownership: lead
  Disposition: `In Progress`
- Lane: `docs-email-wave`
  Goal: align product/docs/testing language with the active blast-email authoring, preview, formatting, and delivery wave
  Owned paths: `docs/product/product-spec.md`, `docs/features/FEATURE_MATRIX.md`, `docs/features/TEMPLATE_SYSTEM.md`, `docs/testing/TESTING.md`
  Forbidden shared paths: `docs/phases/planning-and-progress.md`, `frontend/src/routes/**`, `backend/src/routes/v2/index.ts`
  Expected tests: `make check-links` plus `make lint-doc-api-versioning` when `/api/v2` wording changes
  Handoff notes: summarize docs wording changes and exact validation guidance added
  Docs ownership: lane
  Disposition: `In Progress`
- Lane: `workflow-customization-backlog`
  Goal: audit current metadata-driven workflow and customization support, then hand the lead ranked later-wave backlog recommendations without direct repo edits
  Owned paths: none; analysis-only lane
  Forbidden shared paths: all repo-tracked files; report findings to the lead instead of editing directly
  Expected tests: none; evidence comes from current repo docs, route catalogs, and benchmark canon
  Handoff notes: provide confirmed repo support, visible gaps, borrowable patterns, persona implications, and priority recommendations
  Docs ownership: lead
  Disposition: `In Progress`
- Lane: `memberships-appeals-backlog`
  Goal: audit memberships, appeals, and fundraising-depth gaps, then hand the lead ranked later-wave backlog recommendations without direct repo edits
  Owned paths: none; analysis-only lane
  Forbidden shared paths: all repo-tracked files; report findings to the lead instead of editing directly
  Expected tests: none; evidence comes from current repo docs, route catalogs, and benchmark canon
  Handoff notes: provide confirmed repo support, visible gaps, borrowable patterns, persona implications, and priority recommendations
  Docs ownership: lead
  Disposition: `In Progress`
- Lane: `finance-program-ops-backlog`
  Goal: audit finance and program-operations gaps, then hand the lead ranked later-wave backlog recommendations without direct repo edits
  Owned paths: none; analysis-only lane
  Forbidden shared paths: all repo-tracked files; report findings to the lead instead of editing directly
  Expected tests: none; evidence comes from current repo docs, route catalogs, and benchmark canon
  Handoff notes: provide confirmed repo support, visible gaps, borrowable patterns, persona implications, and priority recommendations
  Docs ownership: lead
  Disposition: `In Progress`
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
| P5-T2B | Shared validation lane stabilization | In Progress | Codex | The repo-local lane contract is now baked in, smoke cleanup is hardened, UI audit drift is refreshed, stale host expectations are aligned, and the avatar / contacts / donations / events regressions are fixed. The 2026-04-22 host rerun then surfaced new blockers in `src/__tests__/integration/volunteers.test.ts` and `src/__tests__/config/database.test.ts`; route those back to the owning surfaces and rerun `E2E_FRONTEND_PORT=5317 make ci-full` before attempting the fresh-workspace MFA proof, `npm run test:docker:ci`, `npm run test:docker:audit`, and final validation closeout. | [../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md](../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md) |
| P5-T4 | Website surfaces wave: website builder plus public website | Review | Codex | The one-form managed public publish-loop proof is now green across the website console, builder, publish flow, and public runtime. Keep the row in `Review` while `P5-T2B` finishes the broader host-plus-Docker validation lane. | [../validation/P5-T4_MANAGED_FORM_PUBLISH_LOOP_REVIEW_2026-04-20.md](../validation/P5-T4_MANAGED_FORM_PUBLISH_LOOP_REVIEW_2026-04-20.md) |
| P5-T3 | Email platform wave: blast email plus email builder/formatter | In Progress | Codex | Start the coordinated email wave: keep `/api/v2/mailchimp/*` as the outbound contract, extend campaign authoring for draft/schedule/preview-ready flows, reuse current builder primitives for email-safe preview/formatting, and land focused backend/frontend/docs proof while shared route/workboard seams stay lead-owned. | [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md) |
| P5-T5 | Client portal wave | In Progress | Codex | The portal forms inbox slice is now green in targeted proof: `/api/v2/portal/forms/assignments*` is the canonical active/completed contract, `/portal/forms` refetches by bucket with case-aware summary metadata and due dates, and the focused portal docs/E2E coverage is updated. Keep the broader portal wave active for the next scoped pickup while shared broad signoff remains coupled to `P5-T2B`. | [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md) |
| P5-T6 | Follow-on backlog: workflow/customization, memberships/appeals, finance/program ops | In Progress | Codex | Use the published synthesis artifact to keep workflow/customization, memberships/appeals, and finance/program-ops work ranked and visible, but keep runtime implementation blocked on the active `P5-T3` and `P5-T5` product waves. | [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md) |
