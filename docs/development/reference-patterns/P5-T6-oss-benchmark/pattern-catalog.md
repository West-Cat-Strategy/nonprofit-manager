# P5-T6 OSS Benchmark Pattern Catalog

**Last Updated:** 2026-04-24

## Scope

- Target: implementation-oriented OSS benchmark synthesis for `P5-T6`.
- Parent task linkage: `P5-T6` follow-on backlog planning wave.
- Cohort: `CiviCRM`, `OpenPetra`, `ERPNext`, `SuiteCRM`, `OpenSPP`, and `Sahana Eden`, with `civicrm-docker` as the only approved companion repo in wave one.
- Reuse policy: default to `architecture_only` for GPL/AGPL/LGPL sources; no direct source copy is authorized.
- Second-pass refinement: the `2026-04-24` follow-through tightened outcomes and landing zones only. It did not expand the cohort or authorize runtime implementation.

## Runtime Lab Notes

| Product | Local repo | Official local entrypoint | Wave-one result |
|---|---|---|---|
| CiviCRM | `reference-repos/external/nm--civicrm-docker` | `example/civicrm` Docker Compose lab | `docker compose config -q` succeeded, the standalone containers booted locally, then the lab was torn down after validation. |
| OpenSPP | `reference-repos/external/nm--openspp2` | `docker compose --profile ui up -d` | Compose config resolved, but the boot attempt exposed early `openspp-dev` image pull/access trouble before a clean boot completed. |
| OpenPetra | `reference-repos/external/nm--openpetra` | bootstrap script plus `nant help` | Runtime attempt was blocked because the official dev flow is system-level and `nant` is not installed on this machine. |
| SuiteCRM | `reference-repos/external/nm--suitecrm` | install guide plus PHP prerequisites | Runtime attempt was blocked because the repo does not ship a safe turnkey local lab here and `php` is not installed on this machine. |
| ERPNext | `reference-repos/external/nm--erpnext` | Docker or Bench install | Deferred in wave one; code/docs review first. |
| Sahana Eden | `reference-repos/external/nm--sahana-eden` | framework/app setup from repo docs | Deferred in wave one; code/docs review first. |

## Summary Table

| Pattern ID | Source cohort | Borrowable pattern | Reuse class | Concrete landing zone | Phase | Outcome |
|---|---|---|---|---|---|---|
| `PAT-01` | CiviCRM | Saved audiences with include, exclude, and prior-send controls bridging People and campaigns | `architecture_only` | `frontend/src/features/contacts/**`, `frontend/src/features/mailchimp/**`, `backend/src/modules/mailchimp/**` | `P5-T3` | `borrow now` |
| `PAT-02` | SuiteCRM | Internal campaign run history with target, suppression, test-send, audience snapshot, and local send lifecycle | `architecture_only` | `frontend/src/features/mailchimp/**`, `backend/src/modules/mailchimp/**` | `P5-T3` | `borrow now` |
| `PAT-03` | OpenPetra | Donor subprofile with receipt defaults and solicitation preferences | `architecture_only` | `backend/src/types/contact.ts`, `backend/src/modules/donations/services/taxReceiptService.ts`, `frontend/src/features/contacts/**` | `P5-T3` | `borrow now` |
| `PAT-04` | CiviCRM + OpenSPP | Provenance-first public-intake identity resolution across website, portal, and events | `architecture_only` | `backend/src/services/publishing/publicWebsiteFormService.ts`, `backend/src/services/portalAuthService.ts`, `backend/src/modules/events/services/eventPublicService.ts` | `P5-T5` | `borrow now` |
| `PAT-05` | SuiteCRM | Server-backed queue view definitions reused by list screens and workbench entry points | `architecture_only` | `frontend/src/features/cases/hooks/useSavedCaseViews.ts`, `frontend/src/features/adminOps/pages/portalAdmin/**`, `frontend/src/features/dashboard/components/workbench/**` | `P5-T5` | `borrow now` |
| `PAT-06` | OpenSPP | Typed portal review requests linked back to the case record | `architecture_only` | `frontend/src/features/portal/pages/PortalCaseDetailPage.tsx`, `backend/src/modules/portal/services/portalMessagingService.validation.ts`, `backend/src/services/portalPointpersonService.ts` | `P5-T5` | `borrow now` |
| `PAT-07` | CiviCRM + SuiteCRM | Typed appeal/campaign spine plus later provider-fed campaign event ledger | `architecture_only` | `backend/src/modules/mailchimp/**`, `backend/src/services/publishing/publicWebsiteFormService.ts`, `frontend/src/features/mailchimp/**` | `P5-T6` | `queue for P5-T6` |
| `PAT-08` | SuiteCRM | Narrow workflow-rule registry for one domain seam at a time | `architecture_only` | `backend/src/modules/portalAdmin/services/portalAppointmentStatusWorkflow.ts`, `backend/src/modules/cases/queries/lifecycleQueries.ts`, `backend/src/modules/opportunities/**` | `P5-T6` | `queue for P5-T6` |
| `PAT-09` | ERPNext + OpenPetra | Fund designation policy with validated dimensions, account defaults, and report propagation | `architecture_only` | `backend/src/types/donation.ts`, `backend/src/types/recurringDonation.ts`, `backend/src/modules/donations/**`, `backend/src/modules/reports/**` | `P5-T6` | `queue for P5-T6` |
| `PAT-10` | OpenPetra | Closeable donation batches with control totals, pre-close exception preview, and staged import handoff | `architecture_only` | `backend/src/modules/donations/**`, `backend/src/modules/reconciliation/**`, `frontend/src/features/finance/**` | `P5-T6` | `queue for P5-T6` |
| `PAT-11` | CiviCRM + OpenPetra + ERPNext | Membership as typed lifecycle plus payment or service evidence instead of contact role inference | `architecture_only` | new membership module plus `frontend/src/features/contacts/pages/ContactDetailPage.tsx` | `P5-T6` | `queue for P5-T6` |
| `PAT-12` | OpenSPP + Sahana Eden | Typed service-site routing on case services and appointments | `architecture_only` | `backend/src/modules/portalAdmin/services/portalAppointmentSlotService.ts`, `backend/src/modules/portal/mappers/portalMappers.ts`, `frontend/src/components/cases/CaseServices.tsx` | `P5-T6` | `queue for P5-T6` |
| `PAT-13` | OpenSPP + Sahana Eden | Revision-capable case-form review before any generic approval kernel | `architecture_only` | `backend/src/modules/cases/usecases/caseForms.usecase.staff.ts`, `backend/src/modules/cases/repositories/caseFormsRepository.ts`, `frontend/src/types/caseForms.ts` | `P5-T6` | `queue for P5-T6` |
| `PAT-14` | Sahana Eden | Volunteer dispatch ergonomics with active task/event pickers, status filters, and skill-fit cues | `architecture_only` | `frontend/src/components/AssignmentForm.tsx`, `frontend/src/features/volunteers/pages/VolunteerDetailPage.tsx`, `frontend/src/features/volunteers/api/volunteersApiClient.ts` | `P5-T6` | `borrow now` |
| `PAT-15` | OpenSPP + ERPNext | Generic studio/custom-field builder and stale ERPNext nonprofit parity as first moves | `architecture_only` | none | `P5-T6` | `reject` |

## Borrow Now

### `PAT-01` Saved audiences as the bridge between People and campaigns

- `Borrowable pattern:` first-class saved audiences built from contact groups or smart groups, then reused directly by the mailing composer for include or exclude, counts, and preview.
- `Source paths:` `reference-repos/external/nm--civicrm-core/CRM/Contact/Page/View/GroupContact.php`, `reference-repos/external/nm--civicrm-core/CRM/Contact/Page/View/ContactSmartGroup.php`, `reference-repos/external/nm--civicrm-core/Civi/Api4/Service/Autocomplete/MailingRecipientsAutocompleteProvider.php`, `reference-repos/external/nm--civicrm-core/ext/civi_mail/ang/crmMailing/crmMailingRecipientsAutocomplete.component.js`
- `Repo truth delta:` nonprofit-manager has ad hoc People filters and provider-native Mailchimp segments, but no internal saved audience object staff can define once and reuse across contact review, fundraising outreach, and campaign sends.
- `Smallest adoptable slice:` add saved audience definitions on top of People filters, then let the newsletter campaign flow select one include audience plus optional exclusions from another saved audience or prior campaign run before translating to provider segments.
- `Concrete nonprofit-manager landing zone:` `frontend/src/features/contacts/hooks/useContactListPage.tsx`, `frontend/src/features/mailchimp/components/EmailMarketingPageParts.tsx`, `backend/src/modules/mailchimp/services/mailchimpService.ts`
- `Persona implication:` fundraiser and communications staff get reusable donor and appeal segments instead of rebuilding audiences downstream in Mailchimp.
- `Phase/backlog linkage:` `P5-T3`
- `Outcome:` `borrow now`
- `Guardrail:` keep this to People audiences, provider segments, and campaign-run exclusions; do not build a generic entity-set union engine.

### `PAT-02` Internal campaign run history with audience snapshot and local send lifecycle

- `Borrowable pattern:` an internal campaign brief plus audience snapshot and queued send lifecycle, even when delivery stays with an external ESP.
- `Source paths:` `reference-repos/external/nm--suitecrm/modules/Campaigns/Campaign.php`, `reference-repos/external/nm--suitecrm/modules/ProspectLists/ProspectList.php`, `reference-repos/external/nm--suitecrm/modules/EmailMan/vardefs.php`, `reference-repos/external/nm--suitecrm/modules/EmailMan/EmailManDelivery.php`, `reference-repos/external/nm--suitecrm/modules/Campaigns/QueueCampaign.php`
- `Repo truth delta:` the current newsletter workspace can sync contacts, load provider segments, create campaigns, and send or schedule directly in Mailchimp, but it does not keep a first-class internal campaign record, audience snapshot, or local send queue/history.
- `Smallest adoptable slice:` add a local `campaign_run` record capturing title, provider campaign ID, selected target audience, suppression snapshot, optional test-recipient lane, requested send time, requester, local status, counts, and failure message; surface recent runs in the newsletter workspace.
- `Concrete nonprofit-manager landing zone:` `frontend/src/features/mailchimp/pages/EmailMarketingPage.tsx`, `backend/src/modules/mailchimp/services/mailchimpService.ts`
- `Persona implication:` fundraiser and communications staff get defensible campaign history and cleaner handoffs; admins get delivery audit without living in Mailchimp.
- `Phase/backlog linkage:` `P5-T3`
- `Outcome:` `borrow now`
- `Guardrail:` do not mirror SuiteCRM target-list internals; store typed local snapshots and keep Mailchimp unsubscribe or cleaned status authoritative for delivery suppression.

### `PAT-03` Donor subprofile with receipt and solicitation preferences

- `Borrowable pattern:` a donor subprofile on top of the shared contact root for receipt cadence, per-gift receipts, email gift statements, anonymity, and solicitation preferences.
- `Source paths:` `reference-repos/external/nm--openpetra/db/petra.xml`, `reference-repos/external/nm--openpetra/csharp/ICT/Petra/Server/lib/MFinance/Gift/Gift.Receipting.cs`, `reference-repos/external/nm--openpetra/js-client/src/forms/Finance/Gift/GiftReceipting/PrintAnnualReceipts.js`, `reference-repos/external/nm--openpetra/i18n/template.pot`
- `Repo truth delta:` nonprofit-manager already has general communication opt-outs plus donation-level receipt flags, but it does not have donor-specific finance preferences even though fundraiser personas explicitly call out donor-preference governance as a current gap.
- `Smallest adoptable slice:` create `donor_profiles` keyed to contact or account with `receipt_frequency`, `receipt_each_gift`, `email_gift_statement`, `anonymous_donor`, and `no_solicitations`; use those values as receipt modal defaults while preserving explicit staff override and audit.
- `Concrete nonprofit-manager landing zone:` `backend/src/types/contact.ts`, `backend/src/services/contactRoleService.ts`, `backend/src/modules/donations/services/taxReceiptService.ts`, `frontend/src/features/contacts/**`
- `Persona implication:` fundraisers get better stewardship controls and admins get clearer receipt/privacy handling without waiting for a full finance redesign.
- `Phase/backlog linkage:` `P5-T3`
- `Outcome:` `borrow now`
- `Guardrail:` keep this to stewardship and receipting default behavior; do not widen it into finance-suite implementation.

### `PAT-04` Shared public-intake identity resolution across website, portal, and events

- `Borrowable pattern:` public profiles plus provenance, source references, ambiguity state, and contact-resolution audit, so public intake can create or match constituent records without each surface inventing its own contact-resolution behavior.
- `Source paths:` `reference-repos/external/nm--civicrm-core/CRM/Profile/Form/Dynamic.php`, `reference-repos/external/nm--civicrm-core/CRM/Profile/Page/Router.php`, `reference-repos/external/nm--civicrm-core/CRM/Contact/Page/DedupeMerge.php`, `reference-repos/external/nm--openspp2/spp_source_tracking/`, `reference-repos/external/nm--openspp2/spp_import_match/`
- `Repo truth delta:` website forms use one contact-resolution path, portal signup uses another, and public events use a separate identity lookup/create path; only portal signup exposes an explicit `needs_contact_resolution` outcome today.
- `Smallest adoptable slice:` extract one public-intake contact resolution service with a shared `public_intake_resolution` decision contract that stores source system, source reference, collection method/date, ambiguity state, and resolution audit; adopt it first in website forms and portal signup while preserving current idempotency and audit logging, then pull public events onto the same resolver.
- `Concrete nonprofit-manager landing zone:` `backend/src/services/publishing/publicWebsiteFormService.ts`, `backend/src/services/portalAuthService.ts`, `backend/src/modules/events/services/eventPublicService.ts`
- `Persona implication:` nonprofit administrators get fewer duplicate constituent records; fundraisers and portal staff keep a cleaner single-person history when supporters donate, register, or request access.
- `Phase/backlog linkage:` `P5-T5`
- `Outcome:` `borrow now`
- `Guardrail:` do not build a generic master-person-index, import-match admin console, or broad merge engine; keep this to explicit intake provenance and ambiguous-match audit.

### `PAT-05` Saved queue views reused by list screens and workbench entry points

- `Borrowable pattern:` saved operational views that drive both list productivity and dashboard or queue entry points.
- `Source paths:` `reference-repos/external/nm--suitecrm/modules/SavedSearch/SavedSearch.php`, `reference-repos/external/nm--suitecrm/include/Dashlets/DashletGeneric.php`, `reference-repos/external/nm--suitecrm/include/Dashlets/DashletGenericDisplay.tpl`, `reference-repos/external/nm--suitecrm/include/SearchForm/SearchForm.php`, `reference-repos/external/nm--suitecrm/modules/Tasks/MyTasks.php`
- `Repo truth delta:` nonprofit-manager already has strong quick filters and a case-only saved-view pattern, but it is localStorage-only and isolated to cases. Tasks and portal queues have filters and pagination, while workbench cards deep-link to fixed routes instead of reusable queue definitions.
- `Smallest adoptable slice:` promote the current case saved-view shape into a server-backed `QueueViewDefinition` carrying owner, surface, filters, columns, sort, row limit, and dashboard behavior; add named views first to portal appointments or conversations, then let workbench cards open those saved queues.
- `Concrete nonprofit-manager landing zone:` `frontend/src/features/cases/hooks/useSavedCaseViews.ts`, `frontend/src/features/adminOps/pages/portalAdmin/panels/AppointmentsPanel.tsx`, `frontend/src/features/adminOps/pages/portalAdmin/panels/ConversationsPanel.tsx`, `frontend/src/features/dashboard/components/workbench/FocusQueuePanel.tsx`
- `Persona implication:` case managers and nonprofit administrators can recover exact triage state across sessions and handoffs, then move through a more consistent shared queue surface instead of rebuilding filters and relearning panel-by-panel affordances.
- `Phase/backlog linkage:` `P5-T5`
- `Outcome:` `borrow now`
- `Guardrail:` use typed JSON and permission-scoped definitions; do not persist raw request blobs or leave queue reuse trapped in localStorage.

### `PAT-06` Structured portal escalations linked back to the case record

- `Borrowable pattern:` case-scoped review request intake that turns a client self-service concern into a typed escalation with category, severity, sensitivity, SLA, decision states, resolution summary, and a durable link back to the case.
- `Source paths:` `reference-repos/external/nm--openspp2/spp_grm/models/grm_ticket.py`, `reference-repos/external/nm--openspp2/spp_grm_case_link/README.rst`, `reference-repos/external/nm--openspp2/spp_grm_case_link/models/grm_ticket.py`, `reference-repos/external/nm--openspp2/spp_grm_case_link/wizard/escalate_to_case_wizard.py`
- `Repo truth delta:` nonprofit-manager already has case-aware portal access and pointperson-aware messaging, but the current portal flow still routes people into generic threads and appointments instead of a typed escalation object with decision states; the current backlog synthesis explicitly calls grievance queues missing.
- `Smallest adoptable slice:` add a case-detail portal action like `Need help` or `Request review` that creates a typed `portal_escalation` record with category, reason, severity, sensitivity, assignee, SLA due date, resolution summary, and `open/in_review/resolved/referred` status instead of only a generic thread.
- `Concrete nonprofit-manager landing zone:` `frontend/src/features/portal/pages/PortalCaseDetailPage.tsx`, `backend/src/modules/portal/services/portalMessagingService.validation.ts`, `backend/src/services/portalPointpersonService.ts`
- `Persona implication:` case managers and rehab workers get explicit triage queues; clients get a clearer self-service path than `send a message and hope`.
- `Phase/backlog linkage:` `P5-T5`
- `Outcome:` `borrow now`
- `Guardrail:` do not import a full grievance, helpdesk, appeal, or program-payment dispute module; keep the first slice case-scoped and portal-access-controlled.

## Queue For `P5-T6`

### `PAT-07` Typed appeal or campaign record spanning email and donation intake

- `Borrowable pattern:` a first-class appeal or campaign record that threads attribution through email, public forms, recurring gifts, and dashboards instead of reducing everything to provider payloads or free-text labels.
- `Source paths:` `reference-repos/external/nm--civicrm-core/CRM/Campaign/BAO/Campaign.php`, `reference-repos/external/nm--civicrm-core/ext/civi_campaign/managed/SavedSearch_Administer_Campaigns.mgd.php`, `reference-repos/external/nm--civicrm-core/CRM/Contribute/DAO/ContributionPage.php`, `reference-repos/external/nm--suitecrm/modules/CampaignLog/vardefs.php`, `reference-repos/external/nm--suitecrm/modules/Campaigns/PopupCampaignRoi.php`
- `Repo truth delta:` nonprofit-manager currently splits campaign intent across provider-native Mailchimp campaigns and a `campaign_name` string on donations and recurring plans; public donation forms can pass campaign metadata, but it flattens into attribution text rather than a shared appeal record.
- `Smallest adoptable slice:` introduce a lightweight local appeal or campaign record with owner, objective, audience reference, provider campaign ID, and donation/public-form attribution key while keeping Mailchimp as the delivery engine; later add a provider-fed campaign event ledger for targeted, sent, bounced/cleaned, unsubscribed, failed, and provider-reported open/click summary events.
- `Concrete nonprofit-manager landing zone:` `backend/src/modules/mailchimp/services/mailchimpService.ts`, `backend/src/services/publishing/publicWebsiteFormService.ts`, `frontend/src/features/mailchimp/pages/EmailMarketingPage.tsx`
- `Persona implication:` fundraisers get one object tying outreach and revenue together; leadership gets cleaner appeal ROI instead of stitching Mailchimp and donation reports manually.
- `Phase/backlog linkage:` `P5-T6`
- `Outcome:` `queue for P5-T6`
- `Guardrail:` do not create a self-hosted tracking pixel or privacy-invasive tracking layer; rely on provider summaries or webhooks and consent posture.

### `PAT-08` Narrow workflow-rule registry for one domain seam at a time

- `Borrowable pattern:` a narrow workflow-rule registry with typed trigger timing, conditions, actions, and processed guards for status-driven operations.
- `Source paths:` `reference-repos/external/nm--suitecrm/modules/AOW_WorkFlow/AOW_WorkFlow.php`, `reference-repos/external/nm--suitecrm/modules/AOW_WorkFlow/vardefs.php`
- `Repo truth delta:` nonprofit-manager already has meaningful state logic for opportunities and portal appointments, but those transitions are hard-coded per domain and are not reusable or admin-owned.
- `Smallest adoptable slice:` add a typed transition registry for one seam only, preferably portal appointments or case lifecycle transitions, with trigger, guard, side effects, and audit storage. Do not start with a general builder UI.
- `Concrete nonprofit-manager landing zone:` `backend/src/modules/portalAdmin/services/portalAppointmentStatusWorkflow.ts`, `backend/src/modules/cases/queries/lifecycleQueries.ts`, `backend/src/modules/opportunities/**`
- `Persona implication:` nonprofit administrators get safer automation; case managers and rehab workers get clearer, less brittle status side effects.
- `Phase/backlog linkage:` `P5-T6`
- `Outcome:` `queue for P5-T6`

### `PAT-09` Typed restriction kernel with validated designations and account defaults

- `Borrowable pattern:` a finance restriction kernel with canonical fund/designation records, default account mapping, active/report/receipt flags, and write-time validation for required or restricted dimensions instead of treating `designation` as free text.
- `Source paths:` `reference-repos/external/nm--erpnext/erpnext/accounts/doctype/accounting_dimension/accounting_dimension.py`, `reference-repos/external/nm--erpnext/erpnext/accounts/doctype/accounting_dimension_filter/accounting_dimension_filter.py`, `reference-repos/external/nm--erpnext/erpnext/accounts/doctype/gl_entry/gl_entry.py`, `reference-repos/external/nm--openpetra/db/petra.xml`, `reference-repos/external/nm--openpetra/js-client/src/forms/Finance/Setup/Gift/Motivations.html`
- `Repo truth delta:` nonprofit-manager can store and report `designation`, but it remains a free-text attribute in donations and recurring plans, with no typed restriction model, no allowed-value/default system, and no enforced account coupling even though the roadmap already calls out typed appeals/restrictions and project-restricted donation handling.
- `Smallest adoptable slice:` introduce a `fund_designations` or equivalent config table with optional default GL/fund mapping, restricted marker, receipt/report flags, and validator hooks on donation, recurring-plan, public donation intake, and report query paths.
- `Concrete nonprofit-manager landing zone:` `backend/src/types/donation.ts`, `backend/src/types/recurringDonation.ts`, `backend/src/modules/donations/services/donationService.ts`, `backend/src/modules/reports/services/reportQueryPlanner.ts`
- `Persona implication:` fundraisers and nonprofit administrators get real restricted-gift safeguards instead of cleanup after entry or reporting.
- `Phase/backlog linkage:` `P5-T6`
- `Outcome:` `queue for P5-T6`
- `Guardrail:` reject ERPNext's dynamic custom-field engine and OpenPetra's full ledger taxonomy; use explicit TypeScript types and narrow validator hooks.

### `PAT-10` Donation batch posting with control totals and finance close boundary

- `Borrowable pattern:` staff-facing donation batch posting with control totals, effective dates, payment method, staged import rows, default bank or cost-centre resolution, and a clear `draft` vs `closed` review boundary before finance treats the batch as locked.
- `Source paths:` `reference-repos/external/nm--openpetra/csharp/ICT/Petra/Server/lib/MFinance/Gift/Gift.Batch.cs`, `reference-repos/external/nm--openpetra/csharp/ICT/Petra/Server/lib/MFinance/Gift/Gift.Transactions.cs`, `reference-repos/external/nm--openpetra/csharp/ICT/Petra/Server/lib/MFinance/BankImport/Matching.cs`, `reference-repos/external/nm--openpetra/csharp/ICT/Testing/lib/MFinance/server/Gift/PostGiftBatch.test.cs`, `reference-repos/external/nm--openpetra/db/petra.xml`
- `Repo truth delta:` nonprofit-manager has per-donation records and provider reconciliation, but no internal batch object for cash or check entry, no control total, and no posting boundary between fundraising intake and finance confirmation.
- `Smallest adoptable slice:` add `donation_batches` with `status`, `effective_date`, `control_total`, `bank_account`, exception preview, and linked donations for offline gift entry, even if true GL posting stays deferred; later allow imported statement rows to stage into draft batches for manual review.
- `Concrete nonprofit-manager landing zone:` `backend/src/modules/donations/services/donationService.ts`, `backend/src/modules/reconciliation/controllers/reconciliationController.ts`, `frontend/src/features/finance/**`
- `Persona implication:` fundraisers can enter gifts in operational batches while admins or finance staff review and close them cleanly.
- `Phase/backlog linkage:` `P5-T6`
- `Outcome:` `queue for P5-T6`
- `Guardrail:` do not imply GL posting, period close, accounting-suite parity, or automatic bank matching; closed means internally reviewed and locked.

### `PAT-11` Membership as a typed lifecycle instead of a contact-role inference

- `Borrowable pattern:` membership as a first-class lifecycle with visible status rules, renewal UX, payment or service evidence, and a dedicated data model while keeping volunteer as its own typed record.
- `Source paths:` `reference-repos/external/nm--civicrm-core/CRM/Member/Form/MembershipBlock.php`, `reference-repos/external/nm--civicrm-core/CRM/Member/Form/MembershipRenewal.php`, `reference-repos/external/nm--civicrm-core/CRM/Member/BAO/MembershipType.php`, `reference-repos/external/nm--civicrm-core/ext/civicrm_admin_ui/managed/SavedSearch_Contact_Summary_Memberships.mgd.php`, `reference-repos/external/nm--openpetra/db/petra.xml`, `reference-repos/external/nm--erpnext/erpnext/patches/v13_0/rename_membership_settings_to_non_profit_settings.py`, `reference-repos/external/nm--erpnext/erpnext/patches/v13_0/update_subscription_status_in_memberships.py`
- `Repo truth delta:` nonprofit-manager already documents that no first-class membership domain exists; staff currently infer recurring constituent commitment from contacts, donations, recurring plans, opportunities, and communications, while `Member` is still just a contact role.
- `Smallest adoptable slice:` add a membership catalog plus typed contact membership records with `membership_type`, `status`, `start/end`, `renewal_due_at`, and linked contribution, recurring-plan, or service-evidence references, then surface them read-only in the contact hub before building public join/renew.
- `Concrete nonprofit-manager landing zone:` a new membership module adjacent to donations and recurring plans, plus `frontend/src/features/contacts/pages/ContactDetailPage.tsx`
- `Persona implication:` fundraisers, membership coordinators, and nonprofit administrators get renewal and lapse control without overloading the volunteer model.
- `Phase/backlog linkage:` `P5-T6`
- `Outcome:` `queue for P5-T6`
- `Guardrail:` namespace carefully away from user memberships and contact roles; do not start with public join or renew UX before typed internal records exist.

### `PAT-12` Typed service-point routing on case services and appointments

- `Borrowable pattern:` first-class service sites with operational state, provider affiliation, area, service categories, active/disabled reason, routing identity, and version metadata, used by frontline service delivery instead of free-text locations.
- `Source paths:` `reference-repos/external/nm--openspp2/spp_service_points/README.rst`, `reference-repos/external/nm--openspp2/spp_service_points/readme/DESCRIPTION.md`, `reference-repos/external/nm--openspp2/spp_service_points/models/registrant.py`, `reference-repos/external/nm--openspp2/spp_api_v2_service_points/services/service_point_service.py`
- `Repo truth delta:` portal appointments currently expose only `location`, case, and pointperson, while case services still lean on provider text plus optional provider id; the current backlog synthesis already calls service-point routing absent.
- `Smallest adoptable slice:` add an optional typed `service_site` reference and snapshot label/status on case services and appointment slots while keeping the current free-text `location` fallback.
- `Concrete nonprofit-manager landing zone:` `backend/src/modules/portalAdmin/services/portalAppointmentSlotService.ts`, `backend/src/modules/portal/mappers/portalMappers.ts`, `frontend/src/components/cases/CaseServices.tsx`
- `Persona implication:` rehab workers and case managers get cleaner routing, fewer ambiguous handoffs, and better continuity when multiple delivery sites exist.
- `Phase/backlog linkage:` `P5-T6`
- `Outcome:` `queue for P5-T6`
- `Guardrail:` do not add service-point OAuth, service-point users, or contract lifecycle in the first slice; preserve the current free-text fallback.

### `PAT-13` Domain-scoped approval loops inside case-form review before any generic kernel

- `Borrowable pattern:` explicit `submit`, `pending`, `needs_revision`, `approve`, and `reject` states with review comments, due/SLA metadata, reviewer history, optimistic versioning, and closure side-effect semantics on service-authorizing workflows, but only inside a concrete domain first.
- `Source paths:` `reference-repos/external/nm--openspp2/spp_approval/readme/DESCRIPTION.md`, `reference-repos/external/nm--openspp2/spp_approval/models/approval_mixin.py`, `reference-repos/external/nm--openspp2/spp_approval/models/approval_definition_multitier.py`
- `Repo truth delta:` nonprofit-manager already has narrow review states in case-form review, but the current path still ends at `reviewed | closed | cancelled`; it does not yet expose revision requests, approver queues, or shared approval primitives, and the current product plus backlog docs already frame approvals as later-wave work.
- `Smallest adoptable slice:` extend case-form review into `submitted -> pending_review -> needs_revision|reviewed` with review notes, reviewer history, due-by timestamps, and explicit linked follow-up or response-action closure semantics; defer any generic approval engine until a second domain proves reuse.
- `Concrete nonprofit-manager landing zone:` `frontend/src/types/caseForms.ts`, `backend/src/modules/cases/usecases/caseForms.usecase.staff.ts`, `backend/src/modules/cases/repositories/caseFormsRepository.ts`
- `Persona implication:` nonprofit administrators and case managers get clearer rework loops; portal users get a clearer answer than `submitted but maybe still unresolved`.
- `Phase/backlog linkage:` `P5-T6`
- `Outcome:` `queue for P5-T6`
- `Guardrail:` do not build dynamic approver rules, CEL, multi-tier admin UI, or a generic approval engine first.

### `PAT-14` Volunteer dispatch ergonomics with active task/event pickers and skill-fit cues

- `Borrowable pattern:` dispatcher-friendly volunteer coordination that filters active work by event, task, status, location, and skill fit instead of making staff type raw record ids.
- `Source paths:` `reference-repos/external/nm--sahana-eden/controllers/project.py`, `reference-repos/external/nm--sahana-eden/modules/s3db/project.py`, `reference-repos/external/nm--sahana-eden/modules/s3db/hrm.py`
- `Repo truth delta:` nonprofit-manager already stores skills, availability, and hours and even exposes skill matching, but the current assignment form still asks staff to type raw `event_id` and `task_id`, and the volunteer detail page is history-oriented rather than dispatch-oriented.
- `Smallest adoptable slice:` replace raw UUID entry with searchable task and event pickers limited to active records, then rank or badge matches using the repo’s existing skill-search and availability capability before assignment is saved.
- `Concrete nonprofit-manager landing zone:` `frontend/src/components/AssignmentForm.tsx`, `frontend/src/features/volunteers/pages/VolunteerDetailPage.tsx`, `frontend/src/features/volunteers/api/volunteersApiClient.ts`
- `Persona implication:` volunteer coordinators and frontline leads can dispatch faster and with fewer coordination mistakes; this also sets up better volunteer self-service later.
- `Phase/backlog linkage:` `P5-T6`
- `Outcome:` `borrow now`
- `Guardrail:` do not transplant Sahana Eden's project/task/dispatch model, SMS/OpenGeoSMS, or credentialing system; reuse the existing volunteer assignment contract.

## Reject For Now

### `PAT-15` Generic studio/custom-field builder as the first workflow move

- `Borrowable pattern:` reject no-code custom fields and change-request builders as the first workflow move; allow only later typed request/detail models with explicit mappings and audit history if a concrete domain proves the need.
- `Source paths:` `reference-repos/external/nm--openspp2/spp_custom_field/`, `reference-repos/external/nm--openspp2/spp_change_request_v2/README.rst`, `reference-repos/external/nm--openspp2/spp_change_request_v2/models/change_request_type.py`, `reference-repos/external/nm--openspp2/spp_studio_change_requests/models/studio_change_request_type.py`, `reference-repos/external/nm--erpnext/erpnext/patches/v13_0/non_profit_deprecation_warning.py`, `reference-repos/external/nm--erpnext/erpnext/patches/v14_0/delete_non_profit_doctypes.py`
- `Repo truth delta:` nonprofit-manager already has bounded configuration seams and domain-specific approvals, but there is still not enough proof that a generic builder would fit the current TypeScript/React/Express architecture or Phase 5 sequencing.
- `Smallest adoptable slice:` reject a generic builder in this wave; preserve domain-scoped approvals, website-form overrides, typed backlog briefs, and explicit migration-backed DTOs instead of widening into a new admin platform. Also reject direct ERPNext nonprofit parity claims from the local clone because nonprofit-domain code is deprecated or removed there.
- `Concrete nonprofit-manager landing zone:` none in wave one
- `Persona implication:` rejecting this now avoids administrator overload, unclear data ownership, and premature platform work that would compete with current product waves.
- `Phase/backlog linkage:` `P5-T6`
- `Outcome:` `reject`
- `Guardrail:` no runtime metadata builder, generated schema/views, generic workflow studio, direct ERPNext nonprofit surface copying, or direct GPL/AGPL/LGPL source copying.
