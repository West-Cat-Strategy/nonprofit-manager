# Getting Started

**Last Updated:** 2026-04-20

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

Tracked `*.example` env files in this repo are templates. The copied live files you create from them, such as `.env.development`, `backend/.env`, `frontend/.env.local`, `e2e/.env.test.local`, `.env.production`, `.env.elk`, and `.env.plausible`, stay local-only and ignored.

## Choose A Runtime

Pick one runtime path and stay with it while debugging. The Docker dev stack, direct runtime, and Playwright harness all use different ports and env assumptions.

| Goal | Recommended Path | Local Contract |
|---|---|---|
| Validate Dockerfiles or production image packaging | Path 1: build-first Docker images | no long-running app; image build validation only |
| Work full stack with Docker-managed Postgres and Redis | Path 2: optional compose dev stack | frontend `8005`, backend `8004`, public site `8006` |
| Work on the API backend outside Docker | Path 3: direct backend runtime | backend `3000` |
| Work on the public-site runtime outside Docker | Path 4: direct public-site runtime | public site `8006` |
| Run schedulers or worker-side integrations outside Docker | Path 5: direct worker runtime | no HTTP port |
| Work on frontend code against a chosen API | Path 6: direct frontend runtime | frontend `8005` |
| Run Playwright-managed end-to-end checks | Path 7: E2E harness | frontend `5173`, backend `3001` |

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
- `FRONTEND_URL=http://localhost:8005`
- `CORS_ORIGIN=http://127.0.0.1:8005,http://localhost:8005`
- `WEBAUTHN_ORIGIN=http://127.0.0.1:8005,http://localhost:8005`

   If your database or Redis instance uses different host or port values, use those actual values instead.

   The backend code defaults `FRONTEND_URL`, `CORS_ORIGIN`, and `WEBAUTHN_ORIGIN` to the host Playwright contract around `5173`. If you are pairing the direct backend with the direct frontend runtime on `8005`, or any other frontend port, update all three values to match the frontend contract you are actually using.

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

## Path 4: Direct Public-Site Runtime

Use this when you want to run the public-site server outside Docker while reusing the same backend env contract.

```bash
cp backend/.env.example backend/.env
cd /path/to/nonprofit-manager
npm ci
cd backend
npm run dev:public
```

Expected endpoint:

- Public site: `http://localhost:8006`

This runtime uses the same `backend/.env` contract as the direct API runtime. Keep the DB, Redis, and origin settings aligned with the backing services you chose in Path 2 or Path 3.

## Path 5: Direct Worker Runtime

Use this when you need scheduler, queue, or worker-side integration behavior without the Docker stack.

```bash
cp backend/.env.example backend/.env
cd /path/to/nonprofit-manager
npm ci
cd backend
npm run worker:dev
```

Expected behavior:

- No HTTP port is exposed
- The worker uses the same database and Redis settings as the backend runtime

## Path 6: Direct Frontend Runtime

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

If you are also using the direct backend runtime, set that backend's `FRONTEND_URL`, `CORS_ORIGIN`, and `WEBAUTHN_ORIGIN` to the direct frontend origin on `8005`. Otherwise the backend keeps its Playwright-oriented `5173` defaults and email links, passkeys, or CORS checks can point at the wrong origin.

Start the frontend:

```bash
npm run dev
```

Expected endpoint:

- Frontend: `http://localhost:8005`

## Path 7: E2E Harness

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
Wrapper-driven docker commands still default to `8005/8004/8006`, while the repo-root `make test-e2e-docker-smoke` target provisions its own isolated smoke stack on `18005/18004/18006` unless `KEEP_SMOKE_STACK=1`.

## Verification And Next Docs

When you need the repo-owned database contract, use `make db-migrate` for the active database and `make db-verify` for the disposable isolated test database. Avoid running individual `database/migrations/NNN_*.sql` files directly; use `database/initdb/000_init.sql` only when you are manually replaying the full manifest-ordered bootstrap contract against native Postgres.

Use the smallest relevant verification for the change you are making. Common commands:

```bash
make db-migrate
make db-verify
make lint
make typecheck
make test
make test-e2e-docker-smoke
make test-tooling
make check-links
make lint-doc-api-versioning
cd backend && npm run type-check
cd frontend && npm run type-check
```

Open these next only if you need more than setup guidance:

- [../../CONTRIBUTING.md](../../CONTRIBUTING.md) for contributor workflow and handoff expectations
- [../testing/TESTING.md](../testing/TESTING.md) for the validation matrix
- [CONVENTIONS.md](CONVENTIONS.md) for repo conventions
- [../../backend/README.md](../../backend/README.md) or [../../frontend/README.md](../../frontend/README.md) for service-specific details, including direct public-site and worker runtimes
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) when the runtime does not match the expected contract
