# P5-T93 Case-Form Authoring Diagnostics Proof - 2026-05-10

**Status:** Review - needs fix

`P5-T93` implements the first signed-out reference-repo follow-through slice from the latest form-builder scouting pass. The change stays frontend-only and adds local authoring diagnostics to the existing case-form builder.

## Scope

- Added builder diagnostics for duplicate or blank question keys, invalid conditional visibility JSON, missing referenced question keys, blank mapping targets, option-less choice fields, and upload MIME issues.
- Rendered a non-blocking `Authoring diagnostics` panel in the existing builder so staff can review warning counts and messages before saving.
- Kept the slice local to the existing case-form builder utilities and UI. No migration, backend route, runtime dependency, form engine, schema DSL, AI builder, or server-side conformance service was added.

## Focused Proof

| Command | Result |
|---|---|
| `cd frontend && npm test -- --run src/features/cases/caseForms/__tests__/CaseFormsBuilderCard.test.tsx src/features/cases/caseForms/__tests__/caseFormsPanelUtils.test.ts` | Passed: 2 files, 3 tests |
| `cd frontend && npm run type-check` | Passed |
| `cd frontend && npm run lint` | Passed |
| `make check-links` | Passed: 214 files and 1416 local links |
| `git diff --check -- docs/phases/planning-and-progress.md docs/validation/README.md docs/validation/P5-T93_CASE_FORM_AUTHORING_DIAGNOSTICS_PROOF_2026-05-10.md frontend/src/features/cases/caseForms/CaseFormsBuilderCard.tsx frontend/src/features/cases/caseForms/caseFormsPanelUtils.ts frontend/src/features/cases/caseForms/__tests__/CaseFormsBuilderCard.test.tsx frontend/src/features/cases/caseForms/__tests__/caseFormsPanelUtils.test.ts` | Passed |

## Review Update - 2026-05-10

- Read-only review found a diagnostics false-positive: valid single-checkbox questions without options can be reported as option-less, even though the renderer uses options only for multiple-checkbox questions.
- The exact two-file Vitest command above timed out under default file parallelism during review; the same files passed with `--fileParallelism=false`, so the focused proof needs either a reproducible default run or an explicit serial command in the proof.
- `cd frontend && npm run type-check`, `cd frontend && npm run lint`, `make check-links`, and tracked path-scoped `git diff --check` passed during review.

## Boundaries

- Diagnostics are staff authoring feedback and do not introduce new save-blocking policy beyond existing validation.
- Reference repositories informed the warning categories only; no reference source, schema, UI text, or distinctive implementation was copied.
- Public intake tray, local campaign pause/resume, donation batch shell, compliance document retention cues, and broader form-builder engines remain separate future rows.
