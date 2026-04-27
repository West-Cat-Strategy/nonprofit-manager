# Modularity, Simplicity, And Reuse Plan - April 2026

**Last Updated:** 2026-04-26
**Tracked Row:** `P5-T11`
**Branch:** `modularity-simplicity-reuse`

## Baseline

- Branch baseline before edits: `modularity-simplicity-reuse` at `5ce90d7f Refresh Codex skill routing and security reference docs`.
- Worktree baseline before edits: clean, with no staged, unstaged, or untracked files.
- `npm run knip` is an active discovery signal, not a deletion authority. The baseline run reported unused backend root shims and global builder/editor/template wrappers.
- Existing guardrails already enforce deleted legacy paths, module ownership, route validation, route catalog drift, auth-guard policy, and implementation-size policy.
- `docs/refactoring/` did not exist before this work; this directory is the durable home for the plan and handoff evidence.

## Goals

- Reduce monoliths and compatibility leftovers while preserving current product behavior.
- Move implementation inward toward module-owned backend and feature-owned frontend surfaces.
- Delete only code that current import tracing, docs/config checks, and validation prove is not a public or compatibility contract.
- Extract reusable helpers only when two or more real call sites benefit and the helper has a narrow stable purpose.
- Leave a concise handoff that records what changed, proof run, skipped checks, risks, and next refactor candidates.

## Non-Goals

- No public API, route URL, browser URL, auth, permission, response-envelope, database, migration, route-catalog, root-store, or contracts-package behavior changes.
- No `P5-T3` product fix for Mailchimp `priorRunSuppressionIds` route validation in this refactor wave.
- No deletion of `/api/payments/*` tombstone behavior or health aliases.
- No reintroduction of `frontend/src/pages/**`, `frontend/src/store/slices/**`, or root backend controller wrappers.
- No broad dependency churn, DB history changes, generated clients, or speculative shared abstractions.

## Lane Assignments

- Lead integration: owns `docs/phases/planning-and-progress.md`, `docs/refactoring/**`, shared registrars, worker startup, route catalogs, root store, auth/permission helpers, shared API clients, and final validation.
- Backend shim prune: remove confirmed-unused root backend service shims after current `rg`, `knip`, type-check, and boundary-policy evidence.
- Cases route decomposition: split `backend/src/modules/cases/routes/index.ts` into module-local schema/subroute helpers without changing route order or `/api/v2/cases/*` behavior.
- Builder wrapper cleanup: move remaining global wrapper tests to feature-owned builder imports and delete dead global wrappers only after current import evidence.
- Frontend monolith split: complete one feature-local split, favoring Mailchimp page/controller or portal case-detail extraction, without touching shared routes or root store.
- Docs and handoff: keep docs concise, link the new refactor section from the catalog/workboard, and run docs validation.

## Candidate Refactors

### Backend

- `backend/src/modules/mailchimp/services/mailchimpService.ts` and `mailchimpController.ts`: split campaign targeting, saved-audience, campaign-run, webhook, and provider-call helpers while keeping facade exports stable.
- `backend/src/modules/cases/routes/index.ts`: extract schemas and subroute registration for queue views, reassessments, forms, portal escalations, and core case resources.
- `backend/src/services/publishing/*`: migrate root publishing helpers toward `backend/src/modules/publishing/services/**` behind compatibility exports.
- `backend/src/modules/contacts/services/contactMergeService.ts`: later module-local transaction helper extraction after narrower low-risk slices land.
- Root services such as `volunteerService`, `taskService`, `accountService`, `queueViewDefinitionService`, `portalEscalationService`, and `publicIntakeResolutionService`: move inward one domain at a time; do not prune without live-import migration.

### Frontend

- `frontend/src/features/mailchimp/pages/EmailMarketingPage.tsx` and `components/EmailMarketingPageParts.tsx`: split state/controller hooks and card/modal components.
- `frontend/src/features/portal/pages/PortalCaseDetailPage.tsx`: extract upload validation, timeline/document panels, review-request handling, and portal data controller helpers.
- `frontend/src/features/websites/state/websitesCore.ts` and `lib/websiteConsole.ts`: partition thunk groups and page derivation helpers while preserving exports and root reducer keys.
- `frontend/src/features/builder/components/editor/**`: keep feature-owned runtime implementation and remove global wrappers only after tests no longer import them.
- `frontend/src/features/cases/pages/**`, `CaseReassessmentPanel.tsx`, and `frontend/src/features/grants/**`: later feature-local splits after current lower-risk slices.

### Dead Code And Reuse

- First-pass backend deletion candidates: root shims for `reportService`, `reportTemplateService`, `savedReportService`, `scheduledReportService`, `socialMediaSyncSchedulerService`, `webhookRetrySchedulerService`, `webhookService`, and `webhookTransport`.
- Not first-pass deletion candidates: `apiKeyService`, `contactService`, `caseService`, `donationService`, `mailchimpService`, `followUpService`, and `followUpQueryColumns`, because current imports still exist or module-internal swaps are needed.
- Frontend deletion candidates: global builder/editor/template wrappers under `frontend/src/components/editor/**` and `frontend/src/components/templates/**` after wrapper tests move to feature-owned imports.
- Reuse candidates: UUID param schema helpers, response-envelope wrappers used across module mappers, local route schema extraction, list query-state helpers, formatting helpers, and feature-local Redux reducer helpers.

## Risk Classification

- Low risk: pure shim deletion with final grep proof, test import moves, feature-local presentational component extraction, and docs/catalog links.
- Medium risk: cases route decomposition, Mailchimp service splitting, website state partitioning, and moving root service implementation inward behind compatibility exports.
- High risk: auth/permissions, API envelopes, DB/migrations, worker startup, route catalog/root store changes, public website runtime, portal file handling, and Playwright-critical route behavior.

## Validation Plan

- Discovery and deletion evidence: `npm run knip`, targeted `rg`, and `git diff --check`.
- Backend: `cd backend && npm run type-check`, `make lint-module-boundary`, `make lint-canonical-module-imports`, `make lint-v2-module-ownership`, and focused backend tests for touched modules.
- Cases route slice: `node scripts/check-route-validation-policy.ts`, `cd backend && npm test -- --runInBand src/__tests__/integration/cases.test.ts src/__tests__/integration/followUps.test.ts`.
- Frontend: targeted Vitest for touched feature or builder/editor tests plus `cd frontend && npm run type-check`.
- Docs: `make check-links`; add `make lint-doc-api-versioning` only if versioned API wording/examples change.
- Broad closeout: use `make lint`, `make typecheck`, and `make test` when scope and environment allow; document any skipped full-lane proof honestly in the handoff.

## Rollback Notes

- Each runtime slice should be small enough to revert independently.
- For shim deletion, rollback is restoring the deleted re-export file and rerunning type-check/policy checks.
- For cases route decomposition, rollback is restoring the previous single registrar file if route-order or validation behavior regresses.
- For frontend wrapper cleanup, rollback is restoring the wrapper file or test import path while preserving feature-owned runtime implementation.
- Do not weaken policy gates to pass a refactor; fix the code or record a blocker.
