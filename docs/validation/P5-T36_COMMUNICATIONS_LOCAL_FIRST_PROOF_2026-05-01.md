# P5-T36 Communications Local-First Proof

**Date:** 2026-05-01

## Scope

`P5-T36` moved newsletter and blast-email workflows to a local-first communications model.

Implemented scope:

- Added provider-neutral `/api/v2/communications/*` routes for status, provider audiences, saved audiences, audience preview, campaign preview, test-send, campaign creation, campaign-run listing, run send, and run status refresh.
- Made `local_email` the default communications provider.
- Added migration `111_local_first_communications.sql` for local campaign content snapshots and recipient-level delivery rows with `queued`, `sending`, `sent`, `failed`, and `suppressed` states.
- Queued local SMTP delivery in bounded batches through the existing email service.
- Applied `contacts.do_not_email` and active email/all-channel suppression evidence before local delivery.
- Kept `/api/v2/mailchimp/*` as the explicit Mailchimp provider-management and compatibility surface.
- Made public newsletter signup local-first by storing the CRM contact and newsletter preferences locally, with optional provider sync only when explicitly configured.
- Updated the communications workspace so Local Email is primary and Mailchimp appears only when configured.

Out of scope:

- Typed appeals, ROI attribution, donation-attribution automation, and workflow-canvas delivery automation.
- Automatic Mailchimp mirroring for local newsletter signups or local campaign sends.
- Replacing existing Mailchimp provider-management routes.

## Validation

Passed:

```bash
cd backend && npm run type-check
cd frontend && npm run type-check
cd frontend && npm test -- --run src/features/adminOps/pages/__tests__/EmailMarketingPage.test.tsx src/features/builder/pages/__tests__/TemplatePreviewPage.test.tsx
cd backend && npm test -- --runInBand src/modules/communications/__tests__/communicationsService.test.ts src/__tests__/services/newsletterProviderService.test.ts src/__tests__/services/publishing/publicWebsiteFormService.test.ts src/__tests__/services/emailCampaignRenderer.test.ts src/__tests__/services/mailchimpService.test.ts src/__tests__/modules/mailchimp.routes.security.test.ts
make db-verify
node scripts/check-route-validation-policy.ts
node scripts/check-v2-module-ownership-policy.ts
node scripts/check-module-boundary-policy.ts
node scripts/check-success-envelope-policy.ts
make lint-doc-api-versioning
make check-links
git diff --check
```

Lane and lead checks also reported green:

- Frontend lane: `cd frontend && npm run type-check`, focused `EmailMarketingPage` tests, and scoped `git diff --check`.
- Backend communications lane: focused communications service tests, backend type-check, route-validation policy, v2 ownership policy, and success-envelope policy.
- Delivery/newsletter compatibility lane: focused newsletter, public website form, site settings, Mailchimp service, and Mailchimp route-security tests.
- Docs lane: `make lint-doc-api-versioning`, `make check-links`, and `git diff --check`.

Known validation notes:

- Backend public-intake tests emit redacted audit-log errors from existing audit-fixture behavior while still passing.
- Jest reports the existing `--localstorage-file` warning during isolated backend test runs.
- Mailchimp route-security tests warn when `MAILCHIMP_WEBHOOK_SECRET` is unset; this matches the existing optional-webhook-secret development contract.

## Interface Summary

Primary local-first routes:

- `GET /api/v2/communications/status`
- `GET /api/v2/communications/audiences`
- `GET /api/v2/communications/audiences/:audienceId`
- `POST /api/v2/communications/audiences`
- `PATCH /api/v2/communications/audiences/:audienceId/archive`
- `POST /api/v2/communications/audiences/preview`
- `GET /api/v2/communications/campaigns`
- `POST /api/v2/communications/campaigns/preview`
- `POST /api/v2/communications/campaigns/test-send`
- `POST /api/v2/communications/campaigns`
- `GET /api/v2/communications/campaign-runs`
- `POST /api/v2/communications/campaign-runs/:runId/send`
- `POST /api/v2/communications/campaign-runs/:runId/status`

Compatibility routes:

- `/api/v2/mailchimp/*` remains mounted for Mailchimp-specific sync, tags, segments, campaign provider operations, reports, and webhooks.
