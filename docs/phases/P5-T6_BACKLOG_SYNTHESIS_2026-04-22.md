# P5-T6 Backlog Synthesis (2026-04-22)

**Last Updated:** 2026-04-25

This note is the row-local synthesis artifact for `P5-T6`. It converts the Phase 5 benchmark and repo-audit follow-through into a ranked later-wave backlog without claiming current product parity where the repo does not have routed support yet.

The `2026-04-25` hardening pass keeps this ranking intact while acknowledging the narrow runtime pickups now attached to the active `P5-T3` and `P5-T5` rows. It does not authorize direct source copying, generic workflow tooling, direct ERPNext nonprofit-module parity claims, or queued typed-domain work such as appeals, restrictions, donation batches, memberships, finance breadth, or workflow studios.

## Inputs

- [planning-and-progress.md](planning-and-progress.md)
- [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md)
- [../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md](../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md)
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

## Fresh External-Source Pressure

The highest-pressure benchmark claims were refreshed against official product docs on `2026-04-22`, and they sharpen the current backlog in several useful ways:

- CiviCRM membership docs confirm selectable membership types, renewal-specific copy, auto-renew support, and multi-term / multi-class signup through price sets. Memberships still read as a later new domain here, but they should eventually be scoped as a typed lifecycle rather than a generic contact flag.
- OpenSPP approvals and service-point docs confirm explicit approval states, multi-tier approval, searchable service-point operations, and frontline routing patterns. That keeps workflow/program-ops pressure focused on stateful case and portal follow-through rather than a generic workflow builder first.
- OpenPetra donation docs keep finance depth close to project-specific donation assignment and batch entry, which reinforces typed restriction/allocation and finance exception review ahead of any broader accounting-suite ambition.
- SuiteCRM campaign docs confirm campaign types, target lists, scheduled send expectations, ROI tracking, and template editing, which keeps typed appeals and campaign measurement adjacent to the active `P5-T3` seam instead of treating them as a detached future domain.
- ERPNext membership docs confirm explicit membership statuses and payment/invoicing hooks, which is another signal that memberships are better treated as a later typed domain than as the next adjacent extension of current routed surfaces.

The later `P5-T6-reference-expansion-2026-04` pass sharpens the queue but does not change the ranked runtime posture. Mautic, GiveWP, OCA, CiviCRM, and Open Collective add future fundraising refinements for communication fatigue, channel-specific do-not-contact reasons, pledge schedules, soft credits, in-kind receipt eligibility, public campaign presentation, contribution timelines, and finance snapshots. Avni, Primero, CommCare, Sahana, OpenSPP, and OpenCRVS add future service-delivery refinements for reassessment windows, checklist timing, case-plan interventions, consent-aware referral/transfer states, closure readiness evidence, field-ready packets, and action-led queue caution. pretix and Open Collective add future event/finance refinements for event check-in policy, immutable order snapshots, and ledger-style reporting. All remain queued behind scoped rows; the active borrow-now set remains limited to `P5-T3` and `P5-T5`.

## Ranked Capability Briefs

### Priority 1

1. `fundraising-ops-brief`
   Scope: `PAT-01`, `PAT-02`, `PAT-03`, and the boundary into `PAT-07`.
   Future targets: `saved_audience`, `campaign_run`, `donor_profile`, and the later typed appeal boundary.
   Why here: the product already has live People, Mailchimp, donations, recurring giving, and reporting seams, and the active `P5-T3` pickup now carries saved audiences, campaign-run history, and donor-profile receipt defaults through those seams. This brief keeps those `borrow now` carry-overs explicit without letting Mailchimp lists/segments or `campaign_name` strings masquerade as first-class records.

2. `portal-ops-brief`
   Scope: `PAT-04`, `PAT-05`, `PAT-06`.
   Future targets: shared `public_intake_resolution`, `queue_view_definition`, `portal_escalation`.
   Why here: the portal and public-intake seams are already real, and the active `P5-T5` pickup now carries shared public-intake resolution audit, server-backed queue view definitions, and typed portal escalations through those seams. This remains the first post-appointments-continuity carry-over, with the shared triage shell folded into `PAT-05` instead of spun out as a separate platform row.

3. `volunteer-dispatch-brief`
   Scope: `PAT-14`.
   Future targets: the smallest active task/event picker contract that can sit on top of the existing assignment shape and skill-fit ranking without opening a new volunteer domain model.
   Why here: this is the only volunteer `borrow now` carry-over from the benchmark wave. The repo already has skills, availability, and matching support, so the brief should stay tightly focused on dispatch ergonomics instead of inventing a broader volunteer domain rewrite.

### Priority 2

4. `finance-membership-brief`
   Scope: `PAT-09`, `PAT-10`, `PAT-11`.
   Future targets: `fund_designation`, `donation_batch`, `membership`.
   Why here: designation and campaign text exist today, but restriction governance is still policy-heavy, donation entry has no batch/review boundary, and membership remains a contact-role inference. This brief keeps the typed-domain work explicit while preserving the current rule that no runtime implementation starts until separate scoped rows exist.

5. `workflow-program-ops-brief`
   Scope: `PAT-08`, `PAT-12`, `PAT-13`.
   Future targets: a domain-scoped transition registry, `service_site`, and expanded case-form approval states.
   Why here: cases, services, appointments, and portal coordination are already real, but the richer workflow, routing, and approval depth above them is still fragmented. This brief should stay domain-scoped, sequence after the active `P5-T5` stabilization work, and keep the generic workflow studio/builder path rejected.

## Repo Truth Vs Benchmark Inspiration

| Area | Confirmed repo support today | Benchmark-inspired later wave |
|---|---|---|
| Workflow/customization | Fixed-domain approvals, dashboards, reports, website-form overrides, outcome definitions | Domain-scoped workflow/configuration first, then a reusable workflow-state kernel if those slices prove shared primitives |
| Memberships/appeals | Donations, recurring giving, opportunities, Mailchimp, fundraising reports/templates | Typed appeals, memberships, renewals, lifecycle dashboards, richer stewardship automation |
| Finance/program ops | Reconciliation, grants, cases, services, referrals, appointments, portal coordination | Restricted-fund governance, allocation/release controls, service authorization, grievance/service-point routing |

## Dependencies On Active Product Waves

- `P5-T3` should keep the new communications authoring/preview model, saved-audience targeting, campaign-run history, and donor-profile receipt defaults narrow before deeper campaign automation or appeal orchestration is scoped, so later fundraising-depth work can reuse the real outbound messaging seam instead of a temporary one.
- `P5-T5` should keep the current portal forms, appointments, public-intake resolution, queue-view definition, and portal-escalation work narrow before program-service backlog slices define new service-authorization or grievance patterns, so those later waves build on the stabilized portal and case contracts.
- This artifact is intentionally backlog-only beyond the named active pickups. It does not authorize runtime implementation for memberships, appeals, restrictions, donation batches, workflow builders, finance breadth, or program-ops depth until those rows are separately signed out.

## Downstream Persona Briefs

1. `P5-T6A` Governance and compliance oversight brief.
   Scope: board-only posture vs `viewer`, executive/board governance-risk escalation, board-packet assembly, compliance-document vault, and corrective-action ledger follow-through.
   Downstream dependency: use the capability-brief outputs as proof inputs, but keep annual filing, legal review, and other true outside-the-product steps explicitly `external only`.

2. `P5-T6B` Fundraising stewardship and restrictions brief.
   Scope: donor-preference governance, acknowledgment handoff, campaign/deadline orchestration, typed appeals attribution, and restriction modeling on top of the active `P5-T3` communications and reporting seams.
   Downstream dependency: build this on the outputs of `fundraising-ops-brief` and `finance-membership-brief` instead of inventing a separate fundraising stack.

3. `P5-T6C` Service-delivery workflow depth brief.
   Scope: reassessment cadence, structured handoff packets, closure continuity, rehab-specific planning artifacts, and authorization/referral depth on top of the active `P5-T5` cases, services, appointments, and portal seams.
   Downstream dependency: build this on `portal-ops-brief`, `volunteer-dispatch-brief`, and `workflow-program-ops-brief`, and keep the first follow-through domain-scoped before any generic workflow kernel is reconsidered.

## Queued Next Planning Actions

1. Keep the `P5-T3` fundraising pickup limited to `saved_audience`, `campaign_run`, donor-profile receipt defaults, test/suppression campaign lanes, and provider static-segment targeting; use `P5-T6B` to preserve the later typed appeal, restriction, donation-batch, and membership boundary.
2. Keep the `P5-T5` portal pickup limited to provenance-first public intake, best-effort resolution audit, owner/surface-scoped queue definitions, and one actor-attributed case-scoped portal review request before any ticketing or grievance module.
3. Keep `volunteer-dispatch-brief` as the only volunteer `borrow now` carry-over from the benchmark wave, and prove active task/event pickers with skill and availability cues can stay inside the current assignment contract before opening any new volunteer row.
4. Hold `finance-membership-brief` and `workflow-program-ops-brief` behind the active product waves, then use them to shape later `P5-T6B`, `P5-T6C`, and any future typed-domain row without reopening a generic workflow studio, metadata builder, no-code change-request platform, or direct ERPNext nonprofit parity claim.
