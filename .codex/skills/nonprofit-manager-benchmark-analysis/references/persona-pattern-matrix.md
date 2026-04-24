# Persona Pattern Matrix

Use this matrix to translate the benchmark cohort into persona-aware product implications.

| Persona | Borrowable patterns | Strongest references | Nonprofit Manager implication |
|---|---|---|---|
| Executive Director | Leadership packet assembly, finance-aware summaries, dashboarded exception review, workflow visibility | CiviCRM, OpenPetra, SuiteCRM | Strengthen executive packet entry points, reusable review views, and governance-sensitive escalation framing |
| Fundraiser | Contact hub, saved campaign audiences, test/suppression lanes, gift tracking, receipt defaults, acknowledgment and membership depth, workflow automation | CiviCRM, ERPNext, SuiteCRM, OpenPetra | Strengthen donor segmentation, stewardship cadence support, campaign flows, and finance-linked gift review |
| Nonprofit Administrator | Explicit setup sequences, safer admin defaults, dashboarded configuration health, workflow automation | OpenPetra, ERPNext, SuiteCRM, CiviCRM | Improve admin reliability views, configuration continuity, report health, and corrective-action tracking |
| Board Member | Read-only packet consumption, dashboard clarity, safe oversight views | CiviCRM, SuiteCRM, OpenPetra | Keep board flows read-first, reduce builder leakage, and make scheduled packet entry points clearer |
| Case Manager | Role-aware case stages, revision-capable approvals, activity-driven follow-ups, typed portal review requests, service-site handoffs | OpenSPP, CiviCRM, Sahana Eden | Strengthen explicit case stages, handoff packets, reassessment gates, and service continuity cues |
| Rehab Worker | Field-work tasks, service sites, referrals, active work pickers, lightweight self-service and coordination views | OpenSPP, Sahana Eden, CiviCRM | Strengthen service coordination, referral and authorization transitions, and role-appropriate frontline vocabulary |

## Cross-Cutting Patterns

- `Workflow state visibility`: OpenSPP and SuiteCRM show states and approvals directly in operational flows.
- `Bulk operational review`: SuiteCRM and OpenPetra make list-level operational cleanup easier.
- `Server-backed reusable views`: SuiteCRM sharpens saved queue definitions that can feed list screens and workbench entry points.
- `Typed records`: ERPNext, CiviCRM, and OpenPetra clarify who is a donor, member, volunteer, grant applicant, or fund designation, but local ERPNext nonprofit parity should not be claimed from the current clone.
- `Public and portal intake`: CiviCRM and OpenSPP both demonstrate structured public or self-service entry points that still feed disciplined, provenance-aware back-office workflows.
- `Reject generic studios first`: OpenSPP's studio and change-request surfaces show the complexity of no-code builders; nonprofit-manager should keep first moves domain-scoped and migration-backed.

## Precision Crosswalk

| Persona | Confirmed repo anchor | Inference or outside-app boundary | Benchmark lens |
|---|---|---|---|
| Executive Director | dashboards, reports, scheduled reports, escalation surfaces | board packets and compliance follow-through stay outside the app | CiviCRM, OpenPetra, SuiteCRM |
| Fundraiser | contacts, donations, opportunities, reporting surfaces | outreach cadence and donor-governance work are partially external | CiviCRM, ERPNext, OpenPetra, SuiteCRM |
| Nonprofit Administrator | admin settings, users, permissions, report delivery | compliance vault and corrective-action ledger are outside the app today | OpenPetra, ERPNext, SuiteCRM, CiviCRM |
| Board Member | read-only reports and dashboards | governance packet composition and committee process are external | CiviCRM, SuiteCRM, OpenPetra |
| Case Manager | cases, follow-ups, portal collaboration | reassessment rigor and standard handoff packets are only partially modeled | OpenSPP, CiviCRM |
| Rehab Worker | cases, services, appointments, portal workflows | individualized employment plans and placement tooling remain missing | OpenSPP, Sahana Eden, CiviCRM |
