# P5-T41 Case Form Template Builder Proof - 2026-05-01

## Scope

`P5-T41` extends the existing case-form module with contact-free template drafts, case-owned customizable assignment copies, debounced autosave, and multi-channel form opening by portal, email, and SMS. The implementation keeps the custom schema and renderer; OSS form-builder repositories are reference-only.

## Implementation Notes

- Added migration `114_case_form_templates_and_delivery_channels.sql` for nullable template case types, template status, autosave provenance, saved-from-assignment provenance, assignment delivery channels, recipient phone, structure autosave timestamps, access-token delivery metadata, and the staff-only `opened` event type.
- Added staff APIs for template list/create/autosave and saving a customized assignment back as a draft template.
- Updated form opening to accept `delivery_channels` while keeping legacy `delivery_target`, generate secure links for email/SMS, send email through SMTP, send SMS through Twilio, and keep portal delivery visible in the existing portal forms inbox.
- Added case-form UI affordances for the template library, blank draft templates, case instantiation, save-as-template, structure autosave, answer autosave, recipient phone, and channel checkboxes.
- Added portal and secure public-link answer autosave while keeping Submit/Resubmit as the submission-recording actions.
- Cloned and pinned Formera, Form.io JS, Formspec, RJSF, OpnForm, and SurveyJS Creator in the reference-repo store with license/reuse notes and compatibility aliases.

## Validation

| Command | Result |
|---|---|
| `cd backend && npm run type-check` | Pass after the public-action runtime follow-up |
| `cd backend && npx jest src/modules/cases/usecases/__tests__/caseForms.usecase.test.ts --runInBand --forceExit` | Pass, `21` tests |
| `cd backend && npm test -- caseForms.usecase.test.ts --runInBand` | Pass, `23` tests after adding SMTP/Twilio failure-ordering coverage |
| `cd frontend && npx vitest run src/features/cases/components/__tests__/CaseFormsPanel.test.tsx src/features/cases/caseForms/__tests__/CaseFormsBuilderCard.test.tsx src/features/cases/caseForms/__tests__/CaseFormsPreviewHistory.test.tsx src/features/portal/pages/__tests__/PortalFormsPage.test.tsx src/features/portal/pages/__tests__/PublicCaseFormPage.test.tsx` | Pass, `14` tests |
| `cd frontend && npm test -- --run src/features/cases/components/__tests__/CaseFormsPanel.test.tsx src/features/portal/pages/__tests__/PortalFormsPage.test.tsx src/features/portal/pages/__tests__/PublicCaseFormPage.test.tsx` | Pass, `11` tests |
| `make db-verify` | Pass |
| `make lint-route-validation` | Pass |
| `make lint-v2-module-ownership` | Pass |
| `node /Users/bryan/projects/reference-repos/scripts/validate-reference-index.mjs /Users/bryan/projects/reference-repos` | Pass, `43` repos |
| `make check-links` | Pass |
| `git diff --check -- backend/src/modules/cases backend/src/types/caseForms.ts backend/src/validations/caseForms.ts frontend/src/features/cases frontend/src/features/portal/pages frontend/src/types/caseForms.ts database docs/development/reference-patterns reference-repos docs/phases/planning-and-progress.md` | Pass |

## Follow-Up Remediation

The May 1 E2E/Playwright remediation pass moved SMTP/Twilio provider delivery before the transaction that revokes/creates access tokens, marks the assignment sent, records the staff `opened` evidence event, and writes the lifecycle note. Provider failures now return `502` without committing success-like case-form state, so the assignment remains retryable.

Earlier `cd backend && npm run type-check` output was blocked by unrelated website public-action/publishing runtime type errors outside the case-form slice:

- `src/modules/publishing/services/publicSiteRuntime/renderer.ts(111,24): TS2339`
- `src/modules/publishing/services/publicSiteRuntime/renderer.ts(111,61): TS2339`
- `src/modules/publishing/services/publicSiteRuntime/renderer.ts(112,21): TS2339`

During the original case-form proof, `cd frontend && npm run type-check` reported these pre-existing builder-page type errors outside the case-form slice:

- `src/features/builder/pages/pageEditorControllerHelpers.ts(359,7): TS2590`
- `src/features/builder/pages/pageEditorUtils.ts(53,9): TS2739`

The May 3 scoped builder type cleanup resolved the stale frontend blocker by tightening the page-editor component defaults and component-update helper types without changing builder behavior, website public-action behavior, routes, migrations, or redesign scope.

| Command | Result |
|---|---|
| `cd frontend && npm test -- --run src/features/builder/pages/__tests__/pageEditorControllerHelpers.test.ts src/features/builder/pages/__tests__/usePageSectionEditing.test.tsx` | Pass, `37` tests |
| `cd frontend && npm run type-check` | Pass |
| `cd frontend && npx tsc -b --pretty false --force` | Pass |

The focused case-form and portal/public form tests above passed after the `opened` event label and new component props were covered.
