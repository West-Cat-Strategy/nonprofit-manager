# Persona Workflow Planning Pack

**Last Updated:** 2026-04-19

Use this companion to [Production User Personas](user-personas.md) when you need to move from role definitions to real day-to-day workflow planning.

## Purpose And Methodology

- Use this document for product, UX, onboarding, and roadmap conversations that need a workflow view rather than a role summary.
- Keep a `current + gaps` lens throughout: preserve the real-world workflow, then mark whether the current app supports it.
- Ground each persona section in both local repo sources and stable external role guidance.
- Role-title translations remain labeled `Inference` when the title is not a canonical auth role slug in code.
- Treat Executive Directors and Board Members as daily in-app users, not only report recipients.

## How To Read The Workflow Schema

| Field | Meaning |
|---|---|
| `workflow_id` | Stable identifier for the workflow card |
| `real_world_trigger` | The in-world event that starts the workflow |
| `cadence` | Frequency of expected execution |
| `expected_role_tasks` | Core user expectations and decisions |
| `primary_app_surfaces` | The product surfaces most likely used today |
| `outputs_and_handoffs` | Deliverables, artifacts, and follow-ups |
| `permission_floor` | Minimum canonical permission needed (`viewer`, `volunteer`, `staff`, `manager`, `admin`) |
| `required_external_dependency` | External systems, data sources, or roles required to fully execute the workflow |
| `workflow_status` | Canonical status label from the legend below |
| `evidence_source` | Local and/or external evidence used to justify the status |

### Workflow Status Legend

- `supported`: The workflow is product-native and currently stable enough for day-to-day use.
- `partial`: Core in-app pieces exist, but key steps depend on workaround flows, changing areas, or outside process.
- `external only`: The workflow outcome is mostly outside the app; the app provides monitoring/inputs only.
- `missing`: The workflow has no practical in-product realization yet and remains planned or out of scope.

## External Research Baseline (Accessed 2026-04-19)

- BoardSource
  - [Board Meetings — FAQs](https://boardsource.org/resources/board-meetings-faqs/)
  - [Preparing for Effective, Focused, and Strategic Board Meetings](https://boardsource.org/resources/strategic-board-meetings/)
  - [Board Performance Matrix](https://boardsource.org/board-performance-matrix/)
  - [BoardSource sample code of conduct and governance practices](https://boardsource.org/resources/recommended-board-practices/)
- National Council of Nonprofits
  - [Board Roles and Responsibilities](https://www.councilofnonprofits.org/running-nonprofit/governance-leadership/board-roles-and-responsibilities)
  - [Conflicts of Interests](https://www.councilofnonprofits.org/running-nonprofit/governance-leadership/conflicts-interests)
- IRS
  - [Instructions for Form 990 Return of an Exempt Organization (2025)](https://www.irs.gov/instructions/i990)
  - [Donor-Advised Funds guidance](https://www.irs.gov/charities-non-profits/charitable-organizations/donor-advised-funds)
  - [Instructions for Schedule D (990)](https://www.irs.gov/instructions/i990sd)
- Association of Fundraising Professionals
  - [Code of Ethical Standards](https://afpglobal.org/ethics/code-ethical-standards)
- NASW
  - [NASW Standards for Social Work Case Management](https://www.socialworkers.org/Practice/NASW-Practice-Standards-Guidelines/NASW-Standards-for-Social-Work-Case-Management)
- CMS
  - [42 CFR 441.725 Person-Centered Service Plan](https://www.law.cornell.edu/cfr/text/42/441.725)

## Executive Director

Companion persona: [Executive Director](user-personas.md#executive-director)

Role mapping: `Inference: admin` by default, with `manager` when governance admin ownership is delegated by org design.

### Role Workflows

- `workflow_id`: `executive-director-monthly-strategic-board-pack`
- `real_world_trigger`: First monthly executive cycle, board package prep, or major variance signal from finance/program activity.
- `cadence`: Monthly.
- `expected_role_tasks`: Assemble high-signal financial, outcomes, and risk dashboards into board-ready packets; compare against prior month and planned targets; raise variance questions before board reviews.
- `primary_app_surfaces`: Workbench Overview, Dashboard and Analytics, Reports, Saved Reports, Scheduled Reports, People/Donations/Case highlights.
- `outputs_and_handoffs`: Board packet, variance narrative, prioritized governance questions, and executive action list.
- `permission_floor`: `admin`
- `required_external_dependency`: Board packet design convention, accounting/financial footnotes, and external legal review language for board narratives.
- `workflow_status`: `partial`
- `evidence_source`: External: [BoardSource](https://boardsource.org/resources/strategic-board-meetings/), [IRS i990](https://www.irs.gov/instructions/i990). Local: [Reporting Guide](../features/REPORTING_GUIDE.md), [WorkbenchDashboardPage.tsx](../../frontend/src/features/dashboard/pages/WorkbenchDashboardPage.tsx), [createReportRoutes.tsx](../../frontend/src/features/reports/routes/createReportRoutes.tsx).

- `workflow_id`: `executive-director-annual-board-990-compliance-command-center`
- `real_world_trigger`: Fiscal year-end, major governance milestone, annual filing cycle, or material policy change.
- `cadence`: Annual plus exception-driven checkpoints.
- `expected_role_tasks`: Track filing milestones, evidence collection status, restricted-fund movement visibility, and executive/governance risk points; ensure handoff with fiscal/compliance stakeholders.
- `primary_app_surfaces`: Dashboards for variance visibility, reports for restricted-fund and revenue snapshots, org settings visibility, and route-level access controls.
- `outputs_and_handoffs`: Filing readiness checklist, compliance issue list, board-level readiness notes, and governance handoff package.
- `permission_floor`: `admin`
- `required_external_dependency`: IRS filing workflows, tax counsel/legal packaging, accounting trial balances, Form 990 narrative drafting.
- `workflow_status`: `external only`
- `evidence_source`: External: [IRS i990](https://www.irs.gov/instructions/i990), [NCN board governance role guide](https://www.councilofnonprofits.org/running-nonprofit/governance-leadership/board-roles-and-responsibilities). Local: [permissions.ts](../../backend/src/utils/permissions.ts), [roleSlug.ts](../../backend/src/utils/roleSlug.ts), [Reporting Guide](../features/REPORTING_GUIDE.md).

- `workflow_id`: `executive-director-restricted-funds-stewardship-gate`
- `real_world_trigger`: Receipt of restricted gift, spending request, donor inquiry, or approaching compliance threshold.
- `cadence`: Event-driven.
- `expected_role_tasks`: Validate donor restrictions before allocation; align spending decisions to donor intent; flag policy exceptions early; trigger acknowledgment and control gates.
- `primary_app_surfaces`: Donations, People and Accounts, Reports, Saved/Scheduled Reports.
- `outputs_and_handoffs`: Restriction review record, allocation exception queue, stewardship reminder to finance, and documented executive decision trail.
- `permission_floor`: `admin`
- `required_external_dependency`: Donor advisories/legal review of restriction terms, grant/finance system policy, external restricted-funds accounting controls.
- `workflow_status`: `partial`
- `evidence_source`: External: [IRS i990](https://www.irs.gov/instructions/i990), [Donor-advised funds](https://www.irs.gov/charities-non-profits/charitable-organizations/donor-advised-funds), [Board roles and accountability](https://www.councilofnonprofits.org/running-nonprofit/governance-leadership/board-roles-and-responsibilities). Local: [DonationListPage.tsx](../../frontend/src/features/finance/pages/DonationListPage.tsx), [Reporting Guide](../features/REPORTING_GUIDE.md), [WorkbenchDashboardPage.tsx](../../frontend/src/features/dashboard/pages/WorkbenchDashboardPage.tsx), [permissions.ts](../../backend/src/utils/permissions.ts).

- `workflow_id`: `executive-director-governance-risk-escalation`
- `real_world_trigger`: Governance, risk, or compliance signal that exceeds the operational delegation boundary.
- `cadence`: Exception-driven.
- `expected_role_tasks`: Confirm supporting facts, classify risk severity, escalate to board/oversight channels, and ensure audit-ready context remains traceable.
- `primary_app_surfaces`: Reports, dashboards, admin-visibility surfaces, route/permission diagnostics.
- `outputs_and_handoffs`: Escalation package, investigation owner, and follow-up timeline.
- `permission_floor`: `admin`
- `required_external_dependency`: Board chair/chamber policies, legal/compliance counsel, and formal governance escalation forums.
- `workflow_status`: `partial`
- `evidence_source`: External: [BoardSource](https://boardsource.org/resources/recommended-board-practices/), [Board Roles and Responsibilities](https://www.councilofnonprofits.org/running-nonprofit/governance-leadership/board-roles-and-responsibilities). Local: [permissions.ts](../../backend/src/utils/permissions.ts), [roleSlug.ts](../../backend/src/utils/roleSlug.ts), [Reporting Guide](../features/REPORTING_GUIDE.md).

## Fundraiser

Companion persona: [Fundraiser](user-personas.md#fundraiser)

Role mapping: `Inference: manager` by default, with `admin` when org policy assigns payment/receipting control.

### Role Workflows

- `workflow_id`: `fundraiser-prospect-research-to-pipeline`
- `real_world_trigger`: New lead generation, donor inquiry, reactivation window, or strategic campaign planning.
- `cadence`: Daily and weekly.
- `expected_role_tasks`: Translate prospect research into prioritized pipeline stages, create warm-contact plans, and prepare stewardship notes for each stage owner.
- `primary_app_surfaces`: People and Accounts, Opportunities, Notes/Comments, Scheduled Reports.
- `outputs_and_handoffs`: Clean pipeline, stage-appropriate owners, research handoff to donor operations, and weekly pipeline health update.
- `permission_floor`: `manager`
- `required_external_dependency`: Donor-intelligence tools, external prospect databases, and research approvals.
- `workflow_status`: `partial`
- `evidence_source`: External: [AFP Ethical Standards](https://afpglobal.org/ethics/code-ethical-standards). Local: [ContactListPage.tsx](../../frontend/src/features/contacts/pages/ContactListPage.tsx), [Opportunities Pipeline](../features/OPPORTUNITIES_PIPELINE.md), [Opportunity permissions in `permissions.ts`](../../backend/src/utils/permissions.ts).

- `workflow_id`: `fundraiser-donor-stewardship-and-impact-comms-cadence`
- `real_world_trigger`: Recurring donor milestones, campaign updates, impact publication cycle, or donor preference signal change.
- `cadence`: Weekly and monthly.
- `expected_role_tasks`: Maintain stewardship cadence, coordinate impact narratives, classify donor preferences, and track communications and promise follow-through.
- `primary_app_surfaces`: Donors/people records, Donations, Scheduled Reports, Saved Reports, dashboard views.
- `outputs_and_handoffs`: Donor communication calendar, stewardship notes, and impact updates for leadership/operations.
- `permission_floor`: `manager`
- `required_external_dependency`: External communication tools, CRM/marketing stack, and consent policy enforcement.
- `workflow_status`: `partial`
- `evidence_source`: External: [AFP Ethical Standards](https://afpglobal.org/ethics/code-ethical-standards). Local: [DonationListPage.tsx](../../frontend/src/features/finance/pages/DonationListPage.tsx), [ContactListPage.tsx](../../frontend/src/features/contacts/pages/ContactListPage.tsx), [Reporting Guide](../features/REPORTING_GUIDE.md).

- `workflow_id`: `fundraiser-grant-and-campaign-lifecycle-with-deadlines`
- `real_world_trigger`: New grant opportunity, campaign launch, deadline progression, or compliance checkpoint.
- `cadence`: Weekly and deadline-driven.
- `expected_role_tasks`: Build campaign/grant work queue, maintain deadline/eligibility status, manage commitments, and hand off to finance/admin when filing or compliance documents are due.
- `primary_app_surfaces`: Opportunities, Donations, Reports, Dashboard Analytics, scheduled reminders.
- `outputs_and_handoffs`: Campaign tracker, grant deadline readiness, compliance checklist, and handoff notes.
- `permission_floor`: `manager`
- `required_external_dependency`: Grant management application, legal/compliance review workflow, finance due-date system.
- `workflow_status`: `partial`
- `evidence_source`: External: [AFP Ethical Standards](https://afpglobal.org/ethics/code-ethical-standards). Local: [OPPORTUNITIES_PIPELINE.md](../features/OPPORTUNITIES_PIPELINE.md), [Reporting Guide](../features/REPORTING_GUIDE.md), [Donation and Opportunity permissions](../../backend/src/utils/permissions.ts).

- `workflow_id`: `fundraiser-restricted-donation-and-donor-preference-workflow`
- `real_world_trigger`: Restricted gift, preference update, consent amendment, or donor disclosure request.
- `cadence`: Daily and exception-driven.
- `expected_role_tasks`: Validate restriction language, capture donor consent/preferences, route for internal control if disallowed usage is detected, and preserve donor relationship continuity.
- `primary_app_surfaces`: Donations, People and Accounts, Saved/Scheduled Reports, case notes/comments.
- `outputs_and_handoffs`: Restriction-validated gift record, donor preference profile, and internal escalation if usage constraints are not satisfiable.
- `permission_floor`: `manager`
- `required_external_dependency`: External consent/legal system, restricted-funds policy owner, and finance approvers.
- `workflow_status`: `partial`
- `evidence_source`: External: [IRS Donor-Advised Funds guidance](https://www.irs.gov/charities-non-profits/charitable-organizations/donor-advised-funds), [IRS i990 restricted funds context](https://www.irs.gov/instructions/i990). Local: [DonationListPage.tsx](../../frontend/src/features/finance/pages/DonationListPage.tsx), [Feature matrix permissions](../features/FEATURE_MATRIX.md), [permissions.ts](../../backend/src/utils/permissions.ts).

- `workflow_id`: `fundraiser-gift-entry-verification-acknowledgment-handoff`
- `real_world_trigger`: New gift entry, adjustment, failed payment, or acknowledgment gap.
- `cadence`: Daily.
- `expected_role_tasks`: Validate gift attribution and payment data, queue acknowledgment actions, and hand finance/admin edge cases for receipting or policy exceptions.
- `primary_app_surfaces`: Donations list/detail, payment status fields, people/account views, report snapshots.
- `outputs_and_handoffs`: Cleaned gift ledger, follow-up tickets for finance/admin, and donor-facing acknowledgment package.
- `permission_floor`: `manager`
- `required_external_dependency`: Accounting processor reconciliation and policy for donor communication language.
- `workflow_status`: `partial`
- `evidence_source`: External: [AFP Ethical Standards](https://afpglobal.org/ethics/code-ethical-standards). Local: [DonationListPage.tsx](../../frontend/src/features/finance/pages/DonationListPage.tsx), [Donations feature permissions](../../backend/src/utils/permissions.ts), [Donation form test evidence references](../../frontend/src/features/finance/pages/__tests__/DonationListPage.test.tsx).

## Nonprofit Administrator

Companion persona: [Nonprofit Administrator](user-personas.md#nonprofit-administrator)

Role mapping: `Canonical: admin`.

### Role Workflows

- `workflow_id`: `nonprofit-administrator-user-onboarding-offboarding-access-lifecycle`
- `real_world_trigger`: New hire, role change, contractor onboarding, or exit event.
- `cadence`: Daily and exception-driven.
- `expected_role_tasks`: Create/update users, assign roles by policy, confirm route visibility, disable access at exit, and maintain deprovision evidence.
- `primary_app_surfaces`: Admin settings, Users/roles, permissions validation flows, reports for access-related outcomes.
- `outputs_and_handoffs`: Access records, role-change logs, staged onboarding/offboarding handoff notes.
- `permission_floor`: `admin`
- `required_external_dependency`: HR identity directory, contractor management process, and security policy controls outside product.
- `workflow_status`: `supported`
- `evidence_source`: External: [NCN nonprofit governance role clarity](https://www.councilofnonprofits.org/running-nonprofit/governance-leadership/board-roles-and-responsibilities). Local: [permissions.ts](../../backend/src/utils/permissions.ts), [roleCatalogUseCase.ts](../../backend/src/modules/admin/usecases/roleCatalogUseCase.ts), [admin navigation settings](../features/FEATURE_MATRIX.md), [adminNavigationCatalog.ts](../../frontend/src/features/adminOps/adminNavigationCatalog.ts).

- `workflow_id`: `nonprofit-administrator-board-ready-reporting-cycle`
- `real_world_trigger`: Monthly reporting review, board packet request, or route/access audit.
- `cadence`: Weekly and monthly.
- `expected_role_tasks`: Verify critical reports are generated, schedule refreshes, confirm read-only/manager/share surfaces are correct, and identify broken workflow outputs before meeting cycles.
- `primary_app_surfaces`: Reports, Scheduled Reports, Dashboard, Admin settings, user support workflows.
- `outputs_and_handoffs`: Board-safe report calendar, report reliability notes, and issue list for product/admin owners.
- `permission_floor`: `admin`
- `required_external_dependency`: Board packet template standards, external document review, and meeting governance process.
- `workflow_status`: `partial`
- `evidence_source`: External: [BoardSource](https://boardsource.org/resources/strategic-board-meetings/). Local: [Feature matrix](../features/FEATURE_MATRIX.md), [PublicReportSnapshot.test.tsx](../../frontend/src/features/savedReports/pages/__tests__/PublicReportSnapshot.test.tsx), [permissions.ts](../../backend/src/utils/permissions.ts).

- `workflow_id`: `nonprofit-administrator-compliance-documentation-vault-retention-audit-artifacts`
- `real_world_trigger`: Compliance request, policy review, or evidence audit request.
- `cadence`: Monthly and before review cycles.
- `expected_role_tasks`: Maintain documentation vault metadata, preserve onboarding/offboarding and permission-change artifacts, ensure retention and retrieval logic aligns with audit posture.
- `primary_app_surfaces`: Organization settings, reports, admin logs, support docs.
- `outputs_and_handoffs`: Audit-ready artifact list, retention flags, and corrective action requests.
- `permission_floor`: `admin`
- `required_external_dependency`: Document storage governance, records-retention policy, legal/compliance review.
- `workflow_status`: `missing`
- `evidence_source`: External: [IRS guidance on organizational governance expectations](https://www.irs.gov/instructions/i990). Local: [permissions.ts](../../backend/src/utils/permissions.ts), [admin routes/catalog](../../frontend/src/features/adminOps/adminRouteManifest.ts), [adminNavigationCatalog.ts](../../frontend/src/features/adminOps/adminNavigationCatalog.ts).

- `workflow_id`: `nonprofit-administrator-audit-risk-ledger-and-corrective-actions`
- `real_world_trigger`: Route failure, anomaly in visibility, or recurring misconfiguration pattern.
- `cadence`: Bi-weekly and exception-driven.
- `expected_role_tasks`: Log recurring incidents, map risk to route/permission scope, track corrective owners and completion status, and report residual risk to leadership.
- `primary_app_surfaces`: Admin settings, permissions views, route health diagnostics, reports.
- `outputs_and_handoffs`: Audit-risk ledger, corrective-action timeline, and escalation pack for leadership.
- `permission_floor`: `admin`
- `required_external_dependency`: Formal incident/PM system and governance sign-off channel external to current app.
- `workflow_status`: `partial`
- `evidence_source`: External: [NCN board governance guidance](https://www.councilofnonprofits.org/running-nonprofit/governance-leadership/board-roles-and-responsibilities). Local: [admin route catalog and permissions](../../backend/src/utils/permissions.ts), [admin settings docs](../features/FEATURE_MATRIX.md).

## Board Member

Companion persona: [Board Member](user-personas.md#board-member)

Role mapping: `Inference: viewer` (via `member`/`readonly` alias in role normalization).

### Role Workflows

- `workflow_id`: `board-member-governance-meeting-cadence-and-packet-review`
- `real_world_trigger`: Board/committee meeting cycle, scheduled governance check-in, or ad hoc oversight review.
- `cadence`: Weekly, monthly, and meeting-driven.
- `expected_role_tasks`: Consume board packets in sequence, review KPI and risk indicators, prepare questions, and confirm action ownership prior to vote or decision.
- `primary_app_surfaces`: Saved Reports, Scheduled Reports, Dashboard/Analytics, board packet snapshots.
- `outputs_and_handoffs`: Meeting-ready oversight notes, delegated follow-up questions, and post-meeting action tracking for management.
- `permission_floor`: `viewer`
- `required_external_dependency`: Board agendas, committee charters, and meeting facilitation process outside product.
- `workflow_status`: `partial`
- `evidence_source`: External: [BoardSource](https://boardsource.org/resources/strategic-board-meetings/), [NCN board roles](https://www.councilofnonprofits.org/running-nonprofit/governance-leadership/board-roles-and-responsibilities). Local: [Reporting Guide](../features/REPORTING_GUIDE.md), [WorkbenchDashboardPage.tsx](../../frontend/src/features/dashboard/pages/WorkbenchDashboardPage.tsx), [roleSlug.ts](../../backend/src/utils/roleSlug.ts), [permissions.ts](../../backend/src/utils/permissions.ts).

- `workflow_id`: `board-member-delegation-authority-matrix-and-committee-charter-traceability`
- `real_world_trigger`: Committee reorganization, authority conflict, or unclear ownership of a board task.
- `cadence`: Quarterly and whenever committees change.
- `expected_role_tasks`: Confirm delegation map, track committee-level authority boundaries, and validate that each request has clear owner/title/oversight path.
- `primary_app_surfaces`: Saved/Scheduled reports for context, governance docs (external), and read-only data snapshots.
- `outputs_and_handoffs`: Charter alignment notes, delegation adjustments, and board-request tracker.
- `permission_floor`: `viewer`
- `required_external_dependency`: Formal committee charter repository and board governance workflow outside app.
- `workflow_status`: `missing`
- `evidence_source`: External: [Board Performance Matrix](https://boardsource.org/board-performance-matrix/), [Board roles](https://www.councilofnonprofits.org/running-nonprofit/governance-leadership/board-roles-and-responsibilities). Local: [permissions.ts](../../backend/src/utils/permissions.ts), [WorkbenchDashboardPage.tsx](../../frontend/src/features/dashboard/pages/WorkbenchDashboardPage.tsx).

- `workflow_id`: `board-member-conflict-of-interest-disclosure-and-recusal-handling`
- `real_world_trigger`: Annual governance cycle, new conflict signal, or transaction involving personal interest.
- `cadence`: Annual and exception-driven.
- `expected_role_tasks`: Capture disclosed conflicts, route recusals, ensure conflicted votes are tracked, and preserve governance audit notes for meetings.
- `primary_app_surfaces`: Read-only reporting context for disclosure references; no native governance exception forms in app today.
- `outputs_and_handoffs`: Recusal tracker and conflict disclosure artifact in external governance system.
- `permission_floor`: `viewer`
- `required_external_dependency`: Board policy process, legal/minutes system, and annual governance filing.
- `workflow_status`: `missing`
- `evidence_source`: External: [NCN conflicts guide](https://www.councilofnonprofits.org/running-nonprofit/governance-leadership/conflicts-interests), [BoardSource governance practices](https://boardsource.org/resources/recommended-board-practices/). Local: [read-only permissions in permissions.ts](../../backend/src/utils/permissions.ts), [viewer role scope in roleSlug.ts](../../backend/src/utils/roleSlug.ts).

- `workflow_id`: `board-member-board-governance-dashboard-kpis-and-compliance-risk`
- `real_world_trigger`: Board dashboard month, audit concern signal, or leadership reporting checkpoint.
- `cadence`: Monthly.
- `expected_role_tasks`: Track board-relevant KPIs, monitor fiduciary and compliance risk indicators, and request corrective follow-up when trajectories change.
- `primary_app_surfaces`: Dashboard, Reports, Scheduled Reports.
- `outputs_and_handoffs`: Board dashboard brief, trend alerts, risk questions for chair/committee.
- `permission_floor`: `viewer`
- `required_external_dependency`: Board KPI definitions and external policy thresholds.
- `workflow_status`: `partial`
- `evidence_source`: External: [Board Performance Matrix](https://boardsource.org/board-performance-matrix/), [NCN board responsibilities](https://www.councilofnonprofits.org/running-nonprofit/governance-leadership/board-roles-and-responsibilities). Local: [WorkbenchDashboardPage.tsx](../../frontend/src/features/dashboard/pages/WorkbenchDashboardPage.tsx), [Reporting Guide](../features/REPORTING_GUIDE.md), [permissions.ts](../../backend/src/utils/permissions.ts).

## Case Manager

Companion persona: [Case Manager](user-personas.md#case-manager)

Role mapping: `Inference: staff`.

### Role Workflows

- `workflow_id`: `case-manager-referral-and-eligibility-compliance-intake`
- `real_world_trigger`: New referral, service request, or reassignment event.
- `cadence`: Daily.
- `expected_role_tasks`: Capture referral source, verify intake eligibility constraints, collect consent and intake context, and open a case owner assignment.
- `primary_app_surfaces`: People and Accounts, Cases, Follow-ups, portal visibility controls.
- `outputs_and_handoffs`: Intake record with eligibility status and ownership handoff for service triage.
- `permission_floor`: `staff`
- `required_external_dependency`: Eligibility policy rules, program intake forms, consent templates from service programs.
- `workflow_status`: `partial`
- `evidence_source`: External: [NASW Case Management Standards](https://www.socialworkers.org/Practice/NASW-Practice-Standards-Guidelines/NASW-Standards-for-Social-Work-Case-Management), [CMS person-centered service planning principles](https://www.law.cornell.edu/cfr/text/42/441.725). Local: [Case Management System](../features/CASE_MANAGEMENT_SYSTEM.md), [FOLLOW_UP_LIFECYCLE.md](../features/FOLLOW_UP_LIFECYCLE.md), [permissions.ts](../../backend/src/utils/permissions.ts), [workflowRoutes.tsx](../../frontend/src/routes/workflowRoutes.tsx).

- `workflow_id`: `case-manager-person-centered-plan-and-reassessment-cycle`
- `real_world_trigger`: Case planning review, changing circumstances, or periodic reassessment milestone.
- `cadence`: Weekly plus reassessment cadence.
- `expected_role_tasks`: Build person-centered case plan with measurable objectives, review progress against objectives, revise goals when needs change.
- `primary_app_surfaces`: Cases, Notes, Services, Follow-ups, outcome views.
- `outputs_and_handoffs`: Updated plan checkpoints, reassessment notes, and service change recommendations.
- `permission_floor`: `staff`
- `required_external_dependency`: Formal person-centered template library and assessment toolsets from clinical/program partners.
- `workflow_status`: `partial`
- `evidence_source`: External: [NASW Case Management Standards](https://www.socialworkers.org/Practice/NASW-Practice-Standards-Guidelines/NASW-Standards-for-Social-Work-Case-Management), [CMS person-centered service plan rules](https://www.law.cornell.edu/cfr/text/42/441.725). Local: [Case Management System](../features/CASE_MANAGEMENT_SYSTEM.md), [Case Client Visibility](../features/CASE_CLIENT_VISIBILITY_AND_FILES.md), [permissions.ts](../../backend/src/utils/permissions.ts).

- `workflow_id`: `case-manager-secure-progress-notes-and-outcome-timeline`
- `real_world_trigger`: Service completion, significant interaction, or outcome checkpoint.
- `cadence`: After each major touchpoint and weekly summary.
- `expected_role_tasks`: Capture secure progress notes, timestamp milestones, preserve outcome evidence, and keep data accessible only to allowed viewers.
- `primary_app_surfaces`: Case Notes, Timeline, Outcomes/Reports, Follow-ups.
- `outputs_and_handoffs`: Secure case timeline, outcome trend history, and audit-ready context for handoff.
- `permission_floor`: `staff`
- `required_external_dependency`: Internal privacy policy enforcement and legal record-retention requirements.
- `workflow_status`: `partial`
- `evidence_source`: External: [NASW Case Management Standards](https://www.socialworkers.org/Practice/NASW-Practice-Standards-Guidelines/NASW-Standards-for-Social-Work-Case-Management), [CMS service-plan review requirement](https://www.law.cornell.edu/cfr/text/42/441.725). Local: [Case Management System](../features/CASE_MANAGEMENT_SYSTEM.md), [Case visibility and files](../features/CASE_CLIENT_VISIBILITY_AND_FILES.md), [permissions.ts](../../backend/src/utils/permissions.ts).

- `workflow_id`: `case-manager-handoff-and-transition-workflow`
- `real_world_trigger`: Staffing changes, service escalation, or discharge into another service team.
- `cadence`: Event-driven.
- `expected_role_tasks`: Prepare continuity packet, transfer responsibilities explicitly, preserve pending follow-ups, and verify privacy boundaries.
- `primary_app_surfaces`: Cases, Follow-ups, Portal case sharing controls, Appointments.
- `outputs_and_handoffs`: Handoff checklist, ownership record, and transition risk flags.
- `permission_floor`: `staff`
- `required_external_dependency`: Program acceptance criteria and referral partner process outside app.
- `workflow_status`: `partial`
- `evidence_source`: External: [NASW Case Management Standards](https://www.socialworkers.org/Practice/NASW-Practice-Standards-Guidelines/NASW-Standards-for-Social-Work-Case-Management), [CMS care-transition requirements](https://www.law.cornell.edu/cfr/text/42/441.725). Local: [Case Management System](../features/CASE_MANAGEMENT_SYSTEM.md), [Case Client Visibility and Files](../features/CASE_CLIENT_VISIBILITY_AND_FILES.md), [Follow-up Lifecycle](../features/FOLLOW_UP_LIFECYCLE.md).

- `workflow_id`: `case-manager-case-closure-continuity-workflow`
- `real_world_trigger`: Successful milestone completion, planned closure, or long inactivity.
- `cadence`: As each case concludes.
- `expected_role_tasks`: Confirm outcome closure criteria, verify referral/consent closure fields, hand future risks to service owner, and archive continuity notes.
- `primary_app_surfaces`: Case list/detail, notes/timeline, reports.
- `outputs_and_handoffs`: Closure package, continuity-of-care handoff note, post-closure review marker.
- `permission_floor`: `staff`
- `required_external_dependency`: Closure policy definitions and post-discharge follow-up protocol.
- `workflow_status`: `partial`
- `evidence_source`: External: [NASW standards on care continuity](https://www.socialworkers.org/Practice/NASW-Practice-Standards-Guidelines/NASW-Standards-for-Social-Work-Case-Management), [CMS person-centered review cycles](https://www.law.cornell.edu/cfr/text/42/441.725). Local: [Case Management System](../features/CASE_MANAGEMENT_SYSTEM.md), [Case Client Visibility and Files](../features/CASE_CLIENT_VISIBILITY_AND_FILES.md), [Reporting Guide](../features/REPORTING_GUIDE.md).

## Rehabilitation Worker

Companion persona: [Rehab Worker](user-personas.md#rehab-worker)

Role mapping: `Inference: staff` (inferred through case/service/appointments support).

### Role Workflows

- `workflow_id`: `rehab-worker-eligibility-and-functional-vocational-assessment`
- `real_world_trigger`: Client visit, referral to rehab services, or reassessment demand from care team.
- `cadence`: Weekly and event-driven.
- `expected_role_tasks`: Review service history, document eligibility indicators, collect functional and vocational signals, and decide eligibility for service next steps.
- `primary_app_surfaces`: Case records, services, appointments, notes, follow-up queue, dashboard views.
- `outputs_and_handoffs`: Assessment snapshot for case manager/supervisor, referral context, and next-step work queue.
- `permission_floor`: `staff`
- `required_external_dependency`: Formal vocational assessment instruments and clinical eligibility policy.
- `workflow_status`: `partial`
- `evidence_source`: External: [CMS person-centered plan requirements](https://www.law.cornell.edu/cfr/text/42/441.725), [BLS Rehabilitation Counselors scope](https://www.bls.gov/ooh/community-and-social-service/rehabilitation-counselors.htm), [NASW case management standards](https://www.socialworkers.org/Practice/NASW-Practice-Standards-Guidelines/NASW-Standards-for-Social-Work-Case-Management). Local: [Case Management System](../features/CASE_MANAGEMENT_SYSTEM.md), [API_REFERENCE_PORTAL_APPOINTMENTS.md](../api/API_REFERENCE_PORTAL_APPOINTMENTS.md).

- `workflow_id`: `rehab-worker-individualized-employment-plan-creation-and-updates`
- `real_world_trigger`: Intake-to-service transition, goal planning meeting, or employment transition milestone.
- `cadence`: Bi-weekly and milestone-driven.
- `expected_role_tasks`: Translate case goals into individualized vocational actions, document progress, update plans after reassessment, and coordinate training or referral needs.
- `primary_app_surfaces`: Cases, Services, Notes, Appointments, Reports.
- `outputs_and_handoffs`: Individualized vocational plan draft, update logs, and supervisor review handoff.
- `permission_floor`: `staff`
- `required_external_dependency`: Vocational plan template library and external service specialists for plan validation.
- `workflow_status`: `missing`
- `evidence_source`: External: [CMS person-centered service planning and reassessment cycle](https://www.law.cornell.edu/cfr/text/42/441.725), [BLS rehabilitation counselor responsibilities](https://www.bls.gov/ooh/community-and-social-service/rehabilitation-counselors.htm). Local: [Case Management System](../features/CASE_MANAGEMENT_SYSTEM.md), [FOLLOW_UP_LIFECYCLE.md](../features/FOLLOW_UP_LIFECYCLE.md).

- `workflow_id`: `rehab-worker-follow-up-and-contact-cadence-for-compliance-windows`
- `real_world_trigger`: Upcoming reassessment, service expiration, or compliance checkpoint for active worker.
- `cadence`: Weekly plus compliance window events.
- `expected_role_tasks`: Set follow-up reminders, monitor response windows, schedule appointments, and proactively close overdue tasks.
- `primary_app_surfaces`: Follow-ups, Appointments, Portal reminders, Cases.
- `outputs_and_handoffs`: Compliance-timed follow-up schedule and overdue task escalations.
- `permission_floor`: `staff`
- `required_external_dependency`: Program compliance thresholds and external attendance requirements.
- `workflow_status`: `partial`
- `evidence_source`: External: [CMS person-centered service plan review cadence](https://www.law.cornell.edu/cfr/text/42/441.725), [NASW service planning emphasis](https://www.socialworkers.org/Practice/NASW-Practice-Standards-Guidelines/NASW-Standards-for-Social-Work-Case-Management). Local: [Follow-ups](../features/FOLLOW_UP_LIFECYCLE.md), [Appointments](../api/API_REFERENCE_PORTAL_APPOINTMENTS.md), [features](../features/CASE_MANAGEMENT_SYSTEM.md).

- `workflow_id`: `rehab-worker-service-authorization-and-referral-transitions`
- `real_world_trigger`: New service request, authorization expiry, or inter-team referral event.
- `cadence`: Event-driven.
- `expected_role_tasks`: Verify authorization status before service delivery, place clear referral handoff notes, and transition to the right internal team when service scope changes.
- `primary_app_surfaces`: Cases, Services, Referrals in case notes, appointments, follow-up queue.
- `outputs_and_handoffs`: Authorization check result, referral handoff record, and escalation list for missing approvals.
- `permission_floor`: `staff`
- `required_external_dependency`: Billing/auth systems and partner referral portals outside current app.
- `workflow_status`: `partial`
- `evidence_source`: External: [CMS person-centered plan change requirements](https://www.law.cornell.edu/cfr/text/42/441.725), [BLS rehabilitation counselor referral roles](https://www.bls.gov/ooh/community-and-social-service/rehabilitation-counselors.htm). Local: [Case Management System](../features/CASE_MANAGEMENT_SYSTEM.md), [Case Client Visibility and Files](../features/CASE_CLIENT_VISIBILITY_AND_FILES.md), [API_REFERENCE_PORTAL_APPOINTMENTS.md](../api/API_REFERENCE_PORTAL_APPOINTMENTS.md).

- `workflow_id`: `rehab-worker-placement-and-outcome-tracking`
- `real_world_trigger`: Job coaching session completion, transition to employment, or outcomes audit.
- `cadence`: Weekly and monthly.
- `expected_role_tasks`: Track placement milestones, document barriers, compare outcomes against plan goals, and coordinate next support step.
- `primary_app_surfaces`: Services, Reports, Cases, Outcomes workflows, appointments/follow-ups.
- `outputs_and_handoffs`: Placement outcome tracker, barrier log, and continuity actions for supervisors.
- `permission_floor`: `staff`
- `required_external_dependency`: Employment outcome systems and labor-market outcome reporting tools.
- `workflow_status`: `partial`
- `evidence_source`: External: [BLS Rehabilitation Counselors](https://www.bls.gov/ooh/community-and-social-service/rehabilitation-counselors.htm), [CMS person-centered periodic review](https://www.law.cornell.edu/cfr/text/42/441.725). Local: [Case Management System](../features/CASE_MANAGEMENT_SYSTEM.md), [Reporting Guide](../features/REPORTING_GUIDE.md), [FOLLOW_UP_LIFECYCLE.md](../features/FOLLOW_UP_LIFECYCLE.md).

## Role × Workflow Coverage Matrix

| Workflow ID | Executive Director | Fundraiser | Nonprofit Administrator | Board Member | Case Manager | Rehabilitation Worker |
|---|---|---|---|---|---|---|
| executive-director-monthly-strategic-board-pack | partial | missing | missing | missing | missing | missing |
| executive-director-annual-board-990-compliance-command-center | external only | missing | missing | missing | missing | missing |
| executive-director-restricted-funds-stewardship-gate | partial | missing | missing | missing | missing | missing |
| executive-director-governance-risk-escalation | partial | missing | missing | partial | missing | missing |
| fundraiser-prospect-research-to-pipeline | missing | partial | missing | missing | missing | missing |
| fundraiser-donor-stewardship-and-impact-comms-cadence | missing | partial | missing | missing | missing | missing |
| fundraiser-grant-and-campaign-lifecycle-with-deadlines | missing | partial | missing | missing | missing | missing |
| fundraiser-restricted-donation-and-donor-preference-workflow | missing | partial | missing | missing | missing | missing |
| fundraiser-gift-entry-verification-acknowledgment-handoff | missing | partial | missing | missing | missing | missing |
| nonprofit-administrator-user-onboarding-offboarding-access-lifecycle | missing | missing | supported | missing | missing | missing |
| nonprofit-administrator-board-ready-reporting-cycle | missing | missing | partial | partial | missing | missing |
| nonprofit-administrator-compliance-documentation-vault-retention-audit-artifacts | missing | missing | missing | missing | missing | missing |
| nonprofit-administrator-audit-risk-ledger-and-corrective-actions | missing | missing | partial | missing | missing | missing |
| board-member-governance-meeting-cadence-and-packet-review | missing | missing | missing | partial | missing | missing |
| board-member-delegation-authority-matrix-and-committee-charter-traceability | missing | missing | missing | missing | missing | missing |
| board-member-conflict-of-interest-disclosure-and-recusal-handling | missing | missing | missing | missing | missing | missing |
| board-member-board-governance-dashboard-kpis-and-compliance-risk | missing | missing | missing | partial | missing | missing |
| case-manager-referral-and-eligibility-compliance-intake | missing | missing | missing | missing | partial | missing |
| case-manager-person-centered-plan-and-reassessment-cycle | missing | missing | missing | missing | partial | missing |
| case-manager-secure-progress-notes-and-outcome-timeline | missing | missing | missing | missing | partial | missing |
| case-manager-handoff-and-transition-workflow | missing | missing | missing | missing | partial | missing |
| case-manager-case-closure-continuity-workflow | missing | missing | missing | missing | partial | missing |
| rehab-worker-eligibility-and-functional-vocational-assessment | missing | missing | missing | missing | missing | partial |
| rehab-worker-individualized-employment-plan-creation-and-updates | missing | missing | missing | missing | missing | missing |
| rehab-worker-follow-up-and-contact-cadence-for-compliance-windows | missing | missing | missing | missing | missing | partial |
| rehab-worker-service-authorization-and-referral-transitions | missing | missing | missing | missing | partial | partial |
| rehab-worker-placement-and-outcome-tracking | missing | missing | missing | missing | missing | partial |
