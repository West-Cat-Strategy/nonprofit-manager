# Backend Service

**Last Updated:** 2026-04-18

This guide covers the backend service only. For the contributor workflow, start at [../CONTRIBUTING.md](../CONTRIBUTING.md). Use [../README.md](../README.md) for product context and contributor handoff.

## What Lives Here

The backend provides:

- `/api/v2/*` application endpoints
- health endpoints at `/health`, `/api/health`, and `/api/v2/health`
- authentication, authorization, validation, and business logic
- background scheduler and integration surfaces

Active domain-owned backend code lives under `src/modules/`.

## Runtime Modes

| Mode | Start Command | Address | Notes |
|------|---------------|---------|-------|
| Docker development | `make dev` from repo root | `http://localhost:8004` | Backend runs in `backend-dev` with Docker-managed Postgres and Redis |
| Direct backend runtime | `cd backend && npm run dev` | `http://localhost:3000` | Uses your `backend/.env` settings |
| E2E harness backend | started by Playwright | `http://127.0.0.1:3001` | Used by `cd e2e && npm test` |

Keep these modes separate when debugging or documenting local issues. The port and env expectations are different across the three runtimes.

## Direct Backend Setup

```bash
cp backend/.env.example backend/.env
cd /path/to/nonprofit-manager
npm ci
cd backend
npm run dev
```

If you are using the Docker dev Postgres and Redis services instead of local infra, update `backend/.env` to match:

- `DB_HOST=localhost`
- `DB_PORT=8002`
- `REDIS_URL=redis://localhost:8003`
- `CORS_ORIGIN=http://127.0.0.1:8005,http://localhost:8005`

Quick verification:

```bash
curl http://localhost:3000/health/live
```

## Common Commands

```bash
npm run dev
npm run build
npm run lint
npm run type-check
npm test
npm run test:unit
npm test -- src/__tests__/integration
npm test -- src/__tests__/integration/routeGuardrails.test.ts
npm run test:coverage
```

Supported backend integration runs go through `npm test` so the repo-preferred CI-style test database contract is prepared before Jest executes. The legacy shell scripts under `tests/integration/` are kept only as historical artifacts and are not part of the supported contributor workflow.

Reset persisted auth lockouts and auth rate-limit buckets:

```bash
npm run auth:reset-state
```

Repo-root equivalents:

- `make lint`
- `make typecheck`
- `make test`
- `make check-links` and `make lint-doc-api-versioning` for backend-doc changes

## Architecture Notes

- Active runtime route registration is owned by `src/routes/v2/index.ts`.
- New backend feature work should land in `src/modules/<domain>/`.
- Keep the HTTP boundary thin: route -> controller -> service/usecase -> data access.
- Avoid direct SQL in controllers.
- Use the current auth-guard helpers in `src/services/authGuardService.ts`.

## API And Response Conventions

- Active API docs should use `/api/v2/*`.
- Legacy `/api/*` application endpoints are tombstoned; only the documented health aliases remain active outside `/api/v2/*`.
- Success envelope:

```json
{
  "success": true,
  "data": {}
}
```

- Error envelope:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description"
  }
}
```

## Related Docs

- [../docs/development/GETTING_STARTED.md](../docs/development/GETTING_STARTED.md)
- [../docs/development/CONVENTIONS.md](../docs/development/CONVENTIONS.md)
- [../docs/development/AGENT_INSTRUCTIONS.md](../docs/development/AGENT_INSTRUCTIONS.md)
- [../docs/api/README.md](../docs/api/README.md)
- [../docs/testing/TESTING.md](../docs/testing/TESTING.md)
- [../docs/deployment/DB_SETUP.md](../docs/deployment/DB_SETUP.md)
