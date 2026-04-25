# P5-T6 Reference Expansion Adoption Spec

**Last Updated:** 2026-04-25

## Locked Decisions

1. This wave is named `P5-T6-reference-expansion-2026-04`.
2. This wave does not revise the locked `P5-T6-oss-benchmark` cohort or its existing `PAT-01` through `PAT-15` decisions.
3. Upstream clones live under `reference-repos/external/nm--<slug>/` and remain ignored local-only reference material.
4. The tracked source of clone truth is `reference-repos/manifest.lock.json`.
5. The primary tracked research artifact is [improvement-opportunities.md](improvement-opportunities.md).
6. Runtime implementation is not authorized by this wave. Any accepted pattern still needs a future scoped workboard row before code changes.
7. Default reuse class is `architecture_only`; no direct source copying is authorized.

## Review Lanes

| Lane | Repos | Primary lens |
|---|---|---|
| Service delivery | `nm--primero`, `nm--commcare-hq`, `nm--avni-server`, `nm--avni-webapp`, `nm--opencrvs-core` | case workflows, public intake, queues, audit, reporting, field operations |
| Fundraising and membership | `nm--givewp`, `nm--oca-donation`, `nm--oca-vertical-association` | donation lifecycle, receipts, stewardship, recurring gifts, recognition, memberships |
| Events and finance | `nm--pretix`, `nm--opencollective-api`, `nm--opencollective-frontend` | event orders, check-in, dual payment state, public ledger, expenses, finance roles |
| Campaign automation | `nm--mautic` | saved segments, consent, campaign events, automation boundaries, reports |

## Outcome Rules

- `borrow now`: fits current `P5-T3` or `P5-T5` seams without opening a new domain or changing the locked P5-T6 benchmark.
- `queue later scoped row`: useful but requires a new typed-domain row, migration sequence, or major reporting/finance/event surface.
- `reject`: too broad, too generic, privacy-risky, or likely to create false parity claims.

## Second-Pass Synthesis

The second-pass subagent review merged three reference lanes into one ranked opportunity set:

- Service delivery and case management: OpenCRVS, CommCare, Primero, Avni, OpenSPP, and Sahana reinforce ambiguity-aware public intake, typed queue definitions, actor-attributed portal escalations, and later case-plan / service-site depth.
- Fundraising, campaigns, membership, and stewardship: CiviCRM, SuiteCRM, GiveWP, Mautic, OCA Donation, and OCA Vertical Association reinforce saved-audience suppression, campaign-run lifecycle, donor receipt defaults, and later typed appeals, memberships, donation validation, and receipt lifecycle work.
- Finance, events, payments, and governance: OpenPetra, ERPNext, pretix, and Open Collective reinforce later typed fund designations, donation batches, event order/check-in state, finance exports, and transparent reporting without promoting them to current runtime work.

This synthesis does not promote queued work into implementation. It keeps the current runtime pickup limited to active `P5-T3` and `P5-T5` seams while using the larger reference set to sharpen future `P5-T6B`, `P5-T6C`, and finance/event rows.

## Second-Pass Queue Additions

The final reference-review pass adds named future records without changing the active interface boundary:

| Area | Future typed records | Source pressure | Disposition |
|---|---|---|---|
| Fundraising stewardship | `communication_suppression_policy`, `contact_dnc_reason`, `pledge_schedule`, `donation_soft_credit`, `in_kind_receipt_policy` | Mautic fatigue/DNC rules, CiviCRM pledges and soft credits, OCA/GiveWP receipt eligibility | Queue behind `P5-T6B`; do not widen current saved-audience, campaign-run, or donor-default work |
| Service delivery | `case_reassessment_cycle`, `case_plan_intervention`, `referral_transfer_status`, `closure_readiness_evidence`, `field_case_packet` | Avni encounter/checklist cadence, Primero plans/referrals/closure forms, CommCare/Sahana field packets | Queue behind `P5-T6C`; reject offline sync and generic action engines |
| Events and finance | `event_check_in_policy`, `event_order_snapshot`, `public_finance_snapshot`, `contribution_timeline_entry` | pretix check-in/order snapshots and Open Collective budget/contribution timelines | Queue behind separate events/finance rows; do not claim public ledger, fiscal-host, or paid-event parity |

## Interface Boundaries

- Live `P5-T3` interfaces stay on existing Mailchimp, contact, donation, receipt, and reporting seams.
- Live `P5-T5` interfaces stay on existing portal, public website form, public event, queue view, case, and portal-admin seams.
- Future scoped rows introduce new typed records only when opened: `appeal`, `fund_designation`, `donation_batch`, `membership`, `event_order`, `check_in_list`, `service_site`, `case_plan_review`, and finance/reporting projections.
- Queue definitions should be typed configs rather than raw request blobs: slug, surface, owner or permission scope, filters/query, columns, sort, counts, row actions, and empty-state metadata.

## Guardrails

- Keep broad low-code, custom-rule, and workflow-studio patterns rejected until two or more typed domain seams prove shared primitives.
- Keep fiscal-host, collective, and public-ledger inspiration separate from nonprofit-manager governance claims.
- Treat public recognition as opt-in and privacy-aware, not gamified by default.
- Keep self-hosted tracking pixels and marketing automation canvases out of the active email wave.
- Keep GL/accounting-suite parity, fiscal-host hierarchy, expense/disbursement workflow, and legal/tax filing workflows out of this wave.
- Preserve current repo conventions for `/api/v2`, Zod validation, feature-owned frontend code, and repo-root validation commands when future implementation rows are opened.

## Effective Outcome Sets

- Effective `borrow now` set:
  - `P5-T3`: saved audiences, prior-send suppression, campaign-run lifecycle, consent/suppression evidence, and donor receipt defaults.
  - `P5-T5`: ambiguity-aware public intake, typed queue definitions with scoped counts/actions, and actor-attributed portal escalations.
- Effective `queue later scoped row` set: typed appeals, memberships, donation validation, receipt lifecycle, fund designations, donation batches, case-plan review, service-site routing, event order/check-in lifecycle, finance ledger exports, materialized reporting, opt-in public recognition/member credentials, scoped campaign automation, and narrow governance role refinement.
- Effective `reject` set: generic workflow studios, low-code form/rule engines, marketing automation canvases as active-wave scope, self-hosted tracking pixels, default donor leaderboards or gamification, GL/accounting-suite parity, direct fiscal-host hierarchy transplant, expense/disbursement workflow for this wave, and direct source copying.

## Validation

- Docs-only synthesis changes run `make check-links`.
- Run `make lint-doc-api-versioning` only if future edits add or change `/api/v2` examples.
- Future `P5-T3` implementation rows should add targeted Mailchimp, contact, tax receipt, reports, and frontend communications proof, plus `make db-verify` when migrations `103` or `107` change.
- Future `P5-T5` implementation rows should add targeted public intake, portal auth, public event, queue definition, portal escalation, portal-admin, and focused Playwright portal proof, plus `make db-verify` when migrations `104` through `106` change.
