# Cases And Intake Save Verification

**Date:** 2026-05-13
**Scope:** Staff case creation, staff intake, public website contact/referral intake, portal signup/admin approval, portal case forms, and tokenized public case-form submissions.

## Summary

This pass reviewed the existing save paths for `/cases/new`, staff `/intake/new`, public website referral/contact intake, portal signup and admin approval, portal forms, and tokenized public case forms. No route, schema, envelope, or database changes were made.

The implementation changes were limited to verification:

- Added `frontend/src/components/__tests__/CaseForm.test.tsx` to submit the real `CaseForm` save path through `POST /v2/cases`, including contact, case type, title, priority, source/referral source, urgent flag, and tags.
- Asserted CaseForm success handling, contact-case cache refresh/stale marking, list navigation, and embedded `onCreated` callback behavior.
- Strengthened `frontend/src/features/workflows/pages/__tests__/IntakeNewPage.test.tsx` so `/intake/new` proves the created contact id is handed to the embedded case form and that a saved case navigates to `/cases/:id`.
- Updated `e2e/tests/cases.spec.ts` so `should create a new case via UI` now drives `/cases/new` and clicks the staff save button; API helpers remain only for prerequisite contact and case-type setup.

## Reviewed Save Paths

| Path | Evidence |
|---|---|
| `/cases/new` staff case creation | New CaseForm unit coverage and updated browser E2E spec submit the staff form save button through `/api/v2/cases`. |
| `/intake/new` staff intake | Intake page unit coverage verifies contact creation handoff into CaseForm and post-save navigation to `/cases/:id`. |
| Public website contact/referral intake | Existing `WebsiteFormsPage` frontend coverage and `publicWebsiteFormService` backend fallback Jest coverage stayed green. |
| Portal signup and admin approval | Existing `PortalAccessPages` frontend coverage plus `portalAuthController` and `portalAdminController` backend fallback Jest coverage stayed green. |
| Portal case forms | Existing portal case-form API client coverage stayed green. |
| Tokenized public case forms | Existing `PublicCaseFormPage`, public case-form API client, and backend case-form usecase coverage stayed green. |

## Validation Results

| Command | Result |
|---|---|
| `cd frontend && npm test -- --run src/components/__tests__/CaseForm.test.tsx src/features/workflows/pages/__tests__/IntakeNewPage.test.tsx --reporter=verbose` | Passed: 2 files, 5 tests. |
| `cd frontend && npm test -- --run src/features/cases/state/casesCore.test.ts src/components/__tests__/ContactForm.test.tsx` | Passed: 2 files, 29 tests. |
| `cd frontend && npm test -- --run src/features/portal/pages/__tests__/PortalAccessPages.test.tsx src/features/portal/pages/__tests__/PublicCaseFormPage.test.tsx src/features/portal/api/publicCaseFormsApiClient.test.ts src/features/portal/api/portalCaseFormsApiClient.test.ts src/features/websites/pages/__tests__/WebsiteFormsPage.test.tsx` | Passed: 5 files, 20 tests. |
| `cd backend && npm test -- --runInBand src/modules/cases/usecases/__tests__/caseLifecycle.usecase.test.ts src/modules/cases/queries/__tests__/lifecycleQueries.test.ts src/__tests__/services/caseService.test.ts src/__tests__/services/publishing/publicWebsiteFormService.test.ts src/modules/portalAuth/controllers/__tests__/portalAuthController.test.ts src/modules/portalAdmin/controllers/__tests__/portalAdminController.test.ts src/modules/cases/usecases/__tests__/caseForms.usecase.test.ts` | Blocked before Jest by missing Docker socket: `failed to connect to the docker API at unix:///Users/bryan/.docker/run/docker.sock`. |
| `cd backend && npx jest --runInBand src/modules/cases/usecases/__tests__/caseLifecycle.usecase.test.ts src/modules/cases/queries/__tests__/lifecycleQueries.test.ts src/__tests__/services/caseService.test.ts src/__tests__/services/publishing/publicWebsiteFormService.test.ts src/modules/portalAuth/controllers/__tests__/portalAuthController.test.ts src/modules/portalAdmin/controllers/__tests__/portalAdminController.test.ts src/modules/cases/usecases/__tests__/caseForms.usecase.test.ts` | Passed: 7 suites, 108 tests. Expected redacted audit-log connection errors were emitted during public intake resolution coverage. |
| `cd frontend && npm run type-check` | Passed. |
| `cd backend && npm run type-check` | Passed. |
| `cd e2e && npm test -- --project=chromium tests/cases.spec.ts` | Blocked during Playwright webServer startup by the same missing Docker socket; browser assertions did not run. |
| `make check-links` | Passed: 242 files and 1499 local links checked with no broken active-doc links. |
| `git diff --check` | Passed. |

## Caveats

Docker-backed runtime wrappers and Playwright browser proof are currently unavailable in this environment because the Docker socket is missing. Direct frontend Vitest, direct backend Jest fallback, and frontend/backend type-checks passed. Re-run the backend wrapper and E2E browser command after Docker is available to capture full runtime proof.
