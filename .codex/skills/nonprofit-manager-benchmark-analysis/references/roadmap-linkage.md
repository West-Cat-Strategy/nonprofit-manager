# Roadmap Linkage

Use this file to connect benchmark findings to current Phase 5 work and the follow-on backlog.

When a roadmap note depends on local source review, use `$use-reference-repos` and the central reference store documented in `docs/reference-repos.md`; preserve older `reference-repos/external/**` paths only as compatibility aliases in historical check matrices and source notes.

## Direct Phase 5 Linkage

| Workboard row | Benchmark pressure | Borrowable patterns | Strongest references |
|---|---|---|---|
| `P5-T3` Email platform wave | Nonprofit Manager trails stronger campaign and email products | Saved audiences, include/exclude controls, test-send lanes, suppression snapshots, local campaign-run history, reusable template blocks | CiviCRM, SuiteCRM |
| `P5-T5` Client portal wave | Current portal needs clearer service-delivery and issue-resolution depth | Provenance-first public intake, server-backed queue views, typed portal review requests, role-aware escalations, stronger case continuity | OpenSPP, Sahana Eden, CiviCRM, SuiteCRM |
| `P5-T6C1` Case reassessment cadence runtime slice | Service-delivery depth needs explicit reassessment cadence before wider handoff or closure work | Case-scoped reassessment cycles, review windows, owner/due-date tracking, linked follow-ups | Avni, Primero, CommCare |
| `P5-T36` Local-first communications refactor | Email and newsletter workflows need a local provider-neutral spine before optional provider sync | Local campaign records, delivery state, recipient suppression, provider-neutral run actions, optional Mailchimp compatibility | SendPortal, listmonk, Keila, Mailtrain, Mautic |
| `P5-T41` Case-form template builder | Staff case workflows need reusable templates, evidence, and multi-channel opening without adopting an external builder wholesale | Template libraries, autosave discipline, submission state, email/SMS/portal opening, reference-only form-builder provenance | Formera, Form.io, react-jsonschema-form, OpnForm, Survey Creator |
| `P5-T42` Website public-action expansion | Public websites need action-oriented forms while preserving typed provenance and staff review boundaries | Petition/support-letter/pledge submissions, content-entry generalization, public runtime blocks, staff console review | CiviCRM, SuiteCRM, OpnForm |

## Precision Crosswalk

| Workboard row | What the benchmark is really telling us | Current repo boundary |
|---|---|---|
| `P5-T3` | campaign and delivery flows need stronger segmentation, test/suppression discipline, and local campaign-run memory | do not claim parity with dedicated email suites until routed and validated here |
| `P5-T5` | portal and service flows need clearer provenance, status, handoff, queue, and review-request patterns | do not treat portal inputs as a full service-delivery system of record |
| `P5-T6C1` | reassessment cadence is the smallest signed-out service-delivery runtime pickup | keep handoff packets, closure continuity, referral engines, service-site routing, and offline sync out of this row |
| `P5-T36` | local-first communications is the current delivery spine and external providers are explicit secondary adapters | do not reframe Mailchimp as the primary campaign contract or add automation-canvas scope without a new row |
| `P5-T41` | case-form templates can borrow workflow shape from form builders without importing their runtime model | do not copy AGPL/commercial source or replace existing case-form module ownership |
| `P5-T42` | public actions should stay typed and reviewable instead of becoming a generic website workflow studio | do not widen public actions into broad donations, appeals, or campaign automation parity |

## Follow-On Backlog Linkage

| Workboard row | Benchmark pressure | Borrowable patterns | Strongest references |
|---|---|---|---|
| `P5-T6A` Governance and compliance oversight brief | Executive and board workflows need clearer governance-risk and compliance follow-through | Board packet workflow, compliance-document retention, corrective-action tracking | CiviCRM, ERPNext, OpenPetra |
| `P5-T6B` Fundraising stewardship and restrictions brief | Current fundraising depth is lighter than mature nonprofit CRMs | Typed appeals, restriction policy, donation batches, memberships, campaign-run memory | CiviCRM, OpenPetra, ERPNext, SuiteCRM |
| `P5-T6C` Service-delivery workflow depth brief | Service workflows need reassessment, handoff, closure, and referral depth | Reassessment cadence, handoff packets, closure evidence, consent-aware referral states | OpenSPP, Sahana Eden, CommCare, Avni, Primero |
| `P5-T6D` Volunteer assignment dispatch radar | Assignment dispatch needed less raw-ID friction | Active event/task pickers that preserve existing assignment payloads | CiviCRM, SuiteCRM |
| `P5-T6` Broader workflow/customization backlog | Metadata-driven workflow and forms are still strategically light | Domain-scoped transition registries, revision-capable case-form review, due followups, auditable actions | OpenSPP, SuiteCRM, Sahana Eden |
| `P5-T35` Finance/governance/evidence reference refresh | Later finance and governance rows need sharper control and evidence vocabulary before runtime signout | Maker-checker checkpoints, idempotent finance events, reconciliation/export vocabulary, signature/submission evidence | Fineract, Blnk, LedgerSMB, DocuSeal |

## Strategic Positioning

- Lead with the unusual combination nonprofit-manager already has in one repo: staff workflows, reporting, portal collaboration, website publishing, public runtime, grants, and self-hosted operations.
- Avoid parity claims in memberships, appeals, richer finance operations, and campaign depth until routed and validated here.
- Reject generic workflow studios, runtime metadata builders, direct ERPNext nonprofit-module parity claims, and direct GPL/AGPL/LGPL source copying in this benchmark wave.
- Keep Twenty, DHIS2, OpenSRP, KoBoToolbox, and OpenMRS as proposed or deferred candidates until a future scoped reference refresh verifies exact repos, licenses, and local landing zones.
- Use the benchmark to sharpen sequence and persona fit, not to inflate current-state claims.
