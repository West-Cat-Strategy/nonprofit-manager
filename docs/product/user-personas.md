# Production User Personas

**Last Updated:** 2026-04-18

Use this document for product and UX planning around the production users who rely on Nonprofit Manager in the staff workspace. This persona pack is intentionally role-based, not demographic, and it does not define demo data, seed data, or QA automation personas. Treat every role-to-auth translation as a planning aid rather than a promise that the repo has a one-to-one auth role with the same name.

## Companion Docs

- [Persona Workflow Planning Pack](persona-workflows.md) maps these personas to real-life day-to-day, recurring, reporting, and handoff workflows with explicit `Supported`, `Partially supported`, and `Outside current app` status notes.

## Scope And Evidence Rules

- Use this pack when prioritizing product behavior, navigation, reporting, onboarding, and workflow design for real staff and leadership users.
- Keep persona claims grounded in the current product overview, feature matrix, staff help center, permissions model, reporting docs, and case-management docs.
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
| `persona_id` | Stable planning slug for the persona card |
| `maps_to_role_slug` | Closest current access model in the repo; use `Inference` whenever the title is not a canonical auth role |
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

- `persona_id`: `executive-director`
- `maps_to_role_slug`: `Inference: admin` by default because the repo already maps `Executive Director` to `admin` during staff-account creation; use `manager` as the fallback planning note when governance, security, or organization administration is split across roles. See [../../backend/src/modules/contacts/usecases/contactDirectory.usecase.ts](../../backend/src/modules/contacts/usecases/contactDirectory.usecase.ts) and [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts).
- `primary_modules`: Workbench Overview, Dashboard and Analytics, Reports, Scheduled Reports, Outcomes Report, Workflow Coverage Report, and light governance surfaces such as organization settings and audit-aware oversight. See [../../README.md](../../README.md), [../features/FEATURE_MATRIX.md](../features/FEATURE_MATRIX.md), [../help-center/staff/dashboard-analytics.html](../help-center/staff/dashboard-analytics.html), and [../help-center/staff/reports.html](../help-center/staff/reports.html).
- `usage_cadence`: Daily summary review in the workbench or dashboard, weekly report review, and monthly oversight of outcomes, workflow gaps, and organization-level health.
- `top_jobs`: Review organization health, confirm that fundraising and service-delivery work is moving in the right direction, monitor recurring leadership reporting, and step into governance controls when a leader must unblock a policy or organization-level decision.
- `dashboard_report_needs`: Summary-first KPIs, reusable saved reports, scheduled leadership packets, trustworthy drill-down into analytics, and high-signal oversight views that do not force the executive to rebuild reports from scratch. See [../features/REPORTING_GUIDE.md](../features/REPORTING_GUIDE.md) and [../help-center/staff/reports.html](../help-center/staff/reports.html).
- `sensitive_data_boundaries`: Broad organizational visibility is appropriate, but the default experience should emphasize oversight rather than day-to-day record editing. Dashboard customization and admin settings are still changing areas, so process-of-record training should stay conservative there. See [../help-center/staff/beta-appendix.html](../help-center/staff/beta-appendix.html).
- `success_signals`: The Executive Director can log in daily, understand the organization's status in minutes, and trust that recurring reports reflect fundraising, program, and operational reality without spreadsheet cleanup.
- `pain_points`: Summary views become too shallow if reusable reports are not already defined, and the changing dashboard customization or admin-settings surfaces can create training drift if treated as settled workflows.
- `anchor_scenarios`: Primary scenario: the Executive Director starts the day in Workbench Overview, reviews scheduled and saved reports, then checks whether fundraising, cases, and operational queues are trending in the right direction. Failure-mode scenario: the Executive Director builds internal SOPs around the current dashboard editor or admin-settings layout and later finds that staff training no longer matches the live product.
- `evidence`: Product framing: [../../README.md](../../README.md) and [product-spec.md](product-spec.md). Workflow or help-center evidence: [../help-center/staff/dashboard-analytics.html](../help-center/staff/dashboard-analytics.html) and [../help-center/staff/reports.html](../help-center/staff/reports.html). Access, reporting, or case-management evidence: [../../backend/src/modules/contacts/usecases/contactDirectory.usecase.ts](../../backend/src/modules/contacts/usecases/contactDirectory.usecase.ts), [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts), and [../features/REPORTING_GUIDE.md](../features/REPORTING_GUIDE.md).

### Fundraiser

- `persona_id`: `fundraiser`
- `maps_to_role_slug`: `Inference: manager` by default because the fundraiser needs donation, reporting, and recurring-delivery control; escalate to `admin` only when in-app payment processing or organization-level receipting ownership is part of the job. See [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts).
- `primary_modules`: People and Accounts, Donations, Dashboard and Analytics, Reports, Scheduled Reports, and campaign-supporting integrations or communication surfaces when relevant. See [../../README.md](../../README.md), [../features/FEATURE_MATRIX.md](../features/FEATURE_MATRIX.md), [../help-center/staff/people-accounts.html](../help-center/staff/people-accounts.html), [../help-center/staff/donations.html](../help-center/staff/donations.html), and [../help-center/staff/reports.html](../help-center/staff/reports.html).
- `usage_cadence`: Daily donor and gift review, weekly campaign and receipt follow-through, and monthly recurring reporting or leadership packet preparation.
- `top_jobs`: Keep donor and account records clean, record gifts accurately, verify payment state and receipt history, track campaign progress, and turn recurring fundraising questions into reusable reports.
- `dashboard_report_needs`: Donation and campaign summaries, recurring-giving trends, scheduled CSV or XLSX delivery, and saved reports that make board and leadership reporting repeatable. See [../features/REPORTING_GUIDE.md](../features/REPORTING_GUIDE.md) and [../help-center/staff/reports.html](../help-center/staff/reports.html).
- `sensitive_data_boundaries`: This role handles donor contact data, donation amounts, payment status, and receipt history. Public report links and exports are useful but raise disclosure risk, so sharing defaults should remain conservative. See [../help-center/staff/donations.html](../help-center/staff/donations.html) and [../features/REPORTING_GUIDE.md](../features/REPORTING_GUIDE.md).
- `success_signals`: The fundraiser can enter or verify gifts quickly, trust donation totals and receipt history, and reuse saved reports instead of rebuilding the same campaign analysis every cycle.
- `pain_points`: Duplicate people or donations when search is skipped, sticky filters that make records look missing, confusion between pending and failed payments, scheduled-delivery limits such as email-first CSV or XLSX attachments, and row-cap constraints for large exports.
- `anchor_scenarios`: Primary scenario: the fundraiser reviews a donor record, records or verifies a gift, confirms receipt history, and schedules a recurring report for campaign review. Failure-mode scenario: the fundraiser shares a public snapshot too broadly or assumes a pending payment is failed, causing avoidable follow-up churn and reporting confusion.
- `evidence`: Product framing: [../../README.md](../../README.md) and [product-spec.md](product-spec.md). Workflow or help-center evidence: [../help-center/staff/people-accounts.html](../help-center/staff/people-accounts.html), [../help-center/staff/donations.html](../help-center/staff/donations.html), and [../help-center/staff/reports.html](../help-center/staff/reports.html). Access, reporting, or case-management evidence: [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts), [../features/REPORTING_GUIDE.md](../features/REPORTING_GUIDE.md), and [../features/FEATURE_MATRIX.md](../features/FEATURE_MATRIX.md).

### Nonprofit Administrator

- `persona_id`: `nonprofit-administrator`
- `maps_to_role_slug`: `Inference: admin` because this role owns organization settings, users, access, report governance, and operational configuration rather than a narrower feature lane. See [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts).
- `primary_modules`: Admin settings and related governance surfaces, Users and Access, Organization settings, Dashboard and Analytics, Reports, Scheduled Reports, People and Accounts, and communications or provider configuration where the organization runs them in-product. See [../../README.md](../../README.md), [../features/FEATURE_MATRIX.md](../features/FEATURE_MATRIX.md), [../help-center/staff/quick-start.html](../help-center/staff/quick-start.html), and [../help-center/staff/reports.html](../help-center/staff/reports.html).
- `usage_cadence`: Daily route, access, or setup troubleshooting; weekly report and organization review; monthly governance, receipting, and configuration follow-through.
- `top_jobs`: Keep the staff workspace configured and safe, manage users and access, maintain organization settings, confirm receipting readiness, and ensure that recurring reporting is reliable for staff and leadership.
- `dashboard_report_needs`: Operational dashboards, report-run visibility, scheduled delivery, report-sharing controls, and enough organization-level reporting to spot route, permission, or configuration drift early.
- `sensitive_data_boundaries`: This role touches the broadest set of sensitive controls, including users, exports, public report links, organization settings, and audit-aware surfaces. It should be modeled as a true system steward, not just a heavy data-entry user. Admin settings and dashboard customization remain changing areas for training and SOP purposes. See [../help-center/staff/beta-appendix.html](../help-center/staff/beta-appendix.html).
- `success_signals`: Staff can reach the right routes, organization configuration is stable, report delivery is dependable, and receipting or provider setup does not block normal operations.
- `pain_points`: Missing permissions can make routes disappear in confusing ways, organization-context issues can block expected workflows, and changing admin surfaces can drift faster than internal training materials.
- `anchor_scenarios`: Primary scenario: the administrator reviews user access, confirms organization receipting and communications settings, and checks that scheduled reports are reaching the right recipients. Failure-mode scenario: an administrator trains staff against an unstable admin-settings flow or misses a permission gap that causes core routes to vanish from the workspace.
- `evidence`: Product framing: [../../README.md](../../README.md) and [product-spec.md](product-spec.md). Workflow or help-center evidence: [../help-center/staff/quick-start.html](../help-center/staff/quick-start.html) and [../help-center/staff/reports.html](../help-center/staff/reports.html). Access, reporting, or case-management evidence: [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts), [../features/REPORTING_GUIDE.md](../features/REPORTING_GUIDE.md), and [../help-center/staff/beta-appendix.html](../help-center/staff/beta-appendix.html).

### Board Member

- `persona_id`: `board-member`
- `maps_to_role_slug`: `Inference: viewer` by default because `member` and `readonly` normalize to `viewer`; treat this as a daily in-app read-only oversight persona rather than an email-only stakeholder. See [../../backend/src/utils/roleSlug.ts](../../backend/src/utils/roleSlug.ts) and [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts).
- `primary_modules`: Dashboard and Analytics, Reports, Scheduled Reports, saved or shared report views, and masked oversight views that support governance without requiring staff-operational CRUD. See [../../README.md](../../README.md), [product-spec.md](product-spec.md), [../help-center/staff/dashboard-analytics.html](../help-center/staff/dashboard-analytics.html), and [../help-center/staff/reports.html](../help-center/staff/reports.html).
- `usage_cadence`: Daily or near-daily read-only check-ins during active reporting periods, with heavier weekly or monthly use around committee review and board meetings.
- `top_jobs`: Review organization health, fundraising trajectory, and program or outcome summaries; stay current between meetings; and use shared or scheduled reporting without learning the full staff-builder workflow.
- `dashboard_report_needs`: Read-only dashboards, clear saved-report views, scheduled board packets, and low-friction shared or public snapshot access with enough structure that a board user does not need staff-operational context to interpret the data. See [../features/REPORTING_GUIDE.md](../features/REPORTING_GUIDE.md).
- `sensitive_data_boundaries`: Default to masked or limited oversight visibility. The board-member persona should not claim report-building, export management, admin CRUD, raw audit-log browsing, or staff-only case-detail access unless an organization intentionally creates a more hands-on variant. See [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts).
- `success_signals`: A board member can log in regularly, read the right summaries quickly, and arrive at meetings already aligned on current fundraising, outcomes, and operational signals.
- `pain_points`: Too much builder complexity, unclear shared-report access, and oversight views that expose more staff-operational detail than the board actually needs.
- `anchor_scenarios`: Primary scenario: a board member logs in before a committee meeting, reviews dashboard summaries and a saved board packet, then opens a scheduled report link for deeper context. Failure-mode scenario: the board member lands in report-builder or admin-style flows and cannot tell which actions are safe because the read-only posture is not visually obvious.
- `evidence`: Product framing: [../../README.md](../../README.md) and [product-spec.md](product-spec.md). Workflow or help-center evidence: [../help-center/staff/dashboard-analytics.html](../help-center/staff/dashboard-analytics.html) and [../help-center/staff/reports.html](../help-center/staff/reports.html). Access, reporting, or case-management evidence: [../../backend/src/utils/roleSlug.ts](../../backend/src/utils/roleSlug.ts), [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts), and [../features/REPORTING_GUIDE.md](../features/REPORTING_GUIDE.md).

### Case Manager

- `persona_id`: `case-manager`
- `maps_to_role_slug`: `Inference: staff` because the current repo models casework through frontline staff permissions rather than a dedicated `case_manager` auth role. See [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts).
- `primary_modules`: Cases, People and Accounts, Follow-ups, portal-sharing workflows, appointments, notes, documents, and repeatable operational reporting. See [../../README.md](../../README.md), [../features/FEATURE_MATRIX.md](../features/FEATURE_MATRIX.md), [../help-center/staff/cases.html](../help-center/staff/cases.html), and [../help-center/staff/people-accounts.html](../help-center/staff/people-accounts.html).
- `usage_cadence`: Daily queue triage, status changes, note capture, follow-up resolution, and portal-sharing decisions; weekly case review and operational reporting.
- `top_jobs`: Create or open cases, move work from intake through active follow-through, capture notes and status changes, coordinate next steps, and decide when a case is ready for client-facing portal visibility.
- `dashboard_report_needs`: Urgent, overdue, or due-this-week queue views; follow-up reminders; operational case summaries; and outcomes or workflow reporting that supports supervision without burying the case manager in report-builder complexity. See [../help-center/staff/dashboard-analytics.html](../help-center/staff/dashboard-analytics.html) and [../help-center/staff/reports.html](../help-center/staff/reports.html).
- `sensitive_data_boundaries`: Case collaboration is private by default, and portal sharing is selective. Internal notes, outcomes, and documents stay staff-only unless they are explicitly marked visible to clients. See [../features/CASE_CLIENT_VISIBILITY_AND_FILES.md](../features/CASE_CLIENT_VISIBILITY_AND_FILES.md).
- `success_signals`: The case manager can move a caseload forward, keep one accurate client record, and share portal-safe information without missing required notes, follow-ups, or visibility decisions.
- `pain_points`: Saved views or filters can hide the real working queue, visibility controls add a second decision layer to updates, and several workflows require note or outcome documentation before the status change is really complete.
- `anchor_scenarios`: Primary scenario: the case manager starts from the case queue, changes status with notes and outcomes, schedules a follow-up, and then marks the case client-viewable only after checking the portal-safe record. Failure-mode scenario: a case manager assumes visibility defaults are public-facing, or loses track of a case because filters and saved views make the queue look cleaner than it really is.
- `evidence`: Product framing: [../../README.md](../../README.md) and [../features/FEATURE_MATRIX.md](../features/FEATURE_MATRIX.md). Workflow or help-center evidence: [../help-center/staff/cases.html](../help-center/staff/cases.html) and [../help-center/staff/people-accounts.html](../help-center/staff/people-accounts.html). Access, reporting, or case-management evidence: [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts), [../features/CASE_MANAGEMENT_SYSTEM.md](../features/CASE_MANAGEMENT_SYSTEM.md), [../features/FOLLOW_UP_LIFECYCLE.md](../features/FOLLOW_UP_LIFECYCLE.md), and [../features/CASE_CLIENT_VISIBILITY_AND_FILES.md](../features/CASE_CLIENT_VISIBILITY_AND_FILES.md).

### Rehab Worker

- `persona_id`: `rehab-worker`
- `maps_to_role_slug`: `Inference: staff` because the repo does not define a first-class `rehab_worker` role and instead models this work through generic frontline case, service, follow-up, appointment, and portal workflows. See [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts), [../features/CASE_MANAGEMENT_SYSTEM.md](../features/CASE_MANAGEMENT_SYSTEM.md), and [../api/API_REFERENCE_PORTAL_APPOINTMENTS.md](../api/API_REFERENCE_PORTAL_APPOINTMENTS.md).
- `primary_modules`: Cases, services and appointments inside casework, Follow-ups, client-facing forms, and portal collaboration surfaces. See [../../README.md](../../README.md), [../features/CASE_MANAGEMENT_SYSTEM.md](../features/CASE_MANAGEMENT_SYSTEM.md), [../help-center/staff/cases.html](../help-center/staff/cases.html), and [../help-center/staff/index.html](../help-center/staff/index.html).
- `usage_cadence`: Daily encounter documentation, appointment follow-through, service logging, and follow-up completion; weekly review of service and outcome patterns with supervisors or team leads.
- `top_jobs`: Document sessions or encounters, log services delivered, schedule or resolve appointments, complete follow-ups, capture outcome-linked notes, and coordinate with clients through forms or portal-safe updates.
- `dashboard_report_needs`: Assigned-case and follow-up queues, appointment reminder and check-in state, staff-safe service summaries, and operational reports that help a frontline worker understand what needs attention next. See [../help-center/staff/dashboard-analytics.html](../help-center/staff/dashboard-analytics.html) and [../help-center/staff/reports.html](../help-center/staff/reports.html).
- `sensitive_data_boundaries`: Internal versus client-visible notes, outcomes, and documents matter here as much as the case record itself. Public or portal collaboration must respect the private-by-default case-sharing model and the current case-form and appointment workflows. See [../features/CASE_CLIENT_VISIBILITY_AND_FILES.md](../features/CASE_CLIENT_VISIBILITY_AND_FILES.md) and [../api/API_REFERENCE_PORTAL_APPOINTMENTS.md](../api/API_REFERENCE_PORTAL_APPOINTMENTS.md).
- `success_signals`: The rehab worker can finish documentation, keep appointments and follow-ups moving, and preserve service history in a shared case record without juggling disconnected tools or ad hoc notes.
- `pain_points`: The current product vocabulary is generic staff and case language rather than rehab-specific language, visibility rules add friction when deciding what the client should see, and forms or appointment-resolution flows can feel brittle if the user expects looser documentation rules.
- `anchor_scenarios`: Primary scenario: the rehab worker opens an assigned case, records a session note with outcome context, resolves an appointment, and sends the next step through a client-safe form or portal path. Failure-mode scenario: the rehab worker assumes a note or document is client-visible by default, or loses momentum because a form has expired and the follow-up or appointment flow requires extra resolution detail.
- `evidence`: Product framing: [../../README.md](../../README.md) and [../features/FEATURE_MATRIX.md](../features/FEATURE_MATRIX.md). Workflow or help-center evidence: [../help-center/staff/cases.html](../help-center/staff/cases.html) and [../help-center/staff/index.html](../help-center/staff/index.html). Access, reporting, or case-management evidence: [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts), [../features/CASE_MANAGEMENT_SYSTEM.md](../features/CASE_MANAGEMENT_SYSTEM.md), [../features/FOLLOW_UP_LIFECYCLE.md](../features/FOLLOW_UP_LIFECYCLE.md), [../api/API_REFERENCE_PORTAL_APPOINTMENTS.md](../api/API_REFERENCE_PORTAL_APPOINTMENTS.md), and [../features/CASE_CLIENT_VISIBILITY_AND_FILES.md](../features/CASE_CLIENT_VISIBILITY_AND_FILES.md).

## Cross-Role Matrix

| Persona | Role slug | Daily surfaces | Weekly or monthly surfaces | Read vs write posture | PII or finance exposure | Primary reports | Most likely friction |
|---|---|---|---|---|---|---|---|
| Executive Director | `admin` by default; `Inference: manager` fallback | Workbench Overview, Dashboard and Analytics, saved or scheduled reports | Outcomes review, workflow coverage, governance review | Read-heavy with occasional governance writes | Broad organizational visibility | Leadership packet, outcomes report, workflow coverage report | Changing dashboard or admin surfaces can outpace training |
| Fundraiser | `Inference: manager` by default | People and Accounts, Donations, quick dashboard checks | Campaign review, scheduled fundraising reports, receipt follow-through | Mixed read and write | High donor and donation sensitivity | Donation, campaign, recurring-giving, and scheduled finance reports | Duplicate records, sticky filters, payment-state confusion, export limits |
| Nonprofit Administrator | `Inference: admin` | Users, access, organization settings, route and report oversight | Governance, provider setup, receipting readiness, scheduled report review | Mixed read and write with broad control scope | Highest admin and export sensitivity | Operational oversight and scheduled admin-facing reports | Missing permissions or changing admin flows can hide the real issue |
| Board Member | `Inference: viewer` | Read-only dashboards, saved reports, scheduled board packet views | Committee and meeting prep, oversight review | Read-only by default | Limited and preferably masked oversight data | Board packet, fundraising summary, outcomes summary | Builder or admin-style UX can blur the intended read-only posture |
| Case Manager | `Inference: staff` | Cases, follow-ups, portal-sharing decisions, people detail views | Case review, operational reporting, outcome follow-through | Mixed read and write | High client-data sensitivity with portal-sharing decisions | Case summary, queue and follow-up reports, outcomes trend views | Filters, saved views, and visibility decisions can hide next steps |
| Rehab Worker | `Inference: staff` | Cases, services, appointments, follow-ups, client forms | Service and outcome review with supervisors | Mixed read and write | High client-data sensitivity with client-visible content boundaries | Service, appointment, follow-up, and staff-safe outcome summaries | Generic staff vocabulary and strict visibility or resolution rules can slow documentation |

## Coverage Check

- Leadership and governance coverage: Executive Director and Board Member.
- Revenue and operations coverage: Fundraiser and Nonprofit Administrator.
- Service-delivery coverage: Case Manager and Rehab Worker.
- Major surfaces covered across the pack: dashboard or workbench, people or accounts, donations, reports and scheduled reports, admin or governance, and cases, follow-ups, appointments, and portal collaboration.

## Future Expansion

This first pack intentionally stops at the six requested roles. If a later planning wave needs fuller coverage of volunteer or event-heavy operations, add a dedicated Volunteer Coordinator or Event Operations persona rather than stretching one of these six to absorb that workload.
