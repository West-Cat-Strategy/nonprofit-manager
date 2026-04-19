# Persona Workflow Planning Pack

**Last Updated:** 2026-04-18

Use this companion to [Production User Personas](user-personas.md) when you need to turn the persona pack into realistic day-to-day workflow planning. The goal is to show how each role would actually use Nonprofit Manager in production today, while keeping visible the work those users would still expect even when the current product only partially supports it or does not own it at all.

## Purpose And Methodology

- Use this document for product, UX, onboarding, and roadmap conversations that need a workflow view rather than a role summary.
- Keep a `current + gaps` lens throughout: preserve the real-world workflow, then label whether the current app supports it cleanly.
- Ground each persona section in two evidence sets: local repo sources and stable external role guidance checked online.
- Keep all role-title translations labeled `Inference` whenever the title is not a canonical auth role slug in the repo.
- Treat Executive Directors and Board Members as daily in-app users, not email-only recipients of reports.

## How To Read The Workflow Schema

| Field | Meaning |
|---|---|
| `workflow_id` | Stable identifier for the workflow card |
| `real_world_trigger` | The real-life event that causes the workflow to happen |
| `cadence` | Typical frequency for the workflow |
| `expected_role_tasks` | Work the role would reasonably expect to perform |
| `primary_app_surfaces` | The current product surfaces most likely to support that work |
| `outputs_and_handoffs` | Deliverables, follow-up tasks, or collaborators touched by the workflow |
| `support_status` | Current coverage using `Supported`, `Partially supported`, or `Outside current app` |
| `gap_notes` | Where real-world expectations exceed the current product |
| `evidence` | External and local sources used to ground the workflow |

Support labels:

- `Supported`: The workflow maps well to the currently documented product surfaces.
- `Partially supported`: Core pieces exist, but important role expectations still rely on changing areas, workaround-heavy flows, or outside tools.
- `Outside current app`: The workflow is real for the role, but the current product does not claim it as a primary in-app experience.

## External Research Baseline

External sources were accessed on April 18, 2026.

- Executive Director: [Sample Job Description: Executive Director (Small Organization)](https://www.bridgespan.org/insights/nonprofit-job-description-toolkit/executive-director-small-organization) and [Board Roles and Responsibilities](https://www.councilofnonprofits.org/running-nonprofit/governance-leadership/board-roles-and-responsibilities). The Bridgespan source is job-description style and therefore illustrative rather than normative.
- Fundraiser: [Test Content Outline](https://www.cfre.org/exam-prep/test-content-outline/) from CFRE International.
- Nonprofit Administrator: [Nonprofit Chief Operating Officer (COO) Resource Center](https://www.bridgespan.org/insights/nonprofit-chief-operating-officer-resource-center). This is the closest stable nonprofit-operations guidance, so the translation from COO guidance to a nonprofit administrator workflow is `Inference`.
- Board Member: [Board Roles and Responsibilities](https://www.councilofnonprofits.org/running-nonprofit/governance-leadership/board-roles-and-responsibilities).
- Case Manager: [What is a Case Manager?](https://cmsa.org/who-we-are/what-is-a-case-manager/) from CMSA.
- Rehab Worker: [Rehabilitation Counselors](https://www.bls.gov/ooh/community-and-social-service/rehabilitation-counselors.htm) from the U.S. Bureau of Labor Statistics, supplemented by [What is a Case Manager?](https://cmsa.org/who-we-are/what-is-a-case-manager/) for coordination and handoff expectations.

## Executive Director

Companion persona: [Executive Director](user-personas.md#executive-director)

Role mapping: `Inference: admin` by default, with `manager` as the fallback planning note when governance or organization administration is split across roles. Treat this as a daily in-app leadership persona focused on summary views, recurring reporting, and oversight rather than deep record editing.

### Daily Operating Workflow

- `workflow_id`: `executive-director-daily-org-health-scan`
- `real_world_trigger`: Start of day, leadership standup, or an early signal that fundraising or program delivery may be drifting.
- `cadence`: Daily.
- `expected_role_tasks`: Review top-line organization health; scan fundraising, program, and operational indicators; check whether queue pressure or outcomes need leadership attention; decide what needs delegation.
- `primary_app_surfaces`: Workbench Overview, Dashboard and Analytics, alerts, saved reports, and scheduled-report inbox delivery.
- `outputs_and_handoffs`: Same-day priorities for managers or admins; requests for deeper analysis; leadership follow-ups tied to fundraising, service delivery, or staffing.
- `support_status`: `Supported`
- `gap_notes`: The daily scan maps well to current workbench and reporting surfaces, but executives still need saved reports or prebuilt views to avoid rebuilding leadership context from scratch.
- `evidence`: External: [Bridgespan Executive Director sample](https://www.bridgespan.org/insights/nonprofit-job-description-toolkit/executive-director-small-organization) and [National Council of Nonprofits board roles](https://www.councilofnonprofits.org/running-nonprofit/governance-leadership/board-roles-and-responsibilities). Local: [Production User Personas](user-personas.md#executive-director), [Dashboard and Analytics](../help-center/staff/dashboard-analytics.html), [Reporting Guide](../features/REPORTING_GUIDE.md), and [Feature Matrix](../features/FEATURE_MATRIX.md).

### Recurring Coordination Workflow

- `workflow_id`: `executive-director-fundraising-program-oversight-coordination`
- `real_world_trigger`: Weekly leadership syncs, program review meetings, or a need to align fundraising and service-delivery priorities.
- `cadence`: Weekly, with extra review around campaign pushes or program pressure.
- `expected_role_tasks`: Compare fundraising momentum against program demand; ask managers for follow-up on lagging queues; review whether staffing, outreach, and casework are moving toward strategic goals; keep board-facing talking points current.
- `primary_app_surfaces`: Dashboard and Analytics, People and Accounts summaries, Donations, Cases, saved reports, and scheduled reports.
- `outputs_and_handoffs`: Leadership meeting agendas; requests for manager action; prioritized issues for fundraising, operations, or program leads.
- `support_status`: `Supported`
- `gap_notes`: Cross-functional visibility is present, but the platform still expects the executive team to stitch together some leadership routines through saved reports and manager follow-up rather than through a purpose-built executive coordination workspace.
- `evidence`: External: [Bridgespan Executive Director sample](https://www.bridgespan.org/insights/nonprofit-job-description-toolkit/executive-director-small-organization). Local: [Production User Personas](user-personas.md#executive-director), [Quick Start](../help-center/staff/quick-start.html), [Donations](../help-center/staff/donations.html), [Cases](../help-center/staff/cases.html), and [Reporting Guide](../features/REPORTING_GUIDE.md).

### Reporting And Review Workflow

- `workflow_id`: `executive-director-board-leadership-packet-preparation`
- `real_world_trigger`: Board meetings, finance committee reviews, monthly leadership packets, or grant and funder update cycles.
- `cadence`: Weekly and monthly, with heavier preparation before board meetings.
- `expected_role_tasks`: Pull high-signal fundraising, outcomes, and operational reports; review whether data is board-ready; package recurring views into a leadership packet; confirm that shared metrics match the current strategic story.
- `primary_app_surfaces`: Reports, Saved Reports, Scheduled Reports, public report snapshots when intentionally shared, and Workbench Overview for quick context before deeper review.
- `outputs_and_handoffs`: Board packet content; leadership briefings; shared summary metrics for committee chairs, fundraisers, or administrators.
- `support_status`: `Partially supported`
- `gap_notes`: Scheduled and saved reports support recurring leadership review, but specialized board-packet assembly and leadership-presentation experiences are only partially modeled in the current app.
- `evidence`: External: [Bridgespan Executive Director sample](https://www.bridgespan.org/insights/nonprofit-job-description-toolkit/executive-director-small-organization) and [National Council of Nonprofits board roles](https://www.councilofnonprofits.org/running-nonprofit/governance-leadership/board-roles-and-responsibilities). Local: [Production User Personas](user-personas.md#executive-director), [Reports](../help-center/staff/reports.html), [Reporting Guide](../features/REPORTING_GUIDE.md), and [Dashboard and Analytics](../help-center/staff/dashboard-analytics.html).

### Exception Or Handoff Workflow

- `workflow_id`: `executive-director-governance-risk-escalation`
- `real_world_trigger`: Compliance concern, program risk, board-sensitive issue, donor crisis, or a problem that crosses normal management boundaries.
- `cadence`: Exception-driven.
- `expected_role_tasks`: Review the available facts; confirm whether the issue is operational, financial, or governance-related; hand work to the right admin or manager; prepare a board or committee escalation when needed.
- `primary_app_surfaces`: Read-only oversight through dashboards and saved reports, selected organization and admin views, and route or permissions troubleshooting context when access itself is part of the issue.
- `outputs_and_handoffs`: Escalation notes for administrators or managers; board-chair or committee briefings; requests for additional reporting or policy review.
- `support_status`: `Partially supported`
- `gap_notes`: The current product supports visibility and some admin-aware handoff, but board-specific governance workflows and specialized escalation paths are only partially modeled.
- `evidence`: External: [National Council of Nonprofits board roles](https://www.councilofnonprofits.org/running-nonprofit/governance-leadership/board-roles-and-responsibilities). Local: [Production User Personas](user-personas.md#executive-director), [FAQ](../help-center/staff/faq.html), [permissions.ts](../../backend/src/utils/permissions.ts), and [Feature Matrix](../features/FEATURE_MATRIX.md).

## Fundraiser

Companion persona: [Fundraiser](user-personas.md#fundraiser)

Role mapping: `Inference: manager` by default, with `admin` only when payment processing or organization-level receipting control belongs to the role. Treat this as a heavy staff-side revenue user who needs donor context, gift tracking, and recurring reporting.

### Daily Operating Workflow

- `workflow_id`: `fundraiser-donor-prospect-triage`
- `real_world_trigger`: Start of day, campaign push, recent donor activity, or a need to decide which donors and prospects need the next touch.
- `cadence`: Daily.
- `expected_role_tasks`: Review recent donor activity; identify prospects or lapsed donors needing follow-up; clean up contact or account context before outreach; prioritize next touches for active relationships.
- `primary_app_surfaces`: People and Accounts, Donations, opportunity summaries, Workbench Overview, and saved donor or campaign reports.
- `outputs_and_handoffs`: Outreach priorities; list cleanup; handoff notes for leadership, finance, or stewardship support.
- `support_status`: `Partially supported`
- `gap_notes`: People, Donations, Opportunities, and Reports support triage, but prospect research and some major-gift qualification work still sit partly outside the current app.
- `evidence`: External: [CFRE Test Content Outline](https://www.cfre.org/exam-prep/test-content-outline/). Local: [Production User Personas](user-personas.md#fundraiser), [People and Accounts](../help-center/staff/people-accounts.html), [Donations](../help-center/staff/donations.html), [Opportunities Pipeline](../features/OPPORTUNITIES_PIPELINE.md), and [Reporting Guide](../features/REPORTING_GUIDE.md).

### Recurring Coordination Workflow

- `workflow_id`: `fundraiser-cultivation-stewardship-coordination`
- `real_world_trigger`: Stewardship calendar milestones, major-donor follow-up, campaign planning, or a board-driven fundraising ask.
- `cadence`: Weekly and monthly.
- `expected_role_tasks`: Coordinate cultivation steps; keep donor context current; align staff and leadership on next asks; track pledge or opportunity movement; confirm who owns each relationship or follow-up.
- `primary_app_surfaces`: People and Accounts, Opportunities, Donations, saved reports, and scheduled reports for recurring revenue visibility.
- `outputs_and_handoffs`: Cultivation plans; board or executive follow-up asks; donor-history context for meetings; requests for communication or receipt support.
- `support_status`: `Partially supported`
- `gap_notes`: The stage-based opportunities pipeline helps with opportunity tracking, but solicitation planning, major-gift strategy, and some stewardship coordination still depend on outside processes or lightweight internal workarounds.
- `evidence`: External: [CFRE Test Content Outline](https://www.cfre.org/exam-prep/test-content-outline/). Local: [Production User Personas](user-personas.md#fundraiser), [People and Accounts](../help-center/staff/people-accounts.html), [Opportunities Pipeline](../features/OPPORTUNITIES_PIPELINE.md), [Feature Matrix](../features/FEATURE_MATRIX.md), and [Reports](../help-center/staff/reports.html).

### Reporting And Review Workflow

- `workflow_id`: `fundraiser-campaign-board-ready-reporting`
- `real_world_trigger`: Weekly revenue review, campaign checkpoint, leadership update, board meeting, or donor-segment analysis request.
- `cadence`: Weekly and monthly, with spikes around campaigns and board cycles.
- `expected_role_tasks`: Review campaign performance; compare recurring and one-time giving trends; prepare board-ready or executive-ready summaries; validate that donor and gift data tell a coherent story.
- `primary_app_surfaces`: Reports, Saved Reports, Scheduled Reports, Donations, campaign views, and dashboard widgets for quick trend review.
- `outputs_and_handoffs`: Campaign summaries; board-facing fundraising metrics; leadership packets; donor-segment exports where policy allows.
- `support_status`: `Supported`
- `gap_notes`: Reporting is strong for recurring revenue review, but fundraisers still need care when translating detailed fundraising work into polished board narratives.
- `evidence`: External: [CFRE Test Content Outline](https://www.cfre.org/exam-prep/test-content-outline/). Local: [Production User Personas](user-personas.md#fundraiser), [Reports](../help-center/staff/reports.html), [Reporting Guide](../features/REPORTING_GUIDE.md), [Donations](../help-center/staff/donations.html), and [Feature Matrix](../features/FEATURE_MATRIX.md).

### Exception Or Handoff Workflow

- `workflow_id`: `fundraiser-gift-entry-verification-acknowledgment-handoff`
- `real_world_trigger`: New gift entry, payment-state anomaly, missing receipt, disputed donation, or an acknowledgment step that crosses staff boundaries.
- `cadence`: Daily, plus exception handling as needed.
- `expected_role_tasks`: Record or verify gifts; review payment and receipt history; confirm donor attribution; hand issues to finance or administrators when payment processing, receipting, or access controls need intervention.
- `primary_app_surfaces`: Donations list and detail views, receipt history, payment status chips, People and Accounts, and report filters for finding problem records.
- `outputs_and_handoffs`: Clean donation records; receipt or acknowledgment follow-through; escalations to finance, administrators, or leadership when gift handling is blocked.
- `support_status`: `Partially supported`
- `gap_notes`: Stable donation review and receipting are documented, but tailored stewardship acknowledgments, complex reconciliation, and some payment-resolution work may still land outside the current app.
- `evidence`: External: [CFRE Test Content Outline](https://www.cfre.org/exam-prep/test-content-outline/). Local: [Production User Personas](user-personas.md#fundraiser), [Donations](../help-center/staff/donations.html), [People and Accounts](../help-center/staff/people-accounts.html), and [Feature Matrix](../features/FEATURE_MATRIX.md).

## Nonprofit Administrator

Companion persona: [Nonprofit Administrator](user-personas.md#nonprofit-administrator)

Role mapping: `Inference: admin`. This workflow translation uses nonprofit operations and COO-style guidance as the closest external analogue for the system steward who owns users, settings, access, and organization-wide setup inside the product.

### Daily Operating Workflow

- `workflow_id`: `nonprofit-administrator-user-onboarding-offboarding-access-provisioning`
- `real_world_trigger`: New hire, role change, contractor access update, departure, or a report that someone cannot reach the right route.
- `cadence`: Daily and exception-driven.
- `expected_role_tasks`: Create or update accounts; align role access with job scope; remove access when a user leaves; troubleshoot missing routes, actions, or module visibility.
- `primary_app_surfaces`: User and role administration, permissions-aware route access, staff help-center troubleshooting flows, and organization-level admin views.
- `outputs_and_handoffs`: Provisioned or deprovisioned access; clarified role expectations; escalations to leadership when governance or approval is required.
- `support_status`: `Supported`
- `gap_notes`: The app clearly supports role-based access and route troubleshooting, but administrators still need careful SOPs because access errors are often confused with data or UI issues.
- `evidence`: External: [Bridgespan COO Resource Center](https://www.bridgespan.org/insights/nonprofit-chief-operating-officer-resource-center). Local: [Production User Personas](user-personas.md#nonprofit-administrator), [permissions.ts](../../backend/src/utils/permissions.ts), [roleCatalogUseCase.ts](../../backend/src/modules/admin/usecases/roleCatalogUseCase.ts), [Quick Start](../help-center/staff/quick-start.html), and [FAQ](../help-center/staff/faq.html).

### Recurring Coordination Workflow

- `workflow_id`: `nonprofit-administrator-settings-branding-communications-provider-upkeep`
- `real_world_trigger`: Rebranding, sender or provider changes, new communication settings, or periodic checks that core configuration still matches organizational policy.
- `cadence`: Weekly, monthly, and during operational changes.
- `expected_role_tasks`: Review organization settings; keep branding and communication providers aligned; verify that admin-side setup still matches current policy; coordinate changes with leadership or technical owners.
- `primary_app_surfaces`: Organization settings, branding controls, communications-provider setup, admin routes, and the changing-area guidance for settings-heavy work.
- `outputs_and_handoffs`: Updated settings; provider configuration requests; rollout notes for staff; issues handed to technical owners when a provider or integration change is needed.
- `support_status`: `Partially supported`
- `gap_notes`: Organization and provider upkeep are partly supported, but HR, payroll, compliance-calendar, and vendor-management work is largely outside the current product, and admin settings remain a changing area.
- `evidence`: External: [Bridgespan COO Resource Center](https://www.bridgespan.org/insights/nonprofit-chief-operating-officer-resource-center). Local: [Production User Personas](user-personas.md#nonprofit-administrator), [Quick Start](../help-center/staff/quick-start.html), [beta appendix](../help-center/staff/beta-appendix.html), [permissions.ts](../../backend/src/utils/permissions.ts), and [Feature Matrix](../features/FEATURE_MATRIX.md).

### Reporting And Review Workflow

- `workflow_id`: `nonprofit-administrator-operational-reporting-configuration-monitoring`
- `real_world_trigger`: Routine ops review, audit preparation, leadership request, or a need to confirm that configuration and permissions still match expected operations.
- `cadence`: Weekly and monthly.
- `expected_role_tasks`: Review operational reports; monitor whether routes, roles, and scheduled outputs are behaving as expected; check that critical organization-level workflows remain available to the right users.
- `primary_app_surfaces`: Reports, Scheduled Reports, permissions and role catalog references, workbench route visibility, and admin-facing operational views.
- `outputs_and_handoffs`: Operations summaries; remediation lists; follow-up with managers or technical staff when access or configuration drift appears.
- `support_status`: `Partially supported`
- `gap_notes`: Reporting and scheduled delivery are strong, but configuration monitoring is still spread across reports, route checks, and admin know-how rather than a dedicated system-health console.
- `evidence`: External: [Bridgespan COO Resource Center](https://www.bridgespan.org/insights/nonprofit-chief-operating-officer-resource-center). Local: [Production User Personas](user-personas.md#nonprofit-administrator), [Reports](../help-center/staff/reports.html), [Reporting Guide](../features/REPORTING_GUIDE.md), [FAQ](../help-center/staff/faq.html), and [permissions.ts](../../backend/src/utils/permissions.ts).

### Exception Or Handoff Workflow

- `workflow_id`: `nonprofit-administrator-permissions-route-visibility-setup-drift`
- `real_world_trigger`: Missing route, broken permission expectation, unexpected visibility change, or admin setup drift discovered during training or support.
- `cadence`: Exception-driven.
- `expected_role_tasks`: Triage whether the issue is a filter problem, permissions mismatch, environment issue, or true defect; document the failing route; reassign the issue to the right owner; protect staff from training against unstable surfaces.
- `primary_app_surfaces`: FAQ triage patterns, route visibility checks, admin settings, role definitions, and changing-area guidance.
- `outputs_and_handoffs`: Clean escalation notes for technical staff; temporary workaround guidance for staff; updated admin or training expectations.
- `support_status`: `Partially supported`
- `gap_notes`: The product provides a clear route and permissions model, but exception handling still depends on disciplined admin troubleshooting, and vendor-management or compliance follow-through usually happens outside the app.
- `evidence`: External: [Bridgespan COO Resource Center](https://www.bridgespan.org/insights/nonprofit-chief-operating-officer-resource-center). Local: [Production User Personas](user-personas.md#nonprofit-administrator), [FAQ](../help-center/staff/faq.html), [Quick Start](../help-center/staff/quick-start.html), [roleSlug.ts](../../backend/src/utils/roleSlug.ts), and [permissions.ts](../../backend/src/utils/permissions.ts).

## Board Member

Companion persona: [Board Member](user-personas.md#board-member)

Role mapping: `Inference: viewer`, with `member` and `readonly` normalizing to `viewer` in the current repo. Treat this as a daily read-only in-app oversight persona, not just a recipient of emailed PDFs.

### Daily Operating Workflow

- `workflow_id`: `board-member-pre-meeting-oversight-review`
- `real_world_trigger`: Preparation for a board or committee meeting, an expected weekly review habit, or a request to check organizational health between meetings.
- `cadence`: Daily or several times per week during active board periods.
- `expected_role_tasks`: Review high-level dashboards and saved reports; understand mission, finance, and program signals; note questions for leadership without editing operational data.
- `primary_app_surfaces`: Read-only dashboards, saved reports, scheduled reports, and curated summary views shared for board consumption.
- `outputs_and_handoffs`: Meeting questions; follow-up requests to the Executive Director or nonprofit administrator; committee discussion notes.
- `support_status`: `Partially supported`
- `gap_notes`: Board members can consume reporting and dashboard views, but there is no dedicated board portal or board-specific read-only workspace in the current app.
- `evidence`: External: [National Council of Nonprofits board roles](https://www.councilofnonprofits.org/running-nonprofit/governance-leadership/board-roles-and-responsibilities). Local: [Production User Personas](user-personas.md#board-member), [Reporting Guide](../features/REPORTING_GUIDE.md), [Dashboard and Analytics](../help-center/staff/dashboard-analytics.html), [roleSlug.ts](../../backend/src/utils/roleSlug.ts), and [permissions.ts](../../backend/src/utils/permissions.ts).

### Recurring Coordination Workflow

- `workflow_id`: `board-member-committee-follow-up-action-review`
- `real_world_trigger`: Committee assignments, agreed action items, or recurring oversight responsibilities between formal meetings.
- `cadence`: Weekly and monthly.
- `expected_role_tasks`: Review progress on committee asks; confirm whether leadership follow-ups landed; prepare questions or decisions for the next committee meeting; stay aligned on fundraising or program oversight responsibilities.
- `primary_app_surfaces`: Read-only saved reports, scheduled reports, and curated leadership summaries rather than builder or admin surfaces.
- `outputs_and_handoffs`: Committee notes; follow-up questions for executives; confirmation that board-level asks have an owner.
- `support_status`: `Partially supported`
- `gap_notes`: The app can support read-only review, but committee workflow, minute-taking, and board action tracking mostly remain outside the current product.
- `evidence`: External: [National Council of Nonprofits board roles](https://www.councilofnonprofits.org/running-nonprofit/governance-leadership/board-roles-and-responsibilities). Local: [Production User Personas](user-personas.md#board-member), [Reports](../help-center/staff/reports.html), [Reporting Guide](../features/REPORTING_GUIDE.md), and [permissions.ts](../../backend/src/utils/permissions.ts).

### Reporting And Review Workflow

- `workflow_id`: `board-member-fundraising-advocacy-touchpoint`
- `real_world_trigger`: Board fundraising commitments, ambassador work, campaign checkpoints, or a request to support advocacy with current numbers in hand.
- `cadence`: Monthly and meeting-driven.
- `expected_role_tasks`: Review current fundraising posture; understand the organization narrative before making introductions or advocacy asks; confirm the board-facing version of campaign or outcomes progress.
- `primary_app_surfaces`: Read-only fundraising summaries, saved reports, scheduled reports, and leadership-prepared board packets.
- `outputs_and_handoffs`: Talking points for board outreach; informed fundraising participation; questions returned to fundraisers or leadership.
- `support_status`: `Partially supported`
- `gap_notes`: Board members can review board-ready fundraising views, but the actual outreach, advocacy, and relationship work is mostly outside current in-app workflows.
- `evidence`: External: [National Council of Nonprofits board roles](https://www.councilofnonprofits.org/running-nonprofit/governance-leadership/board-roles-and-responsibilities). Local: [Production User Personas](user-personas.md#board-member), [Reports](../help-center/staff/reports.html), [Donations](../help-center/staff/donations.html), and [Reporting Guide](../features/REPORTING_GUIDE.md).

### Exception Or Handoff Workflow

- `workflow_id`: `board-member-governance-exception-workflow`
- `real_world_trigger`: Conflict-of-interest concern, fiduciary question, unusual financial signal, or an executive issue that needs board attention.
- `cadence`: Exception-driven.
- `expected_role_tasks`: Review the summarized issue; determine whether the board needs to engage; hand operational investigation back to staff leadership; keep the board in an oversight posture instead of drifting into administration.
- `primary_app_surfaces`: Shared board packet views and read-only report context only.
- `outputs_and_handoffs`: Formal questions to the Executive Director, board chair, committee lead, or nonprofit administrator; requests for additional board-ready context.
- `support_status`: `Outside current app`
- `gap_notes`: Default board workflows should stay out of admin CRUD, report building, export management, and audit-log browsing; there is no dedicated governance exception workspace for board members today.
- `evidence`: External: [National Council of Nonprofits board roles](https://www.councilofnonprofits.org/running-nonprofit/governance-leadership/board-roles-and-responsibilities). Local: [Production User Personas](user-personas.md#board-member), [permissions.ts](../../backend/src/utils/permissions.ts), [roleSlug.ts](../../backend/src/utils/roleSlug.ts), and [FAQ](../help-center/staff/faq.html).

## Case Manager

Companion persona: [Case Manager](user-personas.md#case-manager)

Role mapping: `Inference: staff`. Treat this as a frontline coordination persona focused on moving clients through intake, active services, follow-ups, appointments, and outcomes review.

### Daily Operating Workflow

- `workflow_id`: `case-manager-intake-and-assessment`
- `real_world_trigger`: New referral, intake request, reassignment, or a returning client who needs a new case.
- `cadence`: Daily.
- `expected_role_tasks`: Review referral context; create or open the client record; assess immediate needs; establish the initial case status; identify milestones, follow-ups, and services to begin.
- `primary_app_surfaces`: People and Accounts, Cases list and detail views, Notes, Timeline, Milestones, Services, and Relationships tabs.
- `outputs_and_handoffs`: A new or updated case record; intake notes; initial assignment and follow-up plan; shared next steps for the client or internal team.
- `support_status`: `Supported`
- `gap_notes`: The intake path maps well to current case and contact surfaces, but later depth in tasking and workflow automation is more mixed than the first-day intake experience.
- `evidence`: External: [CMSA What is a Case Manager?](https://cmsa.org/who-we-are/what-is-a-case-manager/). Local: [Production User Personas](user-personas.md#case-manager), [Cases](../help-center/staff/cases.html), [Case Management System](../features/CASE_MANAGEMENT_SYSTEM.md), and [People and Accounts](../help-center/staff/people-accounts.html).

### Recurring Coordination Workflow

- `workflow_id`: `case-manager-active-case-progression`
- `real_world_trigger`: Ongoing service delivery, status changes, milestone movement, or the need to keep multiple cases advancing at once.
- `cadence`: Daily and weekly.
- `expected_role_tasks`: Update case status; record notes and services; manage milestones and relationships; coordinate with internal staff; keep the timeline accurate enough that another worker can pick up the case if needed.
- `primary_app_surfaces`: Cases queue, Notes, Timeline, Milestones, Services, Relationships, Follow-ups, and Appointments tabs.
- `outputs_and_handoffs`: Current case history; clear next actions; shared context for supervisors, rehab workers, or other service staff.
- `support_status`: `Partially supported`
- `gap_notes`: Core case progression is present, but workflow engine depth, task orchestration, files, and outcome layers remain mixed between complete and in-development surfaces.
- `evidence`: External: [CMSA What is a Case Manager?](https://cmsa.org/who-we-are/what-is-a-case-manager/). Local: [Production User Personas](user-personas.md#case-manager), [Cases](../help-center/staff/cases.html), [Case Management System](../features/CASE_MANAGEMENT_SYSTEM.md), and [Follow-up Lifecycle](../features/FOLLOW_UP_LIFECYCLE.md).

### Reporting And Review Workflow

- `workflow_id`: `case-manager-caseload-review-outcome-monitoring`
- `real_world_trigger`: Weekly caseload review, supervisor check-in, outcome review, or a need to understand which cases are stuck.
- `cadence`: Weekly and monthly.
- `expected_role_tasks`: Review open caseloads; identify overdue follow-ups or stalled statuses; compare current activity against expected outcomes; prepare a concise view for supervision or program review.
- `primary_app_surfaces`: Reports, dashboard summaries, case queues, follow-up views, and outcome-related report filters where available.
- `outputs_and_handoffs`: Caseload review notes; escalation lists; outcome follow-up requests; supervision prep.
- `support_status`: `Partially supported`
- `gap_notes`: Reporting helps surface caseload and follow-up state, but outcomes and workflow-depth expectations are still uneven enough that some supervision workflows require extra interpretation.
- `evidence`: External: [CMSA What is a Case Manager?](https://cmsa.org/who-we-are/what-is-a-case-manager/). Local: [Production User Personas](user-personas.md#case-manager), [Reports](../help-center/staff/reports.html), [Dashboard and Analytics](../help-center/staff/dashboard-analytics.html), [Case Management System](../features/CASE_MANAGEMENT_SYSTEM.md), and [Feature Matrix](../features/FEATURE_MATRIX.md).

### Exception Or Handoff Workflow

- `workflow_id`: `case-manager-portal-appointments-follow-up-coordination`
- `real_world_trigger`: A need to share information with the client, resolve an appointment, send or complete follow-up work, or hand the case forward to another service step.
- `cadence`: Daily and exception-driven.
- `expected_role_tasks`: Decide what is client-visible; coordinate appointments and reminders; open or close follow-ups; route documents or forms through the portal; preserve a clear boundary between staff-only and client-visible content.
- `primary_app_surfaces`: Portal visibility controls inside cases, Follow-ups, Appointments, portal case views, and appointment reminder or check-in workflows.
- `outputs_and_handoffs`: Client-visible updates; confirmed appointments; completed follow-ups; shared case context for portal users or the next staff owner.
- `support_status`: `Partially supported`
- `gap_notes`: Portal sharing, appointments, and follow-ups are real current surfaces, but files, outcomes, and workflow depth still require caution when the case crosses multiple owners or visibility rules.
- `evidence`: External: [CMSA What is a Case Manager?](https://cmsa.org/who-we-are/what-is-a-case-manager/). Local: [Production User Personas](user-personas.md#case-manager), [Cases](../help-center/staff/cases.html), [Portal Cases](../help-center/portal/cases.html), [Case Client Visibility and Files](../features/CASE_CLIENT_VISIBILITY_AND_FILES.md), [Follow-up Lifecycle](../features/FOLLOW_UP_LIFECYCLE.md), and [Portal Appointments API Reference](../api/API_REFERENCE_PORTAL_APPOINTMENTS.md).

## Rehab Worker

Companion persona: [Rehab Worker](user-personas.md#rehab-worker)

Role mapping: `Inference: staff`. This is an inferred frontline service-delivery variant, not a canonical repo role. The current app supports the work through generic case, service, appointment, follow-up, and portal patterns rather than rehab-specific domain objects.

### Daily Operating Workflow

- `workflow_id`: `rehab-worker-session-prep-client-history-review`
- `real_world_trigger`: A scheduled client session, field visit, referral follow-up, or a need to prepare before direct service.
- `cadence`: Daily.
- `expected_role_tasks`: Review the active case; check prior notes, services, follow-ups, and appointments; understand what the client should and should not be able to see; prepare for the next service interaction.
- `primary_app_surfaces`: Cases queue, Notes, Timeline, Services, Follow-ups, Appointments, and portal visibility context.
- `outputs_and_handoffs`: A clear session plan; current client context; any questions flagged for the case manager or supervisor before service begins.
- `support_status`: `Supported`
- `gap_notes`: The generic case record provides strong prep context, but rehab workers still need to translate generic terminology into their own service language.
- `evidence`: External: [BLS Rehabilitation Counselors](https://www.bls.gov/ooh/community-and-social-service/rehabilitation-counselors.htm) and [CMSA What is a Case Manager?](https://cmsa.org/who-we-are/what-is-a-case-manager/). Local: [Production User Personas](user-personas.md#rehab-worker), [Cases](../help-center/staff/cases.html), [Case Management System](../features/CASE_MANAGEMENT_SYSTEM.md), and [Portal Cases](../help-center/portal/cases.html).

### Recurring Coordination Workflow

- `workflow_id`: `rehab-worker-service-delivery-documentation`
- `real_world_trigger`: Completion of a service encounter, counseling session, skills-support interaction, or client milestone step.
- `cadence`: Daily.
- `expected_role_tasks`: Record what happened in the service interaction; document services delivered; note client response and next steps; keep enough detail for later continuity of care.
- `primary_app_surfaces`: Case Notes, Services, Timeline, Follow-ups, and linked client history within the case workspace.
- `outputs_and_handoffs`: Completed service documentation; next-step assignments; updated case context for case managers, supervisors, or peer staff.
- `support_status`: `Partially supported`
- `gap_notes`: The current product supports generic case and service documentation, but it does not provide rehab-specific plans, templates, or domain vocabulary out of the box.
- `evidence`: External: [BLS Rehabilitation Counselors](https://www.bls.gov/ooh/community-and-social-service/rehabilitation-counselors.htm). Local: [Production User Personas](user-personas.md#rehab-worker), [Cases](../help-center/staff/cases.html), [Case Management System](../features/CASE_MANAGEMENT_SYSTEM.md), and [Follow-up Lifecycle](../features/FOLLOW_UP_LIFECYCLE.md).

### Reporting And Review Workflow

- `workflow_id`: `rehab-worker-progress-monitoring-rehabilitation-plan-adjustment`
- `real_world_trigger`: Supervisor review, treatment-plan checkpoint, service-plan update, or a need to understand whether client progress is moving in the right direction.
- `cadence`: Weekly and monthly.
- `expected_role_tasks`: Review service history and current barriers; monitor progress trends; decide whether the next plan should change; prepare concise updates for supervisors or case managers.
- `primary_app_surfaces`: Reports, case history, services logged in the case record, appointment and follow-up state, and dashboard summaries where helpful.
- `outputs_and_handoffs`: Progress summaries; service-plan adjustment recommendations; escalation notes for supervisors or case managers.
- `support_status`: `Partially supported`
- `gap_notes`: Current reporting can support generic progress review, but rehab-specific plan-adjustment workflows and terminology are not first-class product concepts today.
- `evidence`: External: [BLS Rehabilitation Counselors](https://www.bls.gov/ooh/community-and-social-service/rehabilitation-counselors.htm) and [CMSA What is a Case Manager?](https://cmsa.org/who-we-are/what-is-a-case-manager/). Local: [Production User Personas](user-personas.md#rehab-worker), [Reports](../help-center/staff/reports.html), [Case Management System](../features/CASE_MANAGEMENT_SYSTEM.md), and [Feature Matrix](../features/FEATURE_MATRIX.md).

### Exception Or Handoff Workflow

- `workflow_id`: `rehab-worker-appointment-referral-follow-up-resolution`
- `real_world_trigger`: Missed session, referral dependency, appointment change, or a client next step that needs handoff to another worker or channel.
- `cadence`: Exception-driven, with daily follow-through.
- `expected_role_tasks`: Resolve or reschedule appointments; coordinate referrals; close or reopen follow-ups; decide when the client needs portal-visible information versus staff-only coordination; keep the handoff trail clear.
- `primary_app_surfaces`: Appointments, follow-ups, portal case views, documents and visibility controls, and the shared case timeline.
- `outputs_and_handoffs`: Appointment resolution; referral follow-up; client-visible next steps; documented handoff to case managers, administrators, or other service staff.
- `support_status`: `Partially supported`
- `gap_notes`: The app supports generic appointment, follow-up, and portal collaboration patterns, but rehab-specific referral workflows and plan vocabularies remain outside the current product model.
- `evidence`: External: [BLS Rehabilitation Counselors](https://www.bls.gov/ooh/community-and-social-service/rehabilitation-counselors.htm) and [CMSA What is a Case Manager?](https://cmsa.org/who-we-are/what-is-a-case-manager/). Local: [Production User Personas](user-personas.md#rehab-worker), [Portal Cases](../help-center/portal/cases.html), [Case Client Visibility and Files](../features/CASE_CLIENT_VISIBILITY_AND_FILES.md), [Follow-up Lifecycle](../features/FOLLOW_UP_LIFECYCLE.md), and [Portal Appointments API Reference](../api/API_REFERENCE_PORTAL_APPOINTMENTS.md).

## Cross-Persona Workflow Gap Matrix

| Persona | Real-world recurring work | Main in-app workflow anchors | Most important outputs | Most important outside-app dependencies | Largest current gap |
|---|---|---|---|---|---|
| Executive Director | Daily org-health review, leadership coordination, board packet prep, governance escalation | Workbench Overview, Dashboard and Analytics, Saved Reports, Scheduled Reports | Leadership packets, escalation notes, executive priorities | Board materials, governance process, leadership meetings | No specialized executive or board-packet workflow; governance escalation is only partially modeled |
| Fundraiser | Donor triage, cultivation, gift follow-through, campaign reporting | People and Accounts, Donations, Opportunities, Reports, Scheduled Reports | Donor priorities, campaign summaries, receipt follow-through | Prospect research tools, stewardship processes, finance reconciliation | Prospect research, major-gift planning, and stewardship coordination still sit partly outside the app |
| Nonprofit Administrator | Access provisioning, settings upkeep, provider coordination, ops monitoring | Role and permission surfaces, organization settings, Reports, FAQ triage patterns | Provisioned access, setup changes, escalation notes, operations summaries | HR, payroll, compliance calendars, vendor management | Admin settings and wider operations management are only partly in-product |
| Board Member | Oversight review, committee follow-up, board fundraising participation, governance questions | Read-only dashboards, saved reports, scheduled reports, board-ready packets | Meeting questions, committee follow-ups, board talking points | Board meeting process, governance docs, advocacy and fundraising activity | No dedicated board portal or read-only board workspace |
| Case Manager | Intake, case progression, portal coordination, caseload review | People and Accounts, Cases, Follow-ups, Appointments, Reports, portal-sharing controls | Updated case records, follow-up plans, caseload review notes | External providers, supervision, deeper workflow/task management | Workflow engine depth, files, and outcomes are mixed between complete and in-development surfaces |
| Rehab Worker | Session prep, documentation, referral and appointment follow-through, progress review | Cases, Services, Follow-ups, Appointments, portal visibility, Reports | Service notes, progress summaries, handoff trails | Rehab-specific plans, referral ecosystems, domain-specific service vocabulary | Support is generic case and service workflow support, not rehab-specific workflow design |

## Next-Wave Workflow Expansion Note

This companion intentionally stays aligned to the six requested personas. If later planning needs fuller event or volunteer operations coverage, add a dedicated Volunteer Coordinator or Event Operations workflow pack rather than stretching these six roles to cover work they do not primarily own.
