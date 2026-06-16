# P5-T144 Intake Cases Portal Remediation Proof

**Date:** 2026-06-13
**Status:** Implementation complete; broad host E2E proof still blocked by local Docker/test-DB runtime loss
**Last Refresh:** 2026-06-16
**Branch:** `p5-t143-intake-cases-portal-remediation`
**Worktree:** `/Users/bryan/projects/nonprofit-manager-p5-t143`

## Scope

Remediate the June 13 intake, cases, portal, and public-intake review findings while preserving route paths, product scope, `P5-T6` backlog boundaries, and `P5-T75` auth-alias timing.

## Implementation Lanes

- Backend staff cases trust boundaries: active-organization scoping for case service list/create/update/delete, create-case account/contact tenant validation, foreign UUID `404` behavior, staff `CASE_VIEW` gates, account-scoped staff portal conversations, canonical staff conversation v2 envelopes, and upload permission-before-Multer ordering.
- Portal/public-intake backend and data hardening: portal form/dashboard visibility filters, portal invitation body-token endpoints, hashed invitation-token storage, legacy path-token compatibility wrappers, case-form assignment locking/idempotency, response-packet cleanup on transaction failure, signup ambiguity-state audit fidelity, and backup redaction for invitation hashes.
- Frontend workflow and accessibility: duplicate submit guards, stale autosave response suppression, URL/list sync, stale portal paged-list response guards, saved-view fallback merge, restored-contact validation, focus-trapped dialogs, tablist keyboard behavior, durable website labels, and live notices.
- Lead proof and validation: sibling-worktree isolation, workboard/index updates, final changed-path reconciliation, focused proof, root gates, and E2E residual-risk recording.

## Subagent Handoffs

- Backend staff cases lane completed the staff trust-boundary and upload-ordering implementation and returned focused tests for case services, lifecycle tenant references, portal conversations, route permission gates, and upload authorization order.
- Portal/public-intake lane completed invitation hashing/body-token routing, portal form visibility filtering, case-form idempotency/packet cleanup, signup ambiguity audit state, migration/initdb/manifest parity, and related backend tests.
- Frontend workflow/a11y lane completed form submit/autosave guards, case URL/saved-view handling, portal stale response guards, invitation body-token frontend calls, dialog/tab accessibility, website labels/notices, and focused frontend tests.
- Lead lane integrated the workers, patched migration/backup/check-changed follow-through, fixed the intake E2E restored-contact fixture to use a real contact, and reconciled validation caveats.

## Validation Log

### Passed

- `cd backend && npx jest --runInBand src/modules/cases/queries/__tests__/servicesQueries.test.ts src/modules/cases/queries/__tests__/lifecycleQueries.test.ts src/modules/cases/controllers/__tests__/cases.trustZone.test.ts src/modules/cases/routes/__tests__/cases.trustZone.test.ts src/modules/cases/usecases/__tests__/caseForms.usecase.test.ts src/modules/cases/repositories/__tests__/caseFormsRepository.assignments.test.ts src/modules/portal/repositories/__tests__/portalRepository.dashboardActions.test.ts src/__tests__/services/portalAuthService.test.ts src/modules/portalAdmin/controllers/__tests__/portalAdminController.test.ts src/modules/portalAuth/controllers/__tests__/portalAuthController.test.ts src/__tests__/integration/portalAuth.test.ts`
  - Result: passed, 11 suites / 130 tests.
- `cd frontend && npm test -- --run src/components/__tests__/CaseForm.test.tsx src/components/ui/__tests__/uiPrimitives.test.tsx src/features/workflows/pages/__tests__/IntakeNewPage.test.tsx src/features/cases/components/__tests__/CaseFormsPanel.test.tsx src/features/cases/components/__tests__/CaseDetailTabs.test.tsx src/features/cases/hooks/__tests__/useCaseListQueryState.test.tsx src/features/cases/hooks/__tests__/useSavedCaseViews.test.tsx src/features/portal/client/__tests__/portalDataHooks.test.tsx src/features/portal/pages/__tests__/PortalFormsPage.test.tsx src/features/portal/pages/__tests__/PublicCaseFormPage.test.tsx src/features/portal/pages/__tests__/PortalAccessPages.test.tsx src/features/invitations/pages/__tests__/AcceptInvitationPage.test.tsx src/features/invitations/pages/__tests__/PortalAcceptInvitationPage.test.tsx src/features/websites/pages/__tests__/WebsiteFormsPage.test.tsx`
  - Result: passed, 14 files / 58 tests.
- `cd backend && npx jest --runInBand src/__tests__/services/portalAuthService.test.ts src/__tests__/services/backupService.test.ts`
  - Result: passed, 2 suites / 14 tests.
- `npm run type-check --workspace contracts`
  - Result: passed.
- `make lint-openapi`
  - Result: passed.
- `make db-verify`
  - Result: passed.
- `make typecheck`
  - Result: passed for backend, frontend, and contracts.
- `make check-changed ARGS=--run`
  - Result: passed after fixing `scripts/check-changed.sh` to run selected commands in subshells. The selected gate included docs checks, OpenAPI lint, backend lint/type-check/integration, frontend lint/type-check/full Vitest, Docker-backed Playwright smoke, and DB verification.
- `cd e2e && bash ../scripts/e2e-playwright.sh host ../node_modules/.bin/playwright test --project=chromium tests/cases.spec.ts -g "persist selected case detail tab"`
  - Result: passed, 1 test.
- `cd e2e && bash ../scripts/e2e-playwright.sh host ../node_modules/.bin/playwright test --project=firefox tests/events.spec.ts`
  - Result: passed, 7 tests. This confirmed the earlier Firefox event failures were caused by a vanished DB listener, not by an events regression.

### Partial Or Blocked

- `make test`
  - Backend portion passed, 290 suites / 2412 tests.
  - Frontend portion passed, 266 files / 1437 tests.
  - Host E2E matrix first attempt reached Firefox events after the full Chromium pass, then `/api/v2/auth/setup-status` returned `500 ECONNREFUSED` because the host E2E DB listener on `127.0.0.1:8012` disappeared. The command was interrupted after repeated confirmed failures because the gate was already red.
  - A fresh targeted Firefox events run passed 7/7, confirming recovery from that runtime failure.
- `cd e2e && npm run test:ci`
  - Second full-host attempt reran from a fresh runtime and passed the remediated Chromium paths through portal route health, portal forms, and fixture-backed portal case detail.
  - The run then failed the existing startup performance guard under concurrent host load from another `nonprofit-manager-deps-2026-06-13` release-check/coverage process: expected p75 `<= 1800ms`, observed `3560ms` then `2814ms`.
  - The command was interrupted after that retry failed because the matrix was already red.
- `cd e2e && npm test -- --project=chromium tests/cases.spec.ts tests/workflows.spec.ts tests/portal-cases-visibility.spec.ts tests/portal-auth.spec.ts tests/portal-workspace.spec.ts tests/public-website.spec.ts`
  - Result: 19/20 passed. Portal auth, portal case visibility, portal workspace/forms, public website, workflows, and the intake restore case passed.
  - The lone failure was `cases.spec.ts` case-detail tab persistence with the app stuck on `Loading page...`; the same test passed in earlier full-matrix attempts and passed in a fresh single-test rerun.

### 2026-06-16 Broad Host Refresh

- Preflight:
  - `git status --short --branch`
    - Result before the rerun: `## main...origin/main`; later existing P5-T143 documentation edits were present in `docs/phases/planning-and-progress.md`, `docs/validation/README.md`, and `docs/validation/P5-T143_SERVICE_SITE_ROUTING_READY_PROOF_2026-06-13.md` and were preserved.
  - `docker info`
    - Initial result: failed because the Docker daemon was unavailable at `unix:///Users/bryan/.docker/run/docker.sock`.
  - `open -a Docker`, then repeated `docker info`
    - Result: Docker became reachable after about 10 seconds.
  - `ps -axo pid,pcpu,pmem,command | sort -k2 -nr | head -25`
    - Result: the machine cooled enough to start the broad gate, though later post-failure sampling showed unrelated ProtonVPN, Transmission, WindowServer, and Docker Desktop load.
- `make test`
  - Backend portion passed, 289 suites / 2412 tests.
  - Frontend portion passed, 266 files / 1438 tests.
  - Host E2E matrix started successfully after port preflight passed for `3001` and `5173`.
  - Chromium progressed through the full desktop matrix through `tests/workflows.spec.ts` with no observed failures before Firefox started.
  - The previously suspicious `cases.spec.ts` case-detail tab persistence path passed in Chromium and Firefox.
  - The startup performance guard passed in Chromium.
  - P5-T144-adjacent Chromium paths passed, including portal route health, portal forms, fixture-backed portal case detail, portal visibility/link audit, portal auth, portal workspace/forms, public website, publishing, cases, and workflows.
  - Firefox then hit a runtime failure wave beginning with `tests/cases.spec.ts` (`staff can tag an interaction outcome and see it persisted`) and continuing into `tests/contacts.spec.ts`.
  - Failure artifacts under `e2e/test-results/**/error-context.md` showed the same root error across the wave: `/api/v2/auth/setup-status` returned `500` with `{"code":"ECONNREFUSED"}`.
  - The broad gate was interrupted after repeated Firefox failures because the gate was already red and the failures matched runtime/test-DB loss rather than a product assertion.
- Post-failure checks:
  - `./scripts/validation-preflight.sh isolated-test-db --context p5-t144-post-failure-check`
    - Result: failed because Docker daemon was no longer reachable.
  - `lsof -nP -iTCP:8012 -sTCP:LISTEN`
    - Result: no isolated test DB listener remained on `127.0.0.1:8012`.
  - `lsof -nP -iTCP:3001 -sTCP:LISTEN` and `lsof -nP -iTCP:5173 -sTCP:LISTEN`
    - Result: interrupted Playwright host servers remained; they were stopped with `kill 86813 91895`.
  - `docker info`
    - Result after failure: `ERROR: Error reading remote info: EOF`.

Disposition: `P5-T144` remains Blocked. The rerun improved confidence that the merged intake/cases/portal product changes are not the current issue, because backend, frontend, Chromium browser coverage, portal/cases/public-intake paths, and the startup guard all passed before the host runtime lost Docker/test-DB availability again. Do not change product code from this evidence. The next unblock attempt should start only after Docker remains stable and the machine is idle, then rerun the full `make test` gate or, if the backend/frontend sections are still green, a preserved host E2E run with `cd e2e && npm run test:ci:report`.

## Final Owned Path Set

- `backend/src/__tests__/services/backupService.test.ts`
- `backend/src/__tests__/services/portalAuthService.test.ts`
- `backend/src/modules/cases/controllers/__tests__/cases.trustZone.test.ts`
- `backend/src/modules/cases/controllers/portalConversations.controller.ts`
- `backend/src/modules/cases/controllers/services.controller.ts`
- `backend/src/modules/cases/queries/__tests__/lifecycleQueries.test.ts`
- `backend/src/modules/cases/queries/__tests__/servicesQueries.test.ts`
- `backend/src/modules/cases/queries/lifecycleQueries.ts`
- `backend/src/modules/cases/queries/servicesQueries.ts`
- `backend/src/modules/cases/repositories/__tests__/caseFormsRepository.assignments.test.ts`
- `backend/src/modules/cases/repositories/caseFormsRepository.assignments.ts`
- `backend/src/modules/cases/repositories/caseFormsRepository.ts`
- `backend/src/modules/cases/repositories/caseServicesRepository.ts`
- `backend/src/modules/cases/routes/__tests__/cases.trustZone.test.ts`
- `backend/src/modules/cases/routes/index.ts`
- `backend/src/modules/cases/usecases/__tests__/caseForms.usecase.test.ts`
- `backend/src/modules/cases/usecases/caseForms.usecase.submission.ts`
- `backend/src/modules/cases/usecases/caseServices.usecase.ts`
- `backend/src/modules/portal/repositories/__tests__/portalRepository.dashboardActions.test.ts`
- `backend/src/modules/portal/repositories/portalRepository.ts`
- `backend/src/modules/portal/services/portalMessagingService.query.ts`
- `backend/src/modules/portalAdmin/controllers/__tests__/portalAdminController.test.ts`
- `backend/src/modules/portalAdmin/controllers/portalAdminAccountController.ts`
- `backend/src/modules/portalAuth/controllers/__tests__/portalAuthController.test.ts`
- `backend/src/modules/portalAuth/controllers/portalAuthController.ts`
- `backend/src/modules/portalAuth/routes/index.ts`
- `backend/src/services/backupService.ts`
- `backend/src/services/caseWorkflowService.ts`
- `backend/src/services/portalAuthService.ts`
- `backend/src/services/publicIntakeResolutionService.ts`
- `backend/src/validations/portal.ts`
- `database/initdb/000_init.sql`
- `database/migrations/140_portal_invitation_token_hash.sql`
- `database/migrations/manifest.tsv`
- `docs/api/openapi.yaml`
- `docs/phases/planning-and-progress.md`
- `docs/validation/P5-T144_INTAKE_CASES_PORTAL_REMEDIATION_PROOF_2026-06-13.md`
- `docs/validation/README.md`
- `e2e/tests/cases.spec.ts`
- `frontend/src/components/CaseForm.tsx`
- `frontend/src/components/ConfirmDialog.tsx`
- `frontend/src/components/__tests__/CaseForm.test.tsx`
- `frontend/src/components/ui/FocusTrapDialog.tsx`
- `frontend/src/components/ui/__tests__/uiPrimitives.test.tsx`
- `frontend/src/components/ui/index.ts`
- `frontend/src/features/cases/caseForms/CaseFormsPanel.tsx`
- `frontend/src/features/cases/components/CaseDetailTabs.tsx`
- `frontend/src/features/cases/components/CaseHandoffModal.tsx`
- `frontend/src/features/cases/components/CaseStatusChangeModal.tsx`
- `frontend/src/features/cases/components/__tests__/CaseDetailTabs.test.tsx`
- `frontend/src/features/cases/components/__tests__/CaseFormsPanel.test.tsx`
- `frontend/src/features/cases/hooks/__tests__/useCaseListQueryState.test.tsx`
- `frontend/src/features/cases/hooks/__tests__/useSavedCaseViews.test.tsx`
- `frontend/src/features/cases/hooks/useCaseListQueryState.ts`
- `frontend/src/features/cases/hooks/useSavedCaseViews.ts`
- `frontend/src/features/cases/pages/CaseListPage.tsx`
- `frontend/src/features/invitations/pages/AcceptInvitationPage.tsx`
- `frontend/src/features/invitations/pages/PortalAcceptInvitationPage.tsx`
- `frontend/src/features/invitations/pages/__tests__/AcceptInvitationPage.test.tsx`
- `frontend/src/features/invitations/pages/__tests__/PortalAcceptInvitationPage.test.tsx`
- `frontend/src/features/portal/client/__tests__/portalDataHooks.test.tsx`
- `frontend/src/features/portal/client/usePortalPagedList.ts`
- `frontend/src/features/portal/pages/PortalFormsPage.tsx`
- `frontend/src/features/portal/pages/PublicCaseFormPage.tsx`
- `frontend/src/features/portal/pages/__tests__/PortalAccessPages.test.tsx`
- `frontend/src/features/portal/pages/__tests__/PortalFormsPage.test.tsx`
- `frontend/src/features/portal/pages/__tests__/PublicCaseFormPage.test.tsx`
- `frontend/src/features/websites/components/WebsiteConsoleNotice.tsx`
- `frontend/src/features/websites/pages/WebsiteFormsPage.tsx`
- `frontend/src/features/websites/pages/__tests__/WebsiteFormsPage.test.tsx`
- `frontend/src/features/workflows/pages/IntakeNewPage.tsx`
- `frontend/src/features/workflows/pages/__tests__/IntakeNewPage.test.tsx`
- `frontend/src/test/ux/RouteUxSmokeExtended.test.tsx`
- `scripts/check-changed.sh`

## Residual Risk

- Implementation and focused gates are complete, but the row is blocked from Review because the full host `make test` / E2E sequence did not complete green in the current environment.
- Current blocker is runtime/load evidence, not a known product-code failure: earlier runs lost the host DB listener mid-matrix or failed a startup p75 threshold under concurrent load, and the June 16 rerun again lost Docker/test-DB availability during Firefox after backend, frontend, Chromium, portal/cases/public-intake paths, and the Chromium startup guard passed.
- Before moving this row to Review, rerun the full host gate when the machine is idle, preferably `make test` or at least `cd e2e && npm run test:ci` after the already-passing backend/frontend/root gates.
