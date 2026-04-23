# Governance And Revenue Personas

This file is the canonical detailed layer for leadership, governance, fundraising, and administrative personas.

## Validation Notes

- Read these cards together with `frontend/src/test/ux/personaWorkflowMatrix.ts`, `frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx`, and `e2e/tests/persona-workflows.spec.ts` when you need to confirm whether a route or workflow claim is actually exercised in the repo.
- Use `Confirmed repo evidence` for route, permission, and test-backed claims.
- Use `Inference` for role mapping, packet composition, and other boundary judgments that the repo does not state directly.
- Treat board packets, filings, stewardship outreach, and governance exception handling as outside-the-app boundaries unless the repo shows a first-class in-app workflow.

## Executive Director

- `canonical_role_boundary`: `admin`; mapping source `backend/src/modules/admin/usecases/roleCatalogUseCase.ts` and `backend/src/utils/permissions.ts`; confidence `High`; confirmed permissions include dashboards, analytics, reports, scheduled reports, and organization-level oversight; workflow scope covers executive reporting, governance review, restricted-funds oversight, and escalation handoff; explicitly inferred scope excludes a first-class board packet composer, formal governance exception workspace, and a full IRS 990 workflow.
- `persona_id`: `executive-director`
- `operating_context`: Organization-wide steward balancing fundraising, service delivery, governance, staffing risk, and board readiness without living in day-to-day transactional screens.
- `decision_authority`: Can set organizational priorities, trigger escalations, and approve cross-functional follow-through; typically relies on admins, managers, finance, and program leads for detailed execution and evidence collection.
- `collaboration_map`: Collaborates with Fundraisers on donor and campaign health, Nonprofit Administrators on access and reporting reliability, Board Members on oversight packets, and service-delivery leaders on outcomes and continuity risks.
- `primary_modules`: Workbench, Dashboard and Analytics, Reports, Saved Reports, Scheduled Reports, outcomes reporting, workflow coverage, and light admin-visibility surfaces.
- `usage_cadence`: Daily summary review, weekly exception review, and monthly board or leadership packet preparation.
- `top_jobs`: Review organization health, compare fundraising and program performance, spot governance-risk signals, and move high-risk issues to the right owner quickly.
- `dashboard_report_needs`: High-signal board-ready views, scheduled packets, donor or program variance snapshots, restricted-funds watchlists, and drill-downs that avoid raw-record reconstruction.
- `core_artifacts`: Leadership packet, board packet, scheduled report bundle, escalation summary, restricted-funds review note, and cross-functional action list.
- `sensitive_data_boundaries`: Broad visibility is appropriate, but default UX should emphasize oversight over staff-style editing. Finance, governance, and policy-sensitive surfaces should remain conservative in ambiguous states.
- `adoption_constraints`: Weak board-packet orchestration, changing dashboard/admin surfaces, and external compliance steps can cause users to over-assume the app owns more governance workflow than it currently does.
- `success_signals`: The Executive Director can conduct recurring reviews from reusable views, identify what needs immediate escalation, and trust that leadership packets are consistent and audit-aware.
- `pain_points`: Rebuilding context through exports, over-trusting partial restricted-funds workflows, and losing governance continuity when escalation paths live outside a first-class workspace.
- `anchor_scenarios`: Primary scenario: run a weekly health scan, prepare a monthly leadership packet, and route a fundraising-risk item plus a service-delivery-risk item to the correct owner. Failure-mode scenario: assume the app owns filing and governance exception tracking end to end and miss an external compliance deadline.
- `external_analogs`: CiviCRM sharpens the leadership persona through dashboarded fundraising and case reporting; OpenPetra sharpens the finance-control and batch-audit lens; ERPNext sharpens typed grants, members, and accounting visibility; SuiteCRM sharpens workflow automation and campaign visibility for leadership review.
- `evidence`: `docs/product/product-spec.md`, `docs/features/FEATURE_MATRIX.md`, `docs/features/REPORTING_GUIDE.md`, `frontend/src/features/dashboard/pages/WorkbenchDashboardPage.tsx`, `frontend/src/features/reports/routes/createReportRoutes.tsx`, `frontend/src/features/adminOps/adminRouteManifest.ts`, `frontend/src/test/ux/personaWorkflowMatrix.ts`, `frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx`, `e2e/tests/persona-workflows.spec.ts`, and `docs/validation/archive/persona-workflow-audit-2026-04-18.md`.

## Fundraiser

- `canonical_role_boundary`: default `manager` with occasional `admin` when receipting or payment authority is explicitly delegated; mapping source `backend/src/utils/permissions.ts`; confidence `Medium`; confirmed permissions include people, accounts, donations, opportunities, and reporting surfaces; workflow scope covers donor triage, stewardship cadence, campaign review, and restricted-gift handling; explicitly inferred scope excludes formal prospect research systems, full grant-compliance calendars, and complete donor-consent governance.
- `persona_id`: `fundraiser`
- `operating_context`: Revenue operator balancing donor relationships, gift integrity, stewardship deadlines, and campaign updates across a mix of structured CRM data and external outreach tools.
- `decision_authority`: Can manage donor records, campaign prioritization, and stewardship follow-through; usually escalates receipting exceptions, finance-policy conflicts, and high-sensitivity restriction questions.
- `collaboration_map`: Collaborates with Executive Directors on board-ready fundraising context, Nonprofit Administrators on reporting and access reliability, finance or payment owners on gift-state issues, and communications owners on donor outreach.
- `primary_modules`: Contacts, Accounts, Donations, Opportunities, Reports, Scheduled Reports, and relevant engagement or communication surfaces when enabled.
- `usage_cadence`: Daily donor and gift review, weekly stewardship and campaign planning, monthly reporting contributions.
- `top_jobs`: Keep donor records clean, prioritize prospects and lapsed donors, track gift state, preserve donor preferences, and route stewardship actions.
- `dashboard_report_needs`: Donor funnel summaries, recurring-giving trends, restricted-gift watchlists, stewardship snapshots, and campaign packet views that can be shared safely.
- `core_artifacts`: Prospect list, stewardship plan, donation review queue, campaign summary, acknowledgment handoff list, and donor preference note.
- `sensitive_data_boundaries`: Donor contact details, amounts, payment state, preferences, and restricted-use details are all high sensitivity. Sharing defaults should stay conservative.
- `adoption_constraints`: Partial stewardship tooling, weaker donation-specific reporting proof than the docs imply, and external communication systems can make the role feel split across tools.
- `success_signals`: The Fundraiser can triage donors quickly, trust gift status, and maintain preference and restriction discipline across campaigns.
- `pain_points`: Search misses, duplicate profiles, weak in-app prospect research, payment-state ambiguity, and partial stewardship automation.
- `anchor_scenarios`: Primary scenario: review a prospect list, confirm donor and gift status, plan stewardship follow-through, and prepare a clean leadership summary. Failure-mode scenario: donor preferences or restricted-use terms fall out of the workflow because they are only partially modeled in-product.
- `external_analogs`: CiviCRM sharpens constituent segmentation, fundraising campaigns, and memberships; OpenPetra sharpens donation-batch and finance-control habits; ERPNext sharpens typed donor or member entities plus payment automation; SuiteCRM sharpens campaign, email, and workflow automation patterns.
- `evidence`: `docs/features/OPPORTUNITIES_PIPELINE.md`, `docs/features/REPORTING_GUIDE.md`, `frontend/src/routes/routeCatalog/staffPeopleRoutes.ts`, `frontend/src/routes/routeCatalog/staffFinanceRoutes.ts`, `frontend/src/routes/routeCatalog/staffInsightsRoutes.ts`, `frontend/src/features/finance/pages/DonationListPage.tsx`, `frontend/src/test/ux/personaWorkflowMatrix.ts`, `frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx`, `e2e/tests/persona-workflows.spec.ts`, and `docs/validation/archive/persona-workflow-audit-2026-04-18.md`.

## Nonprofit Administrator

- `canonical_role_boundary`: `admin`; mapping source `backend/src/modules/admin/usecases/roleCatalogUseCase.ts` and `backend/src/utils/permissions.ts`; confidence `High`; confirmed permissions include organization settings, users and access, scheduled reports, and route-visibility troubleshooting; workflow scope covers user lifecycle operations, configuration continuity, and audit-oriented operational upkeep; explicitly inferred scope excludes a full compliance-vault product and vendor-lifecycle platforms.
- `persona_id`: `nonprofit-administrator`
- `operating_context`: System steward responsible for keeping the org operable, auditable, and consistent while minimizing disruption to staff workflows.
- `decision_authority`: Can provision users, update settings, and maintain report or provider configuration; escalates policy disputes, security-sensitive incidents, and governance-significant drift.
- `collaboration_map`: Collaborates with Executive Directors on governance readiness, Fundraisers on report and access needs, Board Members indirectly through safe reporting surfaces, and engineering or validation owners when route or runtime proof is required.
- `primary_modules`: Admin settings, Users and Access, Organization settings, Scheduled Reports, Reports, Dashboard visibility, People and Accounts, and communications/provider configuration.
- `usage_cadence`: Daily troubleshooting, weekly access and report review, monthly configuration continuity and governance follow-through.
- `top_jobs`: Provision and de-provision users, maintain settings, govern report and export policies, troubleshoot route visibility, and preserve audit context.
- `dashboard_report_needs`: Operational dashboards for access drift, report delivery health, provider setup posture, and issue or corrective-action visibility.
- `core_artifacts`: User-change log, onboarding or offboarding checklist, report delivery status, provider configuration note, and audit-ready incident summary.
- `sensitive_data_boundaries`: This role touches identity, permissions, report sharing, public links, and organization-level settings. It is governance-critical and should not rely on casual edits or undocumented overrides.
- `adoption_constraints`: Route-level surprises, settings drift, and partial audit-ledger workflows can force administrators into manual workarounds and external tracking.
- `success_signals`: Access and configuration changes are completed once, validated clearly, and do not create hidden workflow breakage for staff.
- `pain_points`: Drift between docs and runtime, partial full-journey proof for onboarding or offboarding, and missing first-class compliance-vault or corrective-action ledger surfaces.
- `anchor_scenarios`: Primary scenario: review weekly access and configuration health, apply role changes, confirm report delivery, and hand blockers to leadership or technical owners. Failure-mode scenario: onboarding or de-provisioning happens through manual notes and leaves stale access or missing evidence.
- `external_analogs`: OpenPetra sharpens administrator expectations for explicit setup flows and finance or contact operations; ERPNext sharpens typed entity and accounting-connected administration; SuiteCRM sharpens dashboard, workflow, and admin-configuration patterns; CiviCRM sharpens role-aware nonprofit administration and reminder-driven operations.
- `evidence`: `frontend/src/features/adminOps/adminNavigationCatalog.ts`, `frontend/src/features/adminOps/adminRouteManifest.ts`, `docs/features/FEATURE_MATRIX.md`, `docs/features/REPORTING_GUIDE.md`, `backend/src/modules/admin/usecases/roleCatalogUseCase.ts`, `backend/src/utils/permissions.ts`, `frontend/src/test/ux/personaWorkflowMatrix.ts`, `frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx`, `e2e/tests/persona-workflows.spec.ts`, and `docs/validation/archive/persona-workflow-audit-2026-04-18.md`.

## Board Member

- `canonical_role_boundary`: inferred `viewer` via `member` and `readonly` aliases; mapping source `backend/src/utils/roleSlug.ts` and `backend/src/utils/permissions.ts`; confidence `High`; confirmed permissions include dashboards and saved or scheduled reports in read-only mode; workflow scope covers pre-meeting oversight and informed governance questions; explicitly inferred scope excludes committee-charter tools, voting workflows, recusal handling, and governance exception routing.
- `persona_id`: `board-member`
- `operating_context`: Governance user entering the product primarily for packet review, KPI context, and meeting preparation rather than operational record maintenance.
- `decision_authority`: Provides oversight, raises questions, and approves or challenges organizational direction; does not own operational CRUD or report-builder authoring by default.
- `collaboration_map`: Collaborates with Executive Directors on board packets and escalation questions, with Nonprofit Administrators on safe report delivery, and with committee or governance owners outside the app for charter and recusal work.
- `primary_modules`: Dashboard and Analytics, Saved Reports, Scheduled Reports, read-only reporting views, and shared packet links.
- `usage_cadence`: Weekly or monthly around committee and meeting cycles, with occasional ad hoc review before major decisions.
- `top_jobs`: Review strategic signals, verify follow-through, understand fundraising and outcomes context, and ask focused questions without diving into operator workflows.
- `dashboard_report_needs`: Clear read-only dashboards, recurring board packets, concise saved-report links, and summaries that minimize operational context switching.
- `core_artifacts`: Board packet, committee review note, follow-up question list, and read-only KPI snapshot.
- `sensitive_data_boundaries`: Read-only posture should remain explicit. This persona should not claim admin CRUD, raw audit-log browsing, case-detail operations, or report-builder ownership without explicit approval.
- `adoption_constraints`: The current `viewer` scope is broader than the intended board persona, and packet preparation remains assembled from primitives instead of a dedicated governance workspace.
- `success_signals`: Board members arrive at meetings aligned on current fundraising, service, and operational signals and can request follow-up with confidence.
- `pain_points`: Builder-like entry points, unclear packet lifecycle, and overly broad view access that can leak operator-facing detail.
- `anchor_scenarios`: Primary scenario: open a scheduled packet, review committee actions and KPI deltas, and ask focused follow-up questions. Failure-mode scenario: land in an admin-style or builder-style path that weakens the oversight posture.
- `external_analogs`: CiviCRM sharpens read-only packet and report consumption patterns; SuiteCRM sharpens dashboard and report navigation; OpenPetra sharpens conservative administration and finance-summary expectations; ERPNext sharpens typed membership, grants, and accounting views that leadership may expect to see summarized.
- `evidence`: `frontend/src/features/reports/routes/createReportRoutes.tsx`, `frontend/src/features/savedReports/pages/__tests__/PublicReportSnapshot.test.tsx`, `frontend/src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx`, `backend/src/utils/roleSlug.ts`, `backend/src/utils/permissions.ts`, `frontend/src/test/ux/personaWorkflowMatrix.ts`, `frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx`, `e2e/tests/persona-workflows.spec.ts`, and `docs/validation/archive/persona-workflow-audit-2026-04-18.md`.
