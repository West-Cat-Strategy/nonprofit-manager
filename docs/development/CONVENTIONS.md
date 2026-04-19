# Development Conventions

**Last Updated:** 2026-04-18

Use this file for active coding and workflow conventions after you have the contributor path from [../../CONTRIBUTING.md](../../CONTRIBUTING.md) and the runtime contract from [GETTING_STARTED.md](GETTING_STARTED.md). Keep this page focused on repo behavior and patterns, not onboarding.

## Toolchain

- Node.js `20.19+`
- npm `10+`
- Docker for the optional compose-based local stack

Prefer repo-root commands when they cover the work:

```bash
make lint
make typecheck
make test
```

Package-level type checking uses `npm run type-check`, not `npm run typecheck`.

## Runtime And Env Conventions

- Docker development uses `make dev` and exposes frontend `8005`, backend `8004`, Postgres `8002`, and Redis `8003`.
- Direct backend runtime defaults to `3000`.
- Direct frontend runtime defaults to `8005` and should point at the backend you choose.
- The Playwright harness defaults to frontend `5173` and backend `3001`.
- Root Docker flows prefer `.env.development`.
- Backend local env files use `backend/.env` and optional `backend/.env.test.local`.
- Frontend local env files use `frontend/.env.local`.
- E2E local overrides use `e2e/.env.test.local`.

## Backend Conventions

- Active application endpoints live under `/api/v2/*`.
- New backend feature work should prefer `backend/src/modules/<domain>/`.
- Keep the request path thin: route -> controller -> service/usecase -> data access.
- Controllers should not own direct SQL.
- Validate request inputs with Zod middleware.
- Use the current auth-guard helpers from `backend/src/services/authGuardService.ts`.
- Do not reintroduce legacy `require*OrError` helpers in new work.

## Frontend Conventions

- Prefer feature-owned code under `frontend/src/features/<domain>/`.
- Treat `frontend/src/pages/**` as a legacy compatibility path; new runtime pages belong in `frontend/src/features/**`.
- Keep migrated feature state out of `frontend/src/store/slices/*`.
- Keep the root store keyed by canonical slice names only; do not add mirrored `*V2` aliases back into `frontend/src/store/index.ts`.
- Prefer existing API envelope helpers and shared clients over ad hoc response parsing.

## Naming

### Backend

- Controllers: `entityNameController.ts`
- Services: `entityNameService.ts`
- Middleware: `descriptiveName.ts`
- Types: `entityName.ts`

### Frontend

- Components: `PascalCase.tsx`
- Hooks: `useDescriptiveName.ts`
- Feature state files: follow the feature package pattern already in use
- Utilities: `descriptiveName.ts`

### Database

- Migrations: `NNN_descriptive_name.sql`
- Snake case for tables and columns
- Foreign keys: `{entity}_id`

## Response And API Rules

- Use `/api/v2/*` in active docs and new feature work.
- Health aliases may still use `/api/health` and `/api/v2/health`.
- Canonical success envelope:

```json
{
  "success": true,
  "data": {}
}
```

- Canonical error envelope:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description"
  }
}
```

## Testing Conventions

- Use repo-root commands by default.
- Use narrower package commands when the change set is scoped.
- For docs changes, run `make check-links`.
- If API examples changed, also run `make lint-doc-api-versioning`.
- Coverage thresholds are enforced by repo config; do not restate static percentages unless you verified them from the current config.

## Documentation Conventions

- [../../CONTRIBUTING.md](../../CONTRIBUTING.md) is the contributor entry point and workflow guide.
- [GETTING_STARTED.md](GETTING_STARTED.md) is the setup and runtime guide.
- [../../README.md](../../README.md) is the product overview and contributor handoff.
- [../README.md](../README.md) is the documentation catalog.
- [../testing/TESTING.md](../testing/TESTING.md) owns the validation command map.
- Use relative links in local docs.
- Verify commands, ports, and env guidance against the repo before documenting them.

See [../DOCUMENTATION_STYLE_GUIDE.md](../DOCUMENTATION_STYLE_GUIDE.md).
