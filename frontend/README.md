# Frontend Service

**Last Updated:** 2026-04-18

This guide covers the frontend application only. For the contributor workflow, start at [../CONTRIBUTING.md](../CONTRIBUTING.md). Use [../README.md](../README.md) for product context and contributor handoff.

## What Lives Here

The frontend provides the staff app, admin surfaces, and other browser-based product flows.

Current structure is centered on:

- `src/features/` for feature-owned code
- `src/routes/` for route composition
- `src/pages/` for legacy compatibility paths only
- `src/store/` for the root store and shared state wiring

## Runtime Modes

| Mode | Start Command | Address | Notes |
|------|---------------|---------|-------|
| Docker development | `make dev` from repo root | `http://localhost:8005` | Frontend proxies `/api` to the Docker backend |
| Direct frontend runtime | `cd frontend && npm run dev` | `http://localhost:8005` | Point `frontend/.env.local` at the backend you want |
| E2E harness frontend | started by Playwright | `http://127.0.0.1:5173` | Used by `cd e2e && npm test` |

The frontend port changes between the direct runtime and the Playwright harness. Keep the selected runtime in mind before comparing behavior or API URLs.

## Direct Frontend Setup

```bash
cp frontend/.env.example frontend/.env.local
cd /path/to/nonprofit-manager
npm ci
cd frontend
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
- Treat `src/pages/**` as a legacy compatibility path; new runtime pages belong in `src/features/**`.
- Use the current API envelope helpers and shared client abstractions instead of ad hoc response parsing.

## Related Docs

- [SETUP.md](SETUP.md)
- [../docs/development/GETTING_STARTED.md](../docs/development/GETTING_STARTED.md)
- [../docs/development/CONVENTIONS.md](../docs/development/CONVENTIONS.md)
- [../docs/testing/COMPONENT_TESTING.md](../docs/testing/COMPONENT_TESTING.md)
- [../docs/testing/TESTING.md](../docs/testing/TESTING.md)
- [../e2e/README.md](../e2e/README.md)
- [NEO-BRUTALIST-GUIDE.md](NEO-BRUTALIST-GUIDE.md)
