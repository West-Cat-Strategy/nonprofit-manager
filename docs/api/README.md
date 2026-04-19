# API Documentation Index

**Last Updated:** 2026-04-19

Use this file as the entry point for active Nonprofit Manager API documentation. When route summaries need confirmation, verify them against [../../backend/src/routes/v2/index.ts](../../backend/src/routes/v2/index.ts) and the mounted module route files under `backend/src/modules/**/routes/`.

For contributor navigation, follow [../../CONTRIBUTING.md](../../CONTRIBUTING.md) -> [../development/GETTING_STARTED.md](../development/GETTING_STARTED.md) -> [../development/CONVENTIONS.md](../development/CONVENTIONS.md) -> [../development/AGENT_INSTRUCTIONS.md](../development/AGENT_INSTRUCTIONS.md) -> [../testing/TESTING.md](../testing/TESTING.md) -> [../README.md](../README.md) before diving into API-specific docs.

## Quick Navigation

| Area | Scope | Source Docs | Representative Paths |
|---|---|---|---|
| Authentication & Session | Staff auth, portal auth, bootstrap, preferences | [API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md#authentication), [openapi.yaml](openapi.yaml) | `/api/v2/auth/*`, `/api/v2/portal/auth/*` |
| Dashboard & Alerts | Dashboard configs, alert configs, alert instances, stats | [API_REFERENCE_DASHBOARD_ALERTS.md](API_REFERENCE_DASHBOARD_ALERTS.md) | `/api/v2/dashboard/configs*`, `/api/v2/alerts/configs*` |
| Events | Staff events, registrations, reminders, public events | [API_REFERENCE_EVENTS.md](API_REFERENCE_EVENTS.md) | `/api/v2/events/*`, `/api/v2/public/events/*` |
| Portal Appointments | Portal booking plus admin reminder/check-in flows | [API_REFERENCE_PORTAL_APPOINTMENTS.md](API_REFERENCE_PORTAL_APPOINTMENTS.md) | `/api/v2/portal/appointments*`, `/api/v2/portal/admin/appointments*` |
| Administration | Branding, organization settings, roles, permissions, groups, access, registration settings | [openapi.yaml](openapi.yaml) | `/api/v2/admin/*` |
| Reporting & Exports | Report generation, small synchronous exports, async export jobs, templates, analytics exports | [API_REFERENCE_EXPORT.md](API_REFERENCE_EXPORT.md), [../features/REPORTING_GUIDE.md](../features/REPORTING_GUIDE.md) | `/api/v2/reports/*`, `/api/v2/export/*` |
| Analytics | Summary, account/contact metrics, trend analysis, anomalies | [openapi.yaml](openapi.yaml) | `/api/v2/analytics/*` |
| Payments & Integrations | Payments, reconciliation, Mailchimp, webhooks | [API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md) | `/api/v2/payments/*`, `/api/v2/mailchimp/*`, `/api/v2/webhooks/*` |
| Backup | Admin-triggered backup export | [API_REFERENCE_BACKUP.md](API_REFERENCE_BACKUP.md) | `/api/v2/backup/export` |
| Tooling | Machine-readable schema and Postman workflow | [openapi.yaml](openapi.yaml), [postman/README.md](postman/README.md) | n/a |

## Mounted `/api/v2` Summary

These route families are mounted by the active v2 registrar:

- Auth and portal auth: `/api/v2/auth/*`, `/api/v2/portal/auth/*`
- Admin: `/api/v2/admin/*`
- Dashboard: `/api/v2/dashboard/configs`, `/api/v2/dashboard/configs/default`, `/api/v2/dashboard/configs/:id`, `/api/v2/dashboard/configs/:id/layout`
- Alerts: `/api/v2/alerts/configs*`, `/api/v2/alerts/instances*`, `/api/v2/alerts/stats`, `/api/v2/alerts/test`
- Events: `/api/v2/events/*`, `/api/v2/public/events/*`
- Reports: `/api/v2/reports/generate`, `/api/v2/reports/outcomes`, `/api/v2/reports/workflow-coverage`, `/api/v2/reports/fields/:entity`, `/api/v2/reports/export`, `/api/v2/reports/exports*`, `/api/v2/reports/templates*`
  `/api/v2/reports/export` stays synchronous for small exports only and returns `409` when the result is too large; use `/api/v2/reports/exports` for queued export jobs.
- Analytics: `/api/v2/analytics/summary`, `/api/v2/analytics/accounts/:id/*`, `/api/v2/analytics/contacts/:id/*`, `/api/v2/analytics/trends/*`, `/api/v2/analytics/comparative`, `/api/v2/analytics/anomalies/:metricType`
- Export helpers: `/api/v2/export/analytics-summary`, `/api/v2/export/donations`, `/api/v2/export/volunteer-hours`, `/api/v2/export/events`, `/api/v2/export/comprehensive`
- Payments: `/api/v2/payments/config`, `/api/v2/payments/intents*`, `/api/v2/payments/refunds`, `/api/v2/payments/customers*`, `/api/v2/payments/webhook`
- Backup: `/api/v2/backup/export`
- Integrations and providers: `/api/v2/mailchimp/*`, `/api/v2/webhooks/*`, `/api/v2/reconciliation/*`, `/api/v2/external-service-providers/*`

Use the feature-specific docs for request and response details. This file is the navigation layer, not the full endpoint reference.

## Base URLs And Auth

- Primary direct-backend base URL: `http://localhost:3000/api/v2`
- Docker dev alternative: `http://localhost:8004/api/v2`
- Browser proxy alternative: `/api/v2` when using the Docker dev frontend at `http://localhost:8005`
- Legacy application endpoints outside `/api/v2/*` are retired except for the documented health aliases and explicit compatibility/tombstone flows

Authentication expectations:

- Direct API clients typically use `Authorization: Bearer <JWT_TOKEN>`
- Staff browser shells bootstrap through `GET /api/v2/auth/bootstrap`
- Portal browser shells bootstrap through `GET /api/v2/portal/auth/bootstrap`

See [API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md#authentication) for auth flow details.

## Response Format

Active API docs should assume the canonical envelope shapes:

**Success**

```json
{
  "success": true,
  "data": {}
}
```

**Error**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description"
  }
}
```
Additional `details` or validation-specific fields may appear on some error responses where the endpoint docs call them out explicitly.

## Tooling

- [openapi.yaml](openapi.yaml) is the machine-readable schema for editor tooling, code generation, and schema-aware validation.
- [postman/README.md](postman/README.md) explains the bundled Postman collection and environment files.
- Most endpoint docs include direct-backend `curl` examples against `http://localhost:3000/api/v2`; adjust the host when you are using Docker dev or another runtime.

## Related Docs

- [API_REFERENCE_DASHBOARD_ALERTS.md](API_REFERENCE_DASHBOARD_ALERTS.md)
- [API_REFERENCE_EVENTS.md](API_REFERENCE_EVENTS.md)
- [API_REFERENCE_EXPORT.md](API_REFERENCE_EXPORT.md)
- [API_REFERENCE_PORTAL_APPOINTMENTS.md](API_REFERENCE_PORTAL_APPOINTMENTS.md)
- [API_REFERENCE_BACKUP.md](API_REFERENCE_BACKUP.md)
- [API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md)
- [postman/README.md](postman/README.md)
- [../README.md](../README.md)
- [../../CONTRIBUTING.md](../../CONTRIBUTING.md)
