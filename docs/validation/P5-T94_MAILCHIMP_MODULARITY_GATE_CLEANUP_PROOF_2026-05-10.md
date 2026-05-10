# P5-T94 Mailchimp Modularity And Gate Cleanup Proof - 2026-05-10

## Scope

`P5-T94` follows up the May 10 residual local validation gate findings with a behavior-preserving Mailchimp communications modularity pass and scoped semantic dead-code cleanup.

The change keeps campaign creation UI behavior, local-email readiness gating, Mailchimp targeting behavior, request payload shape, Redux action dispatching, routes, API contracts, and database schema unchanged.

## Implementation Summary

- Extracted campaign creation dialog state, focus handling, validation, request building, preview, test-send, submit, targeting, and delivery-readiness logic from `CampaignCreateModal.tsx` into `useCampaignCreateModalForm.ts`.
- Kept `CampaignCreateModal.tsx` focused on rendering the existing dialog and wiring UI controls to the extracted form controller.
- Lazy-loaded the campaign creation modal from `EmailMarketingPage.tsx` and memoized the page's email-capable/selectable/selected contact lists so the page no longer recomputes those derived collections on every render.
- Reduced `CampaignCreateModal.tsx` from `966` lines to `671` lines while keeping the Mailchimp feature-owned code under `frontend/src/features/mailchimp/components/**`.
- Removed semantic dead code that Knip did not flag because it was still test-covered or compatibility-exported: the unused Loop people service facade, stale websites state provider/analytics thunks, unused frontend builder template page/version thunks, backend direct-role helpers, an unused contact-document case query, case-service bound compatibility exports, and stale analytics/template default compatibility exports.
- Updated the live workboard to mark `P5-T94` in progress before implementation and then ready for review after proof.
- Confirmed the stale Mailchimp cancel/reschedule helper files are absent and the root workspace has no `express-rate-limit` devDependency. The backend runtime `express-rate-limit` dependency remains unchanged.

## Behavior Preserved

- Campaign title, subject, preview text, sender identity, guided-builder, raw HTML/plain-text, schedule, test-recipient, preview, save draft, schedule, and send-now flows remain in the same modal.
- Local SMTP readiness still blocks local live/test/scheduled delivery while preserving preview and draft save behavior.
- Provider segment targeting remains Mailchimp-only.
- Saved-audience targeting, saved-audience suppression, prior-run suppression, and preflight summary behavior remain unchanged.
- Existing campaign preview and test-send result display behavior remains unchanged.

## Validation

- `cd frontend && npm test -- --run src/services/loop/__tests__/demo.test.ts src/features/neoBrutalist/pages/__tests__/PeopleDirectoryPage.test.tsx src/features/websites/state/__tests__/websitesSelectors.test.ts src/features/websites/pages/__tests__/WebsiteIntegrationsPage.test.tsx src/features/builder/state/templateCore.test.ts src/features/builder/pages/__tests__/usePagePersistenceActions.test.tsx` - passed, `6` files and `17` tests.
- `cd backend && npm test -- --runTestsByPath src/__tests__/services/contactService.test.ts src/modules/contacts/controllers/__tests__/documents.controller.test.ts src/__tests__/services/caseService.test.ts src/modules/cases/usecases/__tests__/caseLifecycle.usecase.test.ts src/__tests__/services/analyticsService.test.ts src/__tests__/services/template/helpers.test.ts` - passed, `6` suites and `82` tests.
- `cd frontend && npm run type-check` - passed after the semantic cleanup follow-up.
- `cd backend && npm run type-check` - passed.
- `npm run type-check --workspace frontend` - earlier attempt after the final checkout moved was blocked outside the initial Mailchimp extraction by existing `socialMediaCore.ts`/`websitesCore.ts` errors; the later semantic cleanup follow-up cleared this with the passing `cd frontend && npm run type-check` and `make typecheck` proof above.
- `npm run lint --workspace frontend` - passed.
- `npm test --workspace frontend -- --run frontend/src/features/mailchimp/components/__tests__/EmailMarketingCards.test.tsx` - failed before test execution because Vitest expects workspace-relative paths; no test files were found.
- `npm test --workspace frontend -- --run src/features/mailchimp/components/__tests__/EmailMarketingCards.test.tsx` - passed, `1` file and `3` tests.
- `npm run knip` - passed.
- `npm run knip` - passed again after the semantic cleanup follow-up, with only the local Node `[DEP0205]` warning.
- `node scripts/ui-audit.ts --enforce-baseline` - passed with `1524` hardcoded color utilities, `9936` semantic token utilities, and `60` inline style usages.
- `make lint` - passed, including backend lint, shared policy checks, UI audit baseline enforcement, and frontend lint. UI audit reported passing counts of `1524` hardcoded color utilities, `9936` semantic token utilities, and `60` inline style usages.
- `make typecheck` - passed across backend, frontend, and shared contracts.
- `cd frontend && npm test -- --run src/features/adminOps/pages/__tests__/EmailMarketingPage.test.tsx` - passed, `1` file and `17` tests.
- `cd frontend && npx vite build` - passed and produced a separate `CampaignCreateModal-*.js` chunk.
- `node scripts/check-frontend-bundle-size.js` - passed on fresh Vite assets with startup bundle `115688` raw bytes under cap `122880`; total initial JS `723808` raw bytes under cap `750000`.
- `rg "EmailCampaignBuilder|createBlockId" frontend/dist/assets/EmailMarketingPage-*.js` - no matches, confirming the campaign builder is no longer bundled into the communications page chunk.
- `cd frontend && npm run build` - attempted; blocked before Vite by existing unrelated `socialMediaCore.ts` / `websitesCore.ts` TypeScript errors in the dirty checkout.
- `git diff --check` - passed.

## Notes

- No route, API, Redux slice, database, migration, environment, or new dependency changes were made for this modularity pass.
- The checkout already contained unrelated in-flight worker/export/runtime changes before this slice began; this proof only owns the Mailchimp component extraction, scoped semantic dead-code cleanup, and `P5-T94` workboard/index updates.
