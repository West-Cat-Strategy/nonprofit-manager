# P5-T47 Reassessment Due Cues Proof

**Date:** 2026-05-02

## Scope

`P5-T47` improves staff-facing case reassessment cues inside the existing case detail reassessment panel while keeping `P5-T6` as the Phase 5 scope-control gate.

Implemented scope:

- Added actionable cue text for overdue, due-today, due-soon, open review-window, lapsed-window, completed, and cancelled reassessment states.
- Kept the current and next reassessment cards on the existing Follow-ups tab surface.
- Added a compact recent reassessment history section so completed or cancelled evidence remains visible after active reassessments move on.
- Preserved existing reassessment create, edit, complete, cancel, and schedule-next behavior.
- Added focused component coverage for overdue staff follow-through cues, open review-window cues, and completed reassessment evidence.

Out of scope:

- Backend APIs, database migrations, route changes, portal/public surfaces, case-form review semantics, service-site routing, closure-continuity packets, generic workflow tooling, dashboards, broader case-management redesign, and new reporting surfaces.

## Interface Summary

No public API routes, backend contracts, database migrations, initdb changes, manifest changes, route catalog entries, portal contracts, or frontend API-client contracts were added.

The change is limited to the existing staff-facing `CaseReassessmentPanel` rendering and its focused component tests.

## Validation

Passed:

```bash
cd frontend && npm test -- --run src/features/cases/components/__tests__/CaseReassessmentPanel.test.tsx
cd frontend && npm run type-check
cd frontend && npm run lint
node scripts/check-frontend-feature-boundary-policy.ts
```

Known validation notes:

- `make db-verify` was not run because this row does not change migrations, `database/initdb/000_init.sql`, or `database/migrations/manifest.tsv`.
- Route catalog drift checks were not required because no routes or route manifests changed.
