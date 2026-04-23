# P5-T6 OSS Benchmark Adoption Spec

**Last Updated:** 2026-04-22

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
  Future targets: `saved_audience`, `campaign_run`, `donor_profile`, and the later typed appeal boundary
  Guardrails: do not treat Mailchimp lists/segments or `campaign_name` strings as substitutes for those records
- `portal-ops-brief`
  Scope: `PAT-04`, `PAT-05`, `PAT-06`
  Future targets: shared `public_intake_resolution`, `queue_view_definition`, `portal_escalation`
  Guardrails: keep the shared triage-shell idea folded into `PAT-05`, and position this brief after the current `P5-T5` appointments-continuity slice rather than widening the active portal work immediately
- `volunteer-dispatch-brief`
  Scope: `PAT-14`
  Future targets: the smallest active task/event picker contract that can reuse the existing assignment shape and skill-fit ranking without opening a new volunteer domain model
  Guardrails: keep this as the only volunteer `borrow now` carry-over from the benchmark wave
- `finance-membership-brief`
  Scope: `PAT-09`, `PAT-10`, `PAT-11`
  Future targets: `fund_designation`, `donation_batch`, `membership`
  Guardrails: treat all three as later-wave typed-domain work; do not open runtime implementation until separate scoped rows exist
- `workflow-program-ops-brief`
  Scope: `PAT-08`, `PAT-12`, `PAT-13`
  Future targets: a domain-scoped transition registry, `service_site`, and expanded case-form approval states
  Guardrails: sequence this after the current `P5-T5` stabilization work and do not reopen a generic workflow studio or metadata builder

## Effective Outcome Sets

- Effective `borrow now` set: `PAT-01`, `PAT-02`, `PAT-03`, `PAT-04`, `PAT-05`, `PAT-06`, `PAT-14`
- Effective `queue for P5-T6` set: `PAT-07`, `PAT-08`, `PAT-09`, `PAT-10`, `PAT-11`, `PAT-12`, `PAT-13`
- Effective `reject` set: `PAT-15`

## Borrow Now Buckets

### `P5-T3` email and campaign follow-through

- saved internal audiences that bridge People and Mailchimp
- local `campaign_run` history with audience snapshot and send lifecycle
- donor subprofiles for receipt cadence, anonymity, and solicitation preferences

### `P5-T5` portal and program-service follow-through

- one shared public-intake identity resolver across website, portal, and public events
- reusable queue view definitions that work across case and portal triage surfaces
- grievance-style stage and SLA cues on one existing portal seam before a full ticket module

### `P5-T6` borrow-now carry-over

- volunteer dispatch ergonomics with searchable task/event pickers and skill-fit reuse on top of the existing assignment contract

## `P5-T6` Queue Bucket

- typed appeal/campaign record spanning email and donation intake
- narrow workflow-rule registry for one seam only
- typed restriction kernel for donations and recurring gifts
- donation batch posting with finance review boundary
- typed membership lifecycle
- domain-scoped approval plus service-point routing

## Explicit Rejection For This Wave

- a generic OpenSPP-style studio/custom-field/change-request builder as the first workflow move

Reason:

- it widens beyond the current Phase 5 product seams
- it does not yet have enough reuse proof inside nonprofit-manager
- it would compete directly with active `P5-T3`, `P5-T5`, and validation-lane work

## Acceptance Criteria

- all six primary upstream repos are cloned locally and pinned in `reference-repos/manifest.lock.json`
- the current wave-one runtime-attempt results are documented honestly
- the workboard has a coordinated-exception note and lane contracts for the benchmark wave
- the pattern catalog groups findings into `borrow now`, `queue for P5-T6`, and `reject`
- every accepted finding names a concrete nonprofit-manager landing zone
- `make check-links` passes after the docs changes
