# Nonprofit Manager

**Last Updated:** 2026-04-13

> Nonprofit Manager is a full-stack TypeScript platform for nonprofit operations: people and case management, events and volunteers, fundraising, client portal workflows, analytics, and website publishing.
> This README is the contributor start page and navigation hub for the repository.

`TypeScript` · `React 19` · `Express` · `PostgreSQL` · `Redis` · `Tailwind CSS` · `Docker` · `Playwright`

## Table of Contents

- [Who This Is For](#who-this-is-for)
- [Start Here](#start-here)
- [Stack](#stack)
- [Runtime Matrix](#runtime-matrix)
- [Core Commands](#core-commands)
- [Reference Map](#reference-map)
- [Current Status](#current-status)
- [License](#license)

## Who This Is For

| You are... | Start here | Notes |
|---|---|---|
| Contributor | [README.md](README.md), [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md), [CONTRIBUTING.md](CONTRIBUTING.md), [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md) | Keep setup, workflow, and task ownership in sync. |
| Docs reader | [docs/README.md](docs/README.md), [docs/INDEX.md](docs/INDEX.md) | Use these to navigate the catalog and the short docs landing page. |
| Operator | [scripts/README.md](scripts/README.md), [docs/deployment/DEPLOYMENT.md](docs/deployment/DEPLOYMENT.md) | Start from repo-native operational docs and helper scripts. |

## Start Here

Read these in order when you are contributing code or docs:

1. [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md)
2. [CONTRIBUTING.md](CONTRIBUTING.md)
3. [docs/development/CONVENTIONS.md](docs/development/CONVENTIONS.md)
4. [docs/development/ARCHITECTURE.md](docs/development/ARCHITECTURE.md)

If the work is tracked, update [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md) before editing code or documentation. The workboard is the single source of truth for ownership, status, and blockers.

> If you only need navigation, use [docs/INDEX.md](docs/INDEX.md) for the full catalog.
>
> If you only need the docs landing page, use [docs/README.md](docs/README.md).

## Stack

| Layer | Tech | Role |
|---|---|---|
| Backend | Node.js, Express, TypeScript, PostgreSQL, Redis, Zod | API, validation, auth, and background jobs |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Redux Toolkit, React Router 7 | Staff UI, portal UI, and browser workflows |
| Testing | Jest, Vitest, Playwright | Unit, component, and end-to-end coverage |
| Operations | Docker, Docker Compose, Makefile-based local CI | Local dev, validation, and deployment workflows |

## Runtime Matrix

| Mode | Start Command | Frontend | Backend/API | Other Services | Best For |
|---|---|---|---|---|---|
| Optional Docker Compose dev stack | `make dev` | `http://localhost:8005` | `http://localhost:8004` | Public site `http://localhost:8006`, Postgres `localhost:8002`, Redis `localhost:8003` | Integrated local development |
| Direct frontend runtime | `cd frontend && npm run dev` | `http://localhost:8005` | Configure `frontend/.env.local` to point at a running backend | None by default | Frontend-focused work |
| Direct backend runtime | `cd backend && npm run dev` | n/a | `http://localhost:3000` | Use local env settings; Docker-backed infra commonly maps Postgres to `8002` and Redis to `8003` | API and service work |
| E2E harness | `cd e2e && npm test` | `http://127.0.0.1:5173` | `http://127.0.0.1:3001` | Playwright manages the frontend/backend processes | Browser automation and cross-browser checks |

> These runtimes are intentionally different. Check the ports before comparing behavior across Docker, direct runtime, and Playwright.

## Core Commands

Prefer the root commands below first when they cover the work you are doing.
These are the common entry points; run `make help` for the full command surface.

| Goal | Command |
|---|---|
| Build backend and frontend images | `make docker-build` |
| Validate both Dockerfiles | `make docker-validate` |
| Rebuild Docker images without cache | `make docker-rebuild` |
| Start the optional compose dev stack | `make dev` |
| Run linters | `make lint` |
| Run TypeScript checks | `make typecheck` |
| Run tests | `make test` |
| Run tests with coverage | `make test-coverage` |
| Run full CI (lint + typecheck + test + build) | `make ci` |
| Run quick CI (lint + typecheck only) | `make ci-fast` |
| Run coverage-focused CI plus security audit | `make ci-full` |
| Run unit-only coverage CI | `make ci-unit` |
| Bootstrap or refresh the database contract | `make db-migrate` |
| Verify database migrations | `make db-verify` |
| Check markdown links | `make check-links` |
| Check active docs API versioning | `make lint-doc-api-versioning` |

<details>
<summary>Backend package commands</summary>

- `cd backend && npm run dev`
- `cd backend && npm run build`
- `cd backend && npm run lint`
- `cd backend && npm run type-check`
- `cd backend && npm run test:unit`
- `cd backend && npm run test:integration`
- `cd backend && npm run test:coverage`
- `cd backend && npm run auth:reset-state`

</details>

<details>
<summary>Frontend package commands</summary>

- `cd frontend && npm run dev`
- `cd frontend && npm run build`
- `cd frontend && npm run preview`
- `cd frontend && npm run lint`
- `cd frontend && npm run type-check`
- `cd frontend && npm test -- --run`
- `cd frontend && npm run test:coverage`

</details>

<details>
<summary>E2E package commands</summary>

- `cd e2e && npm test`
- `cd e2e && npm run test:smoke`
- `cd e2e && npm run test:headed`
- `cd e2e && npm run test:debug`
- `cd e2e && npm run test:ui`
- `cd e2e && npm run test:ci`
- `cd e2e && npm run test:docker:smoke`
- `cd e2e && npm run test:docker:ci`
- `cd e2e && npm run test:docker:audit`
- `cd e2e && npm run test:report`

</details>

## Reference Map

| Need | Read |
|---|---|
| Contributor setup | [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md) |
| Contributor workflow | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Coding-agent guardrails | [docs/development/AGENT_INSTRUCTIONS.md](docs/development/AGENT_INSTRUCTIONS.md) |
| Architecture overview | [docs/development/ARCHITECTURE.md](docs/development/ARCHITECTURE.md) |
| Testing strategy | [docs/testing/TESTING.md](docs/testing/TESTING.md) |
| Backend guide | [backend/README.md](backend/README.md) |
| Frontend guide | [frontend/README.md](frontend/README.md) |
| E2E guide | [e2e/README.md](e2e/README.md) |
| API reference | [docs/api/README.md](docs/api/README.md) |
| Deployment guide | [docs/deployment/DEPLOYMENT.md](docs/deployment/DEPLOYMENT.md) |
| Helper scripts | [scripts/README.md](scripts/README.md) |
| Docs landing page | [docs/README.md](docs/README.md) |
| Full docs catalog | [docs/INDEX.md](docs/INDEX.md) |
| Active workboard | [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md) |

## Current Status

The active delivery stream is Phase 4. The live source of truth for task ownership, status changes, and blockers is [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md).

## License

MIT
