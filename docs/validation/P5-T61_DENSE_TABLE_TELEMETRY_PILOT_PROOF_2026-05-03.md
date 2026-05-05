# P5-T61 Dense Table And Telemetry Pilot Proof - 2026-05-03

## Scope

`P5-T61` piloted TanStack Table on one dense admin grid and added backend-first telemetry metrics.

## Implementation

- Added `@tanstack/react-table` to the frontend workspace.
- Converted the audit-log admin table to TanStack Table column definitions and `useReactTable`.
- Preserved the existing audit-log backend contract, server pagination, loading, error, warning, empty/disabled states, refresh behavior, and dense visual layout.
- Review-batch follow-up constrains and wraps long audit-log user-agent/detail cell content to prevent dense-table overflow on narrow admin surfaces.
- Added low-cardinality backend metrics on the existing Prometheus surface:
  - `backend_request_outcomes_total`
  - `backend_request_duration_seconds`
- Metrics are grouped by method, route family, status class, and outcome where applicable.
- Browser telemetry, public dashboards, workflow/queue platforms, broad admin table rewrites, and backend API changes remain deferred.

## Validation

- `cd frontend && npm test -- --run src/features/adminOps/pages/adminSettings/sections/AuditLogsSection.test.tsx` - passed, 4 tests.
- `cd frontend && npm run type-check` - passed.
- `cd frontend && npm run lint` - passed.
- `node scripts/check-frontend-feature-boundary-policy.ts` - passed.
- `cd backend && npx jest --runTestsByPath src/__tests__/middleware/metrics.test.ts --runInBand` - passed, 3 tests.
- `cd backend && npm run type-check` - passed.
- `cd backend && npx eslint src/middleware/metrics.ts src/__tests__/middleware/metrics.test.ts` - passed.
- `git diff --check -- frontend/src/features/adminOps/pages/adminSettings/sections/AuditLogsSection.tsx frontend/src/features/adminOps/pages/adminSettings/sections/AuditLogsSection.test.tsx backend/src/middleware/metrics.ts backend/src/__tests__/middleware/metrics.test.ts` - passed.
- `npm run knip` - passed with no findings.
- `npm run audit` - passed, 0 vulnerabilities.
- `make security-audit` - passed, 0 vulnerabilities.
- `node scripts/ui-audit.ts --enforce-baseline` - passed after refreshing the semantic-token baseline for the new failure-state/table pilot UI.
- Review-batch follow-up: `cd frontend && npm test -- --run src/features/adminOps/pages/portalAdmin/panels/__tests__/PortalPanels.test.tsx src/features/adminOps/pages/portalAdmin/PortalAdminPage.test.tsx src/features/adminOps/pages/adminSettings/sections/AuditLogsSection.test.tsx` - passed, 3 files / 30 tests.
- Review-batch follow-up: `cd frontend && npm run type-check` - passed.
- Review-batch follow-up: `git diff --check` - passed.

## Notes

- `cd backend && npm test -- --runTestsByPath src/__tests__/middleware/metrics.test.ts --runInBand` did not reach Jest because the backend wrapper could not connect to Docker. Direct Jest was used for focused metrics proof.
