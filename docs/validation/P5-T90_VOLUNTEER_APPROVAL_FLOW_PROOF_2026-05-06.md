# P5-T90 Volunteer Approval Flow Proof

**Date:** 2026-05-06
**Row:** P5-T90
**Status:** Proof complete

## Scope

This pass follows the May 5 auth/accounts/approvals remediation review and stays inside the volunteer background-check approval seam.

In scope:

- Remove generic volunteer form/edit affordances that imply direct `approved` background-check writes.
- Add one staff-facing volunteer detail approval flow that calls the existing dedicated background-check approval endpoint.
- Capture approval notes, approval date, and optional expiry date in that flow.
- Add focused frontend/backend proof.

Out of scope: broad volunteer lifecycle redesign, volunteer dispatch changes, hours approvals, generic workflow tooling, database migrations, public-action approvals, case-form approvals, and unrelated May 6 security-batch edits.

## Implementation Summary

- `VolunteerForm` no longer offers `Approved` in the generic background-check status select.
- Generic volunteer form submissions now build mutation payloads field-by-field, omit existing approved status values, and do not send approval metadata through create/update.
- Volunteer frontend mutation types now exclude `approved` and approval metadata from generic saves while keeping a separate `VolunteerBackgroundCheckApprovalInput`.
- `VolunteerDetailPage` now includes a focused staff approval form for non-approved background checks with notes, approval date, and optional expiry date.
- `volunteersApiClient.approveVolunteerBackgroundCheck` and the volunteer core thunk post to `/v2/volunteers/:id/background-check/approve`.
- Added DB-free controller proof and a direct integration-route test for the dedicated endpoint. The integration test is ready to run when the local Jest DB listener is available.
- May 9 follow-up fixed the dedicated approval service's date-only persistence so `background_check_date` and `background_check_expiry` store the submitted calendar dates instead of shifting one day early under local time zones.

## Validation

Passed:

- `cd frontend && npm test -- --run src/components/__tests__/VolunteerForm.test.tsx src/features/volunteers/pages/__tests__/VolunteerDetailPage.test.tsx src/features/volunteers/api/volunteersApiClient.test.ts`
  - Result: 3 files passed, 25 tests passed.
- `cd backend && npx jest src/modules/volunteers/controllers/__tests__/volunteers.controller.test.ts src/__tests__/services/volunteerService.test.ts src/__tests__/unit/validations/schemas.test.ts --runInBand`
  - Result: 3 suites passed, 97 tests passed.
- `cd frontend && npm run type-check`
- `cd backend && npm run type-check`
- `cd frontend && npm run lint -- --max-warnings=0 src/components/VolunteerForm.tsx src/components/__tests__/VolunteerForm.test.tsx src/features/volunteers/api/volunteersApiClient.ts src/features/volunteers/api/volunteersApiClient.test.ts src/features/volunteers/pages/VolunteerDetailPage.tsx src/features/volunteers/pages/__tests__/VolunteerDetailPage.test.tsx src/features/volunteers/state/volunteersCore.ts src/features/volunteers/types/contracts.ts`
- `cd backend && npm run lint -- --max-warnings=0 src/modules/volunteers/controllers/__tests__/volunteers.controller.test.ts src/__tests__/integration/volunteers.test.ts`
- `git diff --check`

Blocked:

- `cd backend && npx jest src/__tests__/integration/volunteers.test.ts --runInBand`
  - Result: blocked before test execution because the local Jest database listener was unavailable: `connect ECONNREFUSED 127.0.0.1:8012`.

Follow-up passed on 2026-05-09:

- `DB_HOST=127.0.0.1 DB_PORT=8012 DB_NAME=nonprofit_manager_test DB_USER=postgres DB_PASSWORD=postgres COMPOSE_MODE=ci ./scripts/db-migrate.sh`
  - Result: isolated test database rebuilt and ready on `127.0.0.1:8012/nonprofit_manager_test`.
- `cd backend && npx jest src/__tests__/integration/volunteers.test.ts --runInBand`
  - Result: 1 suite passed, 22 tests passed.
- `cd backend && npx jest src/__tests__/integration/volunteers.test.ts --runInBand -t "approves a background check through the dedicated endpoint with notes and approval date"`
  - Result: 1 suite passed, 1 test passed, 21 tests skipped.
- `cd backend && npm run type-check`
- `cd backend && npm run lint -- --max-warnings=0 src/services/volunteerService.ts src/__tests__/integration/volunteers.test.ts`

Final isolated rerun on 2026-05-09:

- `DB_HOST=127.0.0.1 DB_PORT=8012 DB_NAME=nonprofit_manager_test DB_USER=postgres DB_PASSWORD=postgres COMPOSE_MODE=ci ./scripts/db-migrate.sh`
  - Result: isolated test database rebuilt and ready on `127.0.0.1:8012/nonprofit_manager_test`.
- `cd backend && npx jest src/__tests__/integration/volunteers.test.ts --runInBand -t "approves a background check through the dedicated endpoint with notes and approval date"`
  - Result: 1 suite passed, 1 test passed, 21 tests skipped.

Remaining-blocker rerun on 2026-05-10:

- `node scripts/check-implementation-size-policy.ts`
  - Result: passed; `backend/src/services/volunteerService.ts` is now 894 lines.
- `cd backend && npm test -- src/__tests__/integration/volunteers.test.ts -t "approves a background check through the dedicated endpoint with notes and approval date"`
  - Result: 1 test passed, 21 tests skipped.
- `git diff --check -- backend/src/services/volunteerService.ts`
  - Result: passed.
- `make lint`
  - Result: implementation-size policy passed; root lint later failed at unrelated UI audit baseline drift now tracked under `P5-T94`.

## Notes

- No database migration was needed; the existing dedicated approval route already accepts notes, approval/check date, and optional expiry date.
- The May 9 rerun first reproduced the prior listener blocker. Starting Docker Desktop made the repo's isolated test database bootstrap available again; the proof used the documented `8012/nonprofit_manager_test` contract.
- The DB-backed approval-route proof now verifies the persisted `background_check_date`, `background_check_expiry`, approving user, and approval notes directly from the volunteer row, avoiding JSON timestamp/time-zone ambiguity while staying on the dedicated approval route.
