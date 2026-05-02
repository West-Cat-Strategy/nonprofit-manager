# P5-T45 Newsletter Double Opt-In Proof

**Date:** 2026-05-02

## Scope

`P5-T45` adds local double opt-in confirmation for public newsletter signup forms while keeping `P5-T6` as the Phase 5 scope-control gate.

Implemented scope:

- Added migration `117_local_newsletter_double_opt_in.sql` with `newsletter_signup_confirmations` pending/confirmed state.
- Stored public newsletter signup requests as pending confirmations before CRM contact creation or external provider sync.
- Refreshed pending confirmation tokens on repeated signup using a stored SHA-256 token hash; raw tokens are only sent by email.
- Added confirmation emails through the existing SMTP email service, using `API_ORIGIN` for `/api/v2/public/newsletters/confirm/:token` links.
- Added public GET/POST confirmation handling under `/api/v2/public/newsletters/confirm/:token`.
- Kept invalid, expired, and already-used confirmation responses generic so public callers cannot infer contact or signup state.
- Completed the existing CRM/local newsletter contact flow and optional provider handoff only after a valid confirmation.
- Added a CSRF skip only for newsletter confirmation POST while leaving other public newsletter POST paths protected.

Out of scope:

- Marketing automation, tracking pixels, bounce or complaint ingestion, preference-center UI, Mailchimp parity rewrites, reusable segment builders, typed appeals, memberships, donation batches, finance snapshots, and generic workflow tooling.

## Interface Summary

Added public routes:

- `GET /api/v2/public/newsletters/confirm/:token`
- `POST /api/v2/public/newsletters/confirm/:token`

Added database object:

- `newsletter_signup_confirmations`

Public newsletter signup submission keeps the same success-envelope behavior but now returns a confirmation-needed message and defers CRM/provider side effects until confirmation.

## Validation

Passed:

```bash
cd backend && npx jest --runTestsByPath src/__tests__/services/publishing/publicWebsiteFormService.test.ts src/__tests__/services/emailService.test.ts src/__tests__/middleware/csrf.test.ts --runInBand
cd backend && npx jest --runTestsByPath src/modules/communications/__tests__/communicationsService.test.ts src/modules/communications/__tests__/unsubscribeService.test.ts src/modules/communications/__tests__/unsubscribeTokenService.test.ts src/modules/communications/__tests__/publicUnsubscribe.routes.test.ts src/modules/contacts/__tests__/contactSuppressionService.test.ts src/__tests__/services/emailService.test.ts src/__tests__/middleware/csrf.test.ts src/__tests__/services/publishing/publicWebsiteFormService.test.ts --runInBand
cd backend && npm run type-check
cd frontend && npm run type-check
cd backend && npm run lint
make lint-route-validation
make lint-v2-module-ownership
node scripts/check-auth-guard-policy.ts
node scripts/check-migration-manifest-policy.ts
```

Related review-row proof re-run:

```bash
cd backend && npx jest --runTestsByPath src/modules/donations/services/__tests__/donationDesignationService.test.ts src/__tests__/services/donationService.test.ts src/modules/recurringDonations/services/__tests__/recurringDonationService.test.ts src/modules/recurringDonations/services/__tests__/recurringDonationSyncService.test.ts --runInBand --forceExit
cd frontend && npm test -- --run src/components/__tests__/DonationForm.test.tsx src/features/finance/pages/__tests__/RecurringDonationEditPage.test.tsx src/features/finance/pages/__tests__/DonationListPage.test.tsx src/features/finance/pages/__tests__/DonationDetailPage.test.tsx src/features/finance/pages/__tests__/RecurringDonationListPage.test.tsx
```

Known validation notes:

- `make db-verify` is blocked before database verification starts because Docker is unavailable at `/Users/bryan/.docker/run/docker.sock`.
- Direct focused Jest emits the existing `--localstorage-file` warning while still passing.
- Public intake resolution audit best-effort logging emits expected connection-refused noise in the mocked public website form tests; the tests still pass.
