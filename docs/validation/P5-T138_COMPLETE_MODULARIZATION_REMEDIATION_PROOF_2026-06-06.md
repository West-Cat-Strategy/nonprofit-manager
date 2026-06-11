# P5-T138 Complete Modularization Remediation Proof

**Date:** 2026-06-06  
**Status:** Proof-complete; archived from the live board after the 2026-06-10 mainline proof reconciliation
**Branch:** `codex/p5-t138-coverage-fixtures` follow-up to `codex/p5-t138-modularization-remediation`

## Scope

Behavior-preserving modularization remediation for the existing mid-migration codebase.

Included:

- Workboard, coordination, and validation proof scaffolding for the coordinated modularization wave.
- Baseline ratchets for root-service coupling, frontend shared-service coupling, controller SQL, root backend services, and direct E2E app-source imports.
- Initial low-risk modularization slices across shared contracts, E2E test-support boundaries, and backend module declarations.

Excluded unless separately signed out:

- Route path changes.
- `/api/v2` response envelope changes.
- Permission or tenant-boundary behavior changes.
- Database schema or migration changes.
- Production deploys.
- Splitting backend modules or frontend features into separate npm packages.

## Baseline Inventory

Raw scout inventory captured before implementation:

| Metric                                                             | Baseline |
| ------------------------------------------------------------------ | -------: |
| Backend non-test module imports from `@services/*`                 |      234 |
| Backend root service TypeScript files under `backend/src/services` |      139 |
| Frontend non-test feature imports through shared service paths     |      189 |
| Direct `.query(` calls in backend module controllers               |       46 |
| Direct E2E imports from `backend/src` or `frontend/src`            |        6 |

Normalized active ratchet counts enforced by `scripts/check-modularization-boundary-ratchet.ts`:

| Metric                                                          | Ratchet cap |
| --------------------------------------------------------------- | ----------: |
| Backend module imports from root services                       |         203 |
| Backend root service TypeScript files                           |         139 |
| Frontend feature imports through shared services                |         153 |
| Direct `.query(` calls in backend module controllers            |          46 |
| Direct E2E app-source imports                                   |           4 |
| Direct E2E app-source imports outside `e2e/helpers/testSupport` |           0 |

The ratchet baseline lives in `scripts/baselines/modularization-boundaries.json`.

## Coordination

Lead lane:

- `docs/phases/planning-and-progress.md`
- `docs/validation/README.md`
- this proof note
- shared policy scripts, baselines, `Makefile`, and final validation selection

Worker lanes:

- Shared alert contracts: `contracts/**`, alert DTO/types surfaces only.
- E2E test-support boundary: `e2e/helpers/**` and `e2e/tests/**` only.
- Backend module declarations: additive backend module manifest/declaration scaffolding and focused tests only.

## Implementation Summary

- Added `@nonprofit-manager/contracts/alerts` as a type-only contracts subpath and migrated backend/frontend alert DTO-facing types to import or extend that shared surface while keeping backend persistence/repository fields app-local.
- Added an E2E test-support facade under `e2e/helpers/testSupport/**` so changed E2E callers no longer import `backend/src` or `frontend/src` directly; the remaining app-source imports are isolated to the facade and ratcheted.
- Added backend module declaration scaffolding through `defineBackendModule` plus inert declarations for activities, alerts, and dashboard using existing route exports without changing route registration.
- Added `scripts/check-modularization-boundary-ratchet.ts`, wired it into shared policy checks, added `make lint-modularization-boundaries`, and registered the script with Knip.

## Validation Log

Passed:

- `node scripts/check-modularization-boundary-ratchet.ts`.
- `make lint-modularization-boundaries`.
- `cd contracts && npm run type-check`.
- `cd backend && npm run type-check`.
- `cd frontend && npm run type-check`.
- `make typecheck`.
- `cd backend && npx jest src/__tests__/modules/moduleManifest.test.ts --runInBand` (`1` suite, `2` tests).
- `cd backend && npx jest src/modules/alerts/__tests__/alerts.usecase.test.ts --runInBand` (`1` suite, `5` tests).
- `cd frontend && npm test -- --run src/features/alerts/api/alertsApiClient.test.ts src/features/alerts/pages/__tests__/AlertsConfigPage.test.tsx src/features/alerts/components/__tests__/AlertConfigModal.test.tsx` (`3` files, `9` tests).
- `cd e2e && npx playwright test --project=chromium tests/dark-mode-accessibility-audit.spec.ts tests/link-health.spec.ts tests/persona-workflows.spec.ts tests/visibility-link-audit.spec.ts --list` (`142` Chromium tests listed).
- `cd e2e && SKIP_WEBSERVER=1 npx playwright test --project=chromium tests/auth-bootstrap.contract.spec.ts` (`10` tests).
- `make test-tooling` (`63` tests).
- `make check-links` (`265` files and `1516` local links).
- `make lint`.
- `npm run knip`.
- `npm run audit` (`found 0 vulnerabilities`).
- `make security-audit` (`found 0 vulnerabilities`).
- `git diff --check`.

Selector:

- `./scripts/select-checks.sh --files "<final changed paths>" --mode strict` emitted `make check-links`, `make lint`, `make typecheck`, `make test-tooling`, `npm run knip`, `npm run audit`, `make security-audit`, and `make test-coverage-full`.

Coverage fixture follow-up, 2026-06-06:

- Added `backend/src/__tests__/integration/helpers/authFixtures.ts` so integration users, organizations, organization access rows, app-session tokens, and cleanup share the hardened production auth posture: `issueAppSessionToken`, `upsertUserOrganizationAccess`, `resolveDefaultOrganizationAccessLevel`, active `accounts.account_type = 'organization'`, and `user_account_access` cleanup before user/account deletion.
- Updated backend integration/bootstrap fixtures that mint app tokens, register/login users, or promote direct users without active organization access: accounts, admin branding/email/Twilio settings, alerts, analytics, auth, auth MFA, authorization, backup export, case management visibility, cases, case handoff, contacts, debug auth, donations, events, follow-ups, grants, passkey lockout, people import/export, portal appointments, portal messaging, publishing, route guardrails, social media, tasks, user role sync, volunteers, webhooks, payments route security, and meetings integration coverage.
- Tightened the test database bootstrap path in `scripts/db-migrate.sh` and the root `Makefile` coverage/test-backend wrappers so freshly rebuilt isolated Postgres waits for the final `PostgreSQL init process complete; ready for start up.` marker and a host connection before host Jest starts.

Focused backend follow-up proof:

- `cd backend && npm test -- src/__tests__/integration/alerts.test.ts` passed (`1` suite, `4` tests).
- `cd backend && npm test -- src/__tests__/integration/routeGuardrails.test.ts` passed (`1` suite, `57` tests).
- `cd backend && npm test -- src/__tests__/integration/grants.test.ts src/__tests__/integration/webhooks.test.ts` passed (`2` suites, `10` tests).
- `cd backend && npm test -- src/__tests__/integration/userRoleSync.test.ts src/__tests__/integration/passkeyLockout.test.ts` passed (`2` suites, `6` tests).
- `cd backend && npm test -- src/__tests__/integration/peopleImportExport.test.ts src/__tests__/integration/portalMessaging.test.ts src/__tests__/integration/caseManagementVisibility.test.ts src/__tests__/integration/portalAppointments.test.ts` passed (`4` suites, `26` tests).
- `cd backend && npm test -- <all changed backend integration/module suites>` passed (`30` suites, `448` tests).
- `cd backend && npm run test:coverage -- <focused changed/failing group 1>` passed (`16` suites, `269` tests).
- `cd backend && npm run test:coverage -- <focused changed/failing group 2>` passed (`14` suites, `179` tests).

Full coverage follow-up result:

- `make test-coverage-full` now passes the backend coverage leg: `289` suites passed, `2341` tests passed.
- The frontend public-report snapshot blocker from the first follow-up run was fixed by making the hash-token test drive the fragment fallback path instead of retaining the route-param token.
- Additional broad-gate drift found during closeout was fixed without changing production contracts: tokenized public route catalog entries now cover hash-token invitation/reset paths; portal shell route transitions reuse the cached bootstrap snapshot; recurring donation checkout assertions wait for async action rendering; the E2E auth cache writes the actual session token; contact-detail follow-up/task actions use keyboard activation where browser pointer geometry can be intercepted; quick-lookup preload rejections are swallowed as prefetch-only failures; Firefox field-typing task creation uses keyboard activation; and the test-only contact reset helper retries transient Postgres serialization/deadlock errors.
- Final `make test-coverage-full` completed the full gate: backend coverage `289` suites / `2341` tests passed, frontend coverage `254` files / `1402` tests passed, host E2E `1008` passed / `15` skipped with no retries or flakes, mobile E2E `3` passed, Docker-backed Playwright smoke `4` passed, and the command ended with `Coverage reports and full behavior gates complete!`.
- Modularization enforcement remained flat at the exact active caps: backend root-service imports `203/203`, root service files `139/139`, frontend shared-service imports `153/153`, controller SQL calls `46/46`, direct E2E app-source imports `4/4`, and direct E2E app-source imports outside `e2e/helpers/testSupport` `0/0`.

Selector and final hygiene:

- `./scripts/select-checks.sh --files "<final changed paths>" --mode strict` emitted `make check-links`, `make test-tooling`, `make lint`, `make typecheck`, `make test-coverage-full`, and `make db-verify`.
- Passed before the final broad gate: `make check-links` (`265` files, `1516` local links), `make test-tooling` (`63` tests), `make lint`, `make typecheck`, `make db-verify`, and `git diff --check`.
- Passed after the final code closeout: `make test-coverage-full`.
- Passed after the final proof/workboard edits: `./scripts/select-checks.sh --files "<final changed paths>" --mode strict`, `node scripts/check-modularization-boundary-ratchet.ts`, `git diff --check`, `make check-links` (`265` files, `1516` local links), `make test-tooling` (`63` tests), `make lint`, `make typecheck`, and `make db-verify`.

Merged-main closeout, 2026-06-07:

- After local `main` merged this fixture lane and then `codex/p5-t139-code-review-remediation`, `./scripts/select-checks.sh --mode strict --files "<git diff --name-only origin/main>"` emitted `make check-links`, `make test-tooling`, `make lint`, `make typecheck`, `make test-coverage-full`, and `make db-verify`.
- The combined tree passed `make ci-full`: backend coverage `291` suites / `2358` tests, frontend coverage `255` files / `1403` tests, desktop E2E `1007` passed / `15` skipped with one Chromium startup-performance retry that passed, mobile E2E `3` passed, Docker smoke `4` passed, build passed, frontend bundle budget passed, and production audit found 0 vulnerabilities.
- The combined tree passed `make security-scan`: production npm audit found 0 vulnerabilities, gitleaks worktree scan found no leaks, and gitleaks history scan covered 543 commits with no leaks.
- The only merged-main source follow-up was the admin dashboard loading-state stabilization so mobile/staff route checks can see primary actions while the status body loads; route paths, `/api/v2` envelopes, permissions, public-token compatibility, migration ordering, and Docker/runtime contracts remain unchanged by this fixture closeout.

Superseded blockers:

- Earlier `cd backend && npm test -- --runInBand src/__tests__/modules/moduleManifest.test.ts` and `make test-coverage-full` attempts stopped in validation preflight because the Docker daemon/socket was unavailable.
- Docker is now reachable.
- The backend org-access coverage fixture blocker is fixed by this follow-up; focused backend slices and full backend coverage now pass.
- The later frontend public-report snapshot and browser/E2E drift blockers found by the broad gate are fixed; the full coverage gate now passes.

## Residual Risks

- This wave establishes and starts the complete modularization remediation, but the root-service and frontend shared-service debt is intentionally ratcheted rather than deleted in one unsafe move.
- Further structural modularization remains a follow-on coordinated wave after this review/signoff. Route paths, `/api/v2` envelopes, permissions, auth behavior, database schema, webhook acknowledgement shapes, raw-body payment handling, public-token compatibility, and Docker/runtime contracts remain unchanged by this closeout patch.
