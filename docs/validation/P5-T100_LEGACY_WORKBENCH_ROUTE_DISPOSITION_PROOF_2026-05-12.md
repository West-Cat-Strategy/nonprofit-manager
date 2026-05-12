# P5-T100 Legacy Workbench Route Disposition Proof

**Date:** 2026-05-12  
**Status:** Review  
**Workboard row:** [P5-T100](../phases/planning-and-progress.md)

## Scope

Resolve the mounted legacy/workbench route findings without removing routes or expanding product scope.

Included:

- Keep `/people`, `/linking`, `/operations`, `/outreach`, and `/demo/*` mounted.
- Document `/people`, `/linking`, `/operations`, and `/outreach` as secondary workbench shortcuts with canonical routes named beside them.
- Document `/demo/*` as non-product demo/QA fixtures.
- Wire Linking and Outreach search inputs so visible controls filter their rendered rows and expose an empty-results state.

Excluded:

- Backend APIs, migrations, auth changes, and portal changes.
- Route removal or environment-gating for `/demo/*`.
- Runtime implementation for queued `P5-T6` product expansion.

## Implementation Notes

- `/people`, `/linking`, `/operations`, `/outreach`, and `/demo/*` remain mounted.
- `docs/features/FEATURE_MATRIX.md` and `docs/product/product-spec.md` now describe the staff shortcuts as secondary workbench routes and name their canonical product routes beside them.
- `/demo/*` is now documented as deterministic non-product demo/QA fixture coverage instead of customer-facing capability.
- Linking search now filters by visible organization fields and shows an empty-results state.
- Outreach search now filters visible campaign/event rows and shows an empty-results state.

## Validation Proof

- Pass: `cd frontend && npm test -- --run src/routes/__tests__/routeCatalog.test.ts src/features/neoBrutalist/pages/__tests__/LinkingModulePage.test.tsx src/features/neoBrutalist/pages/__tests__/OutreachCenterPage.test.tsx src/features/dashboard/pages/__tests__/WorkbenchDashboardPage.test.tsx src/services/loop/__tests__/demo.test.ts` (5 files, 35 tests).
- Pass: `cd frontend && npm run type-check`.
- Pass: `cd frontend && npm run lint`.
- Pass: `make lint-route-integrity`.
- Pass: `make lint-route-catalog-drift`.
- Pass: `make check-links` (225 files, 1453 local links).

## Follow-Up Notes

- Future removal or environment-gating of demo routes should be opened as a separate signed-out row if desired.
