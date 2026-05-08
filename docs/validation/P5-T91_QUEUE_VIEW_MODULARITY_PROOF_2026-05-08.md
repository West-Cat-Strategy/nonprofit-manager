# P5-T91 Queue View Modularity Proof - 2026-05-08

## Scope

`P5-T91` is a behavior-preserving full-stack modularity refactor for queue views.

The change keeps public queue-view routes, response envelopes, auth behavior, route catalogs, root store keys, and database schema unchanged while moving queue-view implementation toward shared module and feature resources.

## Implementation Summary

- Backend queue-view service/types now live under `backend/src/modules/shared/queueViews/**`.
- `backend/src/services/queueViewDefinitionService.ts` remains as a compatibility re-export for existing imports.
- Cases, dashboard, and portal-admin queue-view endpoints use the shared queue-view route registrar while preserving existing endpoint paths, validators, auth/permission gates, forced surfaces, owner scoping, and permission scopes.
- Frontend queue-view API/types now live under `frontend/src/features/queueViews/api/queueViewsApiClient.ts`.
- `frontend/src/features/cases/api/queueViewsApiClient.ts` remains as a compatibility re-export.
- Dashboard workbench and saved case views now import the canonical queue-view feature resource.

## Behavior Preserved

- `/api/v2/cases/queue-views`
- `/api/v2/dashboard/queue-views`
- `/api/v2/portal-admin/queue-views`
- Existing queue-view list, save, and archive payload behavior
- Existing API envelope unwrapping and response handling
- Existing authenticated workbench saved-queue loading and case-list saved-view behavior

## Validation

Passed:

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

## Notes

- No migration, route URL, route catalog, root store, or dependency changes were made.
- Compatibility re-exports remain intentionally; deletion requires a later import-tracing pass.
