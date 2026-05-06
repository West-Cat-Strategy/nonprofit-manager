# P5-T79-T84 Auth, Accounts, Pending Accounts, And Approvals Remediation Proof

**Date:** 2026-05-05
**Rows:** P5-T79, P5-T80, P5-T81, P5-T82, P5-T83, P5-T84
**Status:** Review

## Scope

This proof covers the May 5 auth/accounts/pending-accounts/approvals remediation batch:

- `P5-T79`: auth/session hardening.
- `P5-T80`: portal and pending-account hardening.
- `P5-T81`: accounts access and RLS hardening.
- `P5-T82`: case-form review-gated mapping.
- `P5-T83`: public-action approval transitions.
- `P5-T84`: volunteer background-check approval.

Out of scope: auth alias retirement before the `P5-T75` telemetry gate, generic workflow tooling, broad account lifecycle role redesign, public analytics, website-builder redesign, and unrelated dirty frontend/proof rows.

## Implementation Summary

- Staff password reset now bumps `auth_revision`; MFA bypass is test-only and production-failing; WebAuthn passkeys require user verification; authenticated password change uses the strong password policy.
- Portal admin invitation, user, signup request, approval, rejection, and password reset flows are account scoped. Pending registration and portal signup review now lock pending rows and use pending-only uniqueness so rejected requests can resubmit cleanly.
- Account lifecycle and account import commit writes are admin-only to match RLS; account `tax_id` reads/writes use field policy; account contacts honor account, contact, creator, and account-type scope; user-access writes use request-bound RLS context.
- Portal/public case-form mappings are stored as pending audit entries and applied only when staff marks the latest submission reviewed. Revision requests do not apply mapped writes.
- Public-action submissions are capture-only until staff accept/reject/fulfill transitions release contacts, pledges, and support-letter artifacts.
- Volunteer generic create/update/import paths reject `background_check_status: approved`. A dedicated background-check approval route records approver, timestamp, notes, and optional check/expiry dates.

## Database

- Added migrations:
  - `121_portal_account_scope.sql`
  - `122_pending_email_uniqueness.sql`
  - `123_volunteer_background_check_approval.sql`
- Updated `database/migrations/manifest.tsv`.
- Updated `database/initdb/000_init.sql`.
- Extended app-role RLS proof for admin account writes, non-admin account write denial, and user-access writes.

## Validation

Passed:

- `cd backend && npm run type-check`
- `cd backend && npm run lint`
- `cd frontend && npm run type-check`
- `cd frontend && npm run lint`
- `node scripts/check-auth-guard-policy.ts`
- `node scripts/check-rate-limit-key-policy.ts`
- `node scripts/check-route-validation-policy.ts`
- `node scripts/check-v2-module-ownership-policy.ts`
- `node scripts/check-success-envelope-policy.ts`
- `node scripts/check-implementation-size-policy.ts`
- `node scripts/ui-audit.ts --enforce-baseline`
  - Result: `1517` hardcoded color utilities, `9911` semantic token utilities, `60` inline style usages.
- `make test-tooling`
  - Result: 34 tests passed after restoring selector delegation for the historical `scripts/verify.sh` and `scripts/verify-pr.sh` wrappers.
- `cd backend && npx jest src/__tests__/services/passwordResetService.test.ts src/modules/auth/lib/__tests__/mfaBypass.test.ts src/__tests__/unit/validations/schemas.test.ts src/__tests__/integration/passkeyLockout.test.ts src/modules/portalAdmin/controllers/__tests__/portalAdminController.test.ts src/modules/portalAuth/controllers/__tests__/portalAuthController.test.ts src/__tests__/services/portalAuthService.test.ts src/modules/admin/__tests__/repositories/pendingRegistrationRepository.test.ts src/modules/admin/__tests__/usecases/createPendingRegistrationUseCase.test.ts src/modules/admin/__tests__/usecases/pendingRegistrationApprovalUseCase.test.ts src/modules/accounts/controllers/__tests__/accounts.controller.test.ts src/modules/accounts/usecases/__tests__/accountImportExport.usecase.test.ts src/modules/admin/__tests__/usecases/userAccessUseCase.test.ts src/__tests__/services/accountService.test.ts src/__tests__/integration/authorization.test.ts src/modules/cases/usecases/__tests__/caseForms.usecase.test.ts src/__tests__/services/publishing/publicActionService.test.ts src/modules/publishing/routes/__tests__/publicRateLimits.test.ts src/__tests__/services/volunteerService.test.ts src/modules/volunteers/__tests__/volunteerImportExport.analysis.test.ts src/modules/volunteers/__tests__/volunteerImportExport.commit.test.ts src/__tests__/utils/permissions.test.ts src/__tests__/integration/volunteers.test.ts src/__tests__/integration/peopleImportExport.test.ts --runInBand`
  - Result: 24 suites passed, 337 tests passed.
- `cd backend && npx jest src/__tests__/integration/accounts.test.ts src/__tests__/integration/donations.test.ts src/__tests__/integration/contacts.test.ts src/modules/meetings/__tests__/integration/meetings.test.ts src/__tests__/integration/cases.handoff.test.ts src/__tests__/integration/cases.test.ts --runInBand`
  - Result: 6 suites passed, 112 tests passed after account-fixture promotion and volunteer background-check fixture updates.
- `cd frontend && npm test -- --run src/features/websites/pages/__tests__/WebsiteFormsPage.test.tsx`
  - Result: 5 tests passed after extracting `WebsitePublicActionsSection`.
- `make db-verify`
- `bash scripts/verify-migrations.sh`
- `CI=1 bash ../scripts/e2e-playwright.sh host ../node_modules/.bin/playwright test --project=chromium tests/public-browser-proof.spec.ts tests/public-workflows.spec.ts tests/volunteers.spec.ts --grep "submits managed forms|drives managed forms|search, filter, edit"`
  - Result: 3 tests passed.
- `CI=1 bash ../scripts/e2e-playwright.sh host ../node_modules/.bin/playwright test --project=firefox --project=webkit tests/public-browser-proof.spec.ts tests/public-workflows.spec.ts tests/volunteers.spec.ts --grep "submits managed forms|drives managed forms|search, filter, edit"`
  - Result: 6 tests passed.
- `CI=1 bash ../scripts/e2e-playwright.sh host ../node_modules/.bin/playwright test --project=firefox tests/visibility-link-audit.spec.ts --grep "audits backup settings|audits email marketing|audits website builder|staff navigation links stay visible"`
  - Result: 4 tests passed, confirming the earlier visibility-link failures were caused by the Docker socket/runtime drop rather than the remediation changes.
- `make test-e2e-docker-smoke`
  - Result: 4 tests passed after adding `DEV_NODE_ENV=test` to the isolated smoke stack environment so the new MFA bypass helper only activates in the intended test runtime.
- `make check-links`
  - Result: 206 active-doc files and 1560 local links checked.
- `git diff --check`
- `make ci-full`
  - Current rerun completed lint, shared policy checks, type-check, backend coverage, frontend coverage, host Playwright desktop matrix, and host mobile slice.
  - Host matrix result: 987 passed, 11 skipped, 1 flaky startup-performance retry passed.
  - The run then reached Docker smoke and exposed the missing `DEV_NODE_ENV=test` smoke-stack setting fixed above. The failing smoke target was rerun directly and passed.

Not run:

- `cd e2e && npm run test:docker:ci`
- `cd e2e && npm run test:docker:audit`

Reason: the original final plan keeps Docker CI/audit as follow-on gates after the full host path. This turn proved the Docker smoke gate that `make ci-full` invokes; the broader Docker CI/audit gates remain queued for a later long-running validation pass.

## Notes

- One worker initially hit the existing isolated test database container-name conflict by running database-backed wrappers concurrently. The focused tests were rerun serially and passed.
- The first `make ci-full` rerun became invalid after Docker Desktop's socket disappeared mid-Firefox/WebKit host run. Docker was restarted, the failed Firefox visibility rows passed directly, and a second host matrix completed.
- `WebsiteFormsPage.tsx` was split by moving public-action controls into `WebsitePublicActionsSection.tsx`; this resolved the implementation-size ratchet blocker without changing the website-builder route contract.
- Existing unrelated dirty frontend/proof rows were preserved and are not part of this remediation proof.
