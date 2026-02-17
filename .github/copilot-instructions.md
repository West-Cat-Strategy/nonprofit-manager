# Copilot / AI Agent Instructions — Nonprofit Manager

Purpose: fast, actionable guidance so AI coding agents can be productive immediately.

- Quick start commands:
  - Development: `make dev` (or `docker-compose -f docker-compose.dev.yml up --build -d`)
  - Full build: `make build`
  - Tests: `make test` (backend: `cd backend && npx jest --testPathPattern="<pattern>"`)
  - Lint/typecheck: `make lint` / `make typecheck`
  - DB migrations: `./scripts/db-migrate.sh` (migrations are in `database/migrations/` — never edit existing files)

- Big-picture architecture (where to look):
  - Backend: `backend/src/` — layered: `routes/` → `controllers/` (thin) → `services/` (business logic) → direct SQL with `pg` pool (`config/` holds pool and logger).
  - Frontend: `frontend/src/` — React + Redux Toolkit + Vite. `store/slices/` hold domain state; `services/api.ts` centralizes HTTP clients.
  - Database: `database/` contains numbered SQL migrations and `seeds/`.
  - Orchestration: Docker Compose files at repo root (`docker-compose.dev.yml`, `docker-compose.yml`).

- Critical patterns & conventions (do not invent alternatives):
  - TypeScript: strict mode, explicit return types, prefer `interface` for object shapes, avoid `any`.
  - Imports ordering: external → absolute `@/` → relative → type-only.
  - Backend routing: routes registered via DI/container providers; look at `container/` for wiring.
  - DB queries: always use parameterized queries (e.g. `pool.query('SELECT ... WHERE id = $1', [id])`).
  - Error/response shape: success `{ data, message? }`, errors `{ error: { message, code, details? } }`.
  - Migrations: add new numbered files under `database/migrations/`; do not modify past migrations.

- Testing & CI:
  - Local E2E: `e2e/` (Playwright) and `./scripts/test-auth-flow.sh` for auth flows.
  - CI orchestration via `Makefile` targets: `make ci`, `make ci-fast`.
  - Coverage lives in `coverage/` after running tests.

- Integration and external dependencies:
  - Redis and Postgres managed via Docker Compose in dev.
  - Plausible analytics integration in `plausible/` and `frontend`.
  - Auth: JWT + bcrypt; middleware lives in `backend/src/middleware/`.

- Project-specific developer workflows:
  - Work planning: sign out tasks in `docs/phases/planning-and-progress.md` before coding; include task IDs in commits (e.g. `feat(P2-T3): ...`).
  - Use `scripts/install-git-hooks.sh` to enable pre-commit checks.
  - For running single tests: backend `npx jest --testPathPattern="<pattern>"`; frontend `npx vitest run <pattern>`.

- Files to inspect for authoritative examples:
  - `CLAUDE.md` — existing agent guidance and commands.
  - `docs/development/AGENT_INSTRUCTIONS.md` — conventions and common task patterns.
  - `backend/src/services/` — canonical business-logic implementations.
  - `frontend/src/services/api.ts` and `frontend/src/store/slices/` — API client & state patterns.
  - `database/migrations/` — migration naming and ordering conventions.

- When editing code, prefer fixes that address root causes (keep changes minimal and scoped).
- Avoid changing database migration history or production configs.

If anything here is unclear or you'd like additional examples (e.g., common controller → service code snippet, or a checklist for adding a new API resource), tell me which section to expand and I will iterate.
