# Planning & Progress

**Last Updated:** 2026-04-26

## At a Glance

- **Current Phase:** Phase 5 - Email, Website, Portal, and Reliability
- **Phase 5 Plan:** [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md)
- **History:** Historical phase closeouts, transition notes, and earlier workboard material live under [archive/README.md](archive/README.md) and [archive/WORKBOARD_HISTORY_2026.md](archive/WORKBOARD_HISTORY_2026.md).

| Snapshot | Value |
|---|---|
| Active rows | 3 |
| In Progress | 1 |
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
| In Progress | P5-T13 | GitHub CI/security pilot | Add GitHub Actions mirrors for full CI, security scan, CodeQL, and dependency review; add Dependabot and workflow ownership config; enable repository security settings; then protect `main` once required check contexts exist. Keep local `make` targets as the canonical command surface and do not add deploy automation, MCP config, hooks, SaaS review bots, Semgrep, Trivy, Harden-Runner, Redocly, or Knip expansion in this row. |

### Review Queue

| Status | ID | Task | Immediate Next Move |
|---|---|---|---|
| Review | P5-T6 | Follow-on backlog: workflow/customization, memberships/appeals, finance/program ops | Use [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md) as the published capability-brief packet alongside [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md). Child planning briefs `P5-T6A`, `P5-T6B`, and `P5-T6C` are signed off in [archive/P5_REVIEW_SIGNOFF_CLOSEOUT_BATCH_2026-04-25.md](archive/P5_REVIEW_SIGNOFF_CLOSEOUT_BATCH_2026-04-25.md); keep the narrow `PAT-01`/`PAT-02`/`PAT-03` fundraising pickups signed off with `P5-T3`, `PAT-04`/`PAT-05`/`PAT-06` portal pickups signed off with `P5-T5`, and typed appeals, restrictions, donation batches, memberships, finance breadth, and generic workflow tooling behind separate scoped rows. |
| Review | P5-T12 | Full E2E/Playwright review and clean all-green validation | Host and Docker proof is green in [../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md](../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md): `make ci-full`, fresh-stack `cd e2e && npm run test:docker:ci`, and fresh-stack `cd e2e && npm run test:docker:audit` all passed. Keep this row in review for final artifact signoff rather than reopening runtime work. |

### Ready Queue

| Status | ID | Task | Immediate Next Move |
|---|---|---|---|
| _None_ | _None_ | _None_ | No row is currently ready and unsigned. |

### Ready Next

- `P5-T3` is archived in [archive/P5-T3_EMAIL_HARDENING_CLOSEOUT_2026-04-25.md](archive/P5-T3_EMAIL_HARDENING_CLOSEOUT_2026-04-25.md) with row-local proof in [../validation/P5-T3_EMAIL_HARDENING_PROOF_2026-04-25.md](../validation/P5-T3_EMAIL_HARDENING_PROOF_2026-04-25.md); typed appeals, restrictions, donation batches, memberships, campaign ROI, and generic automation still need separate scoped rows.
- `P5-T5`, `P5-T6C1`, `P5-T6D`, and `P5-T7` are archived in [archive/P5_RUNTIME_REVIEW_CLOSEOUT_BATCH_2026-04-25.md](archive/P5_RUNTIME_REVIEW_CLOSEOUT_BATCH_2026-04-25.md); any future shim removal must stay lead-owned and preserve current `/api/v2`, route-catalog, root-store, auth/workspace-module, and browser URL contracts.
- Use [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md) to keep `borrow now`, `queue for P5-T6`, and `reject` decisions explicit; signoff-only child briefs are archived in [archive/P5_REVIEW_SIGNOFF_CLOSEOUT_BATCH_2026-04-25.md](archive/P5_REVIEW_SIGNOFF_CLOSEOUT_BATCH_2026-04-25.md), and broader runtime rows still need their own signout.
- `P5-T9`, `P5-T10`, and `P5-T11` are archived in [archive/P5_REVIEW_CLEANUP_PLANNING_CLOSEOUT_2026-04-25.md](archive/P5_REVIEW_CLEANUP_PLANNING_CLOSEOUT_2026-04-25.md); their cleanup implementation rows `P5-T9A`, `P5-T9B`, `P5-T9C`, `P5-T10A`, and `P5-T11A` are archived in [archive/P5_CLEANUP_WAVE_CLOSEOUT_2026-04-25.md](archive/P5_CLEANUP_WAVE_CLOSEOUT_2026-04-25.md).
- `P5-T12` is in `Review` with host-first and Docker follow-on proof recorded in [../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md](../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md). Do not reopen runtime scope from this row unless a future full-gate rerun finds a concrete owning failure.
- `P5-T13` is signed out for the GitHub CI/security pilot. Keep proof in [../validation/P5-T13_GITHUB_CI_SECURITY_PILOT_2026-04-26.md](../validation/P5-T13_GITHUB_CI_SECURITY_PILOT_2026-04-26.md), and do not expand this row into deploy automation, MCP config, hooks, SaaS review bots, Semgrep, Trivy, Harden-Runner, Redocly, or Knip expansion.

## Current Phase Shape

- The Phase 5 docs, archive, benchmark, and persona-skill refresh is complete and archived in [archive/P5-T1_CLOSEOUT_2026-04-20.md](archive/P5-T1_CLOSEOUT_2026-04-20.md).
- The shared testing, remediation, persona, website, helper-skill, and planning-only child review rows are signed off and archived in [archive/P5_REVIEW_SIGNOFF_CLOSEOUT_BATCH_2026-04-25.md](archive/P5_REVIEW_SIGNOFF_CLOSEOUT_BATCH_2026-04-25.md).
- `P5-T5`, `P5-T6C1`, `P5-T6D`, and `P5-T7` are signed off and archived in [archive/P5_RUNTIME_REVIEW_CLOSEOUT_BATCH_2026-04-25.md](archive/P5_RUNTIME_REVIEW_CLOSEOUT_BATCH_2026-04-25.md). Durable proof notes now live under [../validation/README.md](../validation/README.md), and the API-key/webhooks boundary seam passed targeted backend tests, module-boundary policy, canonical-import policy, and backend type-check.
- `P5-T3` is signed off and archived in [archive/P5-T3_EMAIL_HARDENING_CLOSEOUT_2026-04-25.md](archive/P5-T3_EMAIL_HARDENING_CLOSEOUT_2026-04-25.md). The narrowed Mailchimp route validation, optional webhook secret, and PII-safe webhook logging proof lives in [../validation/P5-T3_EMAIL_HARDENING_PROOF_2026-04-25.md](../validation/P5-T3_EMAIL_HARDENING_PROOF_2026-04-25.md).
- `P5-T9`, `P5-T10`, and `P5-T11` are signed off and archived in [archive/P5_REVIEW_CLEANUP_PLANNING_CLOSEOUT_2026-04-25.md](archive/P5_REVIEW_CLEANUP_PLANNING_CLOSEOUT_2026-04-25.md); their cleanup implementation rows are signed off separately.
- `P5-T6` remains in `Review` as the parent capability/backlog packet. Keep `borrow now`, `queue for P5-T6`, and `reject` decisions explicit while broader typed appeals, restrictions, donation batches, memberships, finance breadth, and generic workflow tooling wait for separately scoped rows.
- `P5-T9A`, `P5-T9B`, `P5-T9C`, `P5-T10A`, and `P5-T11A` are signed off and archived in [archive/P5_CLEANUP_WAVE_CLOSEOUT_2026-04-25.md](archive/P5_CLEANUP_WAVE_CLOSEOUT_2026-04-25.md), with proof in [../validation/P5_CLEANUP_WAVE_PROOF_2026-04-25.md](../validation/P5_CLEANUP_WAVE_PROOF_2026-04-25.md).
- `P5-T12` is in `Review` after the final full E2E/Playwright clean-green validation lane passed across host `make ci-full`, fresh-stack Docker CI, and fresh-stack Docker audit proof.
- `P5-T13` is in progress for the first GitHub CI/security pilot: GitHub Actions should mirror the local `make ci-full` and `make security-scan` gates, add CodeQL and dependency review, enable repository security settings, and protect `main` after the required check contexts exist.
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
  Owned paths: `frontend/src/features/builder/**`
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
  Owned paths: `backend/src/modules/socialMedia/**`, `backend/src/modules/socialMedia/services/socialMediaSyncSchedulerService.ts`, social-media backend tests
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
  Owned paths: `frontend/src/features/websites/**`, `frontend/src/features/builder/**`, `frontend/src/types/websiteBuilder.ts`
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
  Owned paths: `frontend/src/features/builder/**`
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
  Goal: synthesize benchmark-backed fundraising carry-over on saved audiences, campaign-run history, donor preference/receipting, and the boundary into typed appeals; the narrow saved-audience, campaign-run, donor-profile default, route-validation, and webhook-hardening pickups are signed off through `P5-T3`
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
- Coordinated exception, 2026-04-25: `P5-T11A` is split across parallel implementation-size cleanup lanes while shared workboard, public type exports, and final validation stay lead-owned.
  Lead: Codex
  Backend lanes: `backend-cases-route-schemas`, `backend-mailchimp-service`
  Frontend lanes: `frontend-mailchimp-modal`
  Other lanes: none
  Integration owner: Codex
- Lane: `backend-cases-route-schemas`
  Goal: extract case route schemas into a route-local module without changing route registration order or request/response behavior
  Owned paths: `backend/src/modules/cases/routes/**`, cases backend tests
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, `docs/phases/planning-and-progress.md`, frontend paths
  Expected tests: `cd backend && npm test -- --runInBand src/__tests__/integration/cases.test.ts` plus backend type-check handoff
  Handoff notes: summarize extracted schemas, route-order preservation, and any validation helper changes
  Docs ownership: lead
- Lane: `backend-mailchimp-service`
  Goal: extract Mailchimp campaign/audience helper logic while preserving public service facade exports and route behavior
  Owned paths: `backend/src/modules/mailchimp/services/**`, Mailchimp backend service tests
  Forbidden shared paths: `backend/src/modules/mailchimp/routes/**`, `backend/src/modules/mailchimp/controllers/**`, `docs/phases/planning-and-progress.md`, frontend paths
  Expected tests: `cd backend && npm test -- --runInBand src/__tests__/services/mailchimpService.test.ts src/__tests__/modules/mailchimp.routes.security.test.ts` plus backend type-check handoff
  Handoff notes: summarize extracted helpers, facade exports preserved, and any cycle-avoidance assumptions
  Docs ownership: lead
- Lane: `frontend-mailchimp-modal`
  Goal: move the campaign creation modal out of the oversized Mailchimp page-parts file without changing the communications workspace flow
  Owned paths: `frontend/src/features/mailchimp/components/**`, `frontend/src/features/adminOps/pages/__tests__/EmailMarketingPage.test.tsx`
  Forbidden shared paths: `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`, backend paths
  Expected tests: `cd frontend && npm test -- --run src/features/adminOps/pages/__tests__/EmailMarketingPage.test.tsx` plus frontend type-check handoff
  Handoff notes: summarize import/export shape and visible campaign creation behavior
  Docs ownership: lead
- Coordinated exception, 2026-04-25: `P5-T9B` is split as a frontend builder cleanup lane while shared workboard, compatibility notes, and final validation stay lead-owned.
  Lead: Codex
  Backend lanes: none
  Frontend lanes: `frontend-builder-shim-retirement`
  Other lanes: none
  Integration owner: Codex
- Lane: `frontend-builder-shim-retirement`
  Goal: retire root builder/editor/template component wrappers and migrate wrapper tests to feature-owned builder paths
  Owned paths: retired root wrappers under `frontend/src/components/editor/**` and `frontend/src/components/templates/**`, `frontend/src/features/builder/components/**`, `scripts/baselines/implementation-size.json`
  Forbidden shared paths: `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`, backend paths
  Expected tests: migrated builder/editor Vitest slices plus `cd frontend && npm run type-check`
  Handoff notes: summarize removed wrappers, migrated tests, and any stale ownership references for lead cleanup
  Docs ownership: lead
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
| P5-T6 | Follow-on backlog: workflow/customization, memberships/appeals, finance/program ops | Review | Codex | The capability-based `P5-T6` brief packet is published in [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md), and child planning briefs `P5-T6A`, `P5-T6B`, and `P5-T6C` are signed off in [archive/P5_REVIEW_SIGNOFF_CLOSEOUT_BATCH_2026-04-25.md](archive/P5_REVIEW_SIGNOFF_CLOSEOUT_BATCH_2026-04-25.md). Keep [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md) as the row-local backlog note, keep `borrow now`, `queue for P5-T6`, and `reject` decisions explicit, and leave broader runtime implementation blocked until a new scoped row is signed out. | [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md), [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md), [archive/P5_REVIEW_SIGNOFF_CLOSEOUT_BATCH_2026-04-25.md](archive/P5_REVIEW_SIGNOFF_CLOSEOUT_BATCH_2026-04-25.md), [../development/reference-patterns/P5-T6-oss-benchmark/adoption-spec.md](../development/reference-patterns/P5-T6-oss-benchmark/adoption-spec.md), [../development/reference-patterns/P5-T6-oss-benchmark/pattern-catalog.md](../development/reference-patterns/P5-T6-oss-benchmark/pattern-catalog.md) |
| P5-T12 | Full E2E/Playwright review and clean all-green validation | Review | Codex | Host `make ci-full`, fresh-stack Docker CI, and fresh-stack Docker audit proof are green and recorded in [../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md](../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md). Keep this row in review for final signoff; any future runtime failure needs an owning scoped follow-up. | [../testing/TESTING.md](../testing/TESTING.md), [../validation/README.md](../validation/README.md), [../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md](../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md) |
| P5-T13 | GitHub CI/security pilot | In Progress | Codex | Add GitHub-hosted mirrors for `make ci-full`, `make security-scan`, CodeQL, and dependency review; enable GitHub security settings; and protect `main` once the required check contexts exist. Keep local `make` commands canonical and leave deploy automation, MCP config, hooks, SaaS review bots, Semgrep, Trivy, Harden-Runner, Redocly, and Knip expansion out of this row. | [../../.github/README.md](../../.github/README.md), [../testing/TESTING.md](../testing/TESTING.md), [../validation/P5-T13_GITHUB_CI_SECURITY_PILOT_2026-04-26.md](../validation/P5-T13_GITHUB_CI_SECURITY_PILOT_2026-04-26.md), [../validation/PHASE_5_SECURITY_REVIEW_2026-04-22.md](../validation/PHASE_5_SECURITY_REVIEW_2026-04-22.md) |
