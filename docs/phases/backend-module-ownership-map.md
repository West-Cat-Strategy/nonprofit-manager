# Backend Module Ownership Map (Compatibility-Aware)

**Updated:** March 11, 2026

## Module-owned contract boundaries (canonical)

| Domain | Canonical module | Module entrypoint | Route/controller/service ownership | Notes |
| --- | --- | --- | --- | --- |
| accounts | `backend/src/modules/accounts` | `backend/src/modules/accounts/index.ts` | `index.ts` and `routes/index.ts` | Module-local controllers/services are source-of-truth for account lifecycle and admin-facing flows. |
| activities | `backend/src/modules/activities` | `backend/src/modules/activities/index.ts` | `index.ts` and `routes/index.ts` | Module-local activity timeline surface now owns feed and activity details. |
| admin | `backend/src/modules/admin` | `backend/src/modules/admin/index.ts` | `index.ts` and `routes/index.ts` | Module-local admin settings, auditing, and outcome-definition surfaces. |
| alerts | `backend/src/modules/alerts` | `backend/src/modules/alerts/index.ts` | `index.ts` and `routes/index.ts` | Module-local alert rule lifecycle and delivery surfaces. |
| analytics | `backend/src/modules/analytics` | `backend/src/modules/analytics/index.ts` | `index.ts` and `routes/index.ts` | Analytics queries/reports owned by module-level services and controllers. |
| auth | `backend/src/modules/auth` | `backend/src/modules/auth/index.ts` | `index.ts` and `routes/index.ts` | Authentication/session/profile/passkey controllers remain module-owned. |
| backup | `backend/src/modules/backup` | `backend/src/modules/backup/index.ts` | `index.ts` and `routes/index.ts` | Backup/restore controls and reporting are module-owned. |
| cases | `backend/src/modules/cases` | `backend/src/modules/cases/index.ts` | `index.ts` and `routes/index.ts` | Case lifecycle routes/controllers owned by module package. |
| contacts | `backend/src/modules/contacts` | `backend/src/modules/contacts/index.ts` | `index.ts` and `routes/index.ts` | Contact detail/relationship/document/email/phone surfaces are module-owned. |
| dashboard | `backend/src/modules/dashboard` | `backend/src/modules/dashboard/index.ts` | `index.ts` and `routes/index.ts` | Dashboard aggregations and permissions remain module-owned. |
| donations | `backend/src/modules/donations` | `backend/src/modules/donations/index.ts` | `index.ts` and `routes/index.ts` | Donation list/detail/mutation and reporting integrations are module-owned. |
| events | `backend/src/modules/events` | `backend/src/modules/events/index.ts` | `index.ts` and `routes/index.ts` | Includes public/legacy events route surfaces; module owns registrations, reminders, and public entrypoints. |
| export | `backend/src/modules/export` | `backend/src/modules/export/index.ts` | `index.ts` and `routes/index.ts` | Export job/reporting interfaces remain module-owned. |
| externalServiceProviders | `backend/src/modules/externalServiceProviders` | `backend/src/modules/externalServiceProviders/index.ts` | `index.ts` and `routes/index.ts` | External service provider CRUD and provider metadata remain module-owned. |
| followUps | `backend/src/modules/followUps` | `backend/src/modules/followUps/index.ts` | `index.ts` and `routes/index.ts` | Follow-up operations are module-owned. |
| ingest | `backend/src/modules/ingest` | `backend/src/modules/ingest/index.ts` | `index.ts` and `routes/index.ts` | Ingestion pipeline entrypoints remain module-owned. |
| invitations | `backend/src/modules/invitations` | `backend/src/modules/invitations/index.ts` | `index.ts` and `routes/index.ts` | Invitation handling and role sync remain module-owned. |
| mailchimp | `backend/src/modules/mailchimp` | `backend/src/modules/mailchimp/index.ts` | `index.ts` and `routes/index.ts` | Mailchimp integration and settings remain module-owned. |
| meetings | `backend/src/modules/meetings` | `backend/src/modules/meetings/index.ts` | `index.ts` and `routes/index.ts` | Meeting lifecycle and meeting-service integration are module-owned. |
| opportunities | `backend/src/modules/opportunities` | `backend/src/modules/opportunities/index.ts` | `index.ts` and `routes/index.ts` | Opportunity lifecycle, stage management, and pipeline transitions are module-owned. |
| payments | `backend/src/modules/payments` | `backend/src/modules/payments/index.ts` | `index.ts` and `routes/index.ts` | Payment intent/config/lifecycle flows are module-owned; bootstrap `setPaymentPool` moved here. |
| plausibleProxy | `backend/src/modules/plausibleProxy` | `backend/src/modules/plausibleProxy/index.ts` | `index.ts` and `routes/index.ts` | Plausible proxy endpoints are module-owned. |
| portal | `backend/src/modules/portal` | `backend/src/modules/portal/index.ts` | `index.ts` and `routes/index.ts` | Portal app/document/case/message/event/client workflows are module-owned. |
| portalAdmin | `backend/src/modules/portalAdmin` | `backend/src/modules/portalAdmin/index.ts` | `index.ts` and `routes/index.ts` | Portal admin workflows are module-owned. |
| portalAuth | `backend/src/modules/portalAuth` | `backend/src/modules/portalAuth/index.ts` | `index.ts` and `routes/index.ts` | Portal auth flows and activity logging are module-owned. |
| publicReports | `backend/src/modules/publicReports` | `backend/src/modules/publicReports/index.ts` | `index.ts` and `routes/index.ts` | Public report share/download surface is module-owned. |
| publishing | `backend/src/modules/publishing` | `backend/src/modules/publishing/index.ts` | `index.ts` and `routes/index.ts` | Website publishing, public forms, and site runtime integration remain module-owned. |
| reconciliation | `backend/src/modules/reconciliation` | `backend/src/modules/reconciliation/index.ts` | `index.ts` and `routes/index.ts` | Finance reconciliation handlers and dashboard surfaces are module-owned. |
| reports | `backend/src/modules/reports` | `backend/src/modules/reports/index.ts` | `index.ts` and `routes/index.ts` | Reporting and workflow coverage surfaces remain module-owned. |
| savedReports | `backend/src/modules/savedReports` | `backend/src/modules/savedReports/index.ts` | `index.ts` and `routes/index.ts` | Saved-report creation, sharing, and lifecycle are module-owned. |
| scheduledReports | `backend/src/modules/scheduledReports` | `backend/src/modules/scheduledReports/index.ts` | `index.ts` and `routes/index.ts` | Scheduled report jobing and CRUD ownership remains in module. |
| tasks | `backend/src/modules/tasks` | `backend/src/modules/tasks/index.ts` | `index.ts` and `routes/index.ts` | Task management surfaces are module-owned. |
| teamChat | `backend/src/modules/teamChat` | `backend/src/modules/teamChat/index.ts` | `index.ts` and `routes/index.ts` | Team chat features and message routes are module-owned. |
| templates | `backend/src/modules/templates` | `backend/src/modules/templates/index.ts` | `index.ts` and `routes/index.ts` | Template CRUD/build surfaces are module-owned. |
| users | `backend/src/modules/users` | `backend/src/modules/users/index.ts` | `index.ts` and `routes/index.ts` | User profile/permission settings and auth-bridge helpers remain module-owned. |
| volunteers | `backend/src/modules/volunteers` | `backend/src/modules/volunteers/index.ts` | `index.ts` and `routes/index.ts` | Volunteer listing/assignment/matching surfaces are module-owned. |
| webhooks | `backend/src/modules/webhooks` | `backend/src/modules/webhooks/index.ts` | `index.ts` and `routes/index.ts` | Webhook delivery and management surfaces are module-owned. |

## Finance aggregate mapping

Financial feature ownership is split across module domains below; the `finance` product area is a composition surface, not a single module.

- `backend/src/modules/donations` (donation surfaces)
- `backend/src/modules/reconciliation` (reconciliation surfaces)
- `backend/src/modules/payments` (payment intent/checkout surfaces)

## Compatibility shims expected in this phase

- `backend/src/controllers/paymentController.ts` should remain a thin re-export shim.
- `backend/src/controllers/domains/index.ts` and `backend/src/controllers/domains/operations/index.ts` should stay compatibility-only.
- `backend/src/routes/payments.ts` and related legacy route surfaces remain compatibility adapters with v1 deprecation headers only.

## Active task ownership context

- Current cleanup stream for this map is tracked as `P4-T1R7` in `docs/phases/planning-and-progress.md`.
- Removals are allowed only when route/controller consumers fully migrate to module entrypoints and policy baselines are green.
