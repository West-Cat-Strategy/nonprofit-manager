# P5-T6 Capability Briefs (2026-04-23)

**Last Updated:** 2026-04-24

This packet publishes the five analysis-only capability briefs called for by `P5-T6`. It turns the benchmark and repo-review wave into explicit `borrow now`, `queue for P5-T6`, and `reject` decisions without authorizing runtime implementation while `P5-T2B`, `P5-T3`, and `P5-T5` remain active.

The `2026-04-24` second-pass reference review tightened the packet with architecture-only refinements from CiviCRM, SuiteCRM, OpenPetra, ERPNext, OpenSPP, and Sahana Eden. It did not expand the cohort, authorize runtime implementation, or allow direct source copying.

## Inputs

- [planning-and-progress.md](planning-and-progress.md)
- [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md)
- [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md)
- [../development/reference-patterns/P5-T6-oss-benchmark/adoption-spec.md](../development/reference-patterns/P5-T6-oss-benchmark/adoption-spec.md)
- [../development/reference-patterns/P5-T6-oss-benchmark/pattern-catalog.md](../development/reference-patterns/P5-T6-oss-benchmark/pattern-catalog.md)
- [../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md](../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md)
- [../product/product-spec.md](../product/product-spec.md)
- [../product/persona-workflows.md](../product/persona-workflows.md)

## Decision Rules

- `borrow now`: the capability is adjacent to a real routed seam and should shape the next scoped follow-through after the active product wave hands off.
- `queue for P5-T6`: the capability needs a separate typed-domain row later and should not be smuggled into the current runtime waves.
- `reject`: the capability is explicitly out of scope for this wave even if benchmarks support it elsewhere.

## `fundraising-ops-brief`

The current fundraiser surface is real but still partial: People, Mailchimp, donations, recurring giving, and reports are routed, yet staff still lack reusable internal audiences, local campaign-run history, and donor-specific preference governance.

| Pattern | Outcome | Concrete landing zones |
|---|---|---|
| `PAT-01` saved audiences with include, exclude, and prior-send controls | `borrow now` | `frontend/src/features/contacts/**`, `frontend/src/features/mailchimp/**`, `backend/src/modules/mailchimp/**` |
| `PAT-02` internal campaign-run history with target, suppression, test-send, audience snapshot, and local lifecycle | `borrow now` | `frontend/src/features/mailchimp/**`, `backend/src/modules/mailchimp/**` |
| `PAT-03` donor subprofile with receipt defaults, anonymity, and solicitation preferences | `borrow now` | `backend/src/types/contact.ts`, `backend/src/modules/donations/services/taxReceiptService.ts`, `frontend/src/features/contacts/**` |
| `PAT-07` typed appeal or campaign spine plus later provider-fed campaign event ledger | `queue for P5-T6` | `backend/src/modules/mailchimp/**`, `backend/src/services/publishing/publicWebsiteFormService.ts`, `frontend/src/features/mailchimp/**` |

Future type targets:
- `saved_audience`
- `campaign_run`
- `donor_profile`
- later `campaign_run_event` fed only by provider summaries or webhooks
- later typed `appeal` boundary after the communications model settles

Sequencing guardrails:
- Keep `PAT-01` and `PAT-02` adjacent to the live `/settings/communications` and `/api/v2/mailchimp/*` seams, with no generic audience-union engine.
- Treat `PAT-03` as stewardship and receipt-defaulting with explicit staff override, not as finance-breadth work.
- Hold `PAT-07` behind the `P5-T3` handoff and use it to shape `P5-T6B`, not the current email-wave implementation.

Parity traps and non-goals:
- Do not treat Mailchimp lists or segments as substitutes for `saved_audience`.
- Do not skip test-recipient and suppression snapshots when shaping `campaign_run`.
- Do not treat free-text `campaign_name` values or provider campaign IDs as typed appeal records.
- Do not add self-hosted tracking pixels or privacy-invasive event collection; rely on provider summaries or webhooks.
- Do not widen this brief into memberships, restrictions, batch posting, or campaign-ROI parity.

## `portal-ops-brief`

The portal is already a primary product surface, but public intake is still resolved through multiple paths, triage state is still surface-local, and portal users still fall back to generic threads instead of typed escalations.

| Pattern | Outcome | Concrete landing zones |
|---|---|---|
| `PAT-04` provenance-first public-intake identity resolution across website, portal, and events | `borrow now` | `backend/src/services/publishing/publicWebsiteFormService.ts`, `backend/src/services/portalAuthService.ts`, `backend/src/modules/events/services/eventPublicService.ts` |
| `PAT-05` server-backed queue view definitions reused by list screens and workbench entry points | `borrow now` | `frontend/src/features/cases/hooks/useSavedCaseViews.ts`, `frontend/src/features/adminOps/pages/portalAdmin/**`, `frontend/src/features/dashboard/components/workbench/**` |
| `PAT-06` typed portal review requests linked back to the case record | `borrow now` | `frontend/src/features/portal/pages/PortalCaseDetailPage.tsx`, `backend/src/modules/portal/services/portalMessagingService.validation.ts`, `backend/src/services/portalPointpersonService.ts` |

Future type targets:
- `public_intake_resolution`
- `queue_view_definition`
- `portal_escalation`

Sequencing guardrails:
- Keep this as the first post-appointments-continuity `P5-T5` carry-over.
- Sequence `PAT-04` first at the backend contract layer with source system, source reference, collection method/date, ambiguity state, and resolution audit.
- Fold the shared triage shell into server-backed `PAT-05` queue definitions instead of opening a separate queue-platform row.
- Sequence `PAT-06` third as one typed portal action on a stabilized case seam with reason, severity, sensitivity, SLA due date, decision state, and resolution summary.

Parity traps and non-goals:
- Do not claim full dedupe, constituent-mastering, MPI, import-match admin, or merge-engine parity.
- Do not keep queue reuse trapped in localStorage-only case views, fixed deep links, or raw request payloads.
- Do not let generic messaging threads masquerade as typed escalations.
- Do not widen this brief into a standalone ticketing product, grievance module, or generic workflow studio.

## `volunteer-dispatch-brief`

This brief stays intentionally small. `PAT-14` is the only volunteer carry-over explicitly marked `borrow now`, and the current repo already mounts volunteers, events, tasks, assignment, skills, availability, and matching support.

| Pattern | Outcome | Concrete landing zones |
|---|---|---|
| `PAT-14` volunteer dispatch ergonomics with active task/event pickers, status filters, availability cues, and skill-fit cues | `borrow now` | `frontend/src/components/AssignmentForm.tsx`, `frontend/src/features/volunteers/pages/VolunteerDetailPage.tsx`, `frontend/src/features/volunteers/api/volunteersApiClient.ts` |

Future type targets:
- keep this to the smallest active task and event picker contract on top of the existing assignment shape

Sequencing guardrails:
- Keep the brief analysis-only for now; runtime work still needs its own signed-out row.
- Prove any future follow-through can stay inside the current assignment contract before opening a new volunteer row.
- Treat this as one narrow input into later `P5-T6C`, not as a standalone platform rewrite.

Parity traps and non-goals:
- Do not create a new volunteer domain model, lifecycle system, or broad volunteer-program rewrite.
- Do not transplant Sahana Eden's project/task/dispatch model, SMS/OpenGeoSMS, credentialing system, service-site routing, approvals, or generic workflow tooling.
- Do not over-claim persona parity: the current persona audit does not include a dedicated volunteer-coordinator lane.

## `finance-membership-brief`

This lane remains firmly in the later-wave queue. The repo has real donations, recurring giving, reconciliation, reporting, and fundraiser gift-entry surfaces, but it does not yet have typed restricted-fund controls, donation batch review boundaries, or a first-class membership lifecycle.

| Pattern | Outcome | Concrete landing zones |
|---|---|---|
| `PAT-09` fund designation policy with validated dimensions, account defaults, and report propagation | `queue for P5-T6` | `backend/src/types/donation.ts`, `backend/src/types/recurringDonation.ts`, `backend/src/modules/donations/**`, `backend/src/modules/reports/**` |
| `PAT-10` closeable donation batches with control totals, pre-close exception preview, and staged import handoff | `queue for P5-T6` | `backend/src/modules/donations/**`, `backend/src/modules/reconciliation/**`, `frontend/src/features/finance/**` |
| `PAT-11` membership as typed lifecycle plus payment or service evidence instead of contact-role inference | `queue for P5-T6` | a new membership module adjacent to donations and recurring plans, plus `frontend/src/features/contacts/pages/ContactDetailPage.tsx` |

Future type targets:
- `fund_designation`
- `donation_batch`
- `membership`

Sequencing guardrails:
- Keep all three as planning-only typed-domain targets until separate scoped rows exist.
- Sequence future work as `fund_designation` first, `donation_batch` second, and `membership` third; keep staged bank import behind the batch review boundary.
- Use this brief as an input to later fundraising stewardship work instead of inventing a parallel fundraising stack.

Parity traps and non-goals:
- Do not mark any item in this brief as `borrow now`.
- Do not imply accounting-suite, GL-posting, budgeting, or disbursement parity.
- Do not treat free-text designations, contact roles, recurring plans, bank-import rows, or Mailchimp metadata as substitutes for typed finance and membership records.
- Do not start with public join or renew UX before typed membership records exist.
- Do not claim direct ERPNext nonprofit-module parity from the local clone; borrow only architecture concepts such as typed accounting dimensions and migration boundaries.

## `workflow-program-ops-brief`

This brief should stay domain-scoped and later-wave. The repo already has mounted case, service, appointment, portal, and case-form seams, but the missing depth is structured transitions, typed service-site routing, and richer approval or revision loops rather than a generic workflow platform.

| Pattern | Outcome | Concrete landing zones |
|---|---|---|
| `PAT-08` narrow workflow-rule registry for one domain seam at a time | `queue for P5-T6` | `backend/src/modules/portalAdmin/services/portalAppointmentStatusWorkflow.ts`, `backend/src/modules/cases/queries/lifecycleQueries.ts`, `backend/src/modules/opportunities/**` |
| `PAT-12` typed service-site routing on case services and appointments | `queue for P5-T6` | `backend/src/modules/portalAdmin/services/portalAppointmentSlotService.ts`, `backend/src/modules/portal/mappers/portalMappers.ts`, `frontend/src/components/cases/CaseServices.tsx` |
| `PAT-13` revision-capable case-form review before any generic approval kernel | `queue for P5-T6` | `backend/src/modules/cases/usecases/caseForms.usecase.staff.ts`, `backend/src/modules/cases/repositories/caseFormsRepository.ts`, `frontend/src/types/caseForms.ts` |

Future type targets:
- seam-local `transition_registry` definitions
- `service_site`
- expanded case-form approval states plus review history, due dates, and linked follow-up or response-action closure semantics

Sequencing guardrails:
- Keep this brief behind the current `P5-T5` stabilization work.
- Start with `PAT-13` before `PAT-08`; case-form approval depth is the narrowest existing approval seam and the cleanest reuse proof.
- Take `PAT-12` next only if portal appointments and case services settle around consistent site snapshots.
- Reconsider a reusable kernel only after at least two concrete domains prove the same primitives.

Parity traps and non-goals:
- Do not reopen a generic workflow builder, studio, custom-field layer, or metadata-driven admin platform.
- Do not treat free-text `location`, provider labels, generic portal threads, or case-form `reviewed | closed | cancelled` endings as typed routing or revision-capable approvals.
- Do not add service-point OAuth/API, service-point users, dynamic approver rules, CEL, or multi-tier admin UI in the first slice.
- Do not invent a rehab-only module first; deepen the shared case and service seams before any domain fork.

## Explicit Reject Boundary

Keep `PAT-15` rejected for this wave. A generic studio or custom-field builder is still out of scope because it widens beyond the current product seams and still lacks reuse proof inside nonprofit-manager.

The reject boundary also includes:
- no runtime metadata builder, generated schema or view layer, generic workflow studio, or no-code change-request platform
- no direct ERPNext nonprofit-module parity claim from the local `nm--erpnext` clone
- no direct source-code copy from GPL, AGPL, or LGPL reference projects

## Downstream Handoff

- `P5-T6A` is the next later-wave planning pickup. Use this packet plus the persona audit to scope governance and compliance oversight without pulling annual filing or legal review into product claims.
- `P5-T6B` should build on `fundraising-ops-brief` and `finance-membership-brief` after the `P5-T3` handoff.
- `P5-T6C` should build on `portal-ops-brief`, `volunteer-dispatch-brief`, and `workflow-program-ops-brief` after the `P5-T5` handoff.
- No runtime implementation is authorized from this packet until a separate scoped row is signed out on the live workboard.
