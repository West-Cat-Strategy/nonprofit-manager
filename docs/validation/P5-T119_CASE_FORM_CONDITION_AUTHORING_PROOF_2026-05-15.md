# P5-T119 Case-Form Condition Authoring Proof

`P5-T119` implements the next additive case-form builder slice over the existing staff authoring surface. The change stays inside the current case-form schema and frontend builder utilities.

## Scope

- Added structured conditional visibility controls that create and edit the existing `visible_when` rule array through question-key, operator, and value controls.
- Kept the advanced JSON editor for compatibility while syncing structured edits back into the same JSON contract.
- Added safer mapping target pickers for contact fields and common case `intake_data` / `custom_data` targets, with custom case-key fallback preserved.
- Extended diagnostics to flag self-referencing conditional rules and value-less value operators.
- Did not add RJSF, Form.io, OpnForm, SurveyJS, migrations, backend schema changes, public/portal runtime changes, or approval-workflow changes.

## Validation

| Command | Result |
|---|---|
| `cd frontend && npm test -- --run src/features/cases/caseForms/__tests__/CaseFormsBuilderCard.test.tsx src/features/cases/caseForms/__tests__/caseFormsPanelUtils.test.ts` | Passed: 2 files, 7 tests |
| `cd frontend && npx eslint src/features/cases/caseForms/CaseFormsBuilderCard.tsx src/features/cases/caseForms/caseFormsPanelUtils.ts src/features/cases/caseForms/__tests__/CaseFormsBuilderCard.test.tsx src/features/cases/caseForms/__tests__/caseFormsPanelUtils.test.ts` | Passed |
| `git diff --check -- docs/phases/planning-and-progress.md docs/validation/README.md frontend/src/features/cases/caseForms/CaseFormsBuilderCard.tsx frontend/src/features/cases/caseForms/caseFormsPanelUtils.ts frontend/src/features/cases/caseForms/__tests__/CaseFormsBuilderCard.test.tsx frontend/src/features/cases/caseForms/__tests__/caseFormsPanelUtils.test.ts` | Passed |
| `cd frontend && npm run type-check` | Blocked by unrelated existing `src/features/reports/pages/BoardPacketWorkspacePage.tsx(335,32)` `Button` `as` prop type error from the active `P5-T116` lane |

## 2026-05-15 Caveat Rerun

The comprehensive strengthening batch reran the inherited caveat checks after the board-packet lane landed:

| Command | Result |
|---|---|
| `cd frontend && npm test -- --run src/features/cases/components/__tests__/CaseHandoffPacket.test.tsx src/features/cases/caseForms/__tests__/CaseFormsBuilderCard.test.tsx src/features/cases/caseForms/__tests__/caseFormsPanelUtils.test.ts` | Passed: 3 files, 10 tests |
| `cd frontend && npm run type-check` | Passed |

## Contract Notes

- `visible_when` remains `CaseFormLogicRule[]` with the existing operators.
- `mapping_target` remains `{ entity: 'contact' | 'case', field?, container?, key? }`.
- The tests prove the new condition controls avoid invalid self-reference/value-less states through diagnostics and that mapping picker choices clear blank-target diagnostics without blocking save behavior.
