# Nonprofit Manager - Quick Reference

**Last Updated:** 2026-03-19

Compact command map for day-to-day work in the nonprofit-manager repo.

## Project Structure

```text
nonprofit-manager/
├── backend/           # Express.js + TypeScript API
├── frontend/          # React + TypeScript + Vite app
├── database/          # PostgreSQL migrations, seeds, and init scripts
├── docs/              # Repository documentation
└── scripts/           # Local validation and helper scripts
```

## Core Commands

Run these from the repo root unless noted otherwise:

```bash
make lint
make typecheck
make test
make ci
make ci-fast
make ci-full
make check-links
make lint-doc-api-versioning
```

## Runtime Commands

### Optional Docker Compose Dev Stack

```bash
make dev
```

- Frontend: `http://localhost:8005`
- Backend API: `http://localhost:8004`
- PostgreSQL: `localhost:8002`
- Redis: `localhost:8003`

### Direct Backend Runtime

```bash
cd backend
npm ci
npm run dev
```

- Backend API: `http://localhost:3000`

### Direct Frontend Runtime

```bash
cd frontend
npm ci
npm run dev
```

- Frontend: `http://localhost:8005`

### Playwright / E2E Harness

```bash
cd e2e
npm ci
npm test
```

- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:3001`

## Database Commands

```bash
make db-migrate
make db-verify
```

- `make db-migrate` starts or inspects the current database contract.
- `make db-verify` rebuilds and validates the isolated `*_test` database contract.

## Validation Choices

- Docs-only change: `make check-links` and `make lint-doc-api-versioning`
- Small mixed change: `./scripts/select-checks.sh --base HEAD~1 --mode fast`
- Release-facing change: `make ci-full`

## Key References

- [README.md](../../README.md) - Contributor start page
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Contributor workflow and validation
- [docs/development/GETTING_STARTED.md](../development/GETTING_STARTED.md) - Setup and runtime choices
- [docs/development/CONVENTIONS.md](../development/CONVENTIONS.md) - Code and workflow conventions
- [docs/development/AGENT_INSTRUCTIONS.md](../development/AGENT_INSTRUCTIONS.md) - Coding-agent guardrails
- [docs/testing/TESTING.md](../testing/TESTING.md) - Test command map
- [docs/phases/planning-and-progress.md](../phases/planning-and-progress.md) - Active workboard
- [scripts/README.md](../../scripts/README.md) - Helper-script index

## Common Issues

### Database connection errors

- Verify PostgreSQL is running and the credentials in your env files match the runtime you are using.
- For the test database contract, use the `_test` database names and ports described in `docs/development/GETTING_STARTED.md`.

### Port conflicts

- Backend default: `3000` for direct runtime, `8004` for the Docker dev stack
- Frontend default: `8005` for direct runtime or Docker dev stack, `5173` for Playwright
- Change the relevant env file if you need a different local port map
