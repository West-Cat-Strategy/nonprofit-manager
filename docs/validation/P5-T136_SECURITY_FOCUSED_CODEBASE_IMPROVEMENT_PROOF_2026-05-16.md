# P5-T136 Security-Focused Codebase Improvement Proof - 2026-05-16

**Workboard Row:** `P5-T136`
**Status:** Review-ready focused security/tooling batch

## Scope

This row implements the first authorized security-focused batch from the May 16 read-only codebase improvement review. It intentionally preserves the existing `P5-T135` cleanup/audit work already present in the checkout.

In scope for this row:

- Webhook event allowlist validation and production delivery contract clarification.
- Public report token rate limiting.
- Payment intent and payment customer tenant/permission hardening.
- Communications provider bulk-sync contact-scope enforcement.
- Focused DB/tooling safety fixes only when needed to prove the security batch.

Deferred candidate backlog from the same review:

- Meeting tenant-boundary schema and route hardening, because it requires a migration and cross-surface backfill policy.
- Mautic DNS pinning SSRF parity, because it should reuse the outbound pinned-dispatcher pattern as a focused follow-up.
- Side-effect-free tooling contract fixtures.
- Frontend accessibility polish for event registration controls, navigation toggles, builder style fields, case tabs, report dialogs, and campaign preview modal semantics.

Out of scope:

- Product expansion covered by `P5-T6`.
- Auth alias enforcement timing covered by `P5-T75`.
- Production reads, writes, imports, deploy actions, or broad legacy retirement.
- Reworking proof-complete `P5-T135` cleanup decisions.

## Review Findings Being Implemented

- Webhook endpoint creation/update currently accepts arbitrary event strings even though the backend has a finite supported event contract.
- Production webhook delivery can appear enabled while the scheduler is disabled unless the operator contract is explicit.
- Public report metadata/download token routes need abuse throttling.
- Payment intent/customer management paths need tenant and permission checks aligned with adjacent payment operations.
- Communications provider bulk sync should fail closed for cross-account contact IDs before Mailchimp or Mautic calls.
- Migration readiness and destructive verification target checks need exact, fail-fast safety.
- Docker selector and `.mjs` policy-script visibility need to route through the correct proof.

## Changes

- Added `WEBHOOK_EVENT_TYPES` as the runtime-backed webhook event allowlist and routed create/update validation through it.
- Applied active-organization guard parity to webhook API-key management routes.
- Added public report token rate-limit keys and middleware to public report metadata/download routes.
- Required communications provider bulk sync to resolve requested contacts through requester account scope before Mailchimp or Mautic calls.
- Tightened payment intent creation without a donation ID to active-org plus payment processing permission, and verified payment customer create/read/payment-method paths against active organization ownership.
- Enabled the production webhook retry scheduler template by default so queued webhook deliveries have an explicit production processing contract.
- Changed `db-migrate` readiness/reuse from count-based migration detection to exact manifest filename matching.
- Moved destructive migration verifier target-safety ahead of DB preflight and now require loopback host, port `8012`, and `_test` database name unless explicitly overridden.
- Routed Docker compose and `.mjs` policy-script changes through selector/tooling proof and included `.mjs` policy scripts in Knip coverage.

## Validation Plan

- Focused backend tests for webhook event rejection and delivery scheduler contract.
- Focused backend tests for public report token rate limiting.
- Focused backend tests for payment permission and tenant denial.
- Focused communications tests for provider-not-called behavior on out-of-scope contacts.
- Policy checks: `node scripts/check-auth-guard-policy.ts`, `node scripts/check-rate-limit-key-policy.ts`, `node scripts/check-route-validation-policy.ts`, and targeted backend type-check/lint as needed.

## Proof Log

- `cd backend && npm test -- src/__tests__/modules/payments.routes.security.test.ts src/__tests__/modules/payments.intentOwnership.test.ts src/modules/communications/__tests__/communicationsService.test.ts src/modules/publicReports/routes/__tests__/publicReportsRateLimits.test.ts src/__tests__/middleware/rateLimiter.test.ts src/__tests__/utils/rateLimitKeys.test.ts src/modules/webhooks/controllers/__tests__/webhookController.test.ts src/__tests__/integration/webhooks.test.ts --runInBand` - passed, 8 suites / 74 tests.
- `node scripts/check-rate-limit-key-policy.ts` - passed.
- `node scripts/check-auth-guard-policy.ts` - passed.
- `node scripts/check-route-validation-policy.ts` - passed.
- `cd backend && npm run type-check` - passed.
- `make test-tooling` - passed, 58 tests.
- `./scripts/select-checks.sh --files 'docker-compose.dev.yml scripts/check-docker-image-policy.mjs' --mode fast` - emitted `make lint`, `make test-tooling`, `make docker-validate-overlays`, `make test-e2e-docker-smoke`, and `make db-verify`.
- `DB_DRY_RUN=1 bash scripts/verify-migrations.sh` - passed.
- `DB_HOST=192.0.2.10 DB_PORT=8012 DB_NAME=nonprofit_manager_test DB_DRY_RUN=1 DB_AUTO_START=0 bash scripts/verify-migrations.sh` - failed closed immediately before DB preflight.
- `node scripts/check-migration-manifest-policy.ts` - passed.
- `make db-verify` - passed.
- `npm run knip` - passed with the existing Node `module.register()` deprecation warning from the toolchain.
