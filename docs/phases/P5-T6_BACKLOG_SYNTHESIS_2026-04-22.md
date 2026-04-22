# P5-T6 Backlog Synthesis (2026-04-22)

**Last Updated:** 2026-04-22

This note is the row-local synthesis artifact for `P5-T6`. It converts the Phase 5 benchmark and repo-audit follow-through into a ranked later-wave backlog without claiming current product parity where the repo does not have routed support yet.

## Inputs

- [planning-and-progress.md](planning-and-progress.md)
- [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md)
- [../product/product-spec.md](../product/product-spec.md)
- [../product/persona-workflows.md](../product/persona-workflows.md)
- [../product/OPEN_SOURCE_NONPROFIT_CRM_BENCHMARK_2026-04.md](../product/OPEN_SOURCE_NONPROFIT_CRM_BENCHMARK_2026-04.md)
- Tracked benchmark and persona references under [../../.codex/skills/nonprofit-manager-benchmark-analysis/references/](../../.codex/skills/nonprofit-manager-benchmark-analysis/references/cohort-and-sources.md) and [../../.codex/skills/nonprofit-manager-persona-analysis/references/](../../.codex/skills/nonprofit-manager-persona-analysis/references/source-map.md)

## Confirmed Repo Baseline

### Workflow and customization

- The repo already supports bounded configuration seams: reports/templates/scheduled delivery, custom dashboards, website-builder overrides, workspace-module toggles, branding, outcome definitions, and narrow approval flows for staff registration, portal access, and case-form review.
- The repo does not currently mount a reusable workflow-state engine, approval kernel, configurable schema-extension layer, or generic metadata-driven form builder.

### Memberships and appeals

- The repo already supports donor-facing primitives through contacts, donations, recurring giving, opportunities, reports, scheduled reports, and a Mailchimp communications workspace.
- The repo does not currently mount a first-class `membership` or `appeal` domain: no membership tiers, renewal/lapse model, dues lifecycle, appeal entity, appeal-performance surface, or public join/renew workflow is routed today.

### Finance and program operations

- The repo already supports finance and program baselines through donations, recurring giving, receipting, Stripe-backed reconciliation, grants, cases, services, follow-ups, appointments, portal coordination, referral intake, and external service-provider workflows.
- The repo does not currently mount typed restricted-fund controls, allocation/release tracking, nonprofit budgeting/disbursement operations, grievance queues, service-point routing, or service-authorization workflow as first-class product surfaces.

## Ranked Later-Wave Backlog

### Priority 1

1. Reusable workflow-state and approval kernel.
   Repo truth: approvals and workflow checks exist only in siloed flows today.
   Borrowable patterns: OpenSPP and SuiteCRM stateful transitions, approvals, queues, and audit history.
   Persona impact: Nonprofit Administrator, Case Manager, and Rehab Worker benefit first; Executive Director and Board Member stay read-first consumers of the resulting oversight history.

2. Typed appeal attribution and fundraising measurement.
   Repo truth: the product can track gifts, recurring plans, opportunities, reports, and Mailchimp segments, but appeal execution is still stitched together across those surfaces.
   Borrowable patterns: CiviCRM appeal/campaign workflows, ERPNext typed constituent records, SuiteCRM campaign visibility.
   Persona impact: Fundraiser gets first-class campaign measurement; leadership gets appeal ROI and lifecycle visibility instead of report-only snapshots.

3. Typed restriction and allocation layer across donations, grants, funded programs, and reporting.
   Repo truth: designation and campaign text exist today, but restriction governance is still partial and mostly policy-driven outside the app.
   Borrowable patterns: OpenPetra finance controls, ERPNext typed finance/program relationships.
   Persona impact: Executive Director, Fundraiser, and Nonprofit Administrator gain stronger restricted-funds stewardship and finance-ready exception review.

### Priority 2

4. Metadata-driven intake, portal, and case-form configuration on top of existing surfaces.
   Repo truth: website forms and admin outcome definitions already show usable override/taxonomy patterns.
   Borrowable patterns: CiviCRM structured public intake and OpenSPP configurable operational flows.
   Persona impact: Nonprofit Administrator and Case Manager gain safer configurable intake without jumping straight to generic schema editing.

5. Membership record, tier, renewal, lapse, and join/renew lifecycle.
   Repo truth: no routed membership entity exists today.
   Borrowable patterns: CiviCRM and ERPNext membership tiers, renewals, and public sign-up.
   Persona impact: Fundraiser and Nonprofit Administrator gain recurring constituent lifecycle control; leadership gains membership-health visibility.

6. Program workflow layer for service authorization, grievance/escalation, and provider/service-point routing.
   Repo truth: cases, services, referrals, appointments, and portal coordination are present, but the stateful program-service layer above them is not.
   Borrowable patterns: OpenSPP service points, approvals, and grievance handling.
   Persona impact: Case Manager and Rehab Worker gain clearer handoffs, checkpoints, and frontline continuity cues.

### Priority 3

7. Deeper stewardship automation and campaign operations.
   Repo truth: cadence support exists via reports, opportunities, follow-ups, and Mailchimp, but formal stewardship automation is still partial.
   Borrowable patterns: CiviCRM and SuiteCRM workflow automation and campaign coordination.
   Persona impact: Fundraiser gains operational scale, but this should follow typed appeals/memberships rather than precede them.

8. Broader nonprofit finance breadth.
   Repo truth: reconciliation and grants are already meaningful, but the repo is not a general accounting suite.
   Borrowable patterns: ERPNext/OpenPetra budgeting, disbursement, and finance exception handling.
   Persona impact: Nonprofit Administrator and Executive Director gain broader finance-control tooling, but only after the typed restriction/allocation layer exists.

## Repo Truth Vs Benchmark Inspiration

| Area | Confirmed repo support today | Benchmark-inspired later wave |
|---|---|---|
| Workflow/customization | Fixed-domain approvals, dashboards, reports, website-form overrides, outcome definitions | Reusable workflow-state kernel, configurable transitions, auditable approvals, metadata-driven forms |
| Memberships/appeals | Donations, recurring giving, opportunities, Mailchimp, fundraising reports/templates | Typed appeals, memberships, renewals, lifecycle dashboards, richer stewardship automation |
| Finance/program ops | Reconciliation, grants, cases, services, referrals, appointments, portal coordination | Restricted-fund governance, allocation/release controls, service authorization, grievance/service-point routing |

## Dependencies On Active Product Waves

- `P5-T3` should land the new communications authoring/preview model before deeper campaign automation or appeal orchestration is scoped, so later fundraising-depth work can reuse the real outbound messaging seam instead of a temporary one.
- `P5-T5` should finish the current portal forms/case-aware inbox wave before program-service backlog slices define new service-authorization or grievance patterns, so those later waves build on the stabilized portal and case contracts.
- This artifact is intentionally backlog-only. It does not authorize runtime implementation for memberships, appeals, workflow builders, finance breadth, or program-ops depth until those rows are separately signed out.
