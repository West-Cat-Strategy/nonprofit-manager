# Workflow Models

This file is the canonical workflow layer for the six-persona pack. `docs/product/persona-workflows.md` is the summary view.

## Status Legend

- `supported`: product-native and stable enough for day-to-day use
- `partial`: core pieces exist, but key steps still rely on workaround or outside process
- `external only`: the app provides context or inputs, but the workflow outcome is mostly external
- `missing`: no practical in-product realization today

## Governance And Revenue Workflows

### Executive Director

| Workflow ID | Cadence | Status | Primary surfaces | Outputs and handoffs |
|---|---|---|---|---|
| `executive-director-monthly-strategic-board-pack` | Monthly | `partial` | Workbench, Dashboard, Reports, Saved Reports, Scheduled Reports | Board packet, variance narrative, executive action list |
| `executive-director-annual-board-990-compliance-command-center` | Annual plus exception-driven checkpoints | `external only` | Reporting, organization settings visibility, access controls | Filing readiness checklist, compliance handoff package |
| `executive-director-restricted-funds-stewardship-gate` | Event-driven | `partial` | Donations, People and Accounts, Reports | Restriction review note, stewardship reminder, escalation queue |
| `executive-director-governance-risk-escalation` | Exception-driven | `partial` | Reports, dashboards, admin-visibility surfaces | Escalation package, investigation owner, follow-up timeline |

### Fundraiser

| Workflow ID | Cadence | Status | Primary surfaces | Outputs and handoffs |
|---|---|---|---|---|
| `fundraiser-prospect-research-to-pipeline` | Daily and weekly | `partial` | Contacts, Accounts, Opportunities, Notes, Scheduled Reports | Clean pipeline, owner assignments, weekly pipeline summary |
| `fundraiser-donor-stewardship-and-impact-comms-cadence` | Weekly and monthly | `partial` | Donations, donor records, reports, scheduled reports | Stewardship calendar, impact update list, follow-up notes |
| `fundraiser-grant-and-campaign-lifecycle-with-deadlines` | Weekly and deadline-driven | `partial` | Opportunities, Donations, Reports, Dashboard | Campaign tracker, deadline readiness, compliance handoff |
| `fundraiser-restricted-donation-and-donor-preference-workflow` | Daily and exception-driven | `partial` | Donations, People and Accounts, Saved and Scheduled Reports | Restriction-validated gift record, donor preference profile |
| `fundraiser-gift-entry-verification-acknowledgment-handoff` | Daily | `partial` | Donation list and detail, people or account views, reports | Cleaned gift ledger, acknowledgment handoff, finance exception list |

### Nonprofit Administrator

| Workflow ID | Cadence | Status | Primary surfaces | Outputs and handoffs |
|---|---|---|---|---|
| `nonprofit-administrator-user-onboarding-offboarding-access-lifecycle` | Daily and exception-driven | `supported` | Admin settings, users, roles, permissions, reports | Access records, role-change logs, onboarding or offboarding handoff |
| `nonprofit-administrator-board-ready-reporting-cycle` | Weekly and monthly | `partial` | Reports, Scheduled Reports, Dashboard, Admin settings | Board-safe report calendar, report reliability notes |
| `nonprofit-administrator-compliance-documentation-vault-retention-audit-artifacts` | Monthly and before review cycles | `missing` | Organization settings, reports, support docs | Audit-ready artifact list, retention flags, corrective actions |
| `nonprofit-administrator-audit-risk-ledger-and-corrective-actions` | Bi-weekly and exception-driven | `partial` | Admin settings, permissions views, route diagnostics, reports | Audit-risk ledger, corrective-action timeline, escalation pack |

### Board Member

| Workflow ID | Cadence | Status | Primary surfaces | Outputs and handoffs |
|---|---|---|---|---|
| `board-member-governance-meeting-cadence-and-packet-review` | Weekly, monthly, and meeting-driven | `partial` | Saved Reports, Scheduled Reports, Dashboard, packet snapshots | Meeting-ready oversight notes, focused follow-up questions |
| `board-member-delegation-authority-matrix-and-committee-charter-traceability` | Quarterly and when committees change | `missing` | Read-only reporting context plus external governance docs | Charter alignment notes, delegation adjustments |
| `board-member-conflict-of-interest-disclosure-and-recusal-handling` | Annual and exception-driven | `missing` | Read-only reporting context only | Conflict disclosure artifact and recusal tracker outside the app |
| `board-member-board-governance-dashboard-kpis-and-compliance-risk` | Monthly and exception-driven | `partial` | Dashboard and read-only reporting | KPI summary, governance-risk questions, escalation requests |

## Service-Delivery Workflows

### Case Manager

| Workflow ID | Cadence | Status | Primary surfaces | Outputs and handoffs |
|---|---|---|---|---|
| `case-manager-referral-and-eligibility-compliance-intake` | Daily | `partial` | Cases, Contacts, Accounts, intake workflows | Intake summary, referral status, eligibility note |
| `case-manager-person-centered-plan-and-reassessment-cycle` | Daily and recurring review cycles | `partial` | Cases, notes, services, follow-ups, reports | Plan updates, reassessment notes, supervision handoff |
| `case-manager-secure-progress-notes-and-outcome-timeline` | Daily | `partial` | Cases, follow-ups, notes, documents | Secure progress note, outcome timeline, continuity context |
| `case-manager-handoff-and-transition-workflow` | Exception-driven | `partial` | Cases, assignments, notes, follow-ups | Handoff packet, reassignment context, next-action queue |
| `case-manager-case-closure-continuity-workflow` | Event-driven | `partial` | Cases, notes, closure history, reports | Closure summary, continuity note, follow-up ownership |

### Rehab Worker

| Workflow ID | Cadence | Status | Primary surfaces | Outputs and handoffs |
|---|---|---|---|---|
| `rehab-worker-eligibility-and-functional-vocational-assessment` | Daily | `partial` | Cases, services, forms, appointments | Assessment note, service-entry decision, next-step plan |
| `rehab-worker-individualized-employment-plan-creation-and-updates` | Recurring | `missing` | Current case and service surfaces only partially fit | Manual plan artifact and external template work |
| `rehab-worker-follow-up-and-contact-cadence-for-compliance-windows` | Daily and weekly | `partial` | Follow-ups, appointments, portal communication, reports | Compliance contact queue, overdue follow-up note |
| `rehab-worker-service-authorization-and-referral-transitions` | Exception-driven | `partial` | Cases, follow-ups, appointments, portal flows | Referral handoff, authorization note, partner coordination |
| `rehab-worker-placement-and-outcome-tracking` | Weekly and monthly | `partial` | Services, cases, reports | Placement update, outcomes note, supervisor review packet |

## Future Expansion

Keep future personas like Volunteer Coordinator and Event Operations separate from this v1 workflow set. Do not merge their jobs into the existing six roles just to preserve coverage.
