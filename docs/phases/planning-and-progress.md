# Planning & Progress

**Last Updated:** 2026-04-25

## At a Glance

- **Current Phase:** Phase 5 - Email, Website, Portal, and Reliability
- **Phase 5 Plan:** [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md)
- **History:** Historical phase closeouts, transition notes, and earlier workboard material live under [archive/README.md](archive/README.md) and [archive/WORKBOARD_HISTORY_2026.md](archive/WORKBOARD_HISTORY_2026.md).

| Snapshot | Value |
|---|---|
| Active rows | 19 |
| In Progress | 0 |
| Blocked | 0 |
| Review | 14 |
| Ready | 5 |
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
| None | - | - | No rows are currently signed out as in progress. |

### Review Queue

| Status | ID | Task | Immediate Next Move |
|---|---|---|---|
| Review | P5-T2A | Testing-strategy review artifact and findings | Keep [../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md](../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md) as the canonical artifact. The final uninterrupted Docker CI artifact is now green alongside host coverage, auth-alias handoff, fresh-volume Docker MFA proof, Docker smoke, Docker audit, and the focused Firefox/WebKit recovery proofs; keep this row in review for final artifact signoff rather than reopening shared validation work. |
| Review | P5-T2B | Shared validation lane stabilization | The final uninterrupted `cd e2e && npm run test:docker:ci` artifact passed on 2026-04-24: desktop Docker cross-browser matrix `982` passed / `11` skipped in `51.3m`, followed by Mobile Chrome `3` passed in `13.8s`. Keep [../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md](../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md) as the artifact record and leave any future browser drift with the owning runtime or feature row. |
| Review | P5-T2C | Review findings remediation | Treat this row as functionally proof-complete and keep it tightly scoped to the surfaced review findings only: the targeted builder remediation tests, scheduled-report proof, report-template proof, backend/frontend package type-checks, and shared Docker CI signoff are green in the current tree. Keep optional hardening ideas deferred unless a future feature rerun points back here, then leave wider email-wave follow-through with `P5-T3`. |
| Review | P5-T2D | Persona proof lane stabilization | The narrow `persona-proof-stability` lane is green in targeted frontend proof: stable portal workflow hook callbacks avoid repeated effect retriggers under load, `PortalWorkflowPages.test.tsx` passes, frontend type-check passes, and the full documented persona frontend slice passes with `57` tests. Keep any future host-only drift with validation/runtime ownership instead of reclassifying persona support. |
| Review | P5-T4 | Website surfaces wave: website builder plus public website | Use [../validation/P5-T4_MANAGED_FORM_PUBLISH_LOOP_REVIEW_2026-04-20.md](../validation/P5-T4_MANAGED_FORM_PUBLISH_LOOP_REVIEW_2026-04-20.md) as the row-local proof note for the one-form managed publish loop. The shared `P5-T2B` Docker CI gate is now green, so keep this row in review for final row-local signoff rather than broad validation follow-through. |
| Review | P5-T5 | Client portal wave | The current portal carry-over is landed in targeted proof: public-intake audit records explicit match posture, resolution action, and structured business errors; server-backed queue definitions support row actions and empty-state metadata; and case-scoped portal review requests now have staff-facing triage on the Case Detail Portal tab. Before closeout, attach a compact row-local proof note or explicit durable validation link; keep MPI/dedupe consoles, generic saved-search builders, helpdesk/grievance scope, referral engines, and wider service-delivery workflow depth out of this row. |
| Review | P5-T6 | Follow-on backlog: workflow/customization, memberships/appeals, finance/program ops | Use [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md) as the published capability-brief packet alongside [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md). Keep `P5-T6A`, `P5-T6B`, and `P5-T6C` in review against their published planning briefs; the narrow `PAT-01`/`PAT-02`/`PAT-03` fundraising pickups ride with `P5-T3`, `PAT-04`/`PAT-05`/`PAT-06` portal pickups ride with `P5-T5`, and typed appeals, restrictions, donation batches, memberships, finance breadth, and generic workflow tooling still need separate scoped rows. |
| Review | P5-T6A | Governance and compliance oversight brief | Use [P5-T6A_GOVERNANCE_COMPLIANCE_BRIEF_2026-04-24.md](P5-T6A_GOVERNANCE_COMPLIANCE_BRIEF_2026-04-24.md) as the planning artifact for board-only posture, governance-risk escalation, board packet workflow, compliance-document retention, and corrective-action tracking. Keep annual filing and legal review explicitly `external only`; runtime implementation still needs a new scoped row before work starts. |
| Review | P5-T6B | Fundraising stewardship and restrictions brief | Use [P5-T6B_FUNDRAISING_STEWARDSHIP_RESTRICTIONS_BRIEF_2026-04-25.md](P5-T6B_FUNDRAISING_STEWARDSHIP_RESTRICTIONS_BRIEF_2026-04-25.md) as the planning artifact for saved audiences, campaign-run history, donor-profile defaults, typed appeal boundaries, and later fund-designation policy. Keep provider static segments run-specific, donor-profile receipt defaults overrideable, and typed appeals, restrictions, donation batches, memberships, and broader campaign ROI queued behind separate scoped rows. |
| Review | P5-T6C | Service-delivery workflow depth brief | Use [P5-T6C_SERVICE_DELIVERY_WORKFLOW_DEPTH_BRIEF_2026-04-24.md](P5-T6C_SERVICE_DELIVERY_WORKFLOW_DEPTH_BRIEF_2026-04-24.md) as the planning artifact for reassessment cadence, structured handoff packets, closure continuity, rehab planning artifacts, and authorization/referral depth. Keep runtime implementation blocked until a future scoped row is signed out. |
| Review | P5-T6C1 | Case reassessment cadence runtime slice | The first scoped service-delivery runtime pickup is landed in targeted proof: case reassessment cycles are backed by explicit `case_reassessment_cycles` records, linked one-time follow-ups, outcome-backed completion, cancellation, and optional next-cycle scheduling from the Case Detail Follow-ups tab. Before closeout, attach a compact row-local proof note or explicit durable validation link; keep later handoff packets, closure continuity, authorization/referral depth, service plans, service-site references, portal routing, offline sync, and generic workflow tooling behind separate scoped rows. |
| Review | P5-T6D | Volunteer assignment dispatch radar | The Operation Signal Bridge `dispatch-radar` slice is landed in targeted frontend proof: assignment event/task references now use active pickers backed by existing event/task clients, planned and active events plus non-terminal tasks are available, and the saved assignment payload still submits `event_id` or `task_id`. Before closeout, attach a compact row-local proof note or explicit durable validation link; keep `campaign-control` behind the `P5-T3` handoff and `clearwater` behind the `P5-T5` handoff. |
| Review | P5-T7 | Cross-surface modularization hardening | The behavior-preserving modularization wave is landed in focused proof: social-media scheduler/service ownership moved under the module with root shim compatibility, webhook/API-key tests now target module-owned services, saved-report implementation moved under `modules/savedReports`, builder/editor/template implementations moved under the builder feature with global shims, and analytics/finance/dashboard orchestration moved into feature-local hooks. Before closeout, attach a compact row-local proof note or explicit durable validation link; keep route/catalog/root-store/API behavior unchanged and leave full raw `reportService.test.ts` rerun blocked by the existing ExcelJS/uuid Jest transform issue. |
| Review | P5-T8 | Codex skill suite audit and refresh | Helper-skill routing is refreshed against `AGENTS.md`, contributor docs, current runtime/testing guidance, validation references, and actual code layout. Repo-local helper bodies now preserve the local-only boundary, stale CBIS app-import guidance is marked retired and rerouted, broken helper references are repaired, and proof is green across touched skill validation, skill path sweep, `make check-links`, `git diff --check`, and `.codex` ignore-boundary review. |

### Ready Queue

| Status | ID | Task | Immediate Next Move |
|---|---|---|---|
| Ready | P5-T3 | Email platform wave: blast email plus email builder/formatter | When work resumes, fix Mailchimp campaign and preview route validation for `priorRunSuppressionIds`, add focused route tests, review Mailchimp webhook authenticity and PII-safe logging before closeout, then rerun the targeted email proof plus `make db-verify`. Keep typed appeals, restrictions, donation batches, memberships, campaign ROI, and generic automation queued behind separate scoped rows. |
| Ready | P5-T9 | Dead code review | Run a repo-wide dead-code and unused-export review across backend, frontend, scripts, and E2E helpers. Use existing tooling where available, separate true removals from compatibility shims or intentionally exported contracts, and produce scoped cleanup rows before deleting shared surfaces. |
| Ready | P5-T10 | Dead docs review | Review docs for stale, duplicate, historical, or orphaned material that should be archived, consolidated, redirected, or removed. Preserve canonical navigation and avoid deleting validation evidence that still backs active workboard rows. |
| Ready | P5-T11 | Comprehensive modularity and simplicity refactor plan | Plan a broad behavior-preserving refactor for modularity and simplicity across backend modules, frontend feature ownership, shared route/store seams, tests, docs, and compatibility shims. Produce a sequenced implementation plan before any runtime refactor starts. |
| Ready | P5-T12 | Full E2E/Playwright review and clean all-green validation | Run the full browser/runtime review after cleanup and proof-note rows are settled: `make ci-full`, optional fresh `make test-e2e-docker-smoke`, `cd e2e && npm run test:docker:ci`, `cd e2e && npm run test:docker:audit`, separate fresh-workspace MFA proof when required, and final all-green confirmation with documented skips only. |

### Ready Next

- Keep `P5-T8` in review against the refreshed helper routing and green validation proof; do not reopen app code or API work from that row.
- Pick up `P5-T3` when the email wave resumes, keeping it narrowed to the Mailchimp `priorRunSuppressionIds` validation gap, focused route proof, webhook authenticity review, and PII-safe logging follow-through; attach a compact row-local proof note or explicit durable validation link before closeout.
- Keep `P5-T2D` in review against the green frontend persona-proof slice; any future browser-only drift returns to validation/runtime ownership rather than persona reclassification.
- Keep `P5-T6A` in review against its published governance/compliance brief, keep `P5-T6B` in review against its published fundraising stewardship/restrictions brief, and keep `P5-T6C` in review against its published service-delivery workflow depth brief.
- Keep `P5-T5`, `P5-T6C1`, `P5-T6D`, and `P5-T7` in review against targeted proof, but require compact row-local proof notes or explicit durable validation links before closeout; any future shim removal must stay lead-owned and preserve current `/api/v2`, route-catalog, root-store, auth/workspace-module, and browser URL contracts.
- Use [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md) to keep `borrow now`, `queue for P5-T6`, and `reject` decisions explicit; `P5-T6D` is the only signed-out runtime pickup from that packet, and broader runtime rows still need their own signout.
- Queue `P5-T9`, `P5-T10`, and `P5-T11` before broad cleanup implementation so dead code, dead docs, and modularity/simplicity work are reviewed and sequenced rather than folded into active product rows.
- Save `P5-T12` for the later full E2E/Playwright review and clean all-green validation after the review rows have row-local proof notes or explicit carry-forward blockers.

## Current Phase Shape

- The Phase 5 docs, archive, benchmark, and persona-skill refresh is complete and archived in [archive/P5-T1_CLOSEOUT_2026-04-20.md](archive/P5-T1_CLOSEOUT_2026-04-20.md).
- Phase 5's shared Playwright/E2E and testing-strategy review lane has moved into `Review`: the final uninterrupted `cd e2e && npm run test:docker:ci` artifact passed after the earlier UI-audit, dependency-audit, backend coverage, security-baseline, Docker smoke/audit, fresh Docker MFA, and focused Firefox/WebKit broad-failure blockers were cleared in targeted proof.
- `P5-T2C` is now in `Review`: the stale builder site-context fix, extracted builder shortcut/site-context proof, scheduled-report helper/service proof, report-template negative-path proof, backend/frontend package type-checks, and shared Docker CI signoff are green in the current tree. Keep optional hardening ideas deferred unless a future feature rerun points directly back here, and leave broader email-wave follow-through with `P5-T3`.
- `P5-T2D` is now in `Review`: the narrow persona-proof-stability lane fixed the portal workflow test timeout risk by stabilizing mocked refresh/load-more callbacks, and frontend type-check plus the documented persona frontend slice are green.
- Security hardening remains recorded under `P5-T2B`, not as a fourth product wave: the deliberate backend `exceljs -> uuid` remediation is landed, the live security baseline is green again, the auth-alias operational handoff is published, and the shared Docker CI gate is green. The queued email follow-through and portal review slices must keep permission, PII/audit, rate-limit, and SSRF proof current through the published [../validation/PHASE_5_SECURITY_REVIEW_2026-04-22.md](../validation/PHASE_5_SECURITY_REVIEW_2026-04-22.md).
- Product execution now has the portal, website, modularization, volunteer-dispatch, and reassessment runtime pickups in `Review`, while `P5-T3` is back in `Ready` for the narrowed Mailchimp route-validation and webhook-hardening follow-through found during review. Row-local signoff should focus on proof review and closeout rather than opening new runtime scope inside those rows.
- The current `P5-T5` portal pickup is now green in targeted proof across public-intake resolution (`PAT-04`) with structured audit evidence, queue view definitions (`PAT-05`) with row-action and empty-state metadata, and case-scoped typed portal review requests (`PAT-06`) with staff-facing triage in the Case Detail Portal tab. Keep MPI/dedupe consoles, generic saved-search builders, helpdesk/grievance scope, referral engines, and wider service-delivery workflow depth out of this row.
- Follow-on backlog from repo review and external benchmarking now has a published capability-brief packet in [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md). The repo-by-repo OSS benchmark review wave is complete, the five analysis-only lanes now keep `borrow now`, `queue for P5-T6`, and `reject` outcomes explicit, `P5-T6A` has a governance/compliance oversight brief in review, `P5-T6B` has a fundraising stewardship/restrictions brief in review, and `P5-T6C` has a service-delivery workflow depth brief in review.
- `P5-T5` and `P5-T6C1` are now in `Review`: the portal public-intake/queue/escalation slice and case reassessment cadence slice are landed in targeted proof. `P5-T3` is ready to resume when the Mailchimp `priorRunSuppressionIds` route-validation gap, focused route proof, webhook authenticity review, and PII-safe logging follow-through are picked back up. `P5-T6` still sits in `Review` as the planning packet feeding `P5-T6A`, `P5-T6B`, and `P5-T6C`, and later typed-domain runtime rows still need separate signout.
- Latest targeted proof for `P5-T5`, `P5-T6C1`, and integration seams is green across backend service tests, backend follow-up/case integration tests, targeted frontend tests, backend/frontend package type-checks, `make db-verify`, `make check-links`, and `git diff --check`. `P5-T3` needs a fresh targeted email proof after the remaining Mailchimp validation and webhook-hardening follow-through.
- `P5-T7` is now in review: the modularization lanes moved internal ownership boundaries while preserving shared route registrars, route catalogs, root store wiring, auth/permission policy, frontend API clients, and browser contracts. Worker imports now point at module-owned scheduler services through the lead-owned seam, while compatibility shims remain for shared callers.
- The current hardening and reassessment migrations `103` through `108` cover saved audiences/campaign runs, public-intake resolution audit, queue view definitions, portal escalations, donor profiles, and case reassessment cycles; keep `make db-verify` in the validation path whenever those contracts or manifest/initdb parity change.

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
- Coordinated exception, 2026-04-22: `P5-T2B` includes a `security-hardening` sub-lane while shared validation, route, and workboard seams stay lead-owned.
  Lead: Codex
  Backend lanes: `security-hardening`
  Frontend lanes: none
  Other lanes: none
  Integration owner: Codex
- Coordinated exception, 2026-04-24: `P5-T2B` included an `e2e-webkit-import-recovery` sub-lane while the final Docker CI rerun and workboard promotion stayed lead-owned.
  Lead: Codex
  Backend lanes: none
  Frontend lanes: none
  Other lanes: `e2e-webkit-import-recovery`
  Integration owner: Codex
- Coordinated exception, 2026-04-22: `P5-T5` is split across parallel lanes while shared route/workboard seams stay lead-owned.
  Lead: Codex
  Backend lanes: `portal-forms-contract`
  Frontend lanes: `portal-forms-inbox`
  Other lanes: `portal-docs-e2e`
  Integration owner: Codex
- Coordinated exception, 2026-04-22: `P5-T3` and `P5-T6` were split across parallel lanes while shared route/workboard seams stayed lead-owned; no lane from this exception is currently signed out as in progress.
  Lead: Codex
  Backend lanes: `backend-mailchimp-campaigns`, `backend-email-renderer`
  Frontend lanes: `frontend-communications-workspace`, `frontend-email-builder`
  Other lanes: `docs-email-wave`, `fundraising-ops-brief`, `portal-ops-brief`, `volunteer-dispatch-brief`, `finance-membership-brief`, `workflow-program-ops-brief`
  Integration owner: Codex
- Coordinated exception, 2026-04-22: `P5-T6` shifts from repo-review lanes into capability-based adoption briefs while shared workboard and synthesis docs stay lead-owned.
  Lead: Codex
  Backend lanes: none
  Frontend lanes: none
  Other lanes: `fundraising-ops-brief`, `portal-ops-brief`, `volunteer-dispatch-brief`, `finance-membership-brief`, `workflow-program-ops-brief`
  Integration owner: Codex
- Coordinated exception, 2026-04-24: `P5-T6D` is split into a lead-owned workboard/docs lane plus one frontend runtime lane.
  Lead: Codex
  Backend lanes: none
  Frontend lanes: `dispatch-radar`
  Other lanes: none
  Integration owner: Codex
- Coordinated exception, 2026-04-25: `P5-T6C1` is split into backend and frontend runtime lanes while shared workboard/docs and final verification stay lead-owned.
  Lead: Codex
  Backend lanes: `backend-reassessment-cycle`
  Frontend lanes: `frontend-reassessment-panel`
  Other lanes: none
  Integration owner: Codex
- Lane: `backend-reassessment-cycle`
  Goal: add explicit case reassessment-cycle records linked to one-time case follow-ups, with list/create/update/complete/cancel case endpoints and focused backend proof
  Owned paths: `database/migrations/108_case_reassessment_cycles.sql`, `database/migrations/manifest.tsv`, `backend/src/modules/cases/**`, `backend/src/types/case.ts`, `backend/src/__tests__/integration/cases.test.ts`, `backend/src/__tests__/integration/followUps.test.ts`
  Forbidden shared paths: `frontend/src/**`, `docs/phases/planning-and-progress.md`, `backend/src/routes/v2/index.ts`
  Expected tests: `cd backend && npm test -- --runInBand src/__tests__/integration/followUps.test.ts src/__tests__/integration/cases.test.ts`, `cd backend && npm run type-check`, and `make db-verify` when the migration/manifest changes
  Handoff notes: summarize reassessment status transitions, linked follow-up behavior, outcome requirements, and next-cycle creation boundaries
  Docs ownership: lead
  Disposition: `Review`
- Lane: `frontend-reassessment-panel`
  Goal: expose the case reassessment cadence inside the existing case detail Follow-ups tab above the generic follow-up list, without adding routes or portal surfaces
  Owned paths: `frontend/src/features/cases/**`, `frontend/src/types/case.ts`, `frontend/src/features/cases/pages/__tests__/CaseDetailTabs.test.tsx`
  Forbidden shared paths: `backend/src/**`, `docs/phases/planning-and-progress.md`, `frontend/src/routes/**`
  Expected tests: `cd frontend && npm test -- --run src/features/cases/pages/__tests__/CaseDetailTabs.test.tsx src/features/followUps/pages/__tests__/FollowUpsPage.test.tsx` plus `cd frontend && npm run type-check`
  Handoff notes: summarize visible cadence states, form behavior, linked follow-up assumptions, and any backend contract dependency
  Docs ownership: lead
  Disposition: `Review`
- Coordinated exception, 2026-04-25: `P5-T7` is split across backend and frontend modularization lanes while shared route/store/catalog/workboard/runtime seams stay lead-owned.
  Lead: Codex
  Backend lanes: `backend-social-media-boundary`, `backend-webhooks-boundary`, `backend-reports-family-boundary`
  Frontend lanes: `frontend-publishing-builder-boundary`, `frontend-insights-finance-boundary`
  Other lanes: `lead-integration`
  Integration owner: Codex
- Lane: `backend-social-media-boundary`
  Goal: finish social-media domain isolation, including scheduler-adjacent service cleanup, without changing route behavior
  Owned paths: `backend/src/modules/socialMedia/**`, `backend/src/services/socialMediaSyncSchedulerService.ts`, social-media backend tests
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, `backend/src/worker.ts`, auth/policy helpers, `docs/phases/planning-and-progress.md`
  Expected tests: social-media module tests, social-media integration test, and `cd backend && npm run type-check`
  Handoff notes: summarize scheduler assumptions, import changes, and any lead-owned worker follow-up
  Docs ownership: lead
  Disposition: `Review`
- Lane: `backend-webhooks-boundary`
  Goal: move webhook and API-key behavior behind module-owned services while leaving worker startup and compatibility exports lead-owned
  Owned paths: `backend/src/modules/webhooks/**`, webhook/API-key service tests
  Forbidden shared paths: `backend/src/worker.ts`, `backend/src/routes/v2/index.ts`, root compatibility exports unless lead-approved, `docs/phases/planning-and-progress.md`
  Expected tests: webhook integration/service tests, API-key service tests, module-boundary policy check, and `cd backend && npm run type-check`
  Handoff notes: summarize retry/runtime behavior, compatibility exports still needed, and any worker follow-up
  Docs ownership: lead
  Disposition: `Review`
- Lane: `backend-reports-family-boundary`
  Goal: consolidate reports, saved reports, and scheduled reports around module-owned services/usecases while preserving scheduler and public-report behavior
  Owned paths: `backend/src/modules/reports/**`, `backend/src/modules/savedReports/**`, `backend/src/modules/scheduledReports/**`, related report tests
  Forbidden shared paths: `backend/src/worker.ts`, `backend/src/routes/v2/index.ts`, public report snapshot services unless lead-approved, `docs/phases/planning-and-progress.md`
  Expected tests: report, saved-report, and scheduled-report focused tests plus `cd backend && npm run type-check`
  Handoff notes: summarize scheduler/public-report assumptions and any compatibility shims still required
  Docs ownership: lead
  Disposition: `Review`
- Lane: `frontend-publishing-builder-boundary`
  Goal: reduce global editor/template leakage by moving publishing-owned UI logic toward websites/builder feature ownership
  Owned paths: `frontend/src/features/websites/**`, `frontend/src/features/builder/**`, `frontend/src/components/editor/**`, `frontend/src/components/templates/**`, `frontend/src/types/websiteBuilder.ts`
  Forbidden shared paths: `frontend/src/routes/**`, `frontend/src/routes/routeCatalog/**`, shared API clients, `docs/phases/planning-and-progress.md`
  Expected tests: websites, builder, and editor Vitest suites plus `cd frontend && npm run type-check`
  Handoff notes: summarize moved ownership, preview/editor behavior covered, and any route/catalog follow-up
  Docs ownership: lead
  Disposition: `Review`
- Lane: `frontend-insights-finance-boundary`
  Goal: split large analytics, reports, finance, grants, dashboard, outcomes, and alerts surfaces into feature-local controllers/hooks/components
  Owned paths: `frontend/src/features/reports/**`, `frontend/src/features/savedReports/**`, `frontend/src/features/scheduledReports/**`, `frontend/src/features/analytics/**`, `frontend/src/features/dashboard/**`, `frontend/src/features/finance/**`, `frontend/src/features/grants/**`, `frontend/src/features/outcomes/**`, `frontend/src/features/alerts/**`
  Forbidden shared paths: `frontend/src/routes/**`, `frontend/src/routes/routeCatalog/**`, `frontend/src/store/index.ts`, shared navigation, `docs/phases/planning-and-progress.md`
  Expected tests: focused feature Vitest suites plus `cd frontend && npm run type-check`
  Handoff notes: summarize extracted controllers/hooks/components, route/store assumptions, and any lead-owned integration follow-up
  Docs ownership: lead
  Disposition: `Review`
- Lane: `lead-integration`
  Goal: own workboard, route/store/catalog seams, compatibility-shim removal order, and final validation
  Owned paths: `docs/phases/planning-and-progress.md`, `backend/src/routes/v2/index.ts`, `backend/src/index.ts`, `backend/src/worker.ts`, `frontend/src/routes/**`, `frontend/src/routes/routeCatalog/**`, `frontend/src/store/index.ts`, shared auth/permission helpers, shared frontend API clients
  Forbidden shared paths: lane-owned module and feature paths unless integrating returned work
  Expected tests: route/catalog tests, root lint/typecheck/test pass, and selected E2E proof only if route or browser behavior changed
  Handoff notes: record compatibility-shim disposition, skipped broad proof rationale, and final validation commands
  Docs ownership: lead
  Disposition: `Review`
- Lane: `dispatch-radar`
  Goal: replace raw volunteer assignment event/task UUID entry with searchable active event/task pickers while preserving the existing assignment contract
  Owned paths: `frontend/src/components/AssignmentForm.tsx`, `frontend/src/components/__tests__/AssignmentForm.test.tsx`, `frontend/src/features/volunteers/pages/VolunteerDetailPage.tsx`, `frontend/src/features/volunteers/api/volunteersApiClient.ts`, `frontend/src/features/tasks/api/tasksApiClient.ts`, `frontend/src/features/events/api/eventsApiClient.ts`
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`
  Expected tests: `cd frontend && npm test -- --run src/components/__tests__/AssignmentForm.test.tsx` plus frontend type-check after integration
  Handoff notes: summarize picker data sources, assignment payload compatibility, and any proven backend read-contract gap
  Docs ownership: lead
  Disposition: `Review`
- Coordinated exception, 2026-04-22: `P5-T2C` proof from the focused remediation lanes is landed and now sits in review while shared route/workboard seams stay lead-owned.
  Lead: Codex
  Backend lanes: `scheduled-reports-proof`, `report-template-proof`
  Frontend lanes: `frontend-builder-remediation`
  Other lanes: none
  Integration owner: Codex
- Lane: `security-hardening`
  Goal: clear the current security-scan red state and make auth and security monitoring operational without changing shared route or workboard contracts
  Owned paths: `docs/security/**`, `docs/validation/**`, `scripts/security-scan.sh`, `scripts/check-auth-guard-policy.ts`, `scripts/check-rate-limit-key-policy.ts`, `backend/package.json`, `backend/package-lock.json`, `backend/src/modules/auth/**`, `backend/src/middleware/apiKeyAuth.ts`, `backend/src/middleware/portalAuth.ts`, `backend/src/services/authGuardService.ts`, `backend/src/services/piiService.ts`, `backend/src/__tests__/modules/auth/**`, `backend/src/__tests__/modules/*.security.test.ts`, `backend/src/__tests__/services/paymentProviderService.ssrf.test.ts`, `backend/src/__tests__/services/webhookService.secretExposure.test.ts`
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`
  Expected tests: `make security-scan`, `node scripts/check-auth-guard-policy.ts`, `node scripts/check-rate-limit-key-policy.ts`, plus the narrowest auth, portal, payments, reconciliation, SSRF, or webhook suites touched by the lane
  Handoff notes: summarize dependency-scan status, operational dashboard or policy changes, and any follow-up the queued email or portal review lanes must carry
  Docs ownership: lane
  Disposition: `Review`
- Lane: `e2e-webkit-import-recovery`
  Goal: recover from the WebKit-only lazy-module import console burst without weakening route-health, launch, or audit checks for real route/runtime failures
  Owned paths: `e2e/helpers/**`, `e2e/tests/setup-launch.spec.ts`, `e2e/tests/link-health.spec.ts`, `e2e/tests/visibility-link-audit.spec.ts`
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`
  Expected tests: focused WebKit reruns for setup-launch/link-health/visibility-link-audit routes that failed on `/people`, `/settings/user`, and `/dashboard`, followed by the uninterrupted Docker CI gate when lead-owned integration is ready
  Handoff notes: summarize retry/filter boundaries, any remaining WebKit-only evidence, and the exact focused rerun commands used
  Docs ownership: lead
  Disposition: `Review`
- Coordinated exception, 2026-04-24: `P5-T2D` starts as a narrow `persona-proof-stability` lane while shared route catalogs, workboard updates, and persona-support reclassification stay lead-owned.
  Lead: Codex
  Backend lanes: none
  Frontend lanes: `persona-proof-stability`
  Other lanes: none
  Integration owner: Codex
- Lane: `persona-proof-stability`
  Goal: restore the narrow frontend persona report/portal proof slice without changing persona support claims or widening into browser/runtime drift
  Owned paths: `frontend/src/features/reports/pages/__tests__/ReportsHomePage.test.tsx`, `frontend/src/features/savedReports/pages/__tests__/SavedReportsPage.test.tsx`, `frontend/src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx`, `frontend/src/features/portal/pages/__tests__/PortalWorkflowPages.test.tsx`, plus the smallest frontend test helper or source file needed to remove the timeout
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`, `docs/validation/**`
  Expected tests: `cd frontend && npm run type-check` plus the documented persona frontend slice in [../testing/TESTING.md](../testing/TESTING.md)
  Handoff notes: summarize the timeout root cause, exact frontend proof restored, and any host-only drift that must return to validation/runtime ownership
  Docs ownership: lead
  Disposition: `Review`
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
  Disposition: `Review`
- Lane: `backend-email-renderer`
  Goal: create an email-safe formatter and preview path by reusing template/rendering primitives without coupling blast-email behavior to website runtime assumptions
  Owned paths: `backend/src/services/template/**`, `backend/src/services/site-generator/**`, `backend/src/services/publishing/newsletterHtmlSanitizer.ts`
  Forbidden shared paths: `backend/src/modules/mailchimp/**`, `backend/src/routes/v2/index.ts`, `docs/phases/planning-and-progress.md`, `frontend/src/routes/**`
  Expected tests: targeted template helper and sanitization coverage plus `cd backend && npm run type-check`
  Handoff notes: summarize preview/sanitization contracts and any frontend integration requirements
  Docs ownership: lead
  Disposition: `Review`
- Lane: `frontend-communications-workspace`
  Goal: turn the current communications workspace into the canonical blast-email operations surface while preserving `/settings/communications` and legacy `/settings/email-marketing`
  Owned paths: `frontend/src/features/mailchimp/**`, `frontend/src/features/adminOps/pages/**`, `frontend/src/features/adminOps/components/**`, `frontend/src/features/adminOps/api/adminHubApiClient.ts`
  Forbidden shared paths: `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`
  Expected tests: targeted communications/admin page coverage plus `cd frontend && npm run type-check`
  Handoff notes: summarize UI contract changes, preview flow assumptions, and any docs follow-up
  Docs ownership: lead
  Disposition: `Review`
- Lane: `frontend-email-builder`
  Goal: reuse editor and builder primitives for email composition and preview while keeping email composition data distinct from website template records
  Owned paths: `frontend/src/components/editor/**`, `frontend/src/features/builder/**`
  Forbidden shared paths: `frontend/src/features/mailchimp/**`, `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`
  Expected tests: targeted builder/editor preview coverage plus `cd frontend && npm run type-check`
  Handoff notes: summarize reusable editor primitives, email-safe preview assumptions, and any overlap requiring lead integration
  Docs ownership: lead
  Disposition: `Review`
- Lane: `frontend-builder-remediation`
  Goal: remove stale builder site context and add direct coverage for the extracted builder seams without changing shared routes
  Owned paths: `frontend/src/features/builder/**`
  Forbidden shared paths: `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`
  Expected tests: targeted builder hook/controller coverage plus `cd frontend && npm run type-check`
  Handoff notes: summarize site-context clearing behavior, shortcut behavior, and any editor-state assumptions
  Docs ownership: lead
  Disposition: `Review`
- Lane: `scheduled-reports-proof`
  Goal: make the scheduled-report helper split fully test-covered without changing runtime contracts
  Owned paths: `backend/src/modules/scheduledReports/**`, `backend/src/__tests__/services/scheduledReport*.test.ts`
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, `docs/phases/planning-and-progress.md`, `frontend/src/routes/**`
  Expected tests: targeted scheduled-report unit coverage plus `cd backend && npm run type-check`
  Handoff notes: summarize newly covered branches and any residual untestable paths
  Docs ownership: lead
  Disposition: `Review`
- Lane: `report-template-proof`
  Goal: make the report-template validator split and seed behavior visibly proved through negative-path tests
  Owned paths: `backend/src/modules/reports/services/reportTemplate*.ts`, `backend/src/__tests__/services/reportTemplateService.test.ts`
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, `docs/phases/planning-and-progress.md`, `frontend/src/routes/**`
  Expected tests: targeted report-template service coverage plus `cd backend && npm run type-check`
  Handoff notes: summarize negative-path coverage and any deferred validation hardening
  Docs ownership: lead
  Disposition: `Review`
- Lane: `docs-email-wave`
  Goal: align product/docs/testing language with the scoped blast-email authoring, preview, formatting, and delivery wave
  Owned paths: `docs/product/product-spec.md`, `docs/features/FEATURE_MATRIX.md`, `docs/features/TEMPLATE_SYSTEM.md`, `docs/testing/TESTING.md`
  Forbidden shared paths: `docs/phases/planning-and-progress.md`, `frontend/src/routes/**`, `backend/src/routes/v2/index.ts`
  Expected tests: `make check-links` plus `make lint-doc-api-versioning` when `/api/v2` wording changes
  Handoff notes: summarize docs wording changes and exact validation guidance added
  Docs ownership: lane
  Disposition: `Review`
- Lane: `fundraising-ops-brief`
  Goal: synthesize benchmark-backed fundraising carry-over on saved audiences, campaign-run history, donor preference/receipting, and the boundary into typed appeals; the narrow saved-audience, campaign-run, and donor-profile default pickups are now tied to the queued `P5-T3` runtime slice
  Owned paths: planning docs plus the `P5-T3` Mailchimp/communications and receipt-default implementation seams when lead-owned
  Forbidden shared paths: broader typed appeal, restriction, donation-batch, membership, and generic workflow implementation files until separate scoped rows are signed out
  Expected tests: none; evidence comes from current repo docs, the benchmark canon, and completed clone-review notes
  Handoff notes: provide ranked `PAT-01`, `PAT-02`, `PAT-03`, and `PAT-07` outcomes, concrete landing zones, smallest future type targets (`saved_audience`, `campaign_run`, `donor_profile`), and parity traps around Mailchimp lists/segments or `campaign_name`
  Docs ownership: lead
  Disposition: `Review`
- Lane: `portal-ops-brief`
  Goal: synthesize the next portal carry-over on shared public-intake resolution, reusable queue definitions, shared triage-shell reuse inside `PAT-05`, and typed portal escalations; the narrow `PAT-04`, `PAT-05`, and `PAT-06` pickups are now tied to the review-stage `P5-T5` runtime slice
  Owned paths: planning docs plus the `P5-T5` portal, public-intake, queue-view, and escalation implementation seams when lead-owned
  Forbidden shared paths: broader workflow studios, metadata builders, and later case-form revision review implementation until separate scoped rows are signed out
  Expected tests: none; evidence comes from current repo docs, the benchmark canon, and completed clone-review notes
  Handoff notes: provide ranked `PAT-04`, `PAT-05`, and `PAT-06` outcomes, concrete landing zones, smallest future type targets (shared `public_intake_resolution`, `queue_view_definition`, `portal_escalation`), and parity traps around duplicate resolution, queue reuse, or over-widening the portal review slice
  Docs ownership: lead
  Disposition: `Review`
- Lane: `volunteer-dispatch-brief`
  Goal: synthesize the volunteer-dispatch carry-over on searchable event/task pickers, skill-fit reuse, and dispatch-oriented volunteer detail follow-through without direct repo edits
  Owned paths: none; analysis-only lane
  Forbidden shared paths: all repo-tracked files except lead-owned synthesis docs; report findings to the lead instead of editing directly
  Expected tests: none; evidence comes from current repo docs, the benchmark canon, and completed clone-review notes
  Handoff notes: provide ranked `PAT-14` outcomes, concrete landing zones, and the smallest active task/event picker contract needed for dispatch follow-through, plus parity traps around widening into a new volunteer domain model
  Docs ownership: lead
  Disposition: `Review`
- Lane: `finance-membership-brief`
  Goal: synthesize later-wave typed finance and constituent-lifecycle work on restrictions, donation batches, and memberships without direct repo edits
  Owned paths: none; analysis-only lane
  Forbidden shared paths: all repo-tracked files except lead-owned synthesis docs; report findings to the lead instead of editing directly
  Expected tests: none; evidence comes from current repo docs, the benchmark canon, and completed clone-review notes
  Handoff notes: provide ranked `PAT-09`, `PAT-10`, and `PAT-11` outcomes, concrete landing zones, smallest future type targets (`fund_designation`, `donation_batch`, `membership`), and parity traps around free-text designations, batchless finance review, or contact-role membership inference
  Docs ownership: lead
  Disposition: `Review`
- Lane: `workflow-program-ops-brief`
  Goal: synthesize domain-scoped workflow and program-ops follow-through on transition registries, service-point routing, and case-form approvals without direct repo edits
  Owned paths: none; analysis-only lane
  Forbidden shared paths: all repo-tracked files except lead-owned synthesis docs; report findings to the lead instead of editing directly
  Expected tests: none; evidence comes from current repo docs, the benchmark canon, and completed clone-review notes
  Handoff notes: provide ranked `PAT-08`, `PAT-12`, and `PAT-13` outcomes, concrete landing zones, smallest future type targets (a domain-scoped transition registry, `service_site`, expanded case-form approval states), and parity traps around opening a generic workflow studio or metadata builder
  Docs ownership: lead
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
| P5-T2A | Testing-strategy review artifact and findings | Review | Codex | The Phase 5 testing-strategy review artifact is published and now includes the green final Docker CI artifact. Keep this row in review for final artifact signoff rather than reopening shared validation work. | [../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md](../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md) |
| P5-T2B | Shared validation lane stabilization | Review | Codex | The final uninterrupted `cd e2e && npm run test:docker:ci` artifact passed on 2026-04-24: desktop Docker cross-browser matrix `982` passed / `11` skipped in `51.3m`, followed by Mobile Chrome `3` passed in `13.8s`. Keep this row in review against the validation artifact and leave any future browser drift with the owning runtime or feature row. | [../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md](../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md) |
| P5-T2C | Review findings remediation | Review | Codex | Treat this row as functionally proof-complete and keep it tightly scoped to the surfaced review findings only: the coordinated `frontend-builder-remediation`, `scheduled-reports-proof`, and `report-template-proof` lanes are green in the current tree, the targeted builder/backend service reruns are passing, backend/frontend package type-checks are clean, and shared Docker CI signoff is green. Keep optional hardening ideas deferred unless a future feature rerun points back here, then leave wider email-wave preview/QA/scheduling/delivery work with `P5-T3`. | [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md) |
| P5-T2D | Persona proof lane stabilization | Review | Codex | The narrow `persona-proof-stability` lane is green in targeted frontend proof: stable portal workflow hook callbacks avoid repeated effect retriggers under load, `PortalWorkflowPages.test.tsx` passes, frontend type-check passes, and the documented persona frontend slice passes with `57` tests. Keep any future host-only drift with validation/runtime ownership instead of treating it as persona-support regression. | [../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md](../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md) |
| P5-T4 | Website surfaces wave: website builder plus public website | Review | Codex | The one-form managed public publish-loop proof is now green across the website console, builder, publish flow, public runtime, and shared Docker CI gate. Keep the row in `Review` for final row-local signoff rather than broader validation follow-through. | [../validation/P5-T4_MANAGED_FORM_PUBLISH_LOOP_REVIEW_2026-04-20.md](../validation/P5-T4_MANAGED_FORM_PUBLISH_LOOP_REVIEW_2026-04-20.md) |
| P5-T3 | Email platform wave: blast email plus email builder/formatter | Ready | Codex | When work resumes, fix Mailchimp campaign and preview route validation for `priorRunSuppressionIds`, add focused route tests, review Mailchimp webhook authenticity and PII-safe logging before closeout, then rerun the targeted email proof plus `make db-verify`. Before closeout, attach a compact row-local proof note or explicit durable validation link; keep typed appeals, restrictions, donation batches, memberships, campaign ROI, and generic automation queued behind separate scoped rows. | [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md), [../testing/TESTING.md](../testing/TESTING.md) |
| P5-T5 | Client portal wave | Review | Codex | The current portal carry-over is landed in targeted proof: public-intake audit records explicit match posture, resolution action, and structured business errors; server-backed queue definitions support row actions and empty-state metadata; and case-scoped portal review requests now have staff-facing triage on the Case Detail Portal tab. Before closeout, attach a compact row-local proof note or explicit durable validation link; keep MPI/dedupe consoles, generic saved-search builders, helpdesk/grievance scope, referral engines, and wider service-delivery workflow depth out of this row. | [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md) |
| P5-T6 | Follow-on backlog: workflow/customization, memberships/appeals, finance/program ops | Review | Codex | The capability-based `P5-T6` brief packet is now published in [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md). Keep [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md) as the row-local backlog note, use the brief packet to keep `borrow now`, `queue for P5-T6`, and `reject` decisions explicit, and keep `P5-T6A`, `P5-T6B`, and `P5-T6C` in review against their published planning briefs. Narrow `PAT-01`/`PAT-02`/`PAT-03` runtime pickups ride with `P5-T3`, narrow `PAT-04`/`PAT-05`/`PAT-06` runtime pickups ride with `P5-T5`, and broader runtime implementation remains blocked until a new scoped row is signed out. | [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md), [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md), [../development/reference-patterns/P5-T6-oss-benchmark/adoption-spec.md](../development/reference-patterns/P5-T6-oss-benchmark/adoption-spec.md), [../development/reference-patterns/P5-T6-oss-benchmark/pattern-catalog.md](../development/reference-patterns/P5-T6-oss-benchmark/pattern-catalog.md) |
| P5-T6A | Governance and compliance oversight brief | Review | Codex | The governance/compliance oversight brief is published. Keep board-only posture, governance-risk escalation, board packet workflow, compliance-document retention, and corrective-action tracking planning-only while annual filing and legal review remain explicitly `external only`; runtime implementation still needs a new scoped row before work starts. | [P5-T6A_GOVERNANCE_COMPLIANCE_BRIEF_2026-04-24.md](P5-T6A_GOVERNANCE_COMPLIANCE_BRIEF_2026-04-24.md), [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md), [../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md](../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md) |
| P5-T6B | Fundraising stewardship and restrictions brief | Review | Codex | The fundraising stewardship and restrictions brief is published. Keep saved audiences and campaign-run history tied to the live Mailchimp seam through run-specific provider static segments, keep donor-profile defaults narrow and overrideable, and leave typed appeals, restrictions, donation batches, memberships, and broader fundraising runtime work queued behind separate scoped rows. | [P5-T6B_FUNDRAISING_STEWARDSHIP_RESTRICTIONS_BRIEF_2026-04-25.md](P5-T6B_FUNDRAISING_STEWARDSHIP_RESTRICTIONS_BRIEF_2026-04-25.md), [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md), [../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md](../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md) |
| P5-T6C | Service-delivery workflow depth brief | Review | Codex | The service-delivery workflow depth brief is published. Keep reassessment cadence, structured handoff packets, closure continuity, rehab planning artifacts, and authorization/referral depth planning-only while runtime implementation remains blocked until a future scoped row is signed out. | [P5-T6C_SERVICE_DELIVERY_WORKFLOW_DEPTH_BRIEF_2026-04-24.md](P5-T6C_SERVICE_DELIVERY_WORKFLOW_DEPTH_BRIEF_2026-04-24.md), [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md), [../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md](../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md) |
| P5-T6C1 | Case reassessment cadence runtime slice | Review | Codex | The first scoped `P5-T6C` runtime pickup is landed in targeted proof: case reassessment cycles are backed by explicit `case_reassessment_cycles` records, linked one-time follow-ups, outcome-backed completion, cancellation, and optional next-cycle scheduling from the Case Detail Follow-ups tab. Before closeout, attach a compact row-local proof note or explicit durable validation link; keep later handoff packets, closure continuity, authorization/referral depth, service plans, service-site references, portal routing, offline sync, and generic workflow tooling behind separate scoped rows. | [P5-T6C_SERVICE_DELIVERY_WORKFLOW_DEPTH_BRIEF_2026-04-24.md](P5-T6C_SERVICE_DELIVERY_WORKFLOW_DEPTH_BRIEF_2026-04-24.md), [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md) |
| P5-T6D | Volunteer assignment dispatch radar | Review | Codex | The `dispatch-radar` slice is landed in targeted frontend proof: assignment event/task references use existing event/task clients, planned and active events plus non-terminal tasks are available to staff, and create/update payloads still submit the existing `event_id` or `task_id` fields. Before closeout, attach a compact row-local proof note or explicit durable validation link. | [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md), [../development/reference-patterns/P5-T6-oss-benchmark/pattern-catalog.md](../development/reference-patterns/P5-T6-oss-benchmark/pattern-catalog.md) |
| P5-T7 | Cross-surface modularization hardening | Review | Codex | Behavior-preserving boundary cleanup is landed in focused proof. Before closeout, attach a compact row-local proof note or explicit durable validation link, preserve current route/catalog/root-store/API behavior, and retain the full raw `reportService.test.ts` rerun caveat for the existing ExcelJS/uuid Jest transform issue. | [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md), [../development/COMPATIBILITY_SHIM_DEPRECATION_LEDGER.md](../development/COMPATIBILITY_SHIM_DEPRECATION_LEDGER.md) |
| P5-T8 | Codex skill suite audit and refresh | Review | Codex | Helper-skill routing is refreshed without app contract changes: canonical-doc/helper-prompt boundaries are explicit, stale CBIS app-import guidance is retired and rerouted to current CBIS bundle or generic import/export owners, runtime/E2E guidance matches the current docs, and helper path validation plus docs checks are green. | [../../AGENTS.md](../../AGENTS.md), [../testing/TESTING.md](../testing/TESTING.md), [../validation/README.md](../validation/README.md) |
| P5-T9 | Dead code review | Ready | Codex | Run a repo-wide dead-code and unused-export review across backend, frontend, scripts, and E2E helpers. Use existing tooling where available, separate true removals from compatibility shims or intentionally exported contracts, and produce scoped cleanup rows before deleting shared surfaces. | [../development/CONVENTIONS.md](../development/CONVENTIONS.md), [../development/COMPATIBILITY_SHIM_DEPRECATION_LEDGER.md](../development/COMPATIBILITY_SHIM_DEPRECATION_LEDGER.md) |
| P5-T10 | Dead docs review | Ready | Codex | Review docs for stale, duplicate, historical, or orphaned material that should be archived, consolidated, redirected, or removed. Preserve canonical navigation and avoid deleting validation evidence that still backs active workboard rows. | [../README.md](../README.md), [../validation/README.md](../validation/README.md), [archive/README.md](archive/README.md) |
| P5-T11 | Comprehensive modularity and simplicity refactor plan | Ready | Codex | Plan a broad behavior-preserving refactor for modularity and simplicity across backend modules, frontend feature ownership, shared route/store seams, tests, docs, and compatibility shims. Produce a sequenced implementation plan before any runtime refactor starts. | [../development/SUBAGENT_MODULARIZATION_GUIDE.md](../development/SUBAGENT_MODULARIZATION_GUIDE.md), [../development/BACKEND_MODULE_OWNERSHIP_MAP.md](../development/BACKEND_MODULE_OWNERSHIP_MAP.md) |
| P5-T12 | Full E2E/Playwright review and clean all-green validation | Ready | Codex | Run the full browser/runtime review after cleanup and proof-note rows are settled: `make ci-full`, optional fresh `make test-e2e-docker-smoke`, `cd e2e && npm run test:docker:ci`, `cd e2e && npm run test:docker:audit`, separate fresh-workspace MFA proof when required, and final all-green confirmation with documented skips only. | [../testing/TESTING.md](../testing/TESTING.md), [../validation/README.md](../validation/README.md) |
