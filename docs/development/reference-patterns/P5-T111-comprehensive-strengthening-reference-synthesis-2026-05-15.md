# P5-T111 Comprehensive Strengthening Reference Synthesis

**Date:** 2026-05-15
**Status:** Planning evidence
**Source of Truth:** central index at `/Users/bryan/projects/reference-repos/docs/index.json`

This artifact records the reference-repo corpus for the comprehensive strengthening batch. It is metadata-first evidence only: do not copy source, schemas, migrations, UI markup, styles, tests, or distinctive expression from these repositories into nonprofit-manager. Runtime work still needs a signed-out workboard row, row-local proof, and license/reuse review when anything moves beyond architecture comparison.

The live central index observed for this pass reports `129` unique repos and `138` source copies, generated `2026-05-14T08:45:07.156Z`. Project-local compatibility paths and the nonprofit manifest remain policy/navigation aids; the central index and per-repo profiles are the current corpus truth.

## Fundraising And Donations

| Reference repo | Current posture | Use for | Guardrail |
|---|---|---|---|
| `civicrm__civicrm-core` | `architecture_only`, high license risk | Groups, pledges, relationships, campaign history, soft-credit vocabulary | No code reuse; compare domain boundaries only |
| `openpetra__openpetra` | `architecture_only`, high license risk | Receipt defaults, restricted-gift designations, batch close, control totals | Keep finance rows explicit and migration-backed |
| `frappe__erpnext` | `architecture_only`, high license risk | Accounting dimensions and nonprofit accounting vocabulary | Avoid stale nonprofit parity claims |
| `houdiniproject__houdini` | `reference_only`, high license risk | Donation, recurring giving, campaign, and payment-flow boundaries | Nonprofit-native inspiration only |
| `impress-org__givewp` | `architecture_only`, high license risk | Donation validation and receipt defaults | Do not copy WordPress plugin internals |
| `oca__donation` | `architecture_only`, high license risk | Donation validation and tax-receipt lifecycle | Treat Odoo models as conceptual references only |
| `pretix__pretix` | `architecture_only`, high license risk | Event orders, check-in state, finance/export concepts | Keep event and finance rows separate |
| `opencollective__opencollective*` | mixed architecture/reference profile set | Public ledger, fiscal-hosting, accounting category concepts | Requires source-level license/profile review before any adaptation |

## Communications

| Reference repo | Current posture | Use for | Guardrail |
|---|---|---|---|
| `mautic__mautic` | `architecture_only`, high license risk | Fatigue rules, do-not-contact rules, automation comparison | Do not adopt automation-canvas scope |
| `suitecrm__suitecrm` | `architecture_only`, high license risk | Campaign history, target/suppression snapshots, saved queue definitions | Keep local campaign ownership provider-neutral |
| `mettle__sendportal` | `adapt_with_attribution`, low license risk | Workspace newsletter operations and dispatch queue patterns | Attribution/reuse review required before adapting |
| `dittofeed__dittofeed` | `architecture_only`, low license risk | Subscription groups, broadcasts, event/journey boundaries | Use journey ideas only after provider-neutral rows mature |
| `knadh__listmonk` | `architecture_only`, high license risk | Compact campaign status, lists, bounces, operator UI inspiration | No source or UI copying |
| `pentacent__keila` | `architecture_only`, high license risk | Sender adapters, scheduling, opt-in, segments, campaign stats | Keep delivery drain row bounded |
| `mailtrain-org__mailtrain` | `architecture_only`, high license risk | List fields, segments, blacklist, test-send, report ideas | Avoid inheriting list-engine scope |
| `phplist__phplist3` | `architecture_only`, high license risk | Subscribe/unsubscribe, bounce processing, event logs | Keep suppression governance local |
| `usewaypoint__email-builder-js` | `adapt_with_attribution`, low license risk | Block-schema email authoring and renderer separation | Attribution/reuse review required before adapting |

## Service Delivery And Forms

| Reference repo | Current posture | Use for | Guardrail |
|---|---|---|---|
| `openspp__openspp2` | `architecture_only`, medium license risk | Identity resolution, change requests, service routing | Do not open generic studio-builder scope |
| `sahana__eden` | `architecture_only`, low license risk | Dispatch ergonomics and field-service packet ideas | Avoid sync-engine adoption in the first packet rows |
| `primeroims__primero` | `architecture_only`, high license risk | Case plans, referrals, closure forms, protection workflow vocabulary | Keep protection workflow concepts abstract |
| `dimagi__commcare-hq` | `architecture_only`, low license risk | Portable case packets and field workflow comparison | Do not inherit offline-sync complexity |
| `avniproject__avni-server`, `avniproject__avni-webapp` | architecture/reference profile set | Visit cadence, observations, field follow-up flow | Needs source-level profile review before row claims |
| `opencrvs__opencrvs-core` | `architecture_only`, medium license risk | Typed event config and public-service workqueues | Use config/queue concepts only |
| `formio__formio.js` | `reference_only`, low license risk | JSON form renderer and SDK separation | Do not adopt the runtime or schema wholesale |
| `rjsf-team__react-jsonschema-form` | `reference_only`, low license risk | Schema-driven rendering, validation, UI-schema separation | Local case-form schema remains canonical |
| `surveyjs__survey-library` | `adapt_with_attribution`, low license risk | Conditional logic and renderer/framework separation | Attribution/reuse review required before adapting |
| `docusealco__docuseal` | `reference_only`, high license risk | Signature templates, submitters, webhook evidence | E-signature product scope requires a new row |

## Finance, Governance, Field Data, And Ops

| Reference repo | Current posture | Use for | Guardrail |
|---|---|---|---|
| `apache__fineract` | `adopt_selectively`, low license risk | Maker-checker, tenant, accounting-control, reporting patterns | Avoid adopting lending-product assumptions |
| `blnkfinance__blnk` | `adopt_selectively`, low license risk | Ledger API, balances, reconciliation, idempotency | Keep ledger rows explicit and auditable |
| `ledgersmb__ledgersmb` | `reference_only`, high license risk | General ledger, journal, reconciliation, reporting comparison | No direct reuse |
| `dhis2__dhis2-core` | `architecture_only`, low license risk | Program indicators, organization units, analytics APIs | Use for monitoring/evaluation vocabulary only |
| `openboxes__openboxes` | `architecture_only`, medium license risk | Inventory, stock movement, shipment, warehouse workflows | Defer inventory/product breadth behind `P5-T6` |
| `kobotoolbox__kpi` | `reference_only`, high license risk | Field forms, sharing, reporting, export workflow | No source reuse |
| `openmrs__openmrs-core` | `architecture_only`, medium license risk | Encounters, concept dictionary, program/service evidence | Health-record concepts only |
| `openimis__openimis-be_py`, `openimis__openimis-dist_dkr` | metadata-first social-protection profile set | Eligibility, claims, contributions, payments, deployment topology | Source-level claims remain behind clone-cache hygiene |

## Candidate Metadata Rows After P5-T111

These are candidate references to record only after `P5-T111` proof is accepted and the project decides a scoped row exists:

| Candidate | Current central posture | Possible future lane |
|---|---|---|
| `chatwoot__chatwoot` | `architecture_only` | Support inbox and conversation routing analogs |
| `calcom__cal.diy` | `adapt_with_attribution` | Scheduling availability and booking workflow analogs |
| `automatisch__automatisch` | `reference_only` | Integration workflow automation analogs |
| `temporalio__temporal` | `adopt_selectively` | Durable workflow orchestration concepts |
| `openfga__openfga` | `architecture_only` | Relationship-based authorization modeling |

## Product Translation

- Close proof caveats before widening product depth. `P5-T114`, `P5-T115`, and `P5-T119` remain row-local proof follow-ups, not authorization to add offline sync, service routing, or a generic form runtime.
- Treat `P5-T6` as the expansion gate for memberships, finance breadth, workflow studio, offline sync, provider-primary campaign redesign, inventory, and scheduling products.
- Prefer small local contracts: typed spines, explicit control totals, permission-scoped queues, append-only evidence, and route-policy checks.
- Keep clean-room posture visible in proof docs. Metadata can guide what to compare; source-level claims require a separate source-navigation/reuse review.

## Validation Hook

Closeout for `P5-T111` should cite this artifact plus:

```bash
cd /Users/bryan/projects/reference-repos && node scripts/validate-reference-index.mjs --mode=metadata
jq empty /Users/bryan/projects/reference-repos/docs/index.json reference-repos/manifest.lock.json
```

Run source-level sync or clone hydration only when a later row explicitly authorizes source review.
