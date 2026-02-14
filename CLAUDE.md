# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All orchestration is done via `make`. Run `make help` for the full list.

```bash
# Development
make dev              # Start full dev environment (Docker)
make docker-up        # Start Docker services
make docker-down      # Stop Docker services

# Quality
make lint             # ESLint (backend + frontend)
make lint-fix         # Auto-fix lint issues
make typecheck        # TypeScript type checking (both)
make test             # Run all unit tests
make test-coverage    # Tests with coverage reports

# CI pipelines
make ci               # Full CI: lint + typecheck + test + build
make ci-fast          # Quick CI: lint + typecheck only
make ci-unit          # Unit tests only with coverage

# Build & Deploy
make build            # Build backend + frontend
make deploy-local     # Rebuild and restart Docker containers
```

### Running a single backend test
```bash
cd backend && npx jest --testPathPattern="<pattern>" --forceExit
```

### Running a single frontend test
```bash
cd frontend && npx vitest run <pattern>
```

### Database migrations
```bash
./scripts/db-migrate.sh
./scripts/verify-migrations.sh
```

## Architecture

Full-stack TypeScript monorepo: React frontend, Express.js backend, PostgreSQL database, Redis cache. All services run via Docker Compose (`docker-compose.dev.yml` for development, `docker-compose.yml` for production).

**Ports**: Dev DB=5432, Redis=6379, API=3000, Frontend=5173. Prod DB=5433, Redis=6380, API=3001, Frontend=8081.

### Backend (`backend/src/`)

Layered architecture — routes → controllers (thin) → services (business logic) → direct SQL via `pg` pool.

- `config/` — DB pool, Redis client, Winston logger
- `controllers/` — Express request handlers, delegate to services
- `services/` — All business logic (47+ services)
- `routes/` — Route definitions; registered via `container/providers`
- `middleware/` — Auth (JWT), CSRF, rate limiting, validation, error handling
- `types/` — Shared TypeScript interfaces
- `__tests__/` — Jest unit tests (`services/`, `utils/`) and integration tests (`integration/`)

### Frontend (`frontend/src/`)

React 19 + Redux Toolkit SPA built with Vite.

- `pages/` — Route-level components (25+)
- `components/` — Reusable UI components (Headless UI + Heroicons)
- `store/slices/` — Redux slices per entity; `store/hooks.ts` for typed dispatch/selector
- `services/` — Axios-based API clients (use centralized `services/api.ts`)
- `contexts/` — Auth, Branding, Toasts React contexts
- `routes/` — React Router configuration

### Database (`database/`)

PostgreSQL with CDM-aligned schema. Migrations are numbered SQL files (`NNN_descriptive_name.sql`) in `database/migrations/`. Never modify existing migration files — always add new ones.

Standard audit fields on every table: `created_at`, `updated_at`, `created_by`, `modified_by`, `is_active`.

## Key Conventions

### Multi-Agent Protocol
Before writing code, sign out a task in `planning-and-progress.md` Workboard. Use task IDs in commit messages (e.g., `feat(P2-T3): add volunteer skill matching`). Update task status (Ready → In Progress → Review → Done). No untracked work.

### TypeScript
- Strict mode everywhere; explicit return types; prefer `interface` over `type` for object shapes; avoid `any` (use `unknown`)
- Import order: external deps → internal absolute (`@/`) → relative → type-only

### API Design
- RESTful: `/api/v1/resource` (plural nouns), nested resources for sub-collections
- Success: `{ data, message? }` | Error: `{ error: { message, code, details? } }` | Paginated: `{ data, pagination }`
- Authenticate endpoints: `router.get('/path', authenticate, authorize('admin', 'manager'), controller.handler)`

### Database Queries
Always use parameterized queries:
```typescript
const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
const users = result.rows as User[];
```

### Adding a New Module
1. Migration: `database/migrations/NNN_add_entity.sql`
2. Backend: `types/` → `services/entityService.ts` → `controllers/entityController.ts` → `routes/entity.ts` → register in app
3. Frontend: `store/slices/entitySlice.ts` → `services/entityService.ts` → `pages/Entity/` → add route

### Commit Messages
Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:` with task ID where applicable.

## Documentation

- `docs/AGENT_INSTRUCTIONS.md` — Development guidelines and common task patterns
- `docs/CONVENTIONS.md` — Naming, file structure, error codes, CSS class ordering
- `docs/ARCHITECTURE.md` — Architecture Decision Records (ADRs)
- `docs/API_REFERENCE*.md` — API endpoint documentation
- `planning-and-progress.md` — Project roadmap, Workboard, current status
- `product-spec.md` — Product requirements
