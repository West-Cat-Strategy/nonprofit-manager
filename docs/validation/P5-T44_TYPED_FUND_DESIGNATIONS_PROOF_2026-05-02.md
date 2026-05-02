# P5-T44 Typed Fund Designations Proof

**Date:** 2026-05-02

## Scope

`P5-T44` implements the typed fund designation foundation selected from the May 2 reference-repo improvement triage while keeping `P5-T6` as the Phase 5 scope-control gate.

Implemented scope:

- Added organization-scoped `fund_designations` records with typed restriction categories, stable codes, active/inactive state, and migration backfill from existing donation and recurring-plan free-text designations.
- Connected `donations` and `recurring_donation_plans` to typed `designation_id` values while preserving the legacy `designation` label as a display fallback.
- Added donation designation APIs and service resolution so new free-text labels become typed records, selected designations are organization-validated, inactive records are not reused for new writes, and donor-linkage changes do not carry a typed designation across organizations.
- Updated donation create/update/list/detail/summary behavior to return reporting-safe `designation_label`, `designation_code`, and `designation_restriction_type` fields.
- Updated recurring donation create/update and invoice sync so monthly plan designations propagate into created donation records.
- Updated finance UI forms, donation lists/details, and recurring donation lists/details to select and display typed designations, including inactive current-designation preservation on edit.
- The May 2 review pass tightened inactive-current preservation: backend updates may keep only the already-linked inactive designation, and frontend selectors expose active designations plus only the current inactive option instead of making unrelated inactive funds selectable.

Out of scope:

- Donation batches, memberships, pledges, soft credits, public finance snapshots, maker-checker evidence, full GL/fiscal-host parity, generic workflow tooling, and source copying from reference repositories.

## Interface Summary

Added API:

- `GET /api/v2/donations/designations`
- Optional query: `include_inactive=true`

Added database objects:

- `fund_designations`
- `donations.designation_id`
- `recurring_donation_plans.designation_id`

## Validation

Passed:

```bash
cd backend && npm run type-check
cd frontend && npm run type-check
cd backend && npx jest --runTestsByPath src/modules/donations/services/__tests__/donationDesignationService.test.ts src/__tests__/services/donationService.test.ts src/modules/recurringDonations/services/__tests__/recurringDonationService.test.ts src/modules/recurringDonations/services/__tests__/recurringDonationSyncService.test.ts --runInBand --forceExit
cd frontend && npm test -- --run src/components/__tests__/DonationForm.test.tsx src/features/finance/pages/__tests__/DonationListPage.test.tsx src/features/finance/pages/__tests__/DonationDetailPage.test.tsx src/features/finance/pages/__tests__/RecurringDonationListPage.test.tsx
make lint-route-validation
make lint-v2-module-ownership
node scripts/check-migration-manifest-policy.ts
make check-links
git diff --check
```

Known validation notes:

- `make db-verify` is blocked before database verification starts because Docker is unavailable at `/Users/bryan/.docker/run/docker.sock`.
- `cd backend && npm test -- --runTestsByPath ...` is blocked by the same backend test wrapper Docker dependency; the direct focused `npx jest` equivalent passes.
- Direct focused Jest emits the existing `--localstorage-file` warning while still passing.
