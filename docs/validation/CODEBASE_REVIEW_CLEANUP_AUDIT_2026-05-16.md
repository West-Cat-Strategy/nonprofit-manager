# Codebase Review Cleanup Audit - 2026-05-16

**Workboard Row:** `P5-T135`
**Status:** Review-ready conservative cleanup audit

## Scope

This pass performed a conservative repo-health audit and cleanup. It did not add runtime product scope, migrations, deploy actions, production reads or writes, broad legacy retirement, or source-copy/reference-repo expansion.

Covered surfaces:

- Live workboard Review rows and their row-local proof notes.
- Static repo-health gates for lint, type-check, dead-code/dependency routing, and tooling contracts.
- Previously blocked DB/Docker proof seams now that Docker and the isolated test database are reachable.
- Ignored local runtime clutter only.

## Review Reconciliation

Rows removed from the live workboard as proof-complete:

- `P5-T111`, `P5-T114`, `P5-T115`, `P5-T119`, and `P5-T124`.
- `P5-T125` through `P5-T134`.

Rows intentionally kept live:

- `P5-T6`: backlog scope-control gate.
- `P5-T75`: managed time-gated auth alias blocker.
- `P5-T135`: this audit/cleanup row, now in Review for signoff.

The current environment cleared the prior Docker/test-DB caveats for the retained review queue. `make db-verify` passed, the publishing and webhook DB-backed slices passed after sequential reruns, and `make docker-validate-overlays` passed including the Caddyfile validation tail.

## Cleanup Decisions

- Removed ignored local clutter only: `.DS_Store` files, stale `.playwright-cli` console log, `backend/logs/error.log`, and stale `tmp/e2e-runner/*.log` files.
- Kept runtime code unchanged; tracked code cleanup was limited to integration-test fixture/expectation alignment:
  - `backend/src/__tests__/integration/publishing.test.ts` now reflects the live auth middleware, which resolves organization context from the authenticated user/token when no explicit `X-Organization-Id` header is supplied. Route-level security tests still prove truly missing organization context returns `400`.
  - `backend/src/__tests__/integration/cases.handoff.test.ts` now expects the current seeded lifecycle label, `Intake`, for a new case handoff packet.
  - `backend/src/__tests__/integration/contacts.test.ts` now creates out-of-scope account fixtures directly, matching neighboring integration tests and avoiding an unrelated account-route bootstrap dependency in contact-scope assertions.
- Preserved concurrent testing-strategy/selector documentation changes already present in the worktree and indexed separately by `TESTING_STRATEGY_STRENGTHENING_2026-05-15.md`.

## Commands Run

Passed:

```bash
npm run knip
make ci-fast
make test-tooling
make db-verify
make docker-validate-overlays
cd backend && npm test -- src/modules/cases/queries/__tests__/handoffQueries.test.ts src/modules/cases/queries/__tests__/servicesQueries.test.ts --runInBand
cd backend && SKIP_INTEGRATION_DB_PREP=1 npm test -- src/__tests__/integration/publishing.test.ts --runInBand
cd backend && npm test -- src/__tests__/services/donationService.test.ts src/modules/events/services/__tests__/eventCatalogService.webhooks.test.ts src/__tests__/services/webhookService.delivery.test.ts src/modules/events/controllers/__tests__/events.controller.test.ts src/modules/webhooks/controllers/__tests__/webhookController.test.ts --runInBand
cd backend && SKIP_INTEGRATION_DB_PREP=1 npm test -- src/__tests__/integration/webhooks.test.ts --runInBand
make check-links
./scripts/select-checks.sh --base HEAD~1 --mode fast
make security-audit
cd frontend && npm test -- --run
cd backend && npm test -- src/__tests__/integration/contacts.test.ts --runInBand
cd backend && npm test -- src/__tests__/integration --runInBand
DB_REUSE_IF_READY=0 COMPOSE_MODE=ci DB_HOST=127.0.0.1 DB_PORT=8012 DB_NAME=nonprofit_manager_test DB_USER=postgres DB_PASSWORD=postgres ./scripts/db-migrate.sh
cd e2e && npm run test:smoke
make test-e2e-docker-smoke
```

Selector output required the broad docs/tooling/security/backend/frontend/E2E set:

```bash
make check-links
make test-tooling
npm run knip
make security-audit
make lint
make typecheck
cd backend && npm run lint
cd backend && npm run type-check
cd backend && npm test -- src/__tests__/integration
cd frontend && npm run lint
cd frontend && npm run type-check
cd frontend && npm test -- --run
cd e2e && npm run test:smoke
make test-e2e-docker-smoke
```

`make ci-fast` covered lint/type-check commands. The explicit package and E2E test commands above covered the remaining selector output.

Expected transient failures during audit:

- Parallel backend wrapper runs collided on the shared `nonprofit-manager-test-postgres` container name. The affected checks were rerun sequentially.
- `backend/src/__tests__/integration/publishing.test.ts` initially reached assertions and exposed the stale no-header organization-context expectation described above; the focused test passed after the expectation was corrected.
- A first webhook integration attempt lost its database connection while another backend wrapper rebuilt the isolated DB. The same slice passed when rerun alone with `SKIP_INTEGRATION_DB_PREP=1`.
- The first broad backend integration rerun exposed stale `contacts.test.ts` and `cases.handoff.test.ts` expectations. Targeted cleanup landed, then `contacts.test.ts` and the full backend integration suite passed.
- The first host E2E smoke reused a populated isolated DB from backend integration and failed admin bootstrap before workflow execution. Resetting the isolated test DB with `DB_REUSE_IF_READY=0` restored the Playwright-managed setup contract; the host smoke rerun passed.
- The first Docker smoke invocation passed the Playwright tests but the make target was interrupted during cleanup. The smoke stack was gone afterward; the immediate rerun passed the full `make test-e2e-docker-smoke` target.

## Deferred Follow-Ups

- No new runtime follow-up row is opened by this audit.
- Future product expansion remains gated by `P5-T6`.
- `P5-T75` remains time-gated for June 17, 2026 telemetry review and July 1, 2026 earliest enforcement.
