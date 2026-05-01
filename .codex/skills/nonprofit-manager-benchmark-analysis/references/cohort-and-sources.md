# Cohort And Sources

This file is the canonical detailed benchmark cohort for persona-aware nonprofit CRM comparison.

All source links below were accessed on `2026-04-20`.

## Local Reference Repo Store

- Use `$use-reference-repos` for central corpus lookup and start from `/Users/bryan/projects/reference-repos/docs/index.json`; it is the live source of truth for current membership and paths.
- Use `docs/reference-repos.md` for the current local storage contract.
- Use `/Users/bryan/projects/reference-repos/repos/<owner>__<repo>` for source-level review and `/Users/bryan/projects/reference-repos/docs/<owner>__<repo>.md` for central per-repo notes.
- Use `reference-repos/external/nm--<slug>` only when older repo-local docs, check matrices, or source-path notes already point there; those paths are compatibility aliases.
- Treat `reference-repos/manifest.lock.json` as the repo-local policy lock for nonprofit-manager reference waves, including license, license-risk, source-family, domain, and reuse-class guardrails.
- Treat historical reports such as `/Users/bryan/projects/reference-repos/docs/final-report.md` as migration evidence, not as the current repo count.
- Keep official web sources first for current product claims; use local clones for source-backed implementation pattern review and license/reuse classification.

## Governance And Revenue Lens

| Product | Why it matters | Key user surfaces | Representative workflows | Implied personas | Borrowable patterns | Official sources |
|---|---|---|---|---|---|---|
| CiviCRM | Strongest nonprofit-native breadth across contacts, donations, memberships, events, cases, and mailings | Contact hub, dashboards, contribution pages, event registration, membership sign-up, case management, groups and mailings, reports | Contact-centric fundraising, online giving, event follow-up, membership renewal, case activities, targeted mailings | Fundraising staff, membership coordinator, event organizer, case worker, communications staff, sysadmin | Contact hub with tabs, public forms feeding one constituent record, dashboarded operational reporting, segmentation and group targeting | [What is CiviCRM](https://docs.civicrm.org/user/en/latest/introduction/what-is-civicrm/), [What is CiviCase](https://docs.civicrm.org/user/en/latest/case-management/what-is-civicase/), [Membership sign-up](https://docs.civicrm.org/user/en/latest/membership/online-membership-sign-up/), [Campaign everyday tasks](https://docs.civicrm.org/user/en/latest/campaign/everyday-tasks/) |
| OpenPetra | Nonprofit administration and donation-processing benchmark with explicit finance and partner operations | Partner/contact management, finance and donation entry, contact-module setup, system manager | Maintain partner records, batch donation intake, project-specific donation assignment, publication lists, local permission setup | Contact admin staff, donation processor, finance/bookkeeping staff, publications coordinator, system administrator | Batch-oriented donation intake, contact categories and consents, setup checklists, explicit finance controls | [Docs home](https://docs.openpetra.org/), [Process Donations](https://docs.openpetra.org/howtos/finance-donations.html), [Contact module config](https://docs.openpetra.org/howtos/initial-contact-setup.html) |
| ERPNext for Nonprofits | Broad typed nonprofit domain on top of ERP and accounting foundations | Non Profit module pages for donors, members, volunteers, donations, grants, and website signup | Create donor/member/volunteer records, record donations and payment entries, membership billing, public sign-up, grants review | Nonprofit ops admin, donor manager, membership manager, volunteer coordinator, finance staff, chapter or program lead | Typed entities, payment automation, public signup, explicit links between relationship records and accounting | [ERPNext for nonprofits](https://frappe.io/erpnext/for-non-profits), [Non Profit introduction](https://docs.frappe.io/erpnext/v12/user/manual/en/non_profit/introduction), [Member](https://docs.frappe.io/erpnext/v13/user/manual/en/non_profit/member), [Volunteer](https://docs.frappe.io/erpnext/v13/user/manual/en/non_profit/volunteer), [Membership](https://docs.frappe.io/erpnext/v14/user/manual/en/non_profit/membership) |
| SuiteCRM | Mature open-source CRM benchmark for campaigns, workflows, dashboards, reports, and list-view productivity | Dashboards, list/detail/edit views, contacts, cases, reports, workflows, portal-enabled case pages, campaigns and email | Manage records from list views, qualify leads, automate routing, send campaigns, review case threads, build reports | CRM admin, relationship manager, support or case agent, portal user, analyst, manager | Bulk list actions, workflow rules, portal-enabled case collaboration, dashboard tiles, campaign and email tracking | [User guide](https://docs.suitecrm.com/user/), [Workflows](https://docs.suitecrm.com/user/advanced-modules/workflow/), [Campaigns](https://docs.suitecrm.com/8.x/user/modules/_campaigns/), [Home page](https://docs.suitecrm.com/user/introduction/user-interface/home-page/) |

## Planning-Only Candidate References

| Product | Why it matters | Reuse boundary |
|---|---|---|
| Apache Fineract | Maker-checker, accounting-control, job, and reporting discipline for future finance/governance rows | Apache-2.0 and lower license risk, but avoid lending/core-banking model adoption |
| Blnk | Ledger API vocabulary, reconciliation boundaries, balance projections, and idempotent finance-event handling | Apache-2.0 and lower license risk, but do not transplant a ledger module |
| LedgerSMB | GL, reconciliation, invoice/export, and report vocabulary comparison | GPL-2.0; reference-only, no source copying |
| DocuSeal | Signature templates, submissions, evidence state, and webhook proof comparison | AGPL-3.0 with additional terms; reference-only, no source copying |

Twenty is only a proposed modern CRM UX candidate until a separate official-source/license refresh adds it to the central store and local manifest.

## Service Delivery And Program Operations Lens

| Product | Why it matters | Key user surfaces | Representative workflows | Implied personas | Borrowable patterns | Official sources |
|---|---|---|---|---|---|---|
| OpenSPP | Strong benchmark for registry, eligibility, approvals, case management, service points, and grievance handling | Registry search, program and cycle screens, approvals, case management, service points, grievance portal, admin access control | Register and enroll beneficiaries, prepare entitlements, approve payments, open or close cases, manage service points, submit and track grievances | Registry officer, program manager, case worker, approver, supervisor, beneficiary, system admin | Explicit workflow states, service-point routing, approvals, area-scoped roles, self-service grievance tracking, privacy-aware search | [User guide](https://docs.openspp.org/user_guide/), [Approvals](https://docs.openspp.org/user_guide/approvals/), [Core case management workflow](https://docs.openspp.org/user_guide/case_management/core_workflow), [GRM feature](https://docs.openspp.org/v2.0/products/features/grievance_redress.html), [Access control](https://docs.openspp.org/v2.0/ops_guide/security/access_control.html) |
| Sahana Eden | Service coordination and volunteer-operations benchmark with strong field-work and resource-management patterns | Volunteer management, volunteer self-service tasks, project and location linkage, resource and logistics views, reports and exports | Add volunteer records, track skills and credentials, create projects, assign tasks, reassign work, manage field-ready rosters | Volunteer coordinator, project manager, responder, organization admin, volunteer | Volunteer and task console, location-aware coordination, rich people records, lightweight self-service, easy reporting and exports | [Sahana Foundation Eden](https://sahanafoundation.org/eden/), [Volunteer guidelines](https://eden.sahanafoundation.org/wiki/UserGuidelines/Volunteers), [Volunteer management guidelines](https://eden.sahanafoundation.org/wiki/UserGuidelinesVolMng), [BlueprintVolunteer](https://eden.sahanafoundation.org/wiki/BluePrintVolunteer) |

## Usage Notes

- Use CiviCRM as the nonprofit-native breadth benchmark.
- Use OpenPetra and ERPNext to sharpen expectations around finance, typed records, and administrative rigor.
- Use SuiteCRM to sharpen workflow, dashboard, campaign, and list-productivity patterns.
- Use OpenSPP and Sahana Eden to sharpen service-delivery, case, grievance, volunteer, and field-operations thinking.

## Persona Lens Crosswalk

| Persona family | Best-fit benchmark products | Precision reminder |
|---|---|---|
| Executive, governance, and board oversight | CiviCRM, OpenPetra, SuiteCRM | Use these for packet, dashboard, and finance-control expectations, not for claiming full governance parity |
| Fundraising and donor stewardship | CiviCRM, ERPNext, OpenPetra, SuiteCRM | Use these for constituent, donation, and campaign patterns, not for overstating donor-governance completion |
| Administrative and access stewardship | OpenPetra, ERPNext, SuiteCRM, CiviCRM | Use these for setup rigor, typed records, and admin workflow precision, not for assuming a compliance vault exists |
| Case and service delivery | OpenSPP, CiviCRM, Sahana Eden | Use these for staged cases, follow-up continuity, and field/service coordination, not for assuming rehab-specific templates exist |
