# P5-T138 Complete Modularization Remediation Proof

**Date:** 2026-06-06  
**Status:** Blocked on backend coverage org-access fixture drift  
**Branch:** `codex/p5-t138-modularization-remediation`

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

| Metric | Baseline |
|---|---:|
| Backend non-test module imports from `@services/*` | 234 |
| Backend root service TypeScript files under `backend/src/services` | 139 |
| Frontend non-test feature imports through shared service paths | 189 |
| Direct `.query(` calls in backend module controllers | 46 |
| Direct E2E imports from `backend/src` or `frontend/src` | 6 |

Normalized active ratchet counts enforced by `scripts/check-modularization-boundary-ratchet.ts`:

| Metric | Ratchet cap |
|---|---:|
| Backend module imports from root services | 203 |
| Backend root service TypeScript files | 139 |
| Frontend feature imports through shared services | 153 |
| Direct `.query(` calls in backend module controllers | 46 |
| Direct E2E app-source imports | 4 |
| Direct E2E app-source imports outside `e2e/helpers/testSupport` | 0 |

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

Blocked:

- `make test-coverage-full` now reaches Docker-backed backend coverage, rebuilds the isolated test database, and runs Jest, but exits through the backend coverage failure (`npm` code `1`, `make` code `2`) with `25` failed suites / `264` passed suites and `274` failed tests / `2067` passed tests.
- The dominant failure pattern is older backend integration fixtures receiving `403 Forbidden` from hardened organization-access auth where the suites expect `200`, `201`, or validation `400`; representative failures include route guardrails, webhooks, user role sync, payments route authorization, alerts, grants, case management visibility, portal messaging, and passkey lockout coverage.
- Subagent review classified this as backend integration fixture drift against fail-closed org-access checks rather than a P5-T138 modularization regression; the P5-T138 dirty diff does not touch backend auth middleware/controllers or the broad integration fixtures.
- A separate backend validation/fixture-alignment slice should seed or mint active `user_account_access` consistently for suites that register/promote/login or directly mint JWTs before `make test-coverage-full` is rerun.

Superseded blockers:

- Earlier `cd backend && npm test -- --runInBand src/__tests__/modules/moduleManifest.test.ts` and `make test-coverage-full` attempts stopped in validation preflight because the Docker daemon/socket was unavailable.
- Docker is now reachable; the current blocker is the backend coverage fixture failure above.

## Residual Risks

- This wave establishes and starts the complete modularization remediation, but the root-service and frontend shared-service debt is intentionally ratcheted rather than deleted in one unsafe move.
- Full coverage closeout remains pending on backend integration fixture alignment for the hardened organization-access auth posture; route paths, `/api/v2` envelopes, permissions, database schema, and modularization implementation remain unchanged by this closeout patch.
