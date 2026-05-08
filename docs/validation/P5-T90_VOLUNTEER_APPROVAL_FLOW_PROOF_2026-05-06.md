# P5-T90 Volunteer Approval Flow Proof

**Date:** 2026-05-06
**Row:** P5-T90
**Status:** Review

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

## Notes

- No database migration was needed; the existing dedicated approval route already accepts notes, approval/check date, and optional expiry date.
- The direct integration test was added for the next DB-backed validation pass, but the DB-free backend proof above covers controller routing, notes/date forwarding, existing service approval metadata, and approval schema validation.
