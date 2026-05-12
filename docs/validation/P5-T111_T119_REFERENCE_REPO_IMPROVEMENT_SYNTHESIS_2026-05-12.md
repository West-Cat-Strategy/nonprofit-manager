# P5-T111 Through P5-T119 Reference-Repo Improvement Synthesis Proof

**Date:** 2026-05-12
**Workboard Rows:** `P5-T111` through `P5-T119`
**Type:** Docs-only backlog synthesis

## Scope

This note records the accepted read-only reference-repo improvement synthesis as signed-out Ready rows. It does not authorize runtime implementation, public API changes, migrations, dependency additions, or source reuse from reference repos.

The review compared the live nonprofit-manager repo against the central reference profiles, `reference-repos/manifest.lock.json`, and the benchmark canon. The central clone cache for the nonprofit cohort is currently absent by design, so this synthesis uses the metadata-first corpus posture and keeps source-level review behind a future hygiene row.

## Added Ready Rows

| Row | Opportunity | Source pressure | First implementation boundary |
|---|---|---|---|
| `P5-T111` | Reference corpus clone-cache hygiene | Central profiles and manifest paths point at rebuildable clone targets that are not present locally | Prove metadata validity and re-cloneability; reconcile profile/manifest drift before source-level claims |
| `P5-T112` | Typed appeal and campaign spine | CiviCRM and SuiteCRM campaign/appeal history; communications provider summaries | Add a local typed spine before broader campaign parity claims |
| `P5-T113` | Donation batch close and control totals | OpenPetra batch controls; Fineract maker-checker posture; typed fund designations already exist | Add batch review, totals, exceptions, and audit events before deeper finance breadth |
| `P5-T114` | Field-ready case packet | OpenSPP handoff/status patterns; Sahana field packet ergonomics | Extend the existing handoff packet; no offline sync or service-site routing in the first slice |
| `P5-T115` | Service-site snapshot | OpenSPP and Sahana service-site routing pressure | Add optional typed service-site references while preserving free-text fallback |
| `P5-T116` | Board and governance packet | SuiteCRM dashboard/list views; CiviCRM/OpenPetra governance reporting | Package existing report/dashboard/public-snapshot data as read-only packets |
| `P5-T117` | Provider-fed campaign evidence ledger | Mautic, Mailchimp, listmonk, Keila, Mailtrain, and SendPortal campaign state vocabulary | Store provider summaries without tracking pixels or automation-canvas scope |
| `P5-T118` | Public-action review polish | CiviCRM/SuiteCRM public-action and staff-review patterns | Improve history/artifact visibility in the existing Website Forms console |
| `P5-T119` | Case-form condition authoring | Form.io, RJSF, OpnForm, and SurveyJS builder separation patterns | Add local controls over the current schema; do not adopt external runtimes |

## Metadata-First Reference Expansion

The implementation follow-up added metadata-only central profiles and nonprofit manifest entries for:

- Houdini (`houdiniproject__houdini`) for nonprofit-native fundraising, donations, recurring giving, crowdfunding, and payment-flow comparison.
- OpenBoxes (`openboxes__openboxes`) for program inventory, stock movement, shipment, and logistics workflows.
- KoboToolbox KPI (`kobotoolbox__kpi`) for field forms, sharing, reporting, and export workflows.
- DHIS2 Core (`dhis2__dhis2-core`) for indicators, organization units, analytics APIs, and monitoring/evaluation vocabulary.
- OpenMRS Core (`openmrs__openmrs-core`) for encounter, concept dictionary, and structured service-evidence modeling.
- openIMIS Backend (`openimis__openimis-be_py`) and Docker Distribution (`openimis__openimis-dist_dkr`) for eligibility, claims, contributions, payments, and social-protection runtime topology comparison.

No central clone cache was hydrated, no compatibility symlinks were added, and no source-level claims are authorized by this expansion. `OpenVolunteerPlatform` remains deferred until volunteer dispatch becomes the active lane; Coalesce and Creme CRM remain skipped for now.

## Reuse Guardrails

- Treat CiviCRM, OpenPetra, ERPNext, SuiteCRM, Mautic, listmonk, Keila, Mailtrain, OpenSPP, LedgerSMB, DocuSeal, OpnForm, and SurveyJS Creator as architecture/reference-only for these rows.
- Treat Houdini, KoboToolbox KPI, openIMIS, and other high-risk or unverified-license additions as reference-only; treat OpenBoxes, DHIS2 Core, and OpenMRS Core as architecture-only until a future scoped row authorizes narrower reuse.
- Do not copy source, schemas, migrations, tests, UI markup, styles, assets, or distinctive expression from GPL, AGPL, LGPL, commercial, mixed-license, or `reference_only` sources.
- MIT and Apache-2.0 references such as SendPortal, SurveyJS Survey Library, Fineract, and Blnk still require a specific attribution and dependency/reuse review before adaptation.
- `P5-T6` remains the scope-control gate for broader workflow, fundraising, finance, service-delivery, and governance expansion.

## Validation

- Pass: `/Users/bryan/projects/reference-repos && node scripts/validate-reference-index.mjs --mode=metadata` passed for 109 repos after the metadata-first expansion.
- Pass: `/Users/bryan/projects/reference-repos && node scripts/sync-reference-repos.mjs --dry-run --shallow` exited cleanly with `would-clone=7` for the newly added references, `would-update=62`, and `skipped-metadata-only=40`.
- Pass: `jq empty /Users/bryan/projects/reference-repos/docs/index.json reference-repos/manifest.lock.json`.
- Pass: `make check-links` checked 236 files and 1489 local links with no broken active-doc links.
- Pass: `git diff --check` in `/Users/bryan/projects/nonprofit-manager`.
- Pass: `git diff --check` in `/Users/bryan/projects/reference-repos`.

## Notes

- This pass intentionally preserved the dirty runtime checkout and changed only tracking/proof docs.
- No new reference clone cache was hydrated. The sync dry-run proves the seven additions are re-cloneable candidates without changing `/Users/bryan/projects/reference-repos/repos`.
- The first implementation follow-up should pick one Ready row, update the workboard owner/status before runtime edits, and use focused tests for that row's seam.
