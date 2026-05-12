# API Integration Guide

**Last Updated:** 2026-05-07

Use this guide for integration posture and common request patterns. Use [README.md](README.md) for the API map, [openapi.yaml](openapi.yaml) for machine-readable route detail, and the narrower API reference files for endpoint-specific examples.

## Overview

Active application endpoints live under `/api/v2/*` except documented health aliases and explicit compatibility/tombstone flows.

Base URLs:

| Runtime | Base URL |
|---|---|
| Direct backend | `http://localhost:3000/api/v2` |
| Docker dev backend | `http://localhost:8004/api/v2` |
| Browser proxy | `/api/v2` |

Responses use the canonical envelopes unless a route-specific reference says otherwise:

```json
{
  "success": true,
  "data": {}
}
```

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description"
  }
}
```

## Authentication

Browser shells authenticate primarily through HttpOnly session cookies.

| Flow | Routes |
|---|---|
| Staff login/bootstrap | `POST /api/v2/auth/login`, `GET /api/v2/auth/bootstrap` |
| Portal login/bootstrap | `POST /api/v2/portal/auth/login`, `GET /api/v2/portal/auth/bootstrap` |
| Bearer-token clients | `Authorization: Bearer <token>` when the runtime explicitly exposes or provisions a token |

Token exposure is optional. `data.token` is returned only when the backend runtime enables token exposure for that environment. Otherwise, use the session cookie flow.

Minimal staff login request:

```json
{
  "email": "user@example.com",
  "password": "your_password"
}
```

Minimal successful login envelope:

```json
{
  "success": true,
  "data": {
    "csrfToken": "csrf-token",
    "organizationId": "uuid",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "admin"
    }
  }
}
```

## Payment And Reconciliation

Use these route families for finance integrations:

| Area | Routes | Details |
|---|---|---|
| Reconciliation | `/api/v2/reconciliation/*` | Runs, dashboard summaries, items, discrepancies, and reports |
| Payments | `/api/v2/payments/*` | Provider config, payment intents, customers, refunds, and provider webhooks |
| Donations | `/api/v2/donations/*` | Donation records and staff workflows |
| Recurring donations | `/api/v2/recurring-donations/*` | Recurring plan management with provider-specific gates |

Use [PAYMENT_PROVIDER_TESTING_GUIDE.md](PAYMENT_PROVIDER_TESTING_GUIDE.md) for provider webhook and test-mode details.

## Communications API

The provider-neutral communications surface is the primary staff campaign API.

| Capability | Routes |
|---|---|
| Provider-neutral campaign operations | `/api/v2/communications/*` |
| Local Email queueing and status | `/api/v2/communications/campaign-runs/*` |
| Audience preview and recipient selection | `/api/v2/communications/audiences/*` and related campaign-run routes |
| Provider audience sync | `/api/v2/communications/sync/bulk` |

Current behavior:

- Local Email is the default newsletter/blast-email path.
- Mautic is the preferred open-source external sync provider. `GET /api/v2/communications/audiences?scope=provider` exposes Mautic segments as provider audiences when configured, and `/api/v2/communications/sync/bulk` can sync selected CRM contacts to Mautic segments.
- Mautic campaign sending is intentionally not implemented through this staff campaign contract yet; use Local Email for local delivery or Mailchimp only when explicitly configured as an optional compatibility provider.
- Campaign send, retry, preview, and run-history behavior should be represented through provider-neutral communications contracts first.
- Provider-specific behavior should return explicit unsupported-provider responses when no safe local behavior exists.
- Suppression, opt-in, unsubscribe, and campaign-run proof is indexed from [../validation/README.md](../validation/README.md).

## Mailchimp Integration

Mailchimp remains an explicit optional proprietary-provider compatibility surface.

| Capability | Routes |
|---|---|
| Provider campaign compatibility | `/api/v2/mailchimp/*` |
| Campaign preview and provider actions | `/api/v2/mailchimp/campaign-runs/*` |
| Webhook compatibility | `/api/v2/mailchimp/webhook/*` |

Current behavior:

- Mailchimp is not assumed to be configured in local Docker dev/review stacks.
- Provider actions must be explicit and must not masquerade as local-provider behavior.
- Unsupported cancel/reschedule behavior returns explicit error envelopes.
- Webhook secret checking, PII-safe logs, and optional-provider route proof are indexed from [../validation/README.md](../validation/README.md).

## Webhooks

Use `/api/v2/webhooks/*` for registered outbound webhook destinations and delivery tracking. Webhook delivery, retry, signature, and failure behavior is implemented through ordinary services, not autonomous agents.

Integration expectations:

- Store provider credentials through the configured provider surfaces.
- Validate signatures where the provider supports it.
- Treat failed delivery as retryable only when the route/service contract says so.
- Log enough correlation detail for support without exposing bearer tokens, secrets, or PII.

## Rate Limiting And Errors

- Public, auth, provider, and staff routes use separate rate-limit policies.
- Caller-controlled tokens, emails, or IDs must not become raw rate-limit bucket identifiers.
- Validation failures use the canonical error envelope with route-specific `details` only where documented.
- Security-sensitive public writes should fail closed when required provider configuration is missing.

## Integration Checklist

- Confirm the route family in [README.md](README.md) and [openapi.yaml](openapi.yaml).
- Use the correct runtime base URL from [../development/GETTING_STARTED.md](../development/GETTING_STARTED.md).
- Prefer session cookies for browser integrations and bearer tokens only for supported API/test-client flows.
- Use `/api/v2/*` paths in docs, examples, and tests.
- Run `make lint-doc-api-versioning` when changing versioned API wording.
- Run `make lint-openapi` when changing [openapi.yaml](openapi.yaml).
