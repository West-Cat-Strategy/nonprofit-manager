# P5-T4 Managed Form Publish-Loop Review

**Last Updated:** 2026-04-25

**Date:** 2026-04-20  
**Task:** `P5-T4`  
**Row:** Website surfaces wave: website builder plus public website

## Summary

- Commit `82a26d39` landed the coordinated managed-form publish-loop slice across backend publishing/runtime metadata, website-console verification UI, and site-aware builder cues.
- The remaining `docs-e2e` gap is now closed for the narrow row-local slice: the Playwright proof saves a real site-level form override from `/websites/:siteId/forms`, publishes from `/websites/:siteId/publishing`, then verifies the override on the public site before submission.
- `P5-T4` is in `Review` on the live workboard. The shared `P5-T2B` host-plus-Docker validation lane is now green, so this row waits on final row-local signoff rather than broad validation follow-through.

## Landed Lanes

- `backend-publishing-runtime`
  - Landed in `82a26d39` with managed-form `publicRuntime` metadata, site-console runtime context, and same-host public-form CORS follow-through.
- `frontend-websites-console`
  - Landed in `82a26d39` with the managed-form verification panel wired into website overview, forms, and publishing surfaces.
- `frontend-builder`
  - Landed in `82a26d39` with site-aware builder cues, managed-form counts, and editor follow-up links back into the website console loop.
- `docs-e2e`
  - Closed in this pass by aligning the testing guide to the current Docker-backed host-runtime assumption and by adding the override-to-public Playwright proof described above.

## Scope Note

- This closeout is intentionally scoped to one generic managed public form loop.
- The current `event-registration` runtime-path mismatch remains a follow-up and is not a blocker for this row-level review move.

## Validation

- `cd frontend && npm test -- --run src/features/websites/pages/__tests__/WebsitePublishingPage.test.tsx src/features/websites/pages/__tests__/WebsiteOverviewPage.test.tsx src/features/websites/pages/__tests__/WebsiteFormsPage.test.tsx src/features/builder/pages/__tests__/usePageEditorController.test.tsx src/features/builder/components/editor/__tests__/EditorHeader.test.tsx`
  - Result: Passed on 2026-04-20. `5` files and `12` tests green.
- `make check-links`
  - Result: Passed on 2026-04-20. Checked `124` files and `993` local links with no broken active-doc links.
- `cd e2e && E2E_FRONTEND_PORT=5317 bash ../scripts/e2e-playwright.sh host ../node_modules/.bin/playwright test --project=chromium tests/publishing.spec.ts tests/public-website.spec.ts`
  - Result: Passed on 2026-04-20. `4` tests green for the narrowed website builder/forms/publishing/public-runtime loop.
  - Local runtime note: this machine needed `E2E_FRONTEND_PORT=5317` because Docker Desktop occupied the default `127.0.0.1:5173` host frontend port during the rerun.

## Board Disposition

- Move `P5-T4` from `In Progress` to `Review`.
- Keep `P5-T4` in `Review` for final row-local signoff; the broader browser-matrix and Docker follow-through is now recorded under the green `P5-T2B` validation artifact.
