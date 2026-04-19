# Testing Guide

**Last Updated:** 2026-04-18

This file is the active test command map for nonprofit-manager. Use [../../CONTRIBUTING.md](../../CONTRIBUTING.md) for contributor workflow and [../development/GETTING_STARTED.md](../development/GETTING_STARTED.md) for runtime setup and ports; use this file when you need to choose the right validation command.

## Guide Map

| Need | Status | Doc |
|---|---|---|
| Repo-wide validation choices and command defaults | Active | This file |
| Frontend component-test patterns | Active, scoped | [COMPONENT_TESTING.md](COMPONENT_TESTING.md) |
| Backend Jest integration workflow | Active, scoped | [INTEGRATION_TEST_GUIDE.md](INTEGRATION_TEST_GUIDE.md) |
| Playwright runtime wrappers and browser contracts | Active, scoped | [../../e2e/README.md](../../e2e/README.md) |
| Dark-mode accessibility audit flow | Active, focused | [DARK_MODE_ACCESSIBILITY_AUDIT.md](DARK_MODE_ACCESSIBILITY_AUDIT.md) |
| Volunteer-management manual QA checklist | Historical, narrow | [MANUAL_TESTING_GUIDE.md](MANUAL_TESTING_GUIDE.md) |
| Original Phase 2 integration rollout map | Historical context | [INTEGRATION_TESTING_PHASE2.md](INTEGRATION_TESTING_PHASE2.md) |
| Older frontend coverage snapshot | Historical snapshot | [TESTING_STATUS.md](TESTING_STATUS.md) |

## Test Layers

| Layer | Primary Command | Notes |
|------|------------------|-------|
| Repo-wide validation | `make test` | Runs backend/frontend tests, the host Playwright CI matrix, and the Docker-backed smoke gate |
| Coverage variant | `make test-coverage` | Runs backend/frontend coverage, host Playwright smoke, and the Docker-backed smoke gate |
| Backend unit/integration | `cd backend && npm test` / `cd backend && npm test -- src/__tests__/integration` | `npm test` prepares the CI-style test DB before running the full Jest suite; add a narrower Jest path when you only need one backend integration file |
| Frontend unit/component | `cd frontend && npm test -- --run` | Frontend uses Vitest |
| E2E | `cd e2e && npm test` | Wrapper-driven host commands always use the Playwright-managed `5173/3001` contract; `npm run test:docker*` always target the externally managed Docker contract on `8005/8004`. `Mobile Safari` and `Tablet` are available as manual/ad hoc `--project` runs, not CI-gated projects. |
| Docs validation | `make check-links` and `make lint-doc-api-versioning` | Use when docs changed |

## Runtime Matrix

| Context | Frontend | Backend | Notes |
|---------|----------|---------|-------|
| Docker development | `8005` | `8004` | Started with `make dev` |
| Direct backend runtime | n/a | `3000` | `cd backend && npm run dev` |
| E2E harness | `5173` | `3001` | Started by Playwright |
| Docker-backed E2E | `8005` | `8004` | Start with `make docker-up-dev`, then run `cd e2e && npm run test:docker*` |

## Default Commands

Run from the repo root unless noted otherwise. Prefer these before package-level commands:

```bash
make lint
make typecheck
make test
```

Coverage and release commands:

```bash
make ci
make test-coverage
make ci-full
make ci-unit
make test-e2e-docker-smoke
```

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

Run these when documentation or API examples change:

```bash
make check-links
make lint-doc-api-versioning
```

## Choosing A Smaller Check Set

When the change set does not justify the full suite, use the repo selector:

```bash
./scripts/select-checks.sh --base HEAD~1 --mode fast
```

Run the emitted commands in order.
Code and runtime changes should include at least one behavior-test command; docs-only changes stay on docs checks.

## Related References

- [../../backend/README.md](../../backend/README.md)
- [../../frontend/README.md](../../frontend/README.md)
- [../../e2e/README.md](../../e2e/README.md)
- [COMPONENT_TESTING.md](COMPONENT_TESTING.md)
- [INTEGRATION_TEST_GUIDE.md](INTEGRATION_TEST_GUIDE.md)
- [DARK_MODE_ACCESSIBILITY_AUDIT.md](DARK_MODE_ACCESSIBILITY_AUDIT.md)

Historical-only references remain in this folder for context, but the active contributor workflow should flow from this file into the narrower guide you need next.
