# Modularity, Simplicity, And Reuse Handoff - April 2026

**Last Updated:** 2026-04-26
**Tracked Row:** `P5-T11`
**Lead Integrator:** Codex

## Summary

`P5-T11` completed the first behavior-preserving modularity/simplicity/reuse wave. The work kept `/api/v2` routes, auth/permission decisions, API envelopes, database semantics, route catalogs, root-store shape, browser URLs, and contracts-package behavior unchanged.

Completed slices:

- Published the durable refactor plan and handoff under `docs/refactoring/`.
- Removed confirmed-unused backend root service shims after import tracing and `knip` proof.
- Removed global builder/editor/template wrapper files after moving wrapper tests to feature-owned builder paths.
- Split the cases route registrar into module-local route helpers for queue views, reassessments, and portal escalations without touching the shared `/api/v2` registrar.
- Split the Mailchimp page display-card cluster into a feature-owned component file while preserving page routes and API calls.
- Split the largest Mailchimp backend service and shared case type file enough to satisfy the implementation-size gate without changing their public callers.
- Updated active docs references for the removed shim/wrapper paths.

## Files Changed By Domain

Backend runtime:

- `backend/src/modules/cases/routes/index.ts`
- `backend/src/modules/cases/routes/queueViews.routes.ts`
- `backend/src/modules/cases/routes/reassessments.routes.ts`
- `backend/src/modules/cases/routes/portalEscalations.routes.ts`
- `backend/src/modules/mailchimp/services/mailchimpService.ts`
- `backend/src/modules/mailchimp/services/mailchimpCampaignRuns.ts`
- Deleted root shim files under `backend/src/services/`: `reportService.ts`, `reportTemplateService.ts`, `savedReportService.ts`, `scheduledReportService.ts`, `socialMediaSyncSchedulerService.ts`, `webhookRetrySchedulerService.ts`, `webhookService.ts`, and `webhookTransport.ts`

Frontend runtime:

- `frontend/src/features/mailchimp/components/EmailMarketingCards.tsx`
- `frontend/src/features/mailchimp/components/EmailMarketingPageParts.tsx`
- `frontend/src/features/mailchimp/pages/EmailMarketingPage.tsx`
- `frontend/src/types/case.ts`
- `frontend/src/types/caseState.ts`
- Small lint-preserving cleanups in `frontend/src/components/dashboard/PlausibleStatsWidget.tsx`, `frontend/src/features/neoBrutalist/pages/OperationsBoardPage.tsx`, `frontend/src/features/neoBrutalist/pages/PeopleDirectoryPage.tsx`, and `frontend/src/features/cases/hooks/useSavedCaseViews.ts`
- Moved builder wrapper tests under `frontend/src/features/builder/components/editor/**`
- Deleted global wrappers under `frontend/src/components/editor/**` and `frontend/src/components/templates/**`

Docs:

- `docs/refactoring/README.md`
- `docs/refactoring/MODULARITY_SIMPLICITY_REUSE_PLAN_2026-04.md`
- `docs/refactoring/MODULARITY_SIMPLICITY_REUSE_HANDOFF_2026-04.md`
- `docs/README.md`
- `docs/phases/planning-and-progress.md`
- `docs/phases/PHASE_5_DEVELOPMENT_PLAN.md`
- `docs/ui/archive/app-ux-audit.json`
- Active reference docs that named deleted shim/wrapper paths were updated to module-owned or feature-owned paths.

Tooling:

- `scripts/baselines/implementation-size.json`

## Deletion Evidence

Backend root shims:

- `npm run knip` exits successfully after deletion and reports only the existing `knip.json` `ignoreBinaries` configuration hint.
- Targeted import tracing found no remaining code imports of the deleted root shim files.
- Backend package type-check and module boundary checks pass against module-owned imports.
- Compatibility shims with current imports, such as `apiKeyService`, were intentionally retained.

Frontend builder wrappers:

- Builder/editor wrapper tests were moved to feature-owned imports before deletion.
- Targeted builder/editor Vitest coverage passed after the test move.
- `npm run knip` exits successfully after deleting `frontend/src/components/editor/**` and `frontend/src/components/templates/**`.
- Frontend package type-check passes with feature-owned builder imports.

## Shared Code Introduced

No new shared cross-domain helper was introduced. The new files are module-local or feature-local:

- Cases route helpers remain under `backend/src/modules/cases/routes/**`.
- Mailchimp campaign-run helpers remain under `backend/src/modules/mailchimp/services/**`.
- Mailchimp cards remain under `frontend/src/features/mailchimp/components/**`.
- Case state types were split into a type-only frontend module to keep the existing type surface small enough for the repo size gate.

This avoids creating new shared abstractions without two stable call sites.

## Behavior Preserved

- No route URL, route order, API envelope, auth/permission source of truth, database, migration, root-store, route-catalog, or browser URL changes were intended.
- Cases queue-view, reassessment, and portal-escalation routes keep the same middleware sequence, Zod validation, permissions, and handlers.
- Mailchimp page API calls, state usage, modal behavior, and rendered card content are unchanged; only card ownership moved.
- Mailchimp campaign-run persistence and saved-audience helpers keep the same exported service API while moving into a module-local helper file.
- Case type exports remain available from `frontend/src/types/case.ts`; the new `caseState.ts` split is type-only.
- Worker startup and shared `/api/v2` route registration were not edited.

## Validation

Passed:

- `npm run knip` - passed; reports only `knip.json Remove from ignoreBinaries` configuration hint.
- `make lint` - passed; includes backend/frontend ESLint, shared policy checks, API-version docs lint, route integrity, route-catalog drift, implementation-size policy, and UI audit.
- `make typecheck` - passed for backend, frontend, and shared contracts.
- `make check-links` - passed, `142` files and `1190` local links.
- `git diff --check` - passed.
- `node scripts/check-route-validation-policy.ts` - passed.
- `node scripts/check-implementation-size-policy.ts` - passed after splitting the Mailchimp service and case state types.
- `cd backend && npm run type-check` - passed.
- `cd frontend && npm run type-check` - passed.
- `make lint-module-boundary` - passed.
- `make lint-canonical-module-imports` - passed.
- `make lint-v2-module-ownership` - passed.
- `cd backend && npm test -- --runInBand src/__tests__/integration/cases.test.ts src/__tests__/integration/followUps.test.ts` - passed, `2` suites and `22` tests.
- `cd backend && npm test -- --runInBand src/__tests__/services/mailchimpService.test.ts src/modules/mailchimp/controllers/__tests__/mailchimpController.test.ts src/__tests__/modules/mailchimp.routes.security.test.ts` - passed, `3` suites and `42` tests.
- `cd frontend && npm test -- --run src/features/adminOps/pages/__tests__/EmailMarketingPage.test.tsx` - passed, `1` file and `13` tests.
- `cd frontend && npm test -- --run src/features/cases/pages/__tests__/CaseListPage.test.tsx` - passed, `1` file and `7` tests.
- `cd frontend && npm test -- --run src/features/cases/state/casesCore.test.ts` - passed, `1` file and `2` tests.
- `cd frontend && npm test -- --run src/features/builder/components/editor/__tests__/EditorCanvas.test.tsx src/features/builder/components/editor/__tests__/EditorHeader.test.tsx src/features/builder/components/editor/__tests__/PropertyPanel.test.tsx src/features/builder/components/editor/propertyPanel/__tests__/BasicComponentPropertyEditor.test.tsx src/features/builder/components/editor/propertyPanel/__tests__/PagePropertyEditor.test.tsx` - passed in the wrapper-cleanup lane.

Not run:

- `make db-verify`; no migration, initdb, manifest, or database contract behavior changed.
- `make test`, `make ci-full`, and Docker E2E suites; this first wave used targeted runtime proof and leaves full browser/runtime signoff to `P5-T12`.

## Remaining Risks

- Cases route decomposition is medium risk because route groups moved within the module. Targeted integration tests and route-validation policy passed, but broad E2E case/portal flows remain deferred to the normal review lane.
- Deleted root shim paths are low risk after `knip` and import tracing, but archived docs and migration comments may still mention historical root-service paths as evidence history.
- Builder wrapper deletion is low risk after test relocation and type-check, but any out-of-tree importers would need to move to `frontend/src/features/builder/**`.
- The UI-audit archive baseline was refreshed to the current source counts so `make lint` enforces the present baseline: `1397` hardcoded color utilities, `9538` semantic token utilities, and `58` inline style usages. No UI styling behavior was intentionally changed.

## Recommended Next Tasks

- `P5-T3`: keep the Mailchimp `priorRunSuppressionIds` route-validation fix separate from this refactor.
- `P5-T9`: run a deeper dead-code review for remaining root services and unused exports, especially root services that still have live imports.
- `P5-T10`: run a deeper dead-docs review for stale historical references and reference-pattern docs that should be archived rather than updated.
- Future refactor branch: continue splitting `backend/src/modules/mailchimp/services/mailchimpService.ts` and split `frontend/src/features/portal/pages/PortalCaseDetailPage.tsx` behind focused tests.
