# Agent Instructions For Nonprofit Manager

**Last Updated:** 2026-03-11

This file is for coding agents and contributors making repository changes.

## Core Rules

1. Update [../phases/planning-and-progress.md](../phases/planning-and-progress.md) before starting tracked work.
2. Keep one active task per agent by default unless the workboard explicitly documents a coordinated parallel exception.
3. Preserve existing user changes in the worktree unless the task requires touching them.
4. Prefer repo-native validation commands and policies over ad hoc checks.
5. Update active docs when commands, ports, workflows, or contracts change.

## Current Stack

### Backend

- Node.js + TypeScript
- Express
- PostgreSQL via `pg`
- Redis
- Zod validation middleware

### Frontend

- React 19
- React Router 7
- Redux Toolkit
- Vite
- Tailwind CSS

### Testing

- Jest for backend
- Vitest for frontend
- Playwright in `e2e/`

## Active Architecture Boundaries

### Backend

- Active runtime APIs are under `/api/v2/*`.
- Health aliases remain available at `/health`, `/api/health`, and `/api/v2/health`.
- Domain-owned backend code lives under `backend/src/modules/<domain>/`.
- `backend/src/routes/v2/index.ts` must import from `@modules/*` only.
- New request handling should preserve the route -> controller -> service/usecase -> data-access separation.

### Frontend

- Feature-owned frontend code lives under `frontend/src/features/<domain>/`.
- `frontend/src/pages/**` is a compatibility surface unless the repo already treats a page as canonical.
- Migrated features should read state from feature-owned state packages, not legacy `store/slices` imports.

## Validation, Auth, And Responses

- Validate inputs with Zod schemas and repo validation middleware.
- Use the current auth-guard helpers in `backend/src/services/authGuardService.ts`.
- Do not reintroduce legacy `require*OrError` helpers in new controller or module work.
- Preserve the canonical envelope shapes:

```json
{
  "success": true,
  "data": {}
}
```

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description"
  }
}
```

## Repo Workflow

- Default setup path: [GETTING_STARTED.md](GETTING_STARTED.md)
- Contributor workflow: [../../CONTRIBUTING.md](../../CONTRIBUTING.md)
- Service-specific guidance: [../../backend/README.md](../../backend/README.md) and [../../frontend/README.md](../../frontend/README.md)
- Testing guidance: [../testing/TESTING.md](../testing/TESTING.md) and [../../e2e/README.md](../../e2e/README.md)

## Validation Commands

Prefer root commands:

```bash
make lint
make typecheck
make test
```

Useful narrower commands:

```bash
cd backend && npm run type-check
cd frontend && npm run type-check
make check-links
make lint-doc-api-versioning
./scripts/select-checks.sh --base HEAD~1 --mode fast
```

Coverage thresholds are enforced by repo config. Do not restate a blanket percentage unless you have verified it from the current config.

## Documentation Expectations

- Treat [../../README.md](../../README.md) as the contributor start page.
- Treat [../INDEX.md](../INDEX.md) as the catalog, not the onboarding entry point.
- Use relative links in docs.
- Verify commands and ports from the repo before documenting them.

## Common Implementation Patterns

### Backend Work

- Add or update a module under `backend/src/modules/<domain>/`.
- Register new `/api/v2` routes through the module export path.
- Keep controllers thin and data access out of controllers.
- Add or update backend tests near the affected behavior.

### Frontend Work

- Add or update a feature package under `frontend/src/features/<domain>/`.
- Wire routes through the current route composition layer.
- Keep state ownership in the feature package when the domain is already migrated.
- Add or update frontend tests with the change.

### Docs Work

- Update entry docs when contributor navigation changes.
- Run `make check-links`.
- Run `make lint-doc-api-versioning` if API examples changed.

## Do Not Assume

- Do not assume Docker dev, direct runtime, and Playwright runtime use the same ports.
- Do not assume a package-level `npm run typecheck` script exists; this repo uses `npm run type-check`.
- Do not assume GitHub Actions is the required gate for active work; the repo uses local validation commands as the documented default path.
