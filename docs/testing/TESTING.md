# Testing Guide

**Last Updated:** 2026-04-16

This file is the active test command map for nonprofit-manager. Use it with [../../README.md](../../README.md) and the service-specific READMEs.

## Test Layers

| Layer | Primary Command | Notes |
|------|------------------|-------|
| Repo-wide validation | `make test` | Runs backend, frontend, and Playwright on the CI-style local stack |
| Coverage variant | `make test-coverage` | Runs backend/frontend coverage and Playwright smoke tests |
| Backend unit/integration | `cd backend && npm test` / `cd backend && npm run test:integration` | `npm test` prepares the CI-style test DB before running the full Jest suite |
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
```

## Package-Level Commands

### Backend

```bash
cd backend
npm test
npm run test:unit
npm run test:integration
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

## Related References

- [../../backend/README.md](../../backend/README.md)
- [../../frontend/README.md](../../frontend/README.md)
- [../../e2e/README.md](../../e2e/README.md)
- [COMPONENT_TESTING.md](COMPONENT_TESTING.md)
- [INTEGRATION_TEST_GUIDE.md](INTEGRATION_TEST_GUIDE.md)

`INTEGRATION_TEST_GUIDE.md` and `MANUAL_TESTING_GUIDE.md` are narrower supporting references. Treat this file as the primary source of truth for the current test-command map.
