# P5-T131 Webhook Organization Scoping Proof

**Date:** 2026-05-15
**Workboard Row:** `P5-T131`
**Scope:** Organization-scoped outbound webhook endpoints, delivery selection, and first producer wiring

## Scope

This pass makes outbound webhook endpoints owned by the active organization instead of only the creator user. It keeps `user_id` as creator metadata, preserves the existing SSRF/delivery retry controls, and now wires the first two real org-owned producer seams without widening the webhook catalog.

Changed surfaces:

- `database/migrations/133_webhook_endpoint_organization_scope.sql`
- `database/migrations/manifest.tsv`
- `database/initdb/000_init.sql`
- `backend/src/modules/webhooks/**`
- `backend/src/types/webhook.ts`
- `frontend/src/types/webhook.ts`
- `backend/src/modules/donations/services/donationService.ts`
- `backend/src/modules/events/services/eventCatalogService.ts`
- Webhook controller, service, and delivery tests

## Contract Notes

- `webhook_endpoints.organization_id` is added with a conservative backfill only when the endpoint creator has exactly one active organization in `user_account_access`.
- Legacy endpoints that cannot be unambiguously scoped remain `NULL` and are excluded from delivery selection and retry claiming.
- Webhook endpoint create/list/get/update/delete/secret/test/deliveries now require active organization context and filter by `organization_id`.
- Endpoint responses include `organizationId`; `userId` remains creator metadata.
- `triggerWebhooks` now accepts an options object with `organizationId`, `eventType`, `data`, and optional `previousAttributes`, and selects only active endpoints for that organization.

## Live Producer Events

The following webhook events are now emitted by real app producers:

- `donation.created`: queued after staff donation creation succeeds, using the resolved donation organization from the active request context, donation account, or contact account.
- `event.created`: queued after staff event creation commits and the created event is reloaded under the creating organization scope.

The rest of the advertised webhook catalog remains subscription-ready but not yet producer-wired in this row: contact update/delete, donation update/delete, event update/delete, event registration, volunteer, task, and payment events.

## Targeted Proof

Passed:

```bash
cd backend && npx jest src/__tests__/services/webhookService.delivery.test.ts src/__tests__/services/webhookService.secretExposure.test.ts src/modules/webhooks/controllers/__tests__/webhookController.test.ts --runInBand --forceExit
cd backend && npx jest src/__tests__/services/donationService.test.ts src/modules/events/services/__tests__/eventCatalogService.webhooks.test.ts src/__tests__/services/webhookService.delivery.test.ts src/modules/events/controllers/__tests__/events.controller.test.ts src/modules/webhooks/controllers/__tests__/webhookController.test.ts --runInBand --forceExit
cd backend && npm run type-check
node scripts/check-migration-manifest-policy.ts
```

Blocked locally:

```bash
cd backend && npx jest src/__tests__/integration/webhooks.test.ts --runInBand --forceExit
```

Result: blocked by the unavailable local isolated test database at `127.0.0.1:8012` (`ECONNREFUSED`). The integration test file was updated for the new org-scoped response contract, but DB-backed proof needs the local test DB/Docker contract restored.

## Boundaries

- No broader webhook expansion beyond `donation.created` and `event.created`.
- No webhook retry/SSRF relaxation.
- No guessed organization ownership for ambiguous legacy endpoint rows.
