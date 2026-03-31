# Nonprofit Manager

**Last Updated:** 2026-03-19

Nonprofit Manager is a full-stack TypeScript platform for nonprofit operations: people and case management, events and volunteers, fundraising, client portal workflows, analytics, and website publishing.

This README is the contributor start page. Use [docs/INDEX.md](docs/INDEX.md) for the full documentation catalog.

## Start Here

Read these in order when you are contributing code or docs:

1. [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md)
2. [CONTRIBUTING.md](CONTRIBUTING.md)
3. [docs/development/CONVENTIONS.md](docs/development/CONVENTIONS.md)
4. [docs/development/ARCHITECTURE.md](docs/development/ARCHITECTURE.md)

If the work is tracked, update [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md) before editing code or documentation.

## Stack

- Backend: Node.js, Express, TypeScript, PostgreSQL, Redis, Zod
- Frontend: React 19, TypeScript, Vite, Tailwind CSS, Redux Toolkit, React Router 7
- Testing: Jest, Vitest, Playwright
- Operations: Dockerfile builds, optional Docker Compose dev stack, Makefile-based local CI, deployment scripts

## Docker Images

Use these when you want the fastest feedback on container changes:

- `make docker-build` builds the backend and frontend images directly from their Dockerfiles
- `make docker-validate` rebuilds both Dockerfiles with `--no-cache` and `--pull`
- `make dev` starts the optional compose-based development stack when you want local Postgres and Redis together

## Runtime Matrix

| Mode | Start Command | Frontend | Backend/API | Other Services |
|------|---------------|----------|-------------|----------------|
| Optional Docker Compose dev stack | `make dev` | `http://localhost:8005` | `http://localhost:8004` | Public site `http://localhost:8006`, Postgres `localhost:8002`, Redis `localhost:8003` |
| Direct frontend runtime | `cd frontend && npm run dev` | `http://localhost:8005` | Configure `frontend/.env.local` to point at a running backend | None by default |
| Direct backend runtime | `cd backend && npm run dev` | n/a | `http://localhost:3000` | Use your local env settings; Docker-backed infra commonly maps Postgres to `8002` and Redis to `8003` |
| E2E harness | `cd e2e && npm test` | `http://127.0.0.1:5173` | `http://127.0.0.1:3001` | Playwright manages the frontend/backend processes |

## Common Commands

Run these from the repo root unless noted otherwise:

```bash
make docker-build
make docker-validate
make dev
make lint
make typecheck
make test
make ci
make ci-fast
make ci-full
make ci-unit
make db-verify
make check-links
make lint-doc-api-versioning
```

Package-level commands still exist when you want narrower feedback:

- `cd backend && npm run type-check`
- `cd frontend && npm run type-check`
- `cd e2e && npm run test:smoke`

## Documentation Map

Use these as the main active references:

- [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md) for setup and runtime choices
- [CONTRIBUTING.md](CONTRIBUTING.md) for branch, review, and validation workflow
- [docs/development/AGENT_INSTRUCTIONS.md](docs/development/AGENT_INSTRUCTIONS.md) for coding-agent rules and repo guardrails
- [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md) for service-specific guidance
- [docs/testing/TESTING.md](docs/testing/TESTING.md) and [e2e/README.md](e2e/README.md) for test guidance
- [docs/api/README.md](docs/api/README.md) for API reference entry points
- [docs/deployment/DEPLOYMENT.md](docs/deployment/DEPLOYMENT.md) for deployment guidance
- [CONTRIBUTING.md](CONTRIBUTING.md) for contributor workflow and validation expectations
- [scripts/README.md](scripts/README.md) for the root helper-script index
- [docs/INDEX.md](docs/INDEX.md) for the full catalog

## Current Status

The active delivery stream is Phase 4. The live source of truth for task ownership, status changes, and blockers is [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md).

## License

MIT
