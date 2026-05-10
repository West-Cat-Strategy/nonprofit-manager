# P5-T91 Queue View Modularity Proof - 2026-05-08

## Scope

`P5-T91` is a behavior-preserving full-stack modularity refactor for queue views.

The change keeps public queue-view routes, response envelopes, auth behavior, route catalogs, root store keys, and database schema unchanged while moving queue-view implementation toward shared module and feature resources.

## Implementation Summary

- Backend queue-view service/types now live under `backend/src/modules/shared/queueViews/**`.
- `backend/src/services/queueViewDefinitionService.ts` was removed after import tracing confirmed callers now use the canonical shared queue-view resource.
- Cases, dashboard, and portal-admin queue-view endpoints use the shared queue-view route registrar while preserving existing endpoint paths, validators, auth/permission gates, forced surfaces, owner scoping, and permission scopes.
- Frontend queue-view API/types now live under `frontend/src/features/queueViews/api/queueViewsApiClient.ts`.
- `frontend/src/features/cases/api/queueViewsApiClient.ts` was removed after import tracing confirmed callers now use the canonical queue-view feature resource.
- Dashboard workbench and saved case views now import the canonical queue-view feature resource.
- The unused shared-module `queueViewDefinitionService` object/default export was removed; named exports remain the canonical contract.
- The active P5-T6 reference-pattern landing zone now points at `backend/src/modules/shared/queueViews/**` and `frontend/src/features/queueViews/api/queueViewsApiClient.ts`.

## Behavior Preserved

- `/api/v2/cases/queue-views`
- `/api/v2/dashboard/queue-views`
- `/api/v2/portal-admin/queue-views`
- Existing queue-view list, save, and archive payload behavior
- Existing API envelope unwrapping and response handling
- Existing authenticated workbench saved-queue loading and case-list saved-view behavior

## Validation

Original proof passed:

- `cd backend && npx jest --runTestsByPath src/__tests__/services/queueViewDefinitionService.test.ts src/modules/dashboard/__tests__/dashboard.queueViews.routes.test.ts src/__tests__/integration/cases.test.ts` - passed, `3` suites and `22` tests.
- `cd frontend && npm test -- --run src/features/dashboard/pages/__tests__/WorkbenchDashboardPage.test.tsx src/features/cases/pages/__tests__/CaseListPage.test.tsx` - passed, `2` files and `10` tests.
- `node scripts/check-route-validation-policy.ts` - passed.
- `node scripts/check-module-boundary-policy.ts` - passed.
- `node scripts/check-frontend-feature-boundary-policy.ts` - passed.
- `cd backend && npm run type-check` - passed.
- `cd frontend && npm run type-check` - passed.
- `make lint` - passed; includes backend/frontend ESLint, route validation, module-boundary, canonical-import, implementation-size, frontend feature-boundary, route integrity/catalog, UI audit, and active-doc API-version policy checks.
- `make typecheck` - passed for backend, frontend, and shared contracts.
- `make check-links` - passed, `212` files and `1412` local links.
- `git diff --check` - passed.

Follow-up import cleanup proof on 2026-05-09:

- `rg -n "from ['\"]@modules/shared/queueViews/queueViewDefinitionService|from ['\"].*features/cases/api/queueViewsApiClient|from ['\"].*cases/api/queueViewsApiClient|\\.\\./api/queueViewsApiClient" backend/src frontend/src --glob '!**/node_modules/**'` - confirmed no code imports rely on the service submodule path or deleted frontend cases shim path.
- `rg -n "backend/src/services/queueViewDefinitionService|frontend/src/features/cases/api/queueViewsApiClient|@services/queueViewDefinitionService|cases/api/queueViewsApiClient|features/cases/api/queueViewsApiClient|export default .*queueView|\\bqueueViewDefinitionService\\b" backend/src frontend/src docs/development docs/validation/P5-T91_QUEUE_VIEW_MODULARITY_PROOF_2026-05-08.md --glob '!**/node_modules/**'` - confirmed no root-service shim import, frontend cases shim import, or queue-view default/service-object export remains; remaining source hits are the internal module path, route registrar mock seam, and test name.
- `cd backend && npx jest --runTestsByPath src/__tests__/services/queueViewDefinitionService.test.ts src/modules/dashboard/__tests__/dashboard.queueViews.routes.test.ts` - passed, `2` suites and `13` tests.
- `cd frontend && npm test -- --run src/features/dashboard/pages/__tests__/WorkbenchDashboardPage.test.tsx src/features/cases/pages/__tests__/CaseListPage.test.tsx` - passed, `2` files and `10` tests.
- `cd backend && npm run type-check` - passed.
- `cd frontend && npm run type-check` - passed.
- `node scripts/check-module-boundary-policy.ts` - passed.
- `node scripts/check-canonical-module-import-policy.ts` - passed.
- `node scripts/check-frontend-feature-boundary-policy.ts` - passed.
- `node scripts/check-frontend-legacy-slice-import-policy.ts` - passed.
- `node scripts/check-frontend-legacy-page-path-policy.ts` - passed.
- `git diff --check` - passed.

Follow-up integration rerun note:

- `cd backend && npx jest --runTestsByPath src/__tests__/services/queueViewDefinitionService.test.ts src/modules/dashboard/__tests__/dashboard.queueViews.routes.test.ts src/__tests__/integration/cases.test.ts` - service and dashboard suites passed, but `src/__tests__/integration/cases.test.ts` failed before assertions because the isolated Jest DB listener was unavailable at `127.0.0.1:8012`.
- `cd backend && npm test -- --runTestsByPath src/__tests__/services/queueViewDefinitionService.test.ts src/modules/dashboard/__tests__/dashboard.queueViews.routes.test.ts src/__tests__/integration/cases.test.ts` - blocked before Jest because the Docker daemon was unavailable, so the supported wrapper could not prepare the isolated test DB.

Remaining-blocker rerun on 2026-05-10:

- Removed the direct `express-serve-static-core` type import from `backend/src/modules/shared/queueViews/queueViewRoutes.ts`; route middleware casts now use Express's exported `RequestHandler` type.
- `npm run knip` - the queue-view unlisted-dependency finding is gone. The command still reports unrelated residual findings for `backend/src/modules/mailchimp/controllers/campaignRunActionResponses.ts`, `backend/src/modules/mailchimp/services/mailchimpCampaignRunActionErrors.ts`, and root `express-rate-limit`; those are tracked under `P5-T94`.
- `cd backend && npm run type-check` - passed.
- `cd backend && npm test -- --runInBand src/modules/dashboard/__tests__/dashboard.queueViews.routes.test.ts src/__tests__/services/queueViewDefinitionService.test.ts` - passed, 2 suites and 13 tests.
- `cd frontend && npm test -- --run src/features/neoBrutalist/pages/__tests__/NeoBrutalistDashboardPage.test.tsx` - passed.
- `cd frontend && npm test -- --run --testTimeout=10000 src/features/dashboard/pages/__tests__/WorkbenchDashboardPage.test.tsx` - passed.
- `cd frontend && npm test -- --run src/features/cases/pages/__tests__/CaseListPage.test.tsx` - passed.

## Notes

- No migration, route URL, route catalog, root store, or dependency changes were made.
- Follow-up import tracing removed the queue-view compatibility re-exports; no runtime behavior changed.
