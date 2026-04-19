# Testing Guide

**Last Updated:** 2026-04-19

This file is the active test command map for nonprofit-manager. Use [../../CONTRIBUTING.md](../../CONTRIBUTING.md) for contributor workflow and [../development/GETTING_STARTED.md](../development/GETTING_STARTED.md) for runtime setup and ports; use this file when you need to choose the right validation command.

## Guide Map

| Need | Status | Doc |
|---|---|---|
| Repo-wide validation choices and command defaults | Active | This file |
| Frontend component-test patterns | Active, scoped | [COMPONENT_TESTING.md](COMPONENT_TESTING.md) |
| Backend Jest integration workflow | Active, scoped | [INTEGRATION_TEST_GUIDE.md](INTEGRATION_TEST_GUIDE.md) |
| Playwright runtime wrappers and browser contracts | Active, scoped | [../../e2e/README.md](../../e2e/README.md) |
| Dark-mode accessibility audit flow | Active, focused | [DARK_MODE_ACCESSIBILITY_AUDIT.md](DARK_MODE_ACCESSIBILITY_AUDIT.md) |
| Historical testing references | Historical only | [archive/README.md](archive/README.md) |

## Test Layers

| Layer | Primary Command | Notes |
|------|------------------|-------|
| DB contract verification | `make db-verify` | Rebuilds the isolated `_test` database and checks manifest/initdb parity, starter bootstrap seeds, the disposable app-role/RLS probe, known superseded indexes, and the audit-log future partition window |
| Repo-wide validation | `make test` | Runs backend/frontend tests, the host Playwright CI matrix, and the isolated Docker-backed smoke gate |
| Coverage variant (fast local lane) | `make test-coverage` | Runs backend/frontend coverage, host Playwright smoke, and the isolated Docker-backed smoke gate |
| Coverage gate (full behavior lane) | `make test-coverage-full` | Runs backend/frontend coverage, the host Playwright CI matrix, and the isolated Docker-backed smoke gate |
| Backend unit/integration | `cd backend && npm test` / `cd backend && npm test -- src/__tests__/integration` | `npm test` prepares the CI-style test DB before running the full Jest suite; add a narrower Jest path when you only need one backend integration file |
| Frontend unit/component | `cd frontend && npm test -- --run` | Frontend uses Vitest |
| E2E | `cd e2e && npm test` | Wrapper-driven host commands use the Playwright-managed `5173/3001` contract; `npm run test:docker*` default to the externally managed Docker contract on `8005/8004`, and `make test-e2e-docker-smoke` provisions an isolated Docker smoke stack on `18005/18004`. `Mobile Safari` and `Tablet` are available as manual/ad hoc `--project` runs, not CI-gated projects. |
| Docs validation | `make check-links` | Use for any docs change; add `make lint-doc-api-versioning` when API wording/examples or versioned API docs changed |
| Tooling regression coverage | `make test-tooling` | Targeted contract suite for route-audit, selector, helper-script, and wrapper changes |

## Runtime Matrix

| Context | Frontend | Backend | Notes |
|---------|----------|---------|-------|
| Docker development | `8005` | `8004` | Started with `make dev` |
| Direct backend runtime | n/a | `3000` | `cd backend && npm run dev` |
| E2E harness | `5173` | `3001` | Started by Playwright |
| Docker-backed E2E (manual dev stack) | `8005` | `8004` | Start with `make docker-up-dev`, then run `cd e2e && npm run test:docker*` |
| Docker-backed E2E (isolated smoke gate) | `18005` | `18004` | Provisioned automatically by `make test-e2e-docker-smoke`; uses compose project `nonprofit-smoke` and tears down unless `KEEP_SMOKE_STACK=1` |

## Default Commands

Run from the repo root unless noted otherwise. Prefer these before package-level commands:

```bash
make db-verify
make lint
make typecheck
make test
```

Coverage and release commands:

```bash
make ci
make ci-fast
make test-coverage
make test-coverage-full
make ci-full
make ci-unit
make test-e2e-docker-smoke
make test-tooling
```

`make ci-full` now uses the stronger `make test-coverage-full` lane, so coverage runs still include the host Playwright CI matrix instead of dropping down to the smaller smoke-only host run.

`make ci-unit` remains a relaxed, non-gating developer signal for backend/frontend unit coverage only. It is useful for quick local feedback, but it is not the repo's full coverage acceptance path.
`make test-tooling` is the targeted regression suite for selector, route-catalog audit, wrapper, and shell-helper contract changes.

## Package-Level Commands

### Backend

```bash
cd backend
npm test
npm run test:unit
npm test -- src/__tests__/integration
npm test -- src/__tests__/integration/routeGuardrails.test.ts
npm run test:coverage
npm run type-check
```

### Frontend

```bash
cd frontend
npm test -- --run
npm run test:coverage
npm run type-check
```

### E2E

```bash
cd e2e
npm test
npm run test:smoke
npm run test:docker
npm run test:docker:smoke
npm run test:docker:ci
npm run test:docker:ci:mobile
npm run test:docker:audit
npm run test:headed
npm run test:ui
npm run test:ci
npm run test:ci:mobile
```

## Docs And Contract Checks

Run `make check-links` for any docs change. Add the extra commands below only when the change touches those areas:

```bash
make check-links
make lint-doc-api-versioning
```

- Add `make lint-doc-api-versioning` when API wording, API examples, or versioned API docs changed.
- Add `make db-verify` when migration docs or database contract expectations changed.

## Choosing A Smaller Check Set

When the change set does not justify the full suite, use the repo selector:

```bash
./scripts/select-checks.sh --base HEAD~1 --mode fast
```

Use `--mode strict` when the change touches shared runtime orchestration, Docker/test wrappers, hooks, or runtime-facing docs and you want the selector to broaden into higher-confidence root checks.
Run the emitted commands in order.
Code and runtime changes should include at least one behavior-test command; docs-only changes stay on `make check-links` unless API wording/examples changed.

## Related References

- [../../backend/README.md](../../backend/README.md)
- [../../frontend/README.md](../../frontend/README.md)
- [../../e2e/README.md](../../e2e/README.md)
- [COMPONENT_TESTING.md](COMPONENT_TESTING.md)
- [INTEGRATION_TEST_GUIDE.md](INTEGRATION_TEST_GUIDE.md)
- [DARK_MODE_ACCESSIBILITY_AUDIT.md](DARK_MODE_ACCESSIBILITY_AUDIT.md)

Historical-only references now live under [archive/README.md](archive/README.md), but the active contributor workflow should flow from this file into the narrower guide you need next.
