# P5-T92 Public Action Staff Transitions Follow-up Proof

**Date:** 2026-05-09
**Row:** P5-T92
**Status:** Proof complete

## Scope

This proof covers the narrow website forms console follow-up for public-action
submission review controls.

In scope:

- Staff accept, reject, and fulfill controls in the existing website forms console.
- Frontend API client methods for the landed staff transition routes.
- Focused proof for pledge acceptance, explicit rejection, support-letter fulfillment, and invalid transition visibility.

Out of scope: backend route redesign, database migrations, public analytics,
generic workflow tooling, bulk review actions, and broader website-builder
redesign.

## Implementation Summary

- Added shared public-action submission transition types to the website-builder
  contract surface and reused them through the frontend website API client.
- Added `acceptPublicActionSubmission`, `rejectPublicActionSubmission`, and
  `fulfillPublicActionSubmission` client methods that call the existing
  `/sites/:siteId/actions/:actionId/submissions/:submissionId/{accept,reject,fulfill}`
  routes.
- Added row-local staff controls in `PublicActionSubmissionsPanel` and kept the
  existing `WebsiteFormsPage` -> `WebsitePublicActionsSection` ->
  `PublicActionSubmissionsPanel` composition.
- Updated successful transitions in place, cleared stale support-letter preview
  state for the transitioned submission, and left failures non-mutating with an
  error notice.

## Validation

Passed:

- `cd frontend && npm test -- --run src/features/websites/pages/__tests__/WebsiteFormsPage.test.tsx`
  - Result: 1 file passed, 9 tests passed.
- `cd frontend && npm test -- --run src/features/websites/pages/__tests__/WebsiteFormsPage.test.tsx -t "rejects public-action submissions"`
  - Result: 1 test passed.
- `cd frontend && npm run type-check`
- `cd frontend && npm run lint`
- `cd contracts && npm run type-check`
- `npx eslint src/features/websites/pages/__tests__/WebsiteFormsPage.test.tsx`
- `git diff --check -- frontend/src/features/websites/pages/__tests__/WebsiteFormsPage.test.tsx`

Not run:

- Backend route/service tests.

Reason: this follow-up used the already-landed backend transition routes and
services covered by `P5-T83`; the implementation change was frontend client/UI
wiring plus the shared contract type export.
