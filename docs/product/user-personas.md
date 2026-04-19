# Production User Personas

**Last Updated:** 2026-04-19

Use this document for product and UX planning around the production users who rely on Nonprofit Manager in the staff workspace. This persona pack is intentionally role-based, not demographic, and it does not define demo data, seed data, or QA automation personas. Treat every role-to-auth translation as a planning aid rather than a promise that the repo has a one-to-one auth role with the same name.

## Companion Docs

- [Persona Workflow Planning Pack](persona-workflows.md) maps these personas to real-life day-to-day, recurring, reporting, and handoff workflows with explicit `Supported`, `Partially supported`, and `Outside current app` status notes.

## Scope And Evidence Rules

- Use this pack when prioritizing product behavior, navigation, reporting, onboarding, and workflow design for real staff and leadership users.
- Keep persona claims grounded in the current product overview, feature matrix, route catalogs, permissions model, reporting docs, case-management docs, and staff-facing page implementations.
- Label anything that is not explicit in the repo as `Inference`.
- Treat Executive Directors and Board Members as real in-app users, not email-only stakeholders.

## Role Model Caveats

- The repo's canonical role slugs are `admin`, `manager`, `staff`, `volunteer`, and `viewer`. See [../../backend/src/modules/admin/usecases/roleCatalogUseCase.ts](../../backend/src/modules/admin/usecases/roleCatalogUseCase.ts) and [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts).
- There is no first-class `fundraiser`, `board_member`, or `rehab_worker` auth role in the current codebase. See [../../backend/src/modules/admin/usecases/roleCatalogUseCase.ts](../../backend/src/modules/admin/usecases/roleCatalogUseCase.ts), [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts), and [../../backend/src/utils/roleSlug.ts](../../backend/src/utils/roleSlug.ts).
- `member` and `readonly` normalize to `viewer`, which is the closest current board-member access model. See [../../backend/src/utils/roleSlug.ts](../../backend/src/utils/roleSlug.ts).
- `rehab worker` is an inferred frontline-staff persona, not a code-defined role. The repo supports the work through case, service, appointment, follow-up, and portal surfaces rather than a rehab-specific auth model. See [../features/CASE_MANAGEMENT_SYSTEM.md](../features/CASE_MANAGEMENT_SYSTEM.md), [../features/FOLLOW_UP_LIFECYCLE.md](../features/FOLLOW_UP_LIFECYCLE.md), and [../api/API_REFERENCE_PORTAL_APPOINTMENTS.md](../api/API_REFERENCE_PORTAL_APPOINTMENTS.md).

## Persona Schema

| Field | Meaning |
|---|---|
| `canonical_role_boundary` | Required boundary block for each card: `maps_to_role_slug`, `mapping_source`, `confidence`, `confirmed_permissions`, `workflow_scope`, `explicitly_inferred_scope` |
| `persona_id` | Stable planning slug for the persona card |
| `primary_modules` | Main surfaces this persona should reach without hunting |
| `usage_cadence` | Expected daily, weekly, or monthly rhythm in the app |
| `top_jobs` | Highest-value tasks this persona is trying to complete |
| `dashboard_report_needs` | Summary views, saved reports, scheduled delivery, and drill-down needs |
| `sensitive_data_boundaries` | Data or control boundaries that should shape UX, sharing, and defaults |
| `success_signals` | What “working well” looks like for this persona |
| `pain_points` | Product risks, confusion points, or unstable areas most likely to slow the role down |
| `anchor_scenarios` | One primary scenario and one failure-mode scenario grounded in the current product surface |

## Persona Cards

### Executive Director

- `canonical_role_boundary`
  - `maps_to_role_slug`: `admin`
  - `mapping_source`: [../../backend/src/modules/contacts/usecases/contactDirectory.usecase.ts](../../backend/src/modules/contacts/usecases/contactDirectory.usecase.ts) and [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts).
  - `confidence`: `High`
  - `confirmed_permissions`: dashboard and analytics views, reports and scheduled reports, operational visibility for organization-level governance, and read-mostly organization settings.
  - `workflow_scope`: executive reporting, leadership packet preparation, restricted funds review, and risk escalation handoff.
  - `explicitly_inferred_scope`: no dedicated in-app board packet composer, no full IRS 990 filing workflow, and no formal conflict-of-interest or delegated-governance workflow module.
- `persona_id`: `executive-director`
- `primary_modules`: Workbench Overview, Dashboard and Analytics, Reports, Scheduled Reports, Outcomes Report, Workflow Coverage Report, and light governance surfaces such as organization settings and audit-aware oversight. See [../../README.md](../../README.md), [../features/FEATURE_MATRIX.md](../features/FEATURE_MATRIX.md), [../../frontend/src/features/dashboard/pages/WorkbenchDashboardPage.tsx](../../frontend/src/features/dashboard/pages/WorkbenchDashboardPage.tsx), [../../frontend/src/features/reports/routes/createReportRoutes.tsx](../../frontend/src/features/reports/routes/createReportRoutes.tsx), and [../../frontend/src/features/adminOps/adminRouteManifest.ts](../../frontend/src/features/adminOps/adminRouteManifest.ts).
- `usage_cadence`: Daily summary review in the workbench or dashboard, weekly report review, and monthly oversight of outcomes, workflow gaps, and organization-level health.
- `top_jobs`: Prepare organization health snapshots, evaluate fundraising and service performance, enforce restricted-funds visibility rules, trigger governance handoffs for risks or compliance exceptions, and keep leadership informed on strategy.
- `dashboard_report_needs`: Executive packet automation, scheduled board-ready packets, donor/program variance views, and high-signal drill-downs that avoid manual reconstruction from raw records. See [../features/REPORTING_GUIDE.md](../features/REPORTING_GUIDE.md), [../../frontend/src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx](../../frontend/src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx), and [../../frontend/src/features/reports/pages/__tests__/WorkflowCoverageReportPage.test.tsx](../../frontend/src/features/reports/pages/__tests__/WorkflowCoverageReportPage.test.tsx).
- `sensitive_data_boundaries`: Broad organizational visibility is appropriate, but default behavior should prioritize oversight over staff-style editing. Admin and finance-related visibility should remain conservative in ambiguous states. See [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts) and [../../backend/src/modules/admin/usecases/roleCatalogUseCase.ts](../../backend/src/modules/admin/usecases/roleCatalogUseCase.ts).
- `success_signals`: The Executive Director can run daily and weekly reviews from reusable views, know what issues require immediate escalation, and maintain confidence in executive packet accuracy.
- `pain_points`: Rebuilding context through ad hoc exports, over-trusting restricted-funds data completeness, and changing admin/dashboard settings that drift from documented SOPs.
- `anchor_scenarios`: Primary scenario: the Executive Director runs a daily health scan, packages a monthly board-ready digest, and routes two risk items to the appropriate admin or management owner. Failure-mode scenario: the ED assumes an in-app filing tracker exists and delays external filing action because workflow status is not explicit in the product.
- `evidence`: Product framing: [../../README.md](../../README.md) and [product-spec.md](product-spec.md). Workflow evidence: [../../frontend/src/features/dashboard/pages/WorkbenchDashboardPage.tsx](../../frontend/src/features/dashboard/pages/WorkbenchDashboardPage.tsx), [../../frontend/src/features/reports/routes/createReportRoutes.tsx](../../frontend/src/features/reports/routes/createReportRoutes.tsx), and [../../frontend/src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx](../../frontend/src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx). Access, reporting, or case-management evidence: [../../backend/src/modules/contacts/usecases/contactDirectory.usecase.ts](../../backend/src/modules/contacts/usecases/contactDirectory.usecase.ts), [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts), [../features/REPORTING_GUIDE.md](../features/REPORTING_GUIDE.md), [../features/FEATURE_MATRIX.md](../features/FEATURE_MATRIX.md).

### Fundraiser

- `canonical_role_boundary`
  - `maps_to_role_slug`: `manager` (inferred) with occasional `admin` when payment/receipting authority is explicitly delegated
  - `mapping_source`: no dedicated `fundraiser` role in role catalog; inferred from donation and fundraising-facing workflow access in [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts).
  - `confidence`: `Medium`
  - `confirmed_permissions`: people/accounts, donations, opportunities pipeline, and report surfaces.
  - `workflow_scope`: donor triage, stewardship cadence, restricted-donor handling, and campaign exception handoff.
  - `explicitly_inferred_scope`: formal prospect research, grant compliance calendar management, donor preference systems, and donor consent lifecycle are external or partial in product.
- `persona_id`: `fundraiser`
- `primary_modules`: People and Accounts, Donations, Dashboard and Analytics, Reports, Scheduled Reports, Opportunities, and communication surfaces when configured. See [../../README.md](../../README.md), [../features/FEATURE_MATRIX.md](../features/FEATURE_MATRIX.md), [../features/OPPORTUNITIES_PIPELINE.md](../features/OPPORTUNITIES_PIPELINE.md), [../../frontend/src/routes/routeCatalog/staffPeopleRoutes.ts](../../frontend/src/routes/routeCatalog/staffPeopleRoutes.ts), [../../frontend/src/routes/routeCatalog/staffFinanceRoutes.ts](../../frontend/src/routes/routeCatalog/staffFinanceRoutes.ts), and [../../frontend/src/routes/routeCatalog/staffInsightsRoutes.ts](../../frontend/src/routes/routeCatalog/staffInsightsRoutes.ts).
- `usage_cadence`: Daily donor and gift review, weekly stewardship planning, and monthly reporting or board packet contributions.
- `top_jobs`: Maintain clean donor records, run prospect and lapsed-donor prioritization, track gift status, route stewardship actions, and protect restricted-gift handling and donor preference requirements.
- `dashboard_report_needs`: Donor funnel and campaign summaries, recurring-giving trends, restricted-gift watchlists, and periodic stewardship snapshots that can be shared safely. See [../features/REPORTING_GUIDE.md](../features/REPORTING_GUIDE.md), [../../frontend/src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx](../../frontend/src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx), and [../../e2e/tests/donations.spec.ts](../../e2e/tests/donations.spec.ts).
- `sensitive_data_boundaries`: Donor contact, gift amounts, payment status, and preference/consent signals are high sensitivity. Export delivery and report sharing must remain conservative by default. See [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts), [../../frontend/src/features/finance/pages/__tests__/DonationListPage.test.tsx](../../frontend/src/features/finance/pages/__tests__/DonationListPage.test.tsx), and [../features/REPORTING_GUIDE.md](../features/REPORTING_GUIDE.md).
- `success_signals`: The fundraiser can quickly triage donors, keep gift state reliable, and preserve donor preference and restricted-use discipline across campaigns.
- `pain_points`: Search misses and duplicate profiles, weak in-app prospect research tooling, payment-state ambiguity, and limited automated stewardship workflows.
- `anchor_scenarios`: Primary scenario: the fundraiser reviews a prospect list, confirms donor and gift statuses, schedules a stewardship sequence, and shares a cleaned packet for board or leadership context. Failure-mode scenario: restricted gift requirements and consent preferences are lost because those constraints are only partly represented in the current workflow.
- `evidence`: Product framing: [../../README.md](../../README.md) and [product-spec.md](product-spec.md). Workflow evidence: [../../frontend/src/routes/routeCatalog/staffPeopleRoutes.ts](../../frontend/src/routes/routeCatalog/staffPeopleRoutes.ts), [../../frontend/src/routes/routeCatalog/staffFinanceRoutes.ts](../../frontend/src/routes/routeCatalog/staffFinanceRoutes.ts), [../../frontend/src/features/finance/pages/DonationListPage.tsx](../../frontend/src/features/finance/pages/DonationListPage.tsx), and [../features/OPPORTUNITIES_PIPELINE.md](../features/OPPORTUNITIES_PIPELINE.md). Access, reporting, or case-management evidence: [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts), [../features/REPORTING_GUIDE.md](../features/REPORTING_GUIDE.md), and [../features/FEATURE_MATRIX.md](../features/FEATURE_MATRIX.md). External: [AFP Ethical Standards](https://afpglobal.org/ethics/code-ethical-standards).

### Nonprofit Administrator

- `canonical_role_boundary`
  - `maps_to_role_slug`: `admin`
  - `mapping_source`: canonical admin role is implemented in [../../backend/src/modules/admin/usecases/roleCatalogUseCase.ts](../../backend/src/modules/admin/usecases/roleCatalogUseCase.ts) and [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts).
  - `confidence`: `High`
  - `confirmed_permissions`: organization settings, users and access, scheduled reports, admin surfaces, and route visibility troubleshooting.
  - `workflow_scope`: user lifecycle operations, configuration continuity, evidence retention, and audit-oriented operations reporting.
  - `explicitly_inferred_scope`: full legal/compliance filing and vendor lifecycle platforms are partially external.
- `persona_id`: `nonprofit-administrator`
- `primary_modules`: Admin settings and related governance surfaces, Users and Access, Organization settings, Dashboard and Analytics, Reports, Scheduled Reports, People and Accounts, and communications/provider configuration where the organization runs them in-product. See [../../README.md](../../README.md), [../features/FEATURE_MATRIX.md](../features/FEATURE_MATRIX.md), [../../frontend/src/features/adminOps/adminNavigationCatalog.ts](../../frontend/src/features/adminOps/adminNavigationCatalog.ts), [../../frontend/src/features/adminOps/adminRouteManifest.ts](../../frontend/src/features/adminOps/adminRouteManifest.ts), and [../features/REPORTING_GUIDE.md](../features/REPORTING_GUIDE.md).
- `usage_cadence`: Daily route, access, or setup troubleshooting; weekly access/report review; monthly governance, provider readiness, and configuration continuity follow-through.
- `top_jobs`: provision and de-provision users safely, maintain organization settings and provider wiring, govern report and export policies, track access drift, and maintain compliance evidence artifacts.
- `dashboard_report_needs`: Operational and audit-facing dashboards for route/access stability, scheduled report health, provider setup posture, and documented handoff logs for critical incidents.
- `sensitive_data_boundaries`: System steward role touches user identity, route permissions, report sharing, public report links, and organization policy controls. It should be treated as a governance-critical operator role.
- `success_signals`: Access and settings changes are completed once, logged clearly, and validated as effective without blocking staff workflows.
- `pain_points`: Route-level surprises, setting drift, and undocumented exceptions can force teams into workarounds if admin flows are treated as static.
- `anchor_scenarios`: Primary scenario: the administrator reviews a weekly access and configuration sweep, applies role updates, confirms report delivery reliability, and hands off blockers to leadership or technical owners. Failure-mode scenario: onboarding/de-provisioning is performed manually without documented exit trail, creating stale access or inconsistent handoffs.
- `evidence`: Product framing: [../../README.md](../../README.md) and [product-spec.md](product-spec.md). Workflow evidence: [../../frontend/src/features/adminOps/adminNavigationCatalog.ts](../../frontend/src/features/adminOps/adminNavigationCatalog.ts), [../../frontend/src/features/adminOps/adminRouteManifest.ts](../../frontend/src/features/adminOps/adminRouteManifest.ts), and [../../frontend/src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx](../../frontend/src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx). Access, reporting, or case-management evidence: [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts), [../features/REPORTING_GUIDE.md](../features/REPORTING_GUIDE.md), [../../backend/src/modules/admin/usecases/roleCatalogUseCase.ts](../../backend/src/modules/admin/usecases/roleCatalogUseCase.ts), and [../features/FEATURE_MATRIX.md](../features/FEATURE_MATRIX.md).

### Board Member

- `canonical_role_boundary`
  - `maps_to_role_slug`: `viewer` (inferred) via `member` and `readonly` aliases
  - `mapping_source`: [../../backend/src/utils/roleSlug.ts](../../backend/src/utils/roleSlug.ts) and [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts).
  - `confidence`: `High`
  - `confirmed_permissions`: dashboards and saved/scheduled reports in read-only mode.
  - `workflow_scope`: pre-meeting oversight, committee follow-up review, and informed governance questions.
  - `explicitly_inferred_scope`: no dedicated board committee voting workspace, governance exception routing, or recusal-specific interface in-product today.
- `persona_id`: `board-member`
- `primary_modules`: Dashboard and Analytics, Reports, Scheduled Reports, saved or shared board packets, and read-only oversight views. See [../../README.md](../../README.md), [product-spec.md](product-spec.md), [../features/REPORTING_GUIDE.md](../features/REPORTING_GUIDE.md), [../../frontend/src/features/reports/routes/createReportRoutes.tsx](../../frontend/src/features/reports/routes/createReportRoutes.tsx), and [../../frontend/src/features/savedReports/pages/__tests__/PublicReportSnapshot.test.tsx](../../frontend/src/features/savedReports/pages/__tests__/PublicReportSnapshot.test.tsx).
- `usage_cadence`: Daily or near-daily read-only check-ins during active reporting periods, with heavier weekly or monthly use around committee review and board meetings.
- `top_jobs`: monitor strategic dashboard and report signals, confirm committee/action follow-through, track fundraising and outcomes context, and escalate only when operational risk crosses governance thresholds.
- `dashboard_report_needs`: clear read-only dashboards, scheduled board packets, concise saved-report links, and safe summaries that minimize operational context-switching.
- `sensitive_data_boundaries`: read-only model should remain explicit. This persona should not claim report-builder ownership, admin CRUD, raw audit-log browsing, or case-detail operations without explicit approval.
- `success_signals`: board members can arrive at meetings aligned on current operational and outcomes signals and can request follow-ups with confidence.
- `pain_points`: builder-like flows, unclear meeting packet lifecycle, and overly broad `viewer` surfaces that may expose non-board-relevant operational detail.
- `anchor_scenarios`: Primary scenario: the board member opens a scheduled packet, reviews committee actions, and asks focused follow-up questions in one meeting cycle. Failure-mode scenario: a review path drops them into admin-style actions or builder screens, weakening the oversight posture.
- `evidence`: Product framing: [../../README.md](../../README.md) and [product-spec.md](product-spec.md). Workflow evidence: [../../frontend/src/features/reports/routes/createReportRoutes.tsx](../../frontend/src/features/reports/routes/createReportRoutes.tsx), [../../frontend/src/features/auth/state/__tests__/reportAccess.test.ts](../../frontend/src/features/auth/state/__tests__/reportAccess.test.ts), and [../../frontend/src/features/savedReports/pages/__tests__/PublicReportSnapshot.test.tsx](../../frontend/src/features/savedReports/pages/__tests__/PublicReportSnapshot.test.tsx). Access, reporting, or case-management evidence: [../../backend/src/utils/roleSlug.ts](../../backend/src/utils/roleSlug.ts), [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts), and [../features/REPORTING_GUIDE.md](../features/REPORTING_GUIDE.md).

### Case Manager

- `canonical_role_boundary`
  - `maps_to_role_slug`: `staff` (inferred)
  - `mapping_source`: staff access surface in [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts).
  - `confidence`: `High`
  - `confirmed_permissions`: cases, follow-ups, notes, services, appointments, portal visibility controls, and people/accounts.
  - `workflow_scope`: referral intake, case progression, secure transitions, handoffs, outcomes documentation, and closure continuity.
  - `explicitly_inferred_scope`: person-centered service plan controls, full supervision workflow orchestration, and outcome-compliance reporting are partially represented in aggregate.
- `persona_id`: `case-manager`
- `primary_modules`: Cases, People and Accounts, Follow-ups, portal-sharing workflows, appointments, notes, documents, and repeatable operational reporting. See [../../README.md](../../README.md), [../features/FEATURE_MATRIX.md](../features/FEATURE_MATRIX.md), [../features/CASE_MANAGEMENT_SYSTEM.md](../features/CASE_MANAGEMENT_SYSTEM.md), [../../frontend/src/routes/workflowRoutes.tsx](../../frontend/src/routes/workflowRoutes.tsx), and [../../frontend/src/routes/portalRoutes.tsx](../../frontend/src/routes/portalRoutes.tsx).
- `usage_cadence`: Daily queue triage, status and note updates, follow-up orchestration, and weekly case review.
- `top_jobs`: intake and assess referrals, create person-centered plans, manage progress and reassessment, secure client-facing visibility, coordinate handoffs, and close cases with continuity notes.
- `dashboard_report_needs`: urgent and overdue queue views, follow-up reminders, outcomes trend slices, and transition-ready case summaries for handoffs. See [../features/REPORTING_GUIDE.md](../features/REPORTING_GUIDE.md), [../../frontend/src/features/reports/pages/__tests__/OutcomesReportPage.test.tsx](../../frontend/src/features/reports/pages/__tests__/OutcomesReportPage.test.tsx), and [../../frontend/src/features/reports/pages/__tests__/WorkflowCoverageReportPage.test.tsx](../../frontend/src/features/reports/pages/__tests__/WorkflowCoverageReportPage.test.tsx).
- `sensitive_data_boundaries`: case collaboration is private by default, and portal sharing is selective. Internal notes, outcomes, and documents stay staff-only unless explicitly marked visible to clients. See [../features/CASE_CLIENT_VISIBILITY_AND_FILES.md](../features/CASE_CLIENT_VISIBILITY_AND_FILES.md).
- `success_signals`: the case manager can keep cases moving without losing continuity, and can document handoffs and closures in a way that the next worker can continue safely.
- `pain_points`: hidden saved views, visibility rules, and weak explicit reassessment gates can create context breaks during handoff.
- `anchor_scenarios`: Primary scenario: referral intake is captured with eligibility and consent, a person-centered plan is opened, follow-ups are scheduled with outcomes logged, and handoff occurs to supervisor when ownership changes. Failure-mode scenario: a case stalls because reassessment and continuity tasks are kept outside explicit case workflow checkpoints.
- `evidence`: Product framing: [../../README.md](../../README.md) and [../features/FEATURE_MATRIX.md](../features/FEATURE_MATRIX.md). Workflow evidence: [../../frontend/src/routes/workflowRoutes.tsx](../../frontend/src/routes/workflowRoutes.tsx), [../../e2e/tests/cases.spec.ts](../../e2e/tests/cases.spec.ts), and [../../e2e/tests/follow-ups.spec.ts](../../e2e/tests/follow-ups.spec.ts). Access, reporting, or case-management evidence: [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts), [../features/CASE_MANAGEMENT_SYSTEM.md](../features/CASE_MANAGEMENT_SYSTEM.md), [../features/FOLLOW_UP_LIFECYCLE.md](../features/FOLLOW_UP_LIFECYCLE.md), and [../features/CASE_CLIENT_VISIBILITY_AND_FILES.md](../features/CASE_CLIENT_VISIBILITY_AND_FILES.md).

### Rehab Worker

- `canonical_role_boundary`
  - `maps_to_role_slug`: `staff` (inferred)
  - `mapping_source`: no dedicated `rehab_worker` role; inferred through staff case/service/appointment surfaces in [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts).
  - `confidence`: `High`
  - `confirmed_permissions`: cases, services, follow-ups, appointments, client forms, and portal collaboration.
  - `workflow_scope`: eligibility review, service delivery documentation, follow-up cadence, service authorization and referral transitions, outcomes tracking.
  - `explicitly_inferred_scope`: rehabilitation-specific plan vocabulary, IPE templates, and outcomes benchmarks are not first-class native modules.
- `persona_id`: `rehab-worker`
- `primary_modules`: Cases, services and appointments inside casework, Follow-ups, client-facing forms, and portal collaboration surfaces. See [../../README.md](../../README.md), [../features/CASE_MANAGEMENT_SYSTEM.md](../features/CASE_MANAGEMENT_SYSTEM.md), [../../frontend/src/routes/workflowRoutes.tsx](../../frontend/src/routes/workflowRoutes.tsx), [../../frontend/src/routes/portalRoutes.tsx](../../frontend/src/routes/portalRoutes.tsx), and [../api/API_REFERENCE_PORTAL_APPOINTMENTS.md](../api/API_REFERENCE_PORTAL_APPOINTMENTS.md).
- `usage_cadence`: Daily encounter preparation, service logging, appointment follow-through, and weekly service outcome review with supervisors.
- `top_jobs`: complete intake and session prep, document outcomes and vocational goals, manage service continuity, coordinate service authorization and referrals, and track placement outcomes with clear handoffs.
- `dashboard_report_needs`: assigned-case queues, appointment/action status, staff-safe service summaries, and practical reports for workforce continuity.
- `sensitive_data_boundaries`: internal versus client-visible notes and outcomes matter as much as the case record itself. Public or portal collaboration must follow private-by-default visibility controls.
- `success_signals`: the rehab worker can keep session data complete, close referrals and appointments cleanly, and preserve continuity through clear handoff records.
- `pain_points`: generic staff vocabulary, strict form expiry, and absent rehab-specific plan templates can slow continuity and increase manual interpretation.
- `anchor_scenarios`: Primary scenario: the worker captures eligibility, performs a structured service encounter, updates service and follow-up tasks, and transitions the case to the next stage with visible next actions. Failure-mode scenario: service records and handoffs diverge when follow-up, authorization, or placement details stay outside a dedicated rehab model.
- `evidence`: Product framing: [../../README.md](../../README.md) and [../features/FEATURE_MATRIX.md](../features/FEATURE_MATRIX.md). Workflow evidence: [../../frontend/src/routes/workflowRoutes.tsx](../../frontend/src/routes/workflowRoutes.tsx), [../../frontend/src/routes/portalRoutes.tsx](../../frontend/src/routes/portalRoutes.tsx), and [../../frontend/src/features/portal/pages/__tests__/PortalWorkflowPages.test.tsx](../../frontend/src/features/portal/pages/__tests__/PortalWorkflowPages.test.tsx). Access, reporting, or case-management evidence: [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts), [../features/CASE_MANAGEMENT_SYSTEM.md](../features/CASE_MANAGEMENT_SYSTEM.md), [../features/FOLLOW_UP_LIFECYCLE.md](../features/FOLLOW_UP_LIFECYCLE.md), [../api/API_REFERENCE_PORTAL_APPOINTMENTS.md](../api/API_REFERENCE_PORTAL_APPOINTMENTS.md), and [../features/CASE_CLIENT_VISIBILITY_AND_FILES.md](../features/CASE_CLIENT_VISIBILITY_AND_FILES.md).

## Cross-Role Matrix

| Persona | Role slug | Primary posture | Daily/weekly surfaces | Daily risk boundary |
|---|---|---|---|---|
| Executive Director | `admin` | Strategic read and selective governance action | Workbench, dashboards, reports, scheduled reports | Board packets, restricted gifts, and filing cadence |
| Fundraiser | `Inference: manager` | Fundraising data steward | People & accounts, donations, opportunities, scheduled reports | Donor preference, payment state, restricted gift compliance |
| Nonprofit Administrator | `admin` | System steward / operator | Users, organization settings, reports, route visibility | Access revocations, policy drift, documentation retention |
| Board Member | `Inference: viewer` | Read-only governance oversight | Dashboard and reports, scheduled board packets | Exceeding read scope into staff-admin operations |
| Case Manager | `Inference: staff` | Frontline continuity coordinator | Cases, follow-ups, appointments, portal sharing | Incomplete handoff context or privacy exposure |
| Rehab Worker | `Inference: staff` | Service continuity and appointment lead | Cases, services, follow-ups, portals | Terminology mismatch and rehab-specific workflow gaps |

## Coverage Check

- Leadership and governance coverage: Executive Director and Board Member.
- Revenue and operations coverage: Fundraiser and Nonprofit Administrator.
- Service-delivery coverage: Case Manager and Rehab Worker.
- Major surfaces covered across the pack: dashboard or workbench, people/accounts, donations, reports and scheduled reports, admin or governance, cases, follow-ups, appointments, and portal collaboration.

## Future Expansion

This first pack intentionally stops at the six requested roles. If a later planning wave needs fuller coverage of volunteer or event-heavy operations, add a dedicated Volunteer Coordinator or Event Operations persona rather than stretching one of these six to absorb that workload.
