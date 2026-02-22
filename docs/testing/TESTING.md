# Testing Guide

## Manual Authentication Flow Test

### Prerequisites

1. PostgreSQL database running (via Docker or locally)
2. Backend server running on port 3000
3. Database migrations applied

### Quick Start Commands

```bash
# Terminal 1: Start PostgreSQL (if using Docker)
docker-compose up -d postgres

# Terminal 2: Start Backend Server
cd backend
npm run dev

# Terminal 3: Run Tests
node scripts/test-auth.js
```

### Using the Test Script

The automated test script (`scripts/test-auth.js`) will:

1. ✓ Check health endpoint
2. ✓ Register a new user
3. ✓ Login with the registered user
4. ✓ Access a protected endpoint with authentication token
5. ✓ Verify invalid login is rejected

Run it with:
```bash
node scripts/test-auth.js
```

### Manual Testing with curl

#### 1. Health Check
```bash
curl localhost:3000/health
```

Expected response:
```json
{"status":"ok","timestamp":"2026-02-01T..."}
```

#### 2. Register User
```bash
curl -X POST localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

Expected response:
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  }
}
```

#### 3. Login
```bash
curl -X POST localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

Expected response: Same format as registration

#### 4. Access Protected Endpoint
```bash
# Replace YOUR_TOKEN with the token from login/register
curl -X GET localhost:3000/api/accounts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:
```json
{
  "accounts": [],
  "pagination": {
    "total": 0,
    "page": 1,
    "limit": 10,
    "pages": 0
  }
}
```

### Frontend Testing

1. Start frontend dev server:

```bash
cd frontend
npm run dev
```

2. Open browser to localhost:5173

3. Test login page:
   - Verify form renders correctly
   - Test validation (email format, password requirements)
   - Submit valid credentials and verify redirect to dashboard
   - Test invalid credentials show error message

### Troubleshooting

#### Backend won't start

- Check if port 3000 is already in use: `lsof -i :3000`
- Check database connection in `.env` file
- Verify PostgreSQL is running: `docker ps | grep nonprofit-db`

#### Database connection errors

- Ensure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` are set in `backend/.env`
- For Docker: DB_HOST should be `postgres` if backend is in Docker, `localhost` if running locally
- Verify database exists: `docker exec nonprofit-db psql -U postgres -l`

#### Tests fail

- Check backend logs for errors
- Verify database tables exist: `docker exec nonprofit-db psql -U postgres -d nonprofit_manager -c "\dt"`
- Run migrations if tables don't exist: See `docs/DB_SETUP.md`

## Known Issues

- TTY/stream errors when running backend with `nohup` - use regular `npm run dev` in a dedicated terminal instead
- Rate limiting may block rapid test runs - wait 15 minutes or adjust rate limits in `.env`

## Automated Testing

### Unit Tests
Backend unit tests use Jest and are located in `backend/src/__tests__/`. Run with:

```bash
cd backend
npm test
```

### Integration Tests
Integration tests verify end-to-end API workflows. Run with:

```bash
cd backend
npm run test:integration
```

### E2E Tests (Playwright)
✅ **Implemented** - See [e2e/README.md](../../e2e/README.md) for comprehensive guide.

```bash
cd e2e
npm test
```

Current coverage includes:
- Authentication flows
- Finance module (Donations, Invoices)
- Engagement modules (Tasks, Wiki, Chat, Calendar, Events)
- Theme system
- Report generation

## CI/CD Integration

Tests run automatically in GitHub Actions on every pull request. E2E tests use Playwright with:
- 2 retries on failure
- Video recording on first failure
- Screenshots on all failures

## Automated Suite Taxonomy (Updated February 18, 2026)

### Backend (Jest)
- Unit/services/controllers: `cd backend && npm test -- --testPathIgnorePatterns=src/__tests__/integration/`
- Integration/API routes: `cd backend && npm run test:integration`
- Integration coverage: `cd backend && npm run test:integration:coverage`

### Frontend (Vitest)
- Unit/component/page tests: `cd frontend && npm test -- --run`
- Coverage: `cd frontend && npm test -- --run --coverage`

### E2E (Playwright)
- Full matrix: `cd e2e && npm run test:ci`
- Smoke subset: `cd e2e && npm run test:smoke`
- Interactive debugging: `cd e2e && npm run test:ui`

### Root/CI entry points
- Full local test run (backend + frontend + Playwright): `make test`
- Coverage-oriented run: `make test-coverage`
- Scripted CI path: `./scripts/ci.sh`
