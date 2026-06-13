# P5-T133 Dense Control And Report Builder Accessibility Proof

**Date:** 2026-05-15
**Workboard Row:** `P5-T133`
**Scope:** Dense-control accessibility, case-form builder extraction, report-builder loading/error states, and implementation-size closeout for the two documented residual blockers

## Scope

This pass extracts the oversized case-form builder coordinator, improves label/control associations in dense authoring controls, replaces report-builder button-only/alert error feedback with in-page states, and closes the two residual implementation-size blockers documented by the first proof run. Backend report query, export, route, and database semantics are unchanged.

Changed surfaces:

- `frontend/src/features/cases/caseForms/CaseFormsBuilderCard.tsx`
- New case-form builder helpers/components under `frontend/src/features/cases/caseForms/`
- `frontend/src/features/builder/components/editor/propertyPanel/**`
- `frontend/src/components/FilterBuilder.tsx`
- `frontend/src/components/SortBuilder.tsx`
- `frontend/src/features/reports/pages/ReportBuilderPage.tsx`
- Focused frontend tests for the touched controls
- `backend/src/services/publishing/publicActionService.ts`
- New `backend/src/services/publishing/publicActionRowMappers.ts`
- `frontend/src/types/case.ts`
- New `frontend/src/types/caseActivity.ts`

## Contract Notes

- `CaseFormsBuilderCard.tsx` is now a thin coordinator under the implementation-size cap; question editing, metadata fields, diagnostics, and header behavior live in feature-owned subcomponents.
- `publicActionService.ts` is now under the implementation-size cap after moving row mappers and shared value normalization into a publishing-owned helper module.
- `case.ts` is now under the implementation-size cap after moving case activity, document, and timeline type exports into a sibling type module while preserving the existing `./types/case` re-export path.
- Case-form builder controls keep stable `htmlFor`/`id` associations while preserving current schema and authoring behavior.
- Website builder property-panel fields use a local wrapper/helper for stable label/control IDs and checkbox labels.
- Report filters and sorts now expose stable labels and accessible names for repeated field/operator/value/move/remove controls.
- Report builder export loading and error feedback use in-page `LoadingState`/`ErrorState` surfaces instead of relying on transient button text or alert-only behavior.

## Targeted Proof

Passed:

```bash
cd frontend && npm test -- --run src/features/cases/caseForms/__tests__/CaseFormsBuilderCard.test.tsx src/features/builder/components/editor/__tests__/PropertyPanel.test.tsx src/features/builder/components/editor/propertyPanel/__tests__/BasicComponentPropertyEditor.test.tsx src/components/__tests__/FilterBuilder.test.tsx src/components/__tests__/SortBuilder.test.tsx src/components/__tests__/FieldSelector.test.tsx
cd frontend && npm test -- --run src/features/reports/pages/__tests__/ReportBuilderPage.test.tsx
cd frontend && npm run type-check
cd frontend && npm run lint
cd backend && npm run type-check
cd backend && npm run lint
npx jest src/__tests__/services/publishing/publicActionService.test.ts --runInBand
node scripts/check-implementation-size-policy.ts
make typecheck
```

Partial:

```bash
cd backend && npm test -- --run src/__tests__/integration/publishing.test.ts
npx jest --forceExit src/__tests__/integration/publishing.test.ts
```

Result: The implementation-size policy now passes; `CaseFormsBuilderCard.tsx`, `backend/src/services/publishing/publicActionService.ts`, and `frontend/src/types/case.ts` are all under the cap. The DB-backed publishing integration rerun remains blocked locally: the package wrapper cannot connect to the Docker API at `unix:///Users/bryan/.docker/run/docker.sock`, and direct Jest cannot prepare the test database because `127.0.0.1:8012` refuses connections.

Follow-up blocker-clearance run, 2026-05-15:

- Passed: `node scripts/check-implementation-size-policy.ts`.
- Passed: `cd backend && npx jest src/__tests__/services/publishing/publicActionService.test.ts --runInBand` (`12` tests).
- Passed: `cd frontend && npm run type-check`.
- Blocked before Jest: `cd backend && npm test -- publicActionService.test.ts --runInBand` because the backend package wrapper requires a reachable Docker daemon and Docker was unavailable in this checkout.

## Boundaries

- No DB, report query, export-job, route-catalog, PDF export, or public-site rendering changes.
- Backend changes are limited to behavior-preserving public-action row mapper/value-helper extraction.
