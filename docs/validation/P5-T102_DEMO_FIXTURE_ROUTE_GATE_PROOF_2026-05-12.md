# P5-T102 Demo Fixture Route Gate Proof

**Date:** 2026-05-12  
**Status:** Review  
**Workboard row:** [P5-T102](../phases/planning-and-progress.md)

## Scope

Gate the unauthenticated `/demo/*` fixture routes so they remain available for deterministic QA and test coverage without being mounted as a default public product surface.

Included:

- Add an explicit `VITE_DEMO_ROUTES_ENABLED` gate for browser demo fixtures.
- Keep demo fixtures enabled in automated tests.
- Keep route-catalog metadata honest about disabled-by-default demo fixtures.
- Preserve `/people`, `/linking`, `/operations`, and `/outreach` staff shortcut behavior from `P5-T100`.

Excluded:

- Removing demo fixtures.
- Changing P5-T100 Linking/Outreach search behavior.
- Backend auth, API, or migration changes.

## Implementation Notes

- `frontend/src/services/loop/demo.ts` now exposes `areDemoRoutesEnabled`, `isDemoPath`, and the `VITE_DEMO_ROUTES_ENABLED` env key.
- `frontend/src/routes/index.tsx` only mounts `/demo/*` routes when demo fixtures are enabled.
- `frontend/src/routes/routeCatalog/demo.ts` marks demo entries as `flag-disabled` behind `VITE_DEMO_ROUTES_ENABLED`.
- `frontend/src/services/bootstrap/staffBootstrap.ts` only bypasses staff bootstrap on `/demo/*` when demo fixtures are enabled, so disabled demo paths do not create an unauthenticated bootstrap bypass.
- `docs/features/FEATURE_MATRIX.md` now records `/demo/*` as non-product demo and QA fixtures enabled only by the explicit env flag or tests.

## Validation Proof

- Pass: `cd frontend && npm test -- --run src/routes/__tests__/routeCatalog.test.ts src/services/loop/__tests__/demo.test.ts src/services/bootstrap/__tests__/staffBootstrap.test.ts` (3 files, 27 tests).
- Pass: integrated frontend slice including route/demo/bootstrap tests (10 files, 67 tests).
- Pass: `cd frontend && npm run type-check`.
- Pass: `make lint-route-integrity`.
- Pass: `make lint-route-catalog-drift`.
- Pass: `git diff --check`.
