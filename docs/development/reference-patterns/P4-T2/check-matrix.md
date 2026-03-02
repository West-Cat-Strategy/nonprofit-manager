# P4-T2 Check Matrix

## Fast Checks (used during implementation)

- `cd backend && npm run type-check`
- `cd backend && npm run lint`
- `cd frontend && npm run type-check`
- `cd frontend && npm run lint`
- `cd backend && npm test -- src/__tests__/integration/referencePatternRoutes.test.ts src/__tests__/utils/permissions.referenceAdoption.test.ts`
- `cd frontend && npm test -- src/store/slices/__tests__/scheduledReportsSlice.test.ts src/store/slices/__tests__/opportunitiesSlice.test.ts src/pages/__tests__/RouteUxSmoke.test.tsx`

## Strict Matrix (recommended before merge)

- `scripts/select-checks.sh --files "<full changed set>" --mode strict`
- `make db-verify`
- `make lint`
- `make typecheck`
- `cd backend && npm run test:integration -- src/__tests__/integration/referencePatternRoutes.test.ts`
- `cd frontend && npm test -- src/pages/__tests__/RouteUxSmoke.test.tsx`
- `cd e2e && npm run test:smoke`

## Notes

- Feature schedulers remain disabled by default behind env flags.
- Migrations are additive and intended for deploy-before-enable rollout.
