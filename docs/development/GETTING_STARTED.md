# Getting Started

**Last Updated:** 2026-04-18

Use this guide to choose a local runtime, set up the matching environment, and confirm the expected ports. Keep broader contributor workflow in [../../CONTRIBUTING.md](../../CONTRIBUTING.md); this file is the runtime and setup source of truth.

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

Run `npm ci` from the repo root before using package-level scripts. Dependency installs are workspace-rooted.

## Choose A Runtime

Pick one runtime path and stay with it while debugging. The Docker dev stack, direct runtime, and Playwright harness all use different ports and env assumptions.

| Goal | Recommended Path | Local Contract |
|---|---|---|
| Validate Dockerfiles or production image packaging | Path 1: build-first Docker images | no long-running app; image build validation only |
| Work full stack with Docker-managed Postgres and Redis | Path 2: optional compose dev stack | frontend `8005`, backend `8004`, public site `8006` |
| Work on backend code outside Docker | Path 3: direct backend runtime | backend `3000` |
| Work on frontend code against a chosen API | Path 4: direct frontend runtime | frontend `8005` |
| Run Playwright-managed end-to-end checks | Path 5: E2E harness | frontend `5173`, backend `3001` |

## Path 1: Build-First Docker Images

Use this when you are changing Dockerfiles or want to verify the packaged assets without starting the dev stack.

```bash
make docker-build
make docker-validate
```

Expected result:

- The backend and frontend Dockerfiles both build successfully.
- The frontend production image includes `/usr/share/nginx/html/vite.svg` from `frontend/public`.

## Path 2: Optional Compose Dev Stack

Use this when you want the app plus local Postgres and Redis under Docker.

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

Use this when you want the backend outside Docker while connecting to either local or managed infrastructure.

1. Ensure Postgres and Redis are available. You can use local services, managed services, or the compose dev stack from Path 2.
2. Create the backend env file:

```bash
cp backend/.env.example backend/.env
```

3. If you are using the compose dev stack or local services that match its default ports, update `backend/.env`:

- `DB_HOST=localhost`
- `DB_PORT=8002`
- `REDIS_URL=redis://localhost:8003`
- `CORS_ORIGIN=http://127.0.0.1:8005,http://localhost:8005`

   If your database or Redis instance uses different host or port values, use those actual values instead.

4. Install dependencies from the repo root, then start the backend:

```bash
cd /path/to/nonprofit-manager
npm ci
cd backend
npm run dev
```

Expected endpoint:

- Backend API: `http://localhost:3000`

Quick verification:

```bash
curl http://localhost:3000/health/live
```

## Path 4: Direct Frontend Runtime

Use this when you are working on frontend code and already know which backend you want to target.

```bash
cp frontend/.env.example frontend/.env.local
cd /path/to/nonprofit-manager
npm ci
cd frontend
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

Use this when Playwright should manage the frontend and backend runtime for end-to-end checks.

```bash
cp e2e/.env.test.example e2e/.env.test.local
cd /path/to/nonprofit-manager
npm ci
cd e2e
npm test
```

Default Playwright runtime:

- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:3001`

The harness loads `.env.test` first and then `.env.test.local`, so local overrides win last.

## Verification And Next Docs

Use the smallest relevant verification for the change you are making. Common commands:

```bash
make lint
make typecheck
make test
make test-e2e-docker-smoke
make check-links
make lint-doc-api-versioning
cd backend && npm run type-check
cd frontend && npm run type-check
```

Open these next only if you need more than setup guidance:

- [../../CONTRIBUTING.md](../../CONTRIBUTING.md) for contributor workflow and handoff expectations
- [../testing/TESTING.md](../testing/TESTING.md) for the validation matrix
- [CONVENTIONS.md](CONVENTIONS.md) for repo conventions
- [../../backend/README.md](../../backend/README.md) or [../../frontend/README.md](../../frontend/README.md) for service-specific details
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) when the runtime does not match the expected contract
