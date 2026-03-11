# Frontend Service

**Last Updated:** 2026-03-11

This guide covers the frontend application only. For the full contributor path, start at [../README.md](../README.md).

## What Lives Here

The frontend provides the staff app, admin surfaces, and other browser-based product flows.

Current structure is centered on:

- `src/features/` for feature-owned code
- `src/routes/` for route composition
- `src/pages/` for compatibility or route-facing wrappers where still needed
- `src/store/` for the root store and any remaining shared legacy wiring

## Runtime Modes

| Mode | Start Command | Address | Notes |
|------|---------------|---------|-------|
| Docker development | `make dev` from repo root | `http://localhost:8005` | Frontend proxies `/api` to the Docker backend |
| Direct frontend runtime | `cd frontend && npm run dev` | `http://localhost:8005` | Point `frontend/.env.local` at the backend you want |
| E2E harness frontend | started by Playwright | `http://127.0.0.1:5173` | Used by `cd e2e && npm test` |

## Direct Frontend Setup

```bash
cd frontend
cp .env.example .env.local
npm ci
npm run dev
```

Set `VITE_API_URL` in `frontend/.env.local` to match the backend you are using:

- `http://localhost:3000/api` for a direct backend runtime
- `http://localhost:8004/api` for the Docker dev backend

## Common Commands

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run type-check
npm test -- --run
npm run test:coverage
```

Repo-root equivalents:

- `make lint`
- `make typecheck`
- `make test`

## Frontend Conventions

- Prefer feature-owned code under `src/features/<domain>/`.
- Keep migrated feature state out of `src/store/slices/*`.
- Treat `src/pages/**` as compatibility or route-surface code unless the existing domain still uses it as the active implementation boundary.
- Use the current API envelope helpers and shared client abstractions instead of ad hoc response parsing.

## Related Docs

- [SETUP.md](SETUP.md)
- [../docs/development/GETTING_STARTED.md](../docs/development/GETTING_STARTED.md)
- [../docs/development/CONVENTIONS.md](../docs/development/CONVENTIONS.md)
- [../docs/testing/COMPONENT_TESTING.md](../docs/testing/COMPONENT_TESTING.md)
- [../docs/testing/TESTING.md](../docs/testing/TESTING.md)
- [../e2e/README.md](../e2e/README.md)
- [NEO-BRUTALIST-GUIDE.md](NEO-BRUTALIST-GUIDE.md)
