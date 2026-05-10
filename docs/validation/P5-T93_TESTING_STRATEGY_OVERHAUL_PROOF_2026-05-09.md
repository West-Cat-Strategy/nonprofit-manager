# P5-T93 Testing Strategy Overhaul Proof - 2026-05-09

## Scope

`P5-T93` revises the repo-local testing strategy and validation tooling contract without changing production application behavior, public API shape, database schema, or GitHub Actions posture.

The implementation runs in the isolated worktree `/Users/bryan/projects/nonprofit-manager-testing-strategy` on branch `codex/testing-strategy-overhaul`, based from `origin/codex/p5-t91-queue-view-modularity`, so the dirty primary checkout stays untouched.

## Implementation Summary

- Reframe the testing guide around four lanes: narrow selector/package proof, repo behavior gate, coverage/full gate, and release or review follow-ons.
- Clarify the three E2E runtime contracts: Playwright-managed host, externally managed Docker dev/review, and isolated Docker smoke.
- Tighten command behavior so the documented strategy matches local tooling:
  - `make test` prepares the isolated test DB once and passes that prepared contract to backend Jest.
  - Workspace `package.json` and lockfile changes route through dependency/dead-code and production audit checks.
  - `contracts/*` changes route through contracts type validation instead of Docker smoke.
  - Docker E2E usage text includes the public-site port.
- Keep Docker cross-browser, Docker audit, fresh MFA, Caddy/public-site container, and non-default mobile/tablet runs as explicit follow-on lanes rather than default gates.

## Validation Status

Status: blocked at `make test-backend` by existing backend integration failures outside this docs/tooling lane. The P5-T93 selector, tooling, docs, and typecheck gates passed; host smoke and full-gate validation were not run after the backend gate failed.

### Passed

- Static selector probe for runtime docs:
  - `./scripts/select-checks.sh --files "docs/testing/TESTING.md e2e/README.md scripts/README.md docs/development/AGENT_INSTRUCTIONS.md CONTRIBUTING.md" --mode strict`
  - Output: `make check-links`, `make lint-doc-api-versioning`, `make lint-openapi`, `make test-coverage-full`.
- Static selector probe for root dependency manifests:
  - `./scripts/select-checks.sh --files "package.json package-lock.json" --mode fast`
  - Output includes `npm run knip`, `make security-audit`, and `make test-e2e-docker-smoke`.
- Static selector probe for workspace dependency manifests:
  - `./scripts/select-checks.sh --files "backend/package.json frontend/package.json e2e/package.json contracts/package.json" --mode fast`
  - Output includes package-local lint/type/test checks plus `npm run knip`, `make security-audit`, and `make test-e2e-docker-smoke`.
- Static selector probe for contracts:
  - `./scripts/select-checks.sh --files "contracts/websiteBuilder.d.ts" --mode fast`
  - Output: `cd contracts && npm run type-check`.
- Static selector probe for orchestration:
  - `./scripts/select-checks.sh --files "Makefile scripts/ci.sh scripts/select-checks.sh" --mode strict`
  - Output: `make test-tooling`, `make lint`, `make typecheck`, `make test-coverage-full`.
- Static selector probe for E2E runtime config:
  - `./scripts/select-checks.sh --files "e2e/playwright.config.ts" --mode fast`
  - Output: `make test-tooling`, `cd e2e && npm run test:smoke`, `make test-e2e-docker-smoke`.
- `git diff --check` passed.
- `make test-tooling` passed: 41 tooling-contract tests.
- `make check-links` passed: 213 files and 1419 local links checked.
- `make lint-doc-api-versioning` passed.
- `make lint-openapi` passed.
- `make typecheck` passed across backend, frontend, and contracts.

### Blocked

- `make test-backend` failed after 266 of 268 suites passed, with 2194 of 2196 tests passing.
- Failing suite: `backend/src/__tests__/integration/volunteers.test.ts`
  - Test: `Volunteer API Integration Tests > POST /api/v2/volunteers/:id/background-check/approve > approves a background check through the dedicated endpoint with notes and approval date`.
  - Failure: expected `background_check_date` to contain `2026-05-06`, received `2026-05-05T07:00:00.000Z`.
  - This is the existing `P5-T90` volunteer approval area, not a file changed by P5-T93.
- Failing suite: `backend/src/__tests__/integration/portalAuth.test.ts`
  - Test: `Portal Auth API Integration > stores duplicate-email signup requests without binding the wrong contact`.
  - Failure: expected `contact_id: null`, received an existing contact UUID.
  - This is the portal-auth duplicate-email association path, not a file changed by P5-T93.

### Not Run

- `cd e2e && npm run test:smoke` was not run because the repo behavior gate stopped at `make test-backend`.
- `make ci-full` was not run because its backend step would hit the same blocker before reaching the included isolated Docker smoke gate.

## Notes

- The isolated Docker smoke gate included inside `make ci-full` is sufficient final Docker smoke proof unless the broad gate fails before reaching that step.
- Any Docker, WebKit, or local runtime environmental blocker should be recorded here with the exact command that exposed it.
