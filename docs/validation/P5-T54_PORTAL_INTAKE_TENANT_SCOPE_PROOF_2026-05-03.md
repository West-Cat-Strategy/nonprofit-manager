# P5-T54 Portal Intake Tenant Scope Proof - 2026-05-03

## Scope

`P5-T54` tightened portal signup request review and dashboard intake-resolution counts to the current organization/account context before `P5-T51` signoff.

## Implementation

- Portal signup request list, approval, and rejection now derive tenant scope from `req.organizationId ?? req.accountId`.
- Pending signup visibility is filtered through linked-contact account ownership or matching-contact email ownership in the current tenant.
- Manual contact approval now requires the selected contact to match both the signup email and current tenant.
- Dashboard intake-resolution counts now use the same tenant-aware signup/contact predicate.
- No public API response shape was changed.

## Review-Batch Follow-Up

- Added migration `120_portal_signup_manual_no_match.sql` to replace `public.portal_resolve_signup_request(...)` without changing the function signature.
- Public portal signup no longer creates an unowned accountless contact. Single-tenant no-match signups create an account-scoped contact and pending request; unresolved no-match or multi-match submissions stay pending with `needs_contact_resolution`.
- Portal signup requests now persist `account_id` so no-match requests remain visible to tenant-scoped admin queues before a contact is selected.
- Portal-admin approval callbacks now preserve the selected `contact_id` payload through the page wrapper and settings hook.
- Dashboard portal-escalation summary cards now fail closed when the request lacks tenant context instead of using an unscoped `$2 IS NULL` fallback.
- Migration `120` is wired into `database/migrations/manifest.tsv` and `database/initdb/000_init.sql`.

## Validation

- `cd backend && npm exec -- jest --runTestsByPath src/modules/portalAdmin/controllers/__tests__/portalAdminController.test.ts src/modules/dashboard/services/__tests__/workqueueSummaryService.test.ts src/modules/dashboard/__tests__/dashboard.queueViews.routes.test.ts --runInBand` - passed, 3 suites / 22 tests.
- `cd backend && npm exec -- eslint backend/src/modules/portalAdmin/controllers/portalAdminAccountController.ts backend/src/modules/portalAdmin/controllers/portalAdminController.shared.ts backend/src/modules/portalAdmin/controllers/__tests__/portalAdminController.test.ts backend/src/modules/dashboard/services/workqueueSummaryService.ts backend/src/modules/dashboard/services/__tests__/workqueueSummaryService.test.ts` - passed.
- `cd backend && npm exec -- prettier --check backend/src/modules/portalAdmin/controllers/portalAdminAccountController.ts backend/src/modules/portalAdmin/controllers/portalAdminController.shared.ts backend/src/modules/portalAdmin/controllers/__tests__/portalAdminController.test.ts backend/src/modules/dashboard/services/workqueueSummaryService.ts backend/src/modules/dashboard/services/__tests__/workqueueSummaryService.test.ts` - passed.
- `cd backend && npm run type-check` - passed.
- Review-batch follow-up: `cd backend && npx jest --runInBand src/modules/dashboard/services/__tests__/workqueueSummaryService.test.ts src/modules/dashboard/__tests__/dashboard.queueViews.routes.test.ts src/__tests__/services/portalAuthService.test.ts src/modules/portalAuth/controllers/__tests__/portalAuthController.test.ts src/__tests__/services/backupService.test.ts` - passed, 5 suites / 44 tests.
- Review-batch follow-up: `cd backend && npm run type-check` - passed.
- Review-batch follow-up: `node scripts/check-migration-manifest-policy.ts` - passed.
- Review-batch follow-up: `git diff --check` - passed.
- May 4 closeout: `cd backend && npx jest --runInBand src/__tests__/services/backupService.test.ts src/__tests__/services/portalAuthService.test.ts src/modules/portalAuth/controllers/__tests__/portalAuthController.test.ts src/modules/portalAdmin/controllers/__tests__/portalAdminController.test.ts src/modules/dashboard/services/__tests__/workqueueSummaryService.test.ts src/__tests__/scripts/checkRouteValidationPolicy.test.ts` - passed, 6 suites / 58 tests.
- May 4 closeout: `cd frontend && npm run test -- --run src/features/adminOps/pages/portalAdmin/PortalAdminPage.test.tsx src/features/adminOps/pages/portalAdmin/panels/__tests__/PortalPanels.test.tsx` - passed, 2 files / 26 tests.
- May 4 closeout: `cd backend && npm run type-check` - passed.
- May 4 closeout: `cd frontend && npm run type-check` - passed.
- May 4 closeout: `make db-verify` - passed after Docker Desktop was started; migration `120` applied and manifest/initdb verification completed successfully.

## Notes

- `cd backend && npm test -- --runTestsByPath ... --runInBand` did not reach Jest because the wrapper requires Docker and the local Docker daemon was unavailable. Direct Jest was used for the focused behavior proof.
- The earlier Docker-daemon blocker at `/Users/bryan/.docker/run/docker.sock` was cleared by starting Docker Desktop for the May 4 closeout.
