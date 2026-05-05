# P5-T65 Outcomes Report Program ID Contract Proof - 2026-05-05

## Scope

`P5-T65` removes `programId` from the accepted outcomes report contract.

## Implementation

- Removed `programId` from `outcomesReportQuerySchema`.
- Made the outcomes report query schema strict so unsupported query keys fail request validation before the controller.
- Removed the controller-level `programId` rejection branch and stopped passing `programId` into `OutcomeReportFilters`.
- Removed `programId` from the backend `OutcomeReportFilters` type.
- Removed the stale frontend `OutcomesReportFilters.programId` type field so the shared UI type no longer advertises unsupported filters.
- Added focused validation and controller tests proving the supported query filters still pass and `programId` is rejected at validation.

## Non-Scope

- No program-scoped filtering was implemented because the current case note, contact note, and case outcome sources do not expose a durable program join model.
- No report-builder, frontend outcomes report UI, database migration, broader report filter, analytics dashboard, or generic reports redesign work was included.
- No API reference or OpenAPI parameter removal was needed; the active API docs list `/api/v2/reports/outcomes` but do not document `programId` as an accepted query parameter.

## Validation

| Command | Result |
|---|---|
| `cd backend && npx jest --runTestsByPath src/__tests__/unit/validations/outcomeImpact.validation.test.ts src/modules/reports/controllers/__tests__/outcomeReport.handlers.test.ts src/__tests__/services/outcomeReportService.test.ts --runInBand` | Pass: 3 suites, 5 tests |
| `cd backend && npm run type-check` | Pass |
| `cd backend && npx eslint src/validations/outcomeImpact.ts src/types/outcomes.ts src/modules/reports/controllers/outcomeReport.handlers.ts src/__tests__/unit/validations/outcomeImpact.validation.test.ts src/modules/reports/controllers/__tests__/outcomeReport.handlers.test.ts src/__tests__/services/outcomeReportService.test.ts` | Pass |
| `cd frontend && npx eslint src/types/outcomes.ts` | Pass |
| `cd frontend && npm run type-check` | Pass |
| `make check-links` | Pass: 196 files and 1508 local links |
| `git diff --check` | Pass |

## Notes

- The controller still defaults omitted `source` to `all` and omitted `bucket` to `week`.
- `includeNonReportable` remains admin-only after validation, unchanged by this cleanup.
