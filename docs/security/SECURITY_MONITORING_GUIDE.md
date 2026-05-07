# Security Monitoring Guide

**Last Updated:** 2026-05-07

Use this guide for the active security monitoring posture. Use [INCIDENT_RESPONSE_RUNBOOK.md](INCIDENT_RESPONSE_RUNBOOK.md) for incident handling, [AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md](AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md) for the auth-alias deprecation dashboard, and [../validation/README.md](../validation/README.md) for dated proof notes.

## Monitoring Model

Security monitoring combines application logs, persisted audit tables, provider/webhook records, and infrastructure signals.

| Signal | Primary Sources | Watch For |
|---|---|---|
| Authentication | Auth controllers/services, session events, MFA/passkey events | Failed-login spikes, MFA failures, unusual login source, session revocation gaps |
| Authorization and tenant boundaries | Route guards, RLS probes, account/portal/admin services | Cross-tenant IDs, missing request context, unexpected admin-only writes |
| PII and data access | `pii_access_audit`, audit service, account/contact/case access paths | Bulk export spikes, unusual user/entity access, field-policy violations |
| Public ingress | Public forms, public actions, newsletters, public events, provider webhooks | Missing provider config, abusive write rates, invalid signatures, token probing |
| Rate limiting | Rate-limit middleware and key helpers | Bucket cardinality spikes, caller-controlled identifiers, auth/public brute force |
| Backups and secrets | Backup controller, security scan, deployment env policy | Unredacted backup attempts, placeholder secrets, leaked bearer tokens |
| Runtime health | Health/metrics middleware, worker scheduler health, Docker status | Missing metrics protection, worker drift, degraded dependencies |

## Required Dashboards

| Dashboard | Minimum Panels |
|---|---|
| Auth and session health | Failed logins by route/user/IP, MFA failures, password reset/session revocation, WebAuthn failures |
| Public ingress and abuse | Public write rates by route, blocked/limited requests, invalid webhook signatures, provider-unconfigured failures |
| Data access and PII | PII reads by actor/entity, exports/backups, field-policy denies, unusual volume by organization |
| Tenant and authorization | `404`/deny rates for scoped IDs, admin-only write attempts, RLS probe failures |
| Worker and delivery | Campaign worker health, failed-recipient retry volume, webhook retry backlog, provider error rates |
| Security operations | Secret-scan status, dependency audit status, backup gate events, health/metrics protection state |

## Alert Thresholds

Tune thresholds per deployment size, but keep these classes covered:

| Alert | Default Trigger |
|---|---|
| Brute-force login | More than 5 failed attempts for one account or source in 10 minutes |
| MFA/passkey anomaly | Repeated MFA/passkey failures or bypass flags outside test environments |
| Public write abuse | Sustained rate-limit hits or invalid public tokens on one route/source |
| Provider webhook failure | Signature failures, missing required config, or retry backlog growth |
| Cross-tenant/authorization denial spike | Sudden increase in scoped-resource denials for one actor or route |
| Unredacted backup attempt | Any unredacted export request without the explicit production gate |
| Placeholder production secret | Any production boot or scan finding with placeholder/weak secret values |
| Metrics/health exposure drift | Protected metrics/health route available without expected key/policy |

## Auth Alias Deprecation Monitoring

Legacy snake_case auth input aliases remain time-gated by `P5-T75`.

Use [AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md](AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md) for exact query/dashboard setup. The operational rule is:

- Track accepted legacy alias use for register, setup, and password routes.
- Review telemetry on June 17, 2026.
- Do not remove aliases before July 1, 2026.
- Removal requires 30 consecutive days of zero use and no approved integrator exception.

The active blocker row and handoff are in [../phases/planning-and-progress.md](../phases/planning-and-progress.md) and [../validation/P5-T75_AUTH_ALIAS_GATE_HANDOFF_2026-05-05.md](../validation/P5-T75_AUTH_ALIAS_GATE_HANDOFF_2026-05-05.md).

## Log Hygiene

- Do not log bearer tokens, reset tokens, API keys, provider secrets, session cookies, or raw credential material.
- Redact token-like path segments before request/error/browser diagnostics are stored or copied.
- Store enough correlation detail for support: request ID, organization ID where allowed, actor ID where allowed, route, status, and provider/run IDs.
- Treat HTTP `User-Agent` as operational metadata, not a secret.
- Keep PII access evidence in the dedicated audit surfaces rather than generic application logs whenever possible.

## Investigation Flow

1. Identify the alert class and affected organization/actor/route.
2. Check the current live row or proof note if the alert overlaps active remediation in [../phases/planning-and-progress.md](../phases/planning-and-progress.md).
3. Pull correlated request IDs, audit entries, provider run IDs, and worker events.
4. Confirm whether the event is abusive, misconfigured, provider-side, or expected blocked behavior.
5. Follow [INCIDENT_RESPONSE_RUNBOOK.md](INCIDENT_RESPONSE_RUNBOOK.md) for containment, notification, recovery, and post-incident evidence.

## Retention And Reporting

- Retain security-relevant logs and audit records according to the deployment's legal and operational requirements.
- Preserve row-local proof in [../validation/README.md](../validation/README.md) rather than copying evidence into this guide.
- Move dated audits into [archive/README.md](archive/README.md) only after the active validation index no longer relies on them.

## Related Docs

- [INCIDENT_RESPONSE_RUNBOOK.md](INCIDENT_RESPONSE_RUNBOOK.md)
- [AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md](AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md)
- [AUTH_ALIAS_DEPRECATION_CHECKLIST.md](AUTH_ALIAS_DEPRECATION_CHECKLIST.md)
- [../testing/TESTING.md](../testing/TESTING.md)
- [../validation/README.md](../validation/README.md)
- [../deployment/README.md](../deployment/README.md)
