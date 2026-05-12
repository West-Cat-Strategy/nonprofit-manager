# P5-T6 Reference Repo Consolidation

**Last Updated:** 2026-05-01

## Purpose

This lead-owned synthesis consolidates the May 1, 2026 read-only reference-repo review across communications, finance/governance, service delivery, workflow, evidence, and document operations.

It does not authorize runtime implementation, add public APIs, change migrations, or reopen archived Phase 5 rows. `P5-T6` remains the scope-control gate: every runtime pickup below still needs a separate signed-out workboard row before code changes.

## Source Lanes

| Lane | Reference repos | Current repo surfaces |
|---|---|---|
| Communications and campaigns | `nm--mautic`, `nm--listmonk`, `nm--mailtrain`, `nm--keila`, `nm--sendportal`, `nm--email-builder-js`, CiviCRM, SuiteCRM | local-first communications, Mailchimp compatibility, newsletter signup, contact suppression, campaign runs |
| Fundraising, finance, and governance | CiviCRM, OpenPetra, ERPNext, GiveWP, Open Collective, Fineract, Blnk, LedgerSMB | donations, recurring donations, reconciliation, reports, grants, donor profiles, `P5-T35` finance/evidence refresh |
| Service delivery and case operations | OpenSPP, Sahana Eden, Avni, Primero, CommCare, OpenCRVS | public intake, queue views, portal escalations, case reassessments, case-form revision requests, volunteer assignment |
| Evidence, documents, and admin operations | DocuSeal, paperless-ngx, pretix, Kimai, docassemble, OCA Donation, OCA Vertical Association, ArkCase | case forms, contact/case documents, audit logs, scheduled reports, event check-in, receipt and membership planning |

GPL, AGPL, LGPL, and MPL projects remain reference-only or architecture-only unless a future row records compatible reuse and attribution. MIT and Apache-2.0 references may inform narrow local implementation when the manifest allows it, but this synthesis still treats all findings as product and architecture inspiration rather than source-copy authorization.

## Borrow Now, With Separate Runtime Signoff

These items fit existing local seams and are the strongest candidates for the next small signed-out rows. They are not automatically authorized by this document.

| Rank | Opportunity | Reference pressure | Current landing zone | First safe slice |
|---|---|---|---|---|
| 1 | Local campaign delivery drain | Keila delivery workers, SendPortal queue posture, listmonk campaign manager | [communicationsService.ts](../../../backend/src/modules/communications/services/communicationsService.ts), [111_local_first_communications.sql](../../../database/migrations/111_local_first_communications.sql) | Add a bounded background drain or explicit retry action for queued local recipients without building a marketing automation engine. |
| 2 | Local unsubscribe and List-Unsubscribe support | CiviCRM and Keila unsubscribe contracts | [emailCampaignRenderer.ts](../../../backend/src/services/template/emailCampaignRenderer.ts), [contactSuppressionService.ts](../../../backend/src/modules/contacts/services/contactSuppressionService.ts) | Add signed local unsubscribe handling and suppression evidence for local SMTP campaigns. |
| 3 | Recipient reporting drilldown | CiviCRM/SuiteCRM event history and Keila recipient states | [111_local_first_communications.sql](../../../database/migrations/111_local_first_communications.sql), [EmailMarketingCards.tsx](../../../frontend/src/features/mailchimp/components/EmailMarketingCards.tsx) | Show sent, failed, and suppressed recipient groups before adding bounce or complaint ingestion. |
| 4 | Double opt-in for public newsletter signup | Keila and listmonk public signup confirmation flows | [publicWebsiteFormService.ts](../../../backend/src/services/publishing/publicWebsiteFormService.ts), [newsletterProviderService.ts](../../../backend/src/services/newsletterProviderService.ts) | Add pending/confirmed signup state with no-information-leak public responses. |
| 5 | Campaign lifecycle actions | listmonk status transitions | [111_local_first_communications.sql](../../../database/migrations/111_local_first_communications.sql), [EmailMarketingCards.tsx](../../../frontend/src/features/mailchimp/components/EmailMarketingCards.tsx) | Add cancel/reschedule for draft or scheduled local runs; defer pause/resume until a delivery drain exists. |
| 6 | Case-form evidence packet | DocuSeal submission events and audit-trail posture | [093_case_form_builder.sql](../../../database/migrations/093_case_form_builder.sql), [109_case_form_revision_requests.sql](../../../database/migrations/109_case_form_revision_requests.sql) | Add append-only actor/time/event history around case-form submissions and revision requests before any e-signature product. |
| 7 | Reassessment due cues | Avni visit cadence and checklist rollups | [108_case_reassessment_cycles.sql](../../../database/migrations/108_case_reassessment_cycles.sql), [caseReassessmentsRepository.ts](../../../backend/src/modules/cases/repositories/caseReassessmentsRepository.ts) | Improve staff-facing due, overdue, and completion cues without adopting Avni's rule system. |
| 8 | Portal and intake workqueue polish | OpenCRVS workqueue config and scoped actions | [104_public_intake_resolutions.sql](../../../database/migrations/104_public_intake_resolutions.sql), [105_queue_view_definitions.sql](../../../database/migrations/105_queue_view_definitions.sql), [106_portal_escalations.sql](../../../database/migrations/106_portal_escalations.sql) | Add clearer queue counts/actions for existing intake and escalation queues, preserving owner and permission scopes. |
| 9 | Volunteer dispatch cockpit | Sahana and Avni task-assignment views | [AssignmentForm.tsx](../../../frontend/src/components/AssignmentForm.tsx), [VolunteerDetailPage.tsx](../../../frontend/src/features/volunteers/pages/VolunteerDetailPage.tsx) | Add a focused assignment list/cockpit using existing task, event, availability, and fit-cue contracts. |
| 10 | Audit and scheduled-report health polish | paperless-ngx audit retention, Kimai export/run history cues | [AuditLogsSection.tsx](../../../frontend/src/features/adminOps/pages/adminSettings/sections/AuditLogsSection.tsx), [scheduledReportSchedulerService.ts](../../../backend/src/services/scheduledReportSchedulerService.ts) | Surface stale/failed operational health before adding new report domains. |

## May 12 Reference-Repo Improvement Synthesis

The May 12 follow-up used the central profiles, `reference-repos/manifest.lock.json`, and current repo state while leaving the rebuildable clone cache absent. It opened [P5-T111 through P5-T119](../../validation/P5-T111_T119_REFERENCE_REPO_IMPROVEMENT_SYNTHESIS_2026-05-12.md) as Ready rows in the live workboard.

| Row | Opportunity | Routing note |
|---|---|---|
| `P5-T111` | Reference corpus clone-cache hygiene | Prove metadata validity and re-cloneability before source-level follow-up. |
| `P5-T112` | Typed appeal and campaign spine | Keep provider IDs and free-text campaign fields as compatibility inputs until migration is scoped. |
| `P5-T113` | Donation batch close and control totals | Sequence after typed fund designations and before broader finance-control parity. |
| `P5-T114` | Field-ready case packet | Extend existing case handoff surfaces without offline sync or service-site routing. |
| `P5-T115` | Service-site snapshot | Add optional typed site references while preserving free-text fallback. |
| `P5-T116` | Board and governance packet | Build read-only packet views from existing report/dashboard/public-snapshot surfaces. |
| `P5-T117` | Provider-fed campaign evidence ledger | Store provider summaries without tracking pixels or automation-canvas scope. |
| `P5-T118` | Public-action review polish | Improve review history and artifact visibility on existing website-console contracts. |
| `P5-T119` | Case-form condition authoring | Add local authoring controls over the current schema without adopting external runtimes. |

## May 12 Metadata-First Corpus Expansion

The accepted follow-up added seven metadata-only central profiles and nonprofit manifest entries. These fill comparison gaps without cloning source or authorizing runtime implementation.

| Reference | Why it was added | First backlog pressure |
|---|---|---|
| Houdini | Nonprofit-native fundraising, donations, recurring giving, crowdfunding, and payment-flow posture beyond GiveWP/OpenPetra/Open Collective. | Sharpen `P5-T112` appeal/campaign spine and later fundraising depth. |
| OpenBoxes | Inventory, stock movement, shipment, and healthcare/disaster-response logistics workflows. | Future program-operations and service-logistics rows behind `P5-T6`. |
| KoboToolbox KPI | Humanitarian field forms, sharing, reporting, and export workflows. | Sharpen `P5-T114`, `P5-T119`, and future field-evidence rows. |
| DHIS2 Core | Program indicators, organization units, analytics APIs, and monitoring/evaluation vocabulary. | Future program-analytics and governance reporting rows. |
| OpenMRS Core | Encounter, concept dictionary, and structured service-evidence modeling without adopting EMR scope. | Future health/rehab-adjacent service-evidence rows behind `P5-T6`. |
| openIMIS Backend | Eligibility, claims, contributions, payments, and social-protection workflow vocabulary. | Future case-finance and social-protection operations rows. |
| openIMIS Docker Distribution | Companion runtime topology for openIMIS module assembly. | Runtime-lab comparison only after clone-cache hygiene. |

`OpenVolunteerPlatform` remains deferred until volunteer dispatch becomes the active lane. Coalesce and Creme CRM remain skipped for now because they add less than Sahana/OpenVolunteer and CiviCRM/SuiteCRM/Twenty.

## Queue For P5-T6

These are useful but require typed records, migrations, or cross-domain contracts. Keep them behind `P5-T6` until a separate row defines the interface and validation path.

| Area | Queued opportunity | Why queued |
|---|---|---|
| Fundraising and finance | Typed fund designations, donation batches, memberships, typed appeals, pledge/soft-credit/in-kind receipt policy | Current donations and campaign runs are real, but designation and appeal semantics remain too free-text for parity claims. Sequence fund designation first, donation batches second, memberships third. |
| Communications | Dynamic CRM audience segments and larger campaign controls | Reusable filters and segment logic quickly become a CRM query/workflow surface. Keep current selected-contact and provider-audience contracts stable first. |
| Service delivery | Referral/transfer status, service-site routing, closure-readiness evidence, field-ready handoff packets, case-form revision history | Existing case, reassessment, handoff, closure, and revision seams are good anchors, but each needs a scoped transition or evidence model. |
| Events and documents | Event order/check-in/payment snapshots, document retention/archive metadata, governance signature evidence | These cross events, payments, documents, and compliance. Do not fold them into current check-in, document, or case-form work without a new row. |
| Reporting and governance | Public/board finance snapshots and finance-event state vocabulary | Borrow vocabulary from Blnk, Fineract, Open Collective, and LedgerSMB, but build projections from local donation/reporting models only. |
| Program operations | Inventory, field evidence, program analytics, health/service evidence, and social-protection payment or claims vocabulary | Use OpenBoxes, KoboToolbox, DHIS2, OpenMRS, and openIMIS only to sharpen future row definitions; do not adopt logistics, EMR, insurance, or benefits-platform scope implicitly. |

## Reject For This Wave

- Marketing automation canvas, tracking-pixel system, or ROI attribution product parity from Mautic or SuiteCRM.
- Full GL, fiscal-host, collective, KYC, expense/disbursement, or ledger-module parity from LedgerSMB, Open Collective, Fineract, or Blnk.
- Generic workflow/admin studios, no-code rule editors, broad custom-field platforms, or metadata-generated UI.
- Offline sync engines or mobile case-runtime transplants from CommCare or Sahana.
- Direct source copying from GPL, AGPL, LGPL, MPL, or repo-manifest `reference_only` sources.

## Interface And Validation Rules

- No public API, route, schema, or migration changes are authorized by this synthesis.
- A future runtime row must define its own interface and proof path before implementation starts.
- Likely first runtime candidates are local communications delivery/unsubscribe endpoints, case/workqueue status fields, or finance designation records, but only after workboard signoff.
- Docs-only updates should run `make check-links`, `git diff --check`, and `jq empty reference-repos/manifest.lock.json /Users/bryan/projects/reference-repos/docs/index.json`.
- Add `make lint-doc-api-versioning` only when API examples or `/api/v2` wording changes.
- Runtime rows that borrow from this synthesis need targeted backend/frontend tests and `make db-verify` when schema changes.
