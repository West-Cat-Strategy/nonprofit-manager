# Backend Service

**Last Updated**: 2026-02-18

Node.js/Express backend for the nonprofit-manager platform.

---

## Quick Start

```bash
cd backend
npm install
npm run dev
```

Backend will start at `http://localhost:3000`.

For detailed setup instructions, see [SETUP.md](SETUP.md) (coming soon) or [docs/development/GETTING_STARTED.md](../docs/development/GETTING_STARTED.md).

---

## What This Service Does

The backend provides:

- **REST API** (`/api/*`) — All frontend requests go here
- **Authentication** — User login, token management, permission checks
- **Data Persistence** — PostgreSQL database with Prisma ORM
- **Business Logic** — CRM, volunteers, events, donations, reporting
- **Integrations** — Stripe (payments), Mailchimp (email), external webhooks
- **Validation** — Zod schemas for all input validation
- **Monitoring** — Logs, metrics, error tracking

---

## Development

### Installation

```bash
npm install
```

Installs dependencies listed in `package.json`.

### Environment Setup

Create `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Set values for:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Secret for signing JWTs
- `STRIPE_SECRET_KEY` — Stripe API key
- (See `.env.example` for complete list)

### Database Setup

```bash
# Run migrations
npm run migrate

# Seed sample data (optional)
# npm run seed
```

See [docs/deployment/DB_SETUP.md](../docs/deployment/DB_SETUP.md) for database details.

### Start Development Server

```bash
npm run dev
```

Server will restart automatically when you change files (hot reload).

### Stop the Server

Press `Ctrl+C` in terminal.

---

## Testing

### Unit Tests

```bash
npm test
```

Runs all `.test.ts` files with Jest.

**Coverage threshold**: 80% minimum.

```bash
npm run test:coverage
```

Shows coverage report.

### Integration Tests

```bash
npm run test:integration
```

Tests API endpoints with real database (uses test database configured in `.env.test`).

---

## Code Quality

### Type Checking

```bash
npm run typecheck
```

Verify TypeScript for errors (strict mode enabled).

### Linting

```bash
npm run lint
```

Check code style with ESLint.

```bash
npm run lint:fix
```

Auto-fix style issues.

---

## Architecture

Follow the standard backend pattern:

```
Request
  ↓
Route handler (defines endpoint)
  ↓
Middleware (authentication, validation)
  ↓
Controller (handles request, calls service)
  ↓
Service (business logic)
  ↓
Database (Prisma ORM)
  ↓
Response
```

**Key files**:
- `src/routes/` — HTTP endpoint definitions
- `src/controllers/` — Request handlers
- `src/services/` — Business logic
- `src/middleware/` — Cross-cutting concerns (auth, validation, etc.)
- `src/types/` — TypeScript interfaces
- `src/__tests__/` — Unit tests

See [docs/development/ARCHITECTURE.md](../docs/development/ARCHITECTURE.md) for detailed design decisions.

---

## Code Standards

All code must follow standards in [docs/development/CONVENTIONS.md](../docs/development/CONVENTIONS.md):

- **TypeScript** — Strict null checking, explicit types
- **Validation** — All inputs checked with Zod schemas
- **Error Handling** — Standardized error responses
- **Comments** — JSDoc for public functions, explain "why" not "what"
- **Testing** — Unit tests for services, integration tests for APIs

---

## API Documentation

API endpoints are documented in:

- [docs/api/README.md](../docs/api/README.md) — Master API index (start here)
- `docs/api/API_REFERENCE_*.md` — Specific endpoint documentation
- `docs/api/openapi.yaml` — OpenAPI specification

**Test an endpoint**:

```bash
curl -X GET http://localhost:3000/api/health
```

---

## Common Tasks

### Adding a New Endpoint

1. Create route in `src/routes/userRoutes.ts`
2. Create controller in `src/controllers/userController.ts`
3. Create service in `src/services/userService.ts`
4. Create validation schema in appropriate file or middleware
5. Add tests in `src/__tests__/`
6. Document in `docs/api/API_REFERENCE_*.md`

See [docs/development/AGENT_INSTRUCTIONS.md](../docs/development/AGENT_INSTRUCTIONS.md) for detailed implementation patterns.

### Running a Specific Test

```bash
npm test -- userService.test.ts
```

### Understanding Error in Production

1. Check logs: `npm run logs` (if deployed)
2. Check database: `npm run prisma studio` (local)
3. Check recent changes: `git log --oneline -10`

---

## Directory Structure

```
backend/
├── src/
│   ├── index.ts              # Server entry point
│   ├── routes/               # API endpoints
│   ├── controllers/          # Request handlers
│   ├── services/             # Business logic
│   ├── middleware/           # Validation, auth, error handling
│   ├── types/                # TypeScript definitions
│   ├── config/               # Configuration (env, database, etc.)
│   ├── utils/                # Utilities (helpers, validators)
│   ├── container/            # Dependency injection
│   └── __tests__/            # Unit tests
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Database migrations
├── jest.config.ts            # Jest configuration
├── tsconfig.json             # TypeScript configuration
├── eslint.config.mjs         # ESLint configuration
├── package.json
└── README.md                 # This file
```

---

## Connecting to Frontend

Frontend expects backend at `http://localhost:3000`.

If backend is at different address, update in frontend `.env.local`:

```bash
VITE_API_URL=http://localhost:3000
```

### Check Connection

```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{"status": "ok"}
```

If not, check:
- Backend is running (`npm run dev`)
- Port 3000 is free
- Database connection is working
- Environment variables are correct

---

## Database

Backend uses **PostgreSQL** with **Prisma** ORM.

**Key commands**:

```bash
npm run migrate              # Apply pending migrations
npm run migrate:status       # Check migration status
npx prisma studio          # Open Prisma Studio (visual DB browser)
npx prisma db push         # (Dev only) Sync schema with DB
```

See [docs/deployment/DB_SETUP.md](../docs/deployment/DB_SETUP.md) for setup details.

---

## Debugging

### VS Code Debugger

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Backend",
      "program": "${workspaceFolder}/backend/node_modules/.bin/ts-node-dev",
      "args": ["--respawn", "src/index.ts"],
      "cwd": "${workspaceFolder}/backend"
    }
  ]
}
```

Press `F5` to start debugging.

### Console Logging

```typescript
console.log('Variable:', variableName);  // Quick debug
console.error('Error:', error);           // Log errors
```

**Note**: Remove debug logs before committing.

### Database Queries

Print executed SQL:

```bash
# In .env, set:
DEBUG=prisma:client
npm run dev
```

---

## Performance

For optimization tips:
- [docs/performance/PERFORMANCE_OPTIMIZATION.md](../docs/performance/PERFORMANCE_OPTIMIZATION.md) — Database indexes, caching strategies
- [docs/security/SECURITY_MONITORING_GUIDE.md](../docs/security/SECURITY_MONITORING_GUIDE.md) — Rate limiting, monitoring

---

## Troubleshooting

### Database Connection Failed

```bash
# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Test connection
npm run migrate:status

# If still failing, verify PostgreSQL is running
# macOS: brew services list | grep postgres
# Linux: sudo systemctl status postgresql
```

### Port 3000 Already in Use

```bash
# Kill process on port 3000
lsof -ti :3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### TypeScript Errors

```bash
npm run typecheck
```

Fix all errors listed before running server.

### Tests Failing

```bash
npm test -- --verbose

# Run specific test file
npm test -- services/userService.test.ts
```

See [docs/testing/UNIT_TESTING.md](../docs/testing/UNIT_TESTING.md) for testing patterns.

---

## Security

Important security practices:

- **Never commit `.env` files** — Use `.env.example` template
- **Validate all inputs** — Use Zod schemas in middleware
- **Check permissions** — Use `requireRoleOrError()` and `requirePermissionOrError()` guards
- **Hash passwords** — Never store plaintext
- **Use HTTPS** — In production only (not localhost)
- **Rate limit endpoints** — Prevent brute force attacks
- **Log security events** — Auth attempts, permission denials, etc.

See [docs/security/SECURITY_MONITORING_GUIDE.md](../docs/security/SECURITY_MONITORING_GUIDE.md) for detailed security guidelines.

---

## Deployment

For production deployment:
- See [docs/deployment/DEPLOYMENT.md](../docs/deployment/DEPLOYMENT.md) — Complete deployment guide
- See [docs/development/RELEASE_CHECKLIST.md](../docs/development/RELEASE_CHECKLIST.md) — Release procedures

---

## Getting Help

**Questions?**
- See [docs/development/TROUBLESHOOTING.md](../docs/development/TROUBLESHOOTING.md) for common issues
- See [docs/development/CONVENTIONS.md](../docs/development/CONVENTIONS.md) for code style
- Check existing service implementations for code examples
- Ask in GitHub Issues with label `question`

---

## See Also

- [docs/development/GETTING_STARTED.md](../docs/development/GETTING_STARTED.md) — Full setup guide
- [docs/development/CONVENTIONS.md](../docs/development/CONVENTIONS.md) — Code style guide
- [docs/development/ARCHITECTURE.md](../docs/development/ARCHITECTURE.md) — System architecture
- [docs/api/README.md](../docs/api/README.md) — API documentation
- [docs/testing/UNIT_TESTING.md](../docs/testing/UNIT_TESTING.md) — Testing patterns
- [docs/deployment/DEPLOYMENT.md](../docs/deployment/DEPLOYMENT.md) — Deployment guide
