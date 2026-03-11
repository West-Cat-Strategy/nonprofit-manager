# Getting Started

**Last Updated:** 2026-03-11

Use this guide to get a working nonprofit-manager development environment without guessing which runtime the docs assume.

## Prerequisites

- Node.js `20.19+`
- npm `10+`
- Docker with Compose support for the recommended local stack
- Git

Verify your toolchain:

```bash
node --version
npm --version
docker compose version
git --version
```

## Choose A Runtime

| Goal | Recommended Path | Notes |
|------|------------------|-------|
| Full-stack day-to-day development | Docker development | Fastest path to a working app with Postgres and Redis included |
| Backend-only feature work | Direct backend runtime | App runs on `3000`; you provide env config and infra |
| Frontend-only feature work | Direct frontend runtime | App runs on `8005`; point it at a running backend |
| Playwright or end-to-end validation | E2E harness | Playwright manages frontend/backend on `5173/3001` |

## Path 1: Docker Development

This is the default contributor path.

```bash
cp .env.development.example .env.development
make install
cd e2e && npm ci
cd ..
make dev
```

Expected endpoints:

- Frontend: `http://localhost:8005`
- Backend API: `http://localhost:8004`
- Postgres: `localhost:8002`
- Redis: `localhost:8003`

Quick verification:

```bash
curl http://localhost:8004/health
```

## Path 2: Direct Backend Runtime

Use this when you want to run the backend outside Docker while still using either local or Docker-backed infrastructure.

1. Start infrastructure if needed:

```bash
cp .env.development.example .env.development
docker compose -f docker-compose.dev.yml up -d postgres redis
```

2. Create the backend env file:

```bash
cd backend
cp .env.example .env
```

3. If you are using the Docker dev Postgres/Redis services from step 1, update `backend/.env`:

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

## Path 3: Direct Frontend Runtime

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

## Path 4: E2E Harness

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

Run the smallest useful set for your change:

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

1. [../../README.md](../../README.md)
2. [../../CONTRIBUTING.md](../../CONTRIBUTING.md)
3. [CONVENTIONS.md](CONVENTIONS.md)
4. [ARCHITECTURE.md](ARCHITECTURE.md)
5. [../../docs/phases/planning-and-progress.md](../../docs/phases/planning-and-progress.md)

## Troubleshooting

- Backend or Docker setup issues: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Backend-specific details: [../../backend/README.md](../../backend/README.md)
- Frontend-specific details: [../../frontend/README.md](../../frontend/README.md)
- E2E details: [../../e2e/README.md](../../e2e/README.md)
