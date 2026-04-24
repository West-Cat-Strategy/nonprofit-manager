# Planning & Progress

**Last Updated:** 2026-04-24

## At a Glance

- **Current Phase:** Phase 5 - Email, Website, Portal, and Reliability
- **Phase 5 Plan:** [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md)
- **History:** Historical phase closeouts, transition notes, and earlier workboard material live under [archive/README.md](archive/README.md) and [archive/WORKBOARD_HISTORY_2026.md](archive/WORKBOARD_HISTORY_2026.md).

| Snapshot | Value |
|---|---|
| Active rows | 12 |
| In Progress | 2 |
| Blocked | 0 |
| Review | 9 |
| Ready | 1 |
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
| In Progress | P5-T3 | Email platform wave: blast email plus email builder/formatter | Keep the coordinated email wave active while the current pickup stays behavior-preserving inside the existing Mailchimp and communications seams: builder-authored `POST /api/v2/mailchimp/campaigns` now keeps `builderContent` aligned with preview and scheduled campaigns are labeled as scheduled in the communications workspace, with narrow backend/frontend proof green. Keep the next email widening scoped to the active Mailchimp/communications seams instead of drifting into later fundraising types. |
| In Progress | P5-T5 | Client portal wave | The first portal forms slice remains green in targeted backend/frontend/docs/E2E proof, and the next scoped pickup is now landed in targeted backend/frontend proof: `/api/v2/portal/appointments*` plus `/portal/appointments` are case-aware with selected-case summary cues, case number/title on appointment cards, pointperson context, and quick links back to the case workspace and messages. Keep the next proof step narrow: finish the focused portal Playwright/browser follow-through, then choose the next portal slice without widening beyond current route seams. |

### Review Queue

| Status | ID | Task | Immediate Next Move |
|---|---|---|---|
| Review | P5-T2A | Testing-strategy review artifact and findings | Keep [../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md](../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md) as the canonical artifact. The final uninterrupted Docker CI artifact is now green alongside host coverage, auth-alias handoff, fresh-volume Docker MFA proof, Docker smoke, Docker audit, and the focused Firefox/WebKit recovery proofs; keep this row in review for final artifact signoff rather than reopening shared validation work. |
| Review | P5-T2B | Shared validation lane stabilization | The final uninterrupted `cd e2e && npm run test:docker:ci` artifact passed on 2026-04-24: desktop Docker cross-browser matrix `982` passed / `11` skipped in `51.3m`, followed by Mobile Chrome `3` passed in `13.8s`. Keep [../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md](../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md) as the artifact record and leave any future browser drift with the owning runtime or feature row. |
| Review | P5-T2C | Review findings remediation | Treat this row as functionally proof-complete and keep it tightly scoped to the surfaced review findings only: the targeted builder remediation tests, scheduled-report proof, report-template proof, backend/frontend package type-checks, and shared Docker CI signoff are green in the current tree. Keep optional hardening ideas deferred unless a future feature rerun points back here, then leave wider email-wave follow-through with `P5-T3`. |
| Review | P5-T2D | Persona proof lane stabilization | The narrow `persona-proof-stability` lane is green in targeted frontend proof: stable portal workflow hook callbacks avoid repeated effect retriggers under load, `PortalWorkflowPages.test.tsx` passes, frontend type-check passes, and the full documented persona frontend slice passes with `57` tests. Keep any future host-only drift with validation/runtime ownership instead of reclassifying persona support. |
| Review | P5-T4 | Website surfaces wave: website builder plus public website | Use [../validation/P5-T4_MANAGED_FORM_PUBLISH_LOOP_REVIEW_2026-04-20.md](../validation/P5-T4_MANAGED_FORM_PUBLISH_LOOP_REVIEW_2026-04-20.md) as the row-local proof note for the one-form managed publish loop. The shared `P5-T2B` Docker CI gate is now green, so keep this row in review for final row-local signoff rather than broad validation follow-through. |
| Review | P5-T6 | Follow-on backlog: workflow/customization, memberships/appeals, finance/program ops | Use [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md) as the published capability-brief packet alongside [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md). Keep `P5-T6A` and `P5-T6C` in review against their published planning briefs, keep `P5-T6B` behind the `P5-T3` handoff, and do not widen into runtime implementation until a new scoped row is signed out. |
| Review | P5-T6A | Governance and compliance oversight brief | Use [P5-T6A_GOVERNANCE_COMPLIANCE_BRIEF_2026-04-24.md](P5-T6A_GOVERNANCE_COMPLIANCE_BRIEF_2026-04-24.md) as the planning artifact for board-only posture, governance-risk escalation, board packet workflow, compliance-document retention, and corrective-action tracking. Keep annual filing and legal review explicitly `external only`; runtime implementation still needs a new scoped row before work starts. |
| Review | P5-T6C | Service-delivery workflow depth brief | Use [P5-T6C_SERVICE_DELIVERY_WORKFLOW_DEPTH_BRIEF_2026-04-24.md](P5-T6C_SERVICE_DELIVERY_WORKFLOW_DEPTH_BRIEF_2026-04-24.md) as the planning artifact for reassessment cadence, structured handoff packets, closure continuity, rehab planning artifacts, and authorization/referral depth. Keep runtime implementation blocked until a future scoped row is signed out. |
| Review | P5-T6D | Volunteer assignment dispatch radar | The signed-out Operation Signal Bridge `dispatch-radar` slice is landed in targeted frontend proof: assignment event/task references now use active pickers backed by existing event/task clients, planned and active events plus non-terminal tasks are available, and the saved assignment payload still submits `event_id` or `task_id`. Keep `campaign-control` behind the `P5-T3` handoff and `clearwater` behind the `P5-T5` handoff. |

### Ready Queue

| Status | ID | Task | Immediate Next Move |
|---|---|---|---|
| Ready | P5-T6B | Fundraising stewardship and restrictions brief | After the current email-wave handoff, draft the smallest fundraiser-depth brief that connects donor-preference governance, acknowledgment handoff, campaign/deadline orchestration, and typed appeals/restriction modeling to the live Mailchimp, donations, recurring, and reporting seams. |

### Ready Next

- Keep `P5-T2D` in review against the green frontend persona-proof slice; any future browser-only drift returns to validation/runtime ownership rather than persona reclassification.
- Keep `P5-T6A` in review against its published governance/compliance brief, keep `P5-T6C` in review against its published service-delivery workflow depth brief, and queue `P5-T6B` behind the `P5-T3` handoff.
- Use [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md) to keep `borrow now`, `queue for P5-T6`, and `reject` decisions explicit; `P5-T6D` is the only signed-out runtime pickup from that packet, and broader runtime rows still need their own signout.

## Current Phase Shape

- The Phase 5 docs, archive, benchmark, and persona-skill refresh is complete and archived in [archive/P5-T1_CLOSEOUT_2026-04-20.md](archive/P5-T1_CLOSEOUT_2026-04-20.md).
- Phase 5's shared Playwright/E2E and testing-strategy review lane has moved into `Review`: the final uninterrupted `cd e2e && npm run test:docker:ci` artifact passed after the earlier UI-audit, dependency-audit, backend coverage, security-baseline, Docker smoke/audit, fresh Docker MFA, and focused Firefox/WebKit broad-failure blockers were cleared in targeted proof.
- `P5-T2C` is now in `Review`: the stale builder site-context fix, extracted builder shortcut/site-context proof, scheduled-report helper/service proof, report-template negative-path proof, backend/frontend package type-checks, and shared Docker CI signoff are green in the current tree. Keep optional hardening ideas deferred unless a future feature rerun points directly back here, and leave broader email-wave follow-through with `P5-T3`.
- `P5-T2D` is now in `Review`: the narrow persona-proof-stability lane fixed the portal workflow test timeout risk by stabilizing mocked refresh/load-more callbacks, and frontend type-check plus the documented persona frontend slice are green.
- Security hardening remains recorded under `P5-T2B`, not as a fourth product wave: the deliberate backend `exceljs -> uuid` remediation is landed, the live security baseline is green again, the auth-alias operational handoff is published, and the shared Docker CI gate is green. The active email/portal slices must keep permission, PII/audit, rate-limit, and SSRF proof current through the published [../validation/PHASE_5_SECURITY_REVIEW_2026-04-22.md](../validation/PHASE_5_SECURITY_REVIEW_2026-04-22.md).
- Product execution then centers on blast email plus the email builder/formatter, website builder plus public website, and the client portal.
- The first `P5-T5` portal forms inbox slice is now green in targeted backend/frontend/docs/E2E proof, and the next named portal slice, case-aware appointments continuity, is now landed in targeted backend/frontend proof; the next portal follow-through should stay focused on the browser proof for that slice before widening again.
- Follow-on backlog from repo review and external benchmarking now has a published capability-brief packet in [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md). The repo-by-repo OSS benchmark review wave is complete, the five analysis-only lanes now keep `borrow now`, `queue for P5-T6`, and `reject` outcomes explicit, `P5-T6A` has a governance/compliance oversight brief in review, `P5-T6C` has a service-delivery workflow depth brief in review, and the current persona gaps review still queues `P5-T6B` fundraising stewardship/restrictions.
- `P5-T3` and `P5-T5` remain the active runtime waves, while `P5-T6` now sits in `Review` as the planning packet feeding `P5-T6A`, `P5-T6B`, and `P5-T6C`; `P5-T6C` is in `Review` against its published planning brief, `P5-T6D` is the narrow volunteer-dispatch carry-over in `Review`, and later typed-domain runtime rows still need separate signout.

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
- Coordinated exception, 2026-04-22: `P5-T3` and `P5-T6` are active in parallel while shared route/workboard seams stay lead-owned.
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
  Handoff notes: summarize dependency-scan status, operational dashboard or policy changes, and any follow-up the active email or portal lanes must carry
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
  Goal: align product/docs/testing language with the active blast-email authoring, preview, formatting, and delivery wave
  Owned paths: `docs/product/product-spec.md`, `docs/features/FEATURE_MATRIX.md`, `docs/features/TEMPLATE_SYSTEM.md`, `docs/testing/TESTING.md`
  Forbidden shared paths: `docs/phases/planning-and-progress.md`, `frontend/src/routes/**`, `backend/src/routes/v2/index.ts`
  Expected tests: `make check-links` plus `make lint-doc-api-versioning` when `/api/v2` wording changes
  Handoff notes: summarize docs wording changes and exact validation guidance added
  Docs ownership: lane
  Disposition: `In Progress`
- Lane: `fundraising-ops-brief`
  Goal: synthesize benchmark-backed fundraising carry-over on saved audiences, campaign-run history, donor preference/receipting, and the boundary into typed appeals without direct repo edits
  Owned paths: none; analysis-only lane
  Forbidden shared paths: all repo-tracked files except lead-owned synthesis docs; report findings to the lead instead of editing directly
  Expected tests: none; evidence comes from current repo docs, the benchmark canon, and completed clone-review notes
  Handoff notes: provide ranked `PAT-01`, `PAT-02`, `PAT-03`, and `PAT-07` outcomes, concrete landing zones, smallest future type targets (`saved_audience`, `campaign_run`, `donor_profile`), and parity traps around Mailchimp lists/segments or `campaign_name`
  Docs ownership: lead
  Disposition: `Review`
- Lane: `portal-ops-brief`
  Goal: synthesize the next portal carry-over on shared public-intake resolution, reusable queue definitions, shared triage-shell reuse inside `PAT-05`, and typed portal escalations without direct repo edits
  Owned paths: none; analysis-only lane
  Forbidden shared paths: all repo-tracked files except lead-owned synthesis docs; report findings to the lead instead of editing directly
  Expected tests: none; evidence comes from current repo docs, the benchmark canon, and completed clone-review notes
  Handoff notes: provide ranked `PAT-04`, `PAT-05`, and `PAT-06` outcomes, concrete landing zones, smallest future type targets (shared `public_intake_resolution`, `queue_view_definition`, `portal_escalation`), and parity traps around duplicate resolution, queue reuse, or over-widening the active portal slice
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
| P5-T3 | Email platform wave: blast email plus email builder/formatter | In Progress | Codex | Keep `/api/v2/mailchimp/*` as the outbound contract while the current pickup stays behavior-preserving inside the existing Mailchimp and communications seams. Builder-authored campaign creation now passes `builderContent` through the create path in line with preview, scheduled campaigns use scheduled copy in the communications workspace, and targeted backend/frontend proof is green. Any next send, schedule, preview, or outbound integration widening must stay inside the active email seam and keep targeted route-security, preview-sanitization, and SSRF-sensitive integration proof current. | [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md) |
| P5-T5 | Client portal wave | In Progress | Codex | The portal forms inbox slice is now green in targeted proof, and the next named portal slice, case-aware appointments continuity, is landed in targeted backend/frontend proof: `/api/v2/portal/appointments*` remains the canonical contract, `/portal/appointments` now keeps selected-case context visible, and appointment cards expose client-safe case and pointperson cues with links back to the case workspace and messages. Finish the focused portal Playwright proof, then choose the next portal slice without widening beyond the current portal and case seams. Any broader portal pickup must keep object-level authorization plus PII and audit proof current before widening again. | [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md) |
| P5-T6 | Follow-on backlog: workflow/customization, memberships/appeals, finance/program ops | Review | Codex | The capability-based `P5-T6` brief packet is now published in [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md). Keep [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md) as the row-local backlog note, use the brief packet to keep `borrow now`, `queue for P5-T6`, and `reject` decisions explicit, keep `P5-T6A` and `P5-T6C` in review against their published planning briefs, and keep `P5-T6B` queued behind the `P5-T3` handoff. Runtime implementation remains blocked on the active product waves until a new scoped row is signed out. | [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md), [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md), [../development/reference-patterns/P5-T6-oss-benchmark/adoption-spec.md](../development/reference-patterns/P5-T6-oss-benchmark/adoption-spec.md), [../development/reference-patterns/P5-T6-oss-benchmark/pattern-catalog.md](../development/reference-patterns/P5-T6-oss-benchmark/pattern-catalog.md) |
| P5-T6A | Governance and compliance oversight brief | Review | Codex | The governance/compliance oversight brief is published. Keep board-only posture, governance-risk escalation, board packet workflow, compliance-document retention, and corrective-action tracking planning-only while annual filing and legal review remain explicitly `external only`; runtime implementation still needs a new scoped row before work starts. | [P5-T6A_GOVERNANCE_COMPLIANCE_BRIEF_2026-04-24.md](P5-T6A_GOVERNANCE_COMPLIANCE_BRIEF_2026-04-24.md), [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md), [../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md](../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md) |
| P5-T6B | Fundraising stewardship and restrictions brief | Ready | Codex | After the `P5-T3` handoff, draft the smallest fundraiser-depth brief that connects donor-preference governance, acknowledgment handoff, campaign/deadline orchestration, and typed appeals/restriction modeling to the live Mailchimp, donations, recurring, and reporting seams. | [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md), [../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md](../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md) |
| P5-T6C | Service-delivery workflow depth brief | Review | Codex | The service-delivery workflow depth brief is published. Keep reassessment cadence, structured handoff packets, closure continuity, rehab planning artifacts, and authorization/referral depth planning-only while runtime implementation remains blocked until a future scoped row is signed out. | [P5-T6C_SERVICE_DELIVERY_WORKFLOW_DEPTH_BRIEF_2026-04-24.md](P5-T6C_SERVICE_DELIVERY_WORKFLOW_DEPTH_BRIEF_2026-04-24.md), [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md), [../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md](../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md) |
| P5-T6D | Volunteer assignment dispatch radar | Review | Codex | The `dispatch-radar` slice is landed in targeted frontend proof: assignment event/task references use existing event/task clients, planned and active events plus non-terminal tasks are available to staff, and create/update payloads still submit the existing `event_id` or `task_id` fields. | [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md), [../development/reference-patterns/P5-T6-oss-benchmark/pattern-catalog.md](../development/reference-patterns/P5-T6-oss-benchmark/pattern-catalog.md) |
