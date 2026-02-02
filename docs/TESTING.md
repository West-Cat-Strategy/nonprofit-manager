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
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok","timestamp":"2026-02-01T..."}
```

#### 2. Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
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
curl -X POST http://localhost:3000/api/auth/login \
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
curl -X GET http://localhost:3000/api/accounts \
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

2. Open browser to http://localhost:5173

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

## Next Steps

After manual testing passes:

1. Write automated integration tests with Jest/Supertest
2. Add E2E tests for frontend with Playwright
3. Set up CI pipeline to run tests automatically
