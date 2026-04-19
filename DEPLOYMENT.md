# Local Docker Deployment

**Last Updated:** 2026-04-18

Use this guide when you want to run Nonprofit Manager on your own machine with Docker. This is the easiest local Docker path for the repo. If you need production or self-hosted deployment details, use [docs/deployment/DEPLOYMENT.md](docs/deployment/DEPLOYMENT.md).

## Prerequisites

- A local clone of this repository
- Docker installed
- Docker Compose support available through `docker compose`
- These local ports free on your machine: `8002`, `8003`, `8004`, `8005`, and `8006`

Quick check:

```bash
docker --version
docker compose version
```

## 1. Create `.env.development`

From the repo root, create a `.env.development` file with this local-safe baseline:

```bash
cat <<'EOF' > .env.development
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
PUBLIC_SITE_PORT=8006

DB_HOST=postgres
DB_PORT=5432
DB_NAME=nonprofit_manager
DB_USER=postgres
DB_PASSWORD=postgres
POSTGRES_PASSWORD=postgres

REDIS_URL=redis://redis:6379
REDIS_ENABLED=true

JWT_SECRET=change-me-local-dev-jwt-secret-minimum-32-chars
JWT_EXPIRES_IN=24h
EXPOSE_AUTH_TOKENS_IN_RESPONSE=false

CSRF_SECRET=change-me-local-dev-csrf-secret-minimum-32-chars
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

TOTP_ISSUER=Nonprofit Manager
WEBAUTHN_RP_NAME=Nonprofit Manager
WEBAUTHN_RP_ID=localhost

HEALTH_CHECK_KEY=local-dev-health-check-key
METRICS_AUTH_KEY=local-dev-metrics-auth-key

ENFORCE_SECURE_CONFIG=false
EOF
```

## 2. Start the local Docker stack

Run this from the repo root:

```bash
make deploy-local
```

What this does:

- Starts the repo's Docker dev stack
- Builds the containers on first run
- Starts local Postgres and Redis
- Starts the backend, frontend, and public-site services

The first run can take a few minutes while Docker builds the images.

If you already built the stack once and just want to start it again, `make dev` is the faster restart path.

## 3. Open the app

When the stack is up, these URLs should work:

- Main app: `http://localhost:8005`
- Backend health: `http://localhost:8004/health`
- Public site: `http://localhost:8006`

## 4. First run

If the database is empty, the app should send you to `/setup` so you can create the first admin account.

If you would rather load demo data instead of creating the first user manually, keep the stack running and use the optional seed command below.

### Optional demo data

Run this exact command from the repo root:

```bash
docker compose -p nonprofit-dev -f docker-compose.dev.yml exec -T postgres psql -U postgres -d nonprofit_manager < database/seeds/003_mock_data.sql
```

Then sign in with:

- Email: `admin@example.com`
- Password: `password123`

## Common Commands

View container logs:

```bash
make docker-logs
```

Stop the stack:

```bash
make docker-down
```

## Need More?

- Runtime choices and local setup details: [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md)
- Database setup and seed details: [docs/deployment/DB_SETUP.md](docs/deployment/DB_SETUP.md)
- Production and self-hosted deployment guidance: [docs/deployment/DEPLOYMENT.md](docs/deployment/DEPLOYMENT.md)
