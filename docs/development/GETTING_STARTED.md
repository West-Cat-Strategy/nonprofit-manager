# Getting Started

**Last Updated:** 2026-04-16

Use this guide to get a working nonprofit-manager development environment without guessing which runtime the docs assume. The ports differ by mode, so keep the runtime you choose in mind as you follow the steps.

## Prerequisites

- Node.js `20.19+`
- npm `10+`
- Docker if you plan to build images or use the optional compose dev stack
- Git

Verify your toolchain:

```bash
node --version
npm --version
docker --version
docker compose version  # optional, only if you plan to use make dev
git --version
```

## Choose A Runtime

| Goal | Recommended Path | Notes |
|------|------------------|-------|
| Dockerfile or image validation | Direct Dockerfile builds | Fastest way to verify container changes and packaged public assets |
| Full-stack day-to-day development | Optional Docker Compose dev stack | Fastest path to a working app with Postgres and Redis included |
| Backend-only feature work | Direct backend runtime | App runs on `3000`; you provide env config and infra |
| Frontend-only feature work | Direct frontend runtime | App runs on `8005`; point it at a running backend |
| Playwright or end-to-end validation | E2E harness | Playwright manages frontend/backend on `5173/3001` |

Use the same runtime mode consistently while debugging. A direct backend on `3000` and the Docker dev backend on `8004` are both valid, but they are different setups with different env expectations.

## Path 1: Build-First Docker Images

Use this when you are changing Dockerfiles or want to confirm the production images still package the right files.

```bash
make docker-build
make docker-validate
```

Expected result:

- The backend and frontend Dockerfiles both build successfully
- The frontend production image includes `/usr/share/nginx/html/vite.svg` from `frontend/public`

## Path 2: Optional Compose Dev Stack

Use this when you want local Postgres and Redis alongside the app.

```bash
cp .env.development.example .env.development
make dev
```

Expected endpoints:

- Frontend: `http://localhost:8005`
- Backend API: `http://localhost:8004`
- Public site: `http://localhost:8006`
- Postgres: `localhost:8002`
- Redis: `localhost:8003`

Quick verification:

```bash
curl http://localhost:8004/health
```

## Path 3: Direct Backend Runtime

Use this when you want to run the backend outside Docker while still using either local or managed infrastructure.

1. Ensure Postgres and Redis are available. You can use local services, managed services, or the optional compose dev stack from Path 2.

2. Create the backend env file:

```bash
cd backend
cp .env.example .env
```

3. If you are using local Postgres/Redis services, update `backend/.env`:

- `DB_HOST=localhost`
- `DB_PORT=8002`
- `REDIS_URL=redis://localhost:8003`
- `CORS_ORIGIN=http://127.0.0.1:8005,http://localhost:8005`

4. Install and start the backend:

```bash
npm ci
npm run dev
```

Expected endpoint:

- Backend API: `http://localhost:3000`

Quick verification:

```bash
curl http://localhost:3000/health/live
```

## Path 4: Direct Frontend Runtime

Use this when you are working on frontend code and already have an API running.

```bash
cd frontend
cp .env.example .env.local
npm ci
```

Set `VITE_API_URL` in `frontend/.env.local` to match the backend you are using:

- Direct backend runtime: `http://localhost:3000/api`
- Docker dev backend: `http://localhost:8004/api`

Start the frontend:

```bash
npm run dev
```

Expected endpoint:

- Frontend: `http://localhost:8005`

## Path 5: E2E Harness

Use this for Playwright-driven validation. The harness starts its own backend and frontend by default.

```bash
cd e2e
npm ci
cp .env.test.example .env.test.local
npm test
```

Default Playwright runtime:

- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:3001`

The harness loads `.env.test.local` first, then `.env.test`.

## Core Verification Commands

Run the smallest useful set for your change. Prefer repo-root commands first:

```bash
make lint
make typecheck
make test
```

Common narrower commands:

```bash
cd backend && npm run type-check
cd frontend && npm run type-check
cd e2e && npm run test:smoke
make check-links
make lint-doc-api-versioning
```

## What To Read Next

1. [../../CONTRIBUTING.md](../../CONTRIBUTING.md)
2. [CONVENTIONS.md](CONVENTIONS.md)
3. [ARCHITECTURE.md](ARCHITECTURE.md)
4. [../../README.md](../../README.md) for product context
5. [../README.md](../README.md) for the docs landing page
6. [../../docs/phases/planning-and-progress.md](../../docs/phases/planning-and-progress.md) before tracked work

## Troubleshooting

- Backend or Docker setup issues: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Backend-specific details: [../../backend/README.md](../../backend/README.md)
- Frontend-specific details: [../../frontend/README.md](../../frontend/README.md)
- E2E details: [../../e2e/README.md](../../e2e/README.md)
