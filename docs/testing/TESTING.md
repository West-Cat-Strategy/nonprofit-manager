# Testing Guide

**Last Updated:** 2026-03-11

This file is the active test command map for nonprofit-manager. Use it with [../../README.md](../../README.md) and the service-specific READMEs.

## Test Layers

| Layer | Primary Command | Notes |
|------|------------------|-------|
| Repo-wide validation | `make test` | Runs backend, frontend, and Playwright on the CI-style local stack |
| Backend unit/integration | `cd backend && npm test` / `cd backend && npm run test:integration` | Backend uses Jest |
| Frontend unit/component | `cd frontend && npm test -- --run` | Frontend uses Vitest |
| E2E | `cd e2e && npm test` | Playwright starts frontend/backend by default |
| Docs validation | `make check-links` and `make lint-doc-api-versioning` | Use when docs changed |

## Runtime Matrix

| Context | Frontend | Backend | Notes |
|---------|----------|---------|-------|
| Docker development | `8005` | `8004` | Started with `make dev` |
| Direct backend runtime | n/a | `3000` | `cd backend && npm run dev` |
| E2E harness | `5173` | `3001` | Started by Playwright |

## Default Commands

Run from the repo root unless noted otherwise:

```bash
make lint
make typecheck
make test
```

Broader release-facing commands:

```bash
make ci
make ci-full
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
npm run test:headed
npm run test:ui
npm run test:ci
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
scripts/select-checks.sh --base HEAD~1 --mode fast
```

Run the emitted commands in order.

## Related References

- [../../backend/README.md](../../backend/README.md)
- [../../frontend/README.md](../../frontend/README.md)
- [../../e2e/README.md](../../e2e/README.md)
- [COMPONENT_TESTING.md](COMPONENT_TESTING.md)
- [INTEGRATION_TEST_GUIDE.md](INTEGRATION_TEST_GUIDE.md)
