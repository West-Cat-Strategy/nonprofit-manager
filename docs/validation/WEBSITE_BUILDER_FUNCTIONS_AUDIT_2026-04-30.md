# Website Builder Functions Audit

**Last Updated:** 2026-04-30

**Task:** `P5-T21`
**Scope:** Website builder editor functions, site console surfaces, shared contracts, backend publishing/runtime, and E2E proof path.
**Disposition:** Audit artifact plus fix-now implementation follow-through. Broader editor/runtime refactors remain queued.

## Summary

- The website-builder surface is feature-owned and covered by focused frontend tests, plus a prior managed-form publish-loop E2E proof.
- The highest-priority `event-registration` runtime-path mismatch is fixed: the registry and console now expose the public events registration endpoint template, while the renderer uses the same backend helper for concrete event IDs.
- Referral-form property editing is now routed through the form editor with public-runtime fields for heading, description, submit text, success message, phone inclusion, default tags, and account ID.
- Builder drag/drop semantics are now deterministic across sections: pointer-aware component and palette drops insert before/after hovered components, while section-background and empty-section drops append to the section.
- Shared contract drift is now pinned by focused backend/frontend managed-form smoke tests. Future implementation should still move the unions/runtime metadata into a shared runtime contract before adding more form/runtime variants.

## Findings

| Priority | Affected Surface | Evidence | Recommended Fix | Proposed Test |
|---|---|---|---|---|
| P1 | Managed forms: `event-registration` | `docs/validation/P5-T4_MANAGED_FORM_PUBLISH_LOOP_REVIEW_2026-04-20.md` records the follow-up. `backend/src/services/publishing/formRegistryService.ts` includes `event-registration` in managed forms and emits `/api/v2/public/forms/:siteKey/:formKey/submit`, while `backend/src/modules/publishing/services/publicSiteRuntime/renderer.ts` renders event registration forms to `/api/v2/public/events/:event_id/registrations?site=:siteId`. `frontend/src/features/websites/lib/websiteConsole.ts` also includes it in managed-form prioritization and dependency metadata. | Choose one canonical contract. Recommended: keep `event-registration` in the website console as a connected CTA, but give it event-specific public runtime metadata instead of the generic public-form submission path. Update the console verification language so event registration points to the event detail runtime and public event registration API. | Backend: `formRegistryService` and `PublicSiteRenderer` tests proving event registration metadata and rendered action agree. Frontend: `websiteConsole` derivation test for event-registration verification. E2E: publish an event detail page and submit registration through the public site. |
| P2 | Builder editor drag/drop semantics | Implemented in `P5-T22`: `frontend/src/features/builder/pages/pageEditorControllerHelpers.ts` now resolves section, raw component, and legacy wrapper targets; `usePageSectionEditing.ts` derives pointer-aware before/after placement from drag geometry. | Complete. Keep future authoring controls on top of this helper-owned movement contract. | `pageEditorControllerHelpers.test.ts` and `usePageSectionEditing.test.tsx` now cover same-section reorder, cross-section moves, palette insert before/after hovered components, empty-section drops, no-op guardrails, and selection continuity. |
| P2 | Builder editor authoring affordances | `frontend/src/features/builder/components/editor/EditorCanvas.tsx` exposes select/delete and add-section actions, while `usePageSectionEditing.ts` exposes add/update/delete/drag handlers only. There is no duplicate component, duplicate section, move up/down, or keyboard-accessible placement command. | Add duplicate and move actions for selected component/section after the drag/drop helper semantics are stable. Keep controls inside the feature-owned builder editor and avoid route/store changes. | Component tests for duplicate/delete/move buttons plus hook tests proving generated IDs are unique and selection moves to the duplicated item. |
| P2 | Referral-form editor coverage | `contracts/websiteBuilder.d.ts`, `pageEditorUtils.ts`, the component palette, public renderer, and form registry all support `referral-form`, but `ComponentPropertyEditor.tsx` does not route `referral-form` to `FormComponentPropertyEditor`. It falls through to generic style editing. | Add a referral-form editor branch matching public-runtime fields: heading, description, submit text, success message, include phone, default tags/account if supported by the existing contract. | `PropertyPanel` or `ComponentPropertyEditor` test proving `referral-form` renders form behavior controls and updates the selected component. |
| P2 | Runtime rendering reuse | `backend/src/modules/publishing/services/publicSiteRuntime/renderer.ts` has async render paths for hero/columns so nested public forms can be runtime-bound; `backend/src/services/site-generator/componentRenderer.ts` has parallel hero/columns rendering for generated/static HTML. The duplication is understandable but drift-prone. | In a later refactor row, extract a shared nested rendering adapter or keep a single primitive-rendering layer with public-runtime overrides injected only where needed. Do not change this before the event-registration contract is clarified. | Existing `publicSiteRenderer.test.ts` for nested forms, plus generator/component-renderer tests that prove hero/columns output remains stable. |
| P2 | Managed form contract duplication | `contracts/websiteBuilder.d.ts` owns `ComponentType`, while `backend/src/types/publishing.ts` and `frontend/src/features/websites/types/contracts.ts` each define `WebsiteManagedFormType` and public runtime shapes. The frontend marks `publicRuntime` optional, while the backend publishing type treats it as required. | Move website managed-form/runtime metadata into the shared contracts package or add an export-smoke assertion that backend/frontend managed-form unions match the component contract. Preserve API response compatibility while tightening type ownership. | Contract smoke compile plus backend/frontend type-check. Add unit tests for `deriveWebsiteManagedFormVerification` on forms with and without `publicRuntime`. |
| P3 | Proof breadth | Current focused frontend tests cover builder helpers, editor canvas, and website console pages. The E2E proof in `e2e/tests/publishing.spec.ts` covers contact-form override, publish, public submit, and CRM lookup, but does not cover referral-form, donation-form, newsletter provider readiness, or event registration. | Keep the current contact-form E2E as the fast managed-form proof. Add one new public event-registration proof only when the P1 contract is fixed. Add smaller unit tests for other managed form variants rather than broadening E2E first. | Targeted E2E for event registration after fix; unit tests for referral/donation/newsletter console readiness. |

## Fix-Now Candidates

1. `P1` event-registration public-runtime contract mismatch: implemented on 2026-04-30.
2. `P2` referral-form property-editor coverage: implemented on 2026-04-30.
3. `P2` shared managed-form contract smoke: implemented on 2026-04-30.

## Future Row Candidates

1. Duplicate/move controls for selected components and sections.
2. Public renderer and static generator reuse cleanup.
3. Broader public-form E2E matrix after the event-registration contract is stable.

## Validation

- `cd frontend && npm test -- --run src/features/builder/components/editor/__tests__/PropertyPanel.test.tsx src/features/websites/lib/__tests__/websiteConsole.test.ts`
  - Result: Passed on 2026-04-30. `2` files and `5` tests green.
- `cd backend && npx jest --forceExit --runInBand src/__tests__/services/publishing/formRegistryService.test.ts src/__tests__/services/publishing/publicSiteRenderer.test.ts`
  - Result: Passed on 2026-04-30. `2` suites and `4` tests green. Jest emitted the existing localstorage-path warning and force-exit notice after completion.
- `cd frontend && npm run type-check`
  - Result: Passed on 2026-04-30.
- `cd backend && npm run type-check`
  - Result: Passed on 2026-04-30.
- `cd frontend && npm run lint`
  - Result: Passed on 2026-04-30.
- `cd backend && npm run lint`
  - Result: Passed on 2026-04-30.
- `node scripts/check-frontend-feature-boundary-policy.ts`
  - Result: Passed on 2026-04-30.
- `node scripts/check-module-boundary-policy.ts`
  - Result: Passed on 2026-04-30.
- `node scripts/check-canonical-module-import-policy.ts`
  - Result: Passed on 2026-04-30.
- `git diff --check`
  - Result: Passed on 2026-04-30.
- `make check-links`
  - Result: Passed on 2026-04-30. Checked `155` files and `1313` local links with no broken active-doc links.
- `cd frontend && npm test -- --run src/features/builder/pages/__tests__/pageEditorControllerHelpers.test.ts src/features/builder/pages/__tests__/usePageSectionEditing.test.tsx`
  - Result: Passed on 2026-04-30. `2` files and `27` tests green.
- `cd frontend && npm run type-check`
  - Result: Passed on 2026-04-30.
- `cd frontend && npm run lint`
  - Result: Passed on 2026-04-30.
- `node scripts/check-frontend-feature-boundary-policy.ts`
  - Result: Passed on 2026-04-30.
- `make check-links`
  - Result: Passed on 2026-04-30. Checked `155` files and `1313` local links with no broken active-doc links.
- `cd backend && npm test -- --runInBand src/__tests__/services/publishing/formRegistryService.test.ts src/__tests__/services/publishing/publicSiteRenderer.test.ts`
  - Result: Blocked on 2026-04-30 before Jest started because the local Docker daemon was unavailable: `Cannot connect to the Docker daemon at unix:///Users/bryan/.docker/run/docker.sock. Is the docker daemon running?`
- `cd frontend && npm test -- --run src/features/builder/pages/__tests__/pageEditorControllerHelpers.test.ts src/features/builder/pages/__tests__/usePageSectionEditing.test.tsx src/features/builder/components/editor/__tests__/EditorCanvas.test.tsx src/features/websites/pages/__tests__/WebsiteOverviewPage.test.tsx src/features/websites/pages/__tests__/WebsiteFormsPage.test.tsx src/features/websites/pages/__tests__/WebsitePublishingPage.test.tsx`
  - Result: Passed on 2026-04-30. `6` files and `27` tests green.
- `node scripts/check-frontend-feature-boundary-policy.ts`
  - Result: Passed on 2026-04-30.
- `node scripts/check-module-boundary-policy.ts`
  - Result: Passed on 2026-04-30.
- `node scripts/check-canonical-module-import-policy.ts`
  - Result: Passed on 2026-04-30.
- `make check-links`
  - Result: Passed on 2026-04-30. Checked `155` files and `1313` local links with no broken active-doc links.
- `cd backend && npm test -- --runInBand src/__tests__/services/publishing/formRegistryService.test.ts src/__tests__/services/publishing/publicSiteRenderer.test.ts src/__tests__/services/publishing/siteOperationsService.test.ts src/__tests__/services/publishing/publicWebsiteFormService.test.ts`
  - Result: Blocked on 2026-04-30 before Jest started because the local Docker daemon was unavailable: `Cannot connect to the Docker daemon at unix:///Users/bryan/.docker/run/docker.sock. Is the docker daemon running?`

## Notes

- No database migration was required for the fix-now candidates; event-registration uses runtime metadata and the existing public events registration API.
- Future work remains intentionally separate: duplicate/move controls, renderer/generator reuse cleanup, and broader public-form E2E coverage.
