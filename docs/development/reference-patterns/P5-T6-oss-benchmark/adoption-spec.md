# P5-T6 OSS Benchmark Adoption Spec

**Last Updated:** 2026-04-24

## Locked Decisions

1. The benchmark cohort is fixed to six primary upstream projects in wave one: `CiviCRM`, `OpenPetra`, `ERPNext`, `SuiteCRM`, `OpenSPP`, and `Sahana Eden`.
2. Upstream clones live under `reference-repos/external/nm--<slug>/`; `reference-repos/local/` remains scratch space only.
3. The only approved companion repo in wave one is `reference-repos/external/nm--civicrm-docker` because the official standalone local lab for CiviCRM lives there.
4. Clone contents remain local-only and ignored, but the comparison, synthesis, and workboard coordination are tracked `P5-T6` planning work.
5. The lead owns `docs/phases/planning-and-progress.md`, `reference-repos/manifest.lock.json`, and `docs/development/reference-patterns/P5-T6-oss-benchmark/**`.
6. Subagent lanes are analysis-only. They review local clones and this repo, then hand structured findings back to the lead instead of editing tracked files directly.
7. Wave-one runnable labs are limited to `CiviCRM`, `OpenSPP`, `OpenPetra`, and `SuiteCRM`, with honest time-box fallback when prerequisites or image/toolchain issues block a clean boot.
8. `ERPNext` and `Sahana Eden` stay code/docs-review-first unless a later synthesis pass proves immediate runtime value.
9. Accepted findings must include a reuse class, a concrete nonprofit-manager landing zone, and one of three outcomes: `borrow now`, `queue for P5-T6`, or `reject`.
10. No direct source-code copy is authorized. GPL/AGPL/LGPL products stay `architecture_only` in this wave.
11. No generic workflow builder or studio surface is authorized from this benchmark wave. Domain-scoped slices must prove shared primitives before any reusable kernel is reconsidered.
12. The repo-by-repo review lanes are complete on `2026-04-22`; next synthesis work is organized around five capability briefs instead of per-product comparison lanes.
13. The second-pass reference review on `2026-04-24` refined the five briefs only; it did not authorize runtime implementation, direct source copying, or a new benchmark cohort.

## Review Rubric

Every accepted pattern must be evaluated against these lenses:

- persona and workflow served
- surface shape and operator ergonomics
- domain model and typed record implications
- state model, approvals, queues, and auditability
- intake, portal, or public resolution contract
- finance, reporting, or service-operations coupling
- configuration burden and implementation fit

## Capability Brief Sequence

- `fundraising-ops-brief`
  Scope: `PAT-01`, `PAT-02`, `PAT-03`, and the boundary into `PAT-07`
  Future targets: `saved_audience`, `campaign_run`, `donor_profile`, later `campaign_run_event`, and the later typed appeal boundary
  Guardrails: do not treat Mailchimp lists/segments, provider campaign IDs, or `campaign_name` strings as substitutes for those records
- `portal-ops-brief`
  Scope: `PAT-04`, `PAT-05`, `PAT-06`
  Future targets: shared `public_intake_resolution`, `queue_view_definition`, `portal_escalation`
  Guardrails: make provenance and ambiguity explicit in public intake, keep queue definitions server-backed and permission-scoped, keep typed escalations case-scoped, and position this brief after the current `P5-T5` appointments-continuity slice rather than widening the active portal work immediately
- `volunteer-dispatch-brief`
  Scope: `PAT-14`
  Future targets: the smallest active task/event picker contract that can reuse the existing assignment shape and skill-fit ranking without opening a new volunteer domain model
  Guardrails: keep this as the only volunteer `borrow now` carry-over from the benchmark wave
- `finance-membership-brief`
  Scope: `PAT-09`, `PAT-10`, `PAT-11`
  Future targets: `fund_designation`, `donation_batch`, `membership`
  Guardrails: treat all three as later-wave typed-domain work; keep staged bank-import and pre-close exception preview behind donation batches; do not open runtime implementation until separate scoped rows exist
- `workflow-program-ops-brief`
  Scope: `PAT-08`, `PAT-12`, `PAT-13`
  Future targets: a domain-scoped transition registry, `service_site`, and expanded case-form approval states
  Guardrails: sequence this after the current `P5-T5` stabilization work, keep due-followup and closure semantics attached to existing seams, and do not reopen a generic workflow studio or metadata builder

## Effective Outcome Sets

- Effective `borrow now` set: `PAT-01`, `PAT-02`, `PAT-03`, `PAT-04`, `PAT-05`, `PAT-06`, `PAT-14`
- Effective `queue for P5-T6` set: `PAT-07`, `PAT-08`, `PAT-09`, `PAT-10`, `PAT-11`, `PAT-12`, `PAT-13`
- Effective `reject` set: `PAT-15`

## Borrow Now Buckets

### `P5-T3` email and campaign follow-through

- saved internal audiences that bridge People and Mailchimp
- include/exclude controls, prior-send exclusions, and locked search-result snapshots for saved audiences
- local `campaign_run` history with target, suppression, test-send, audience snapshot, and send lifecycle
- donor subprofiles for receipt cadence, anonymity, solicitation preferences, and default receipt delivery choices

### `P5-T5` portal and program-service follow-through

- one shared provenance-first public-intake identity resolver across website, portal, and public events
- reusable server-backed queue view definitions that work across case, portal triage, and workbench entry points
- typed portal review requests with stage, severity, SLA, sensitivity, and resolution cues on one existing case-scoped portal seam before any full ticket module

### `P5-T6` borrow-now carry-over

- volunteer dispatch ergonomics with active task/event pickers, status filters, availability cues, and skill-fit reuse on top of the existing assignment contract

## `P5-T6` Queue Bucket

- campaign event ledger fed by provider summaries or webhooks, with no self-hosted tracking layer
- typed appeal/campaign record spanning email, public donation intake, recurring gifts, events, and reporting
- narrow workflow-rule registry for one seam only
- typed restriction kernel for donations and recurring gifts, with write-path and report-path validation
- donation batch posting with finance review boundary, pre-close exception preview, and staged bank-import handoff
- typed membership lifecycle with membership catalog, contact membership instance, and payment or service evidence
- domain-scoped approval plus service-site routing, due-followup, and closure side-effect semantics

## Explicit Rejection For This Wave

- a generic OpenSPP-style studio/custom-field/change-request builder as the first workflow move
- direct ERPNext nonprofit-module parity claims from the local `nm--erpnext` clone
- direct GPL, AGPL, or LGPL source copying from the reference repos

Reason:

- it widens beyond the current Phase 5 product seams
- it does not yet have enough reuse proof inside nonprofit-manager
- it would compete directly with active `P5-T3`, `P5-T5`, and validation-lane work
- the local ERPNext clone has nonprofit-domain removal and deprecation signals, so it should only inform architecture boundaries such as typed accounting dimensions

## Acceptance Criteria

- all six primary upstream repos are cloned locally and pinned in `reference-repos/manifest.lock.json`
- the current wave-one runtime-attempt results are documented honestly
- the workboard has a coordinated-exception note and lane contracts for the benchmark wave
- the pattern catalog groups findings into `borrow now`, `queue for P5-T6`, and `reject`
- every accepted finding names a concrete nonprofit-manager landing zone
- `make check-links` passes after the docs changes
