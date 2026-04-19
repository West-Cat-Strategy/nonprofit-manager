# Deployment Guide

This guide covers deploying the Nonprofit Manager platform to production.

Workspace note: this checkout includes the Dockerfiles plus the compose manifests and overlays used by the repo's local and deployment scripts. For image-only validation here, prefer `make docker-build` and `make docker-validate`.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Security: TLS/HTTPS & Encryption](#security-tlshttps--encryption)
- [Environment Setup](#environment-setup)
- [Docker Deployment](#docker-deployment)
- [Manual Deployment](#manual-deployment)
- [Database Migration](#database-migration)
- [Local CI Runner](#local-ci-runner-no-github-actions)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Rollback Procedures](#rollback-procedures)

## Prerequisites

### Required Software
- Docker (Docker Compose only if you plan to use the optional dev stack)
- Node.js 20.19+ (for manual deployment)
- PostgreSQL 14+
- Git

### Required Access
- Server with SSH access
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt recommended)

### Environment Variables
Create production `.env` files for backend and frontend:

**Backend `.env`:**
```bash
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=nonprofit_manager
DB_USER=your_db_user
DB_PASSWORD=strong_password_here
DB_AT_REST_ENCRYPTION_MODE=managed
DB_AT_REST_PROVIDER=rds
DB_AT_REST_VERIFIED=true
# Self-hosted LUKS alternative:
# DB_AT_REST_ENCRYPTION_MODE=luks
# POSTGRES_DATA_DIR=/srv/nonprofit-manager/postgres
# DB_LUKS_MAPPING_NAME=nonprofit-manager-db
# BACKUP_DIR=/srv/nonprofit-manager/backups/database

# JWT - CHANGE THESE!
JWT_SECRET=your_strong_secret_key_minimum_32_characters
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://westcat.ca

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1500
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=75
REGISTRATION_MAX_ATTEMPTS=75
MAX_LOGIN_ATTEMPTS=15
ACCOUNT_LOCKOUT_DURATION_MS=300000
PUBLIC_EVENT_CHECKIN_RATE_LIMIT_WINDOW_MS=600000
PUBLIC_EVENT_CHECKIN_RATE_LIMIT_MAX_REQUESTS=300
# Password reset uses the built-in 30/hour default.

# Security
MAX_LOGIN_ATTEMPTS=15
ACCOUNT_LOCKOUT_DURATION_MS=300000

# Monitoring
SENTRY_DSN=your_sentry_dsn
ENABLE_MONITORING=true
```

**Frontend `.env`:**
```bash
VITE_API_URL=/api
VITE_ENABLE_ANALYTICS=true
VITE_ANALYTICS_ID=your_analytics_id
```

Public production endpoints:
- App + API origin: `https://westcat.ca`
- Public API base: `https://westcat.ca/api`
- Canonical public health check: `https://westcat.ca/health`

## Security: TLS/HTTPS & Encryption

**CRITICAL: These steps are required before production deployment.**

### HTTPS & TLS Termination Strategy

The Nonprofit Manager application **must be served over HTTPS** in production. We recommend using a reverse proxy (nginx, AWS ALB, or Cloudflare) to handle TLS termination.

#### Option 1: Docker with Caddy Reverse Proxy (Recommended)

Serve the frontend and backend from the same public origin (`westcat.ca`) and let the reverse proxy route `/api` and `/health` to the backend while all other paths go to the frontend:

1. **Get SSL Certificate** (using Let's Encrypt):
```bash
# Install certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d westcat.ca
```

2. **Run the VPS overlay** so Caddy is the only public ingress.
   The production deploy wrapper automatically appends `docker-compose.db-encrypted.yml` when `DB_AT_REST_ENCRYPTION_MODE=luks` and `docker-compose.db-self-hosted.yml` when `DB_AT_REST_ENCRYPTION_MODE=self_hosted` is visible to the deploy shell environment or loaded from the env file. In `managed` mode, the base production stack omits the local `postgres` service entirely and expects an external database host.
   For a local diagnostic pass, keep `DB_AT_REST_ENCRYPTION_MODE` set in your shell or in `.env.production`; the wrapper reads either source before Compose starts, so `DEPLOY_EXECUTE=0 bash ./scripts/deploy.sh production` will show the overlay selection.

3. **Key Points:**
   - Enable HTTP/2 for better performance
   - Set `Strict-Transport-Security` (HSTS) header with `max-age=31536000` (1 year) to force HTTPS
   - Redirect all HTTP traffic to HTTPS
   - Route `/api` and `/health` to the backend and all other paths to the frontend
   - Keep backend/frontend host ports (`8000`/`8001`) bound to `127.0.0.1` for host-local diagnostics only
   - If `DB_AT_REST_ENCRYPTION_MODE=managed`, use your production deployment workflow instead of starting the legacy compose stack locally so the host does not start a local `postgres` service
   - If `DB_AT_REST_ENCRYPTION_MODE=self_hosted`, keep the local `postgres` container loopback-bound and place `POSTGRES_DATA_DIR` and `BACKUP_DIR` on explicit host paths under your operational backup regime

#### Option 2: Application Load Balancer (AWS, Azure, GCP)

If using a managed load balancer:

1. **Configure TLS Termination at Load Balancer:**
   - Upload your SSL certificate (or use AWS Certificate Manager)
   - Configure HTTPS listener on port 443
   - Forward only HTTP traffic to backend containers (internal only)

2. **Backend Configuration:**
   - Backend listens only on HTTP (internal port 3000)
   - Add `X-Forwarded-Proto: https` header detection
   - The backend already handles this in Helmet middleware

3. **Update Environment:**
   ```bash
   # Use the public site origin in CORS and keep the frontend same-origin
   CORS_ORIGIN=https://westcat.ca
   VITE_API_URL=/api
   # Don't expose HTTP ports directly
   ```

#### Option 3: Cloud Provider Managed Certificate (Cloudflare, etc.)

If using Cloudflare or similar:

1. Set "Full (strict)" SSL mode to validate your origin certificate
2. Add page rules to force HTTPS
3. Enable "Always Use HTTPS" setting
4. The backend will receive `X-Forwarded-Proto: https` headers automatically

### Database Encryption at Rest

**CRITICAL: Production must set `DB_AT_REST_ENCRYPTION_MODE` and satisfy exactly one supported contract.**

- `managed`
  - Use an external managed PostgreSQL service with provider-encrypted storage and snapshots.
  - Required env: `DB_AT_REST_PROVIDER` and `DB_AT_REST_VERIFIED=true`.
  - `DB_HOST` must point at the external provider, not a local `postgres` container.
  - The base production compose contract runs without a local `postgres` service in this mode.
  - Local `./scripts/db-backup.sh` is intentionally blocked in this mode; use provider-managed backups instead.
- `luks`
  - Use self-hosted PostgreSQL with the `docker-compose.db-encrypted.yml` overlay; `bash ./scripts/deploy.sh production` adds it automatically when LUKS mode is active.
  - Required env: `POSTGRES_DATA_DIR` as an absolute host path on the unlocked LUKS mount and `DB_LUKS_MAPPING_NAME`.
  - `BACKUP_DIR` must be an absolute path on the same encrypted mount; repo-local backup paths are rejected in production.
  - The production deploy and verification scripts validate the LUKS mapper, the mounted host path, and the Postgres bind mount before reporting success.
- `self_hosted`
  - Use self-hosted PostgreSQL with the `docker-compose.db-self-hosted.yml` overlay when the host cannot satisfy the managed or LUKS contract.
  - Required env: `POSTGRES_DATA_DIR`, `BACKUP_DIR`, and `SELF_HOSTED_DB_RISK_ACCEPTED=true`.
  - When the runtime uses a macOS bind mount, also set `POSTGRES_HOST_UID` and `POSTGRES_HOST_GID` so the container writes files as the host user that owns the mounted directory.
  - On macOS, Docker Desktop-backed bind mounts are a supported path for this mode. Keep Docker Desktop file sharing enabled for the repo and host data paths, and do not carry a Colima-style `DOCKER_HOST` override into the production contract.
  - `POSTGRES_DATA_DIR` and `BACKUP_DIR` must be absolute host paths; the deploy and backup scripts reject repo-local paths in production.
  - This mode intentionally accepts that host-level at-rest safeguards are outside the app contract. Document the operational controls separately before cutover.

### Database Encryption in Transit

**CRITICAL: All database connections must use SSL/TLS in production.**

#### PostgreSQL Configuration

The application automatically enables SSL in production. Ensure your PostgreSQL server:

1. **Has SSL Enabled:**
```sql
-- Check if SSL is enabled
SHOW ssl;  -- Should return 'on'
```

2. **Use Managed Database Service (Recommended):**
   - AWS RDS: Enable "IAM DB authentication" or managed certificates
   - Azure Database: Use TLS 1.2 minimum
   - GCP Cloud SQL: Automatically enforces SSL

3. **Manual Setup (if not using managed service):**
```bash
# Generate certificate (self-signed for testing):
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /var/lib/postgresql/server.key \
  -out /var/lib/postgresql/server.crt

# Set permissions
chmod 600 /var/lib/postgresql/server.key
chown postgres:postgres /var/lib/postgresql/server.*

# Update postgresql.conf
echo "ssl = on" >> /etc/postgresql/14/main/postgresql.conf
echo "ssl_cert_file = '/var/lib/postgresql/server.crt'" >> /etc/postgresql/14/main/postgresql.conf
echo "ssl_key_file = '/var/lib/postgresql/server.key'" >> /etc/postgresql/14/main/postgresql.conf
```

#### Backend Database Connection

The Node.js backend in `backend/src/config/database.ts` automatically:
- Enables SSL in production for managed/external databases
- Disables SSL in production when `DB_AT_REST_ENCRYPTION_MODE=luks` or `self_hosted`
- Rejects untrusted certificates by default when SSL is enabled
- Treats `DB_SSL_ENABLED` as a managed/external-database knob only; local-Postgres deployments ignore it because the backend forces DB TLS off

```bash
# Production database config
DB_HOST=your-prod-database.com
DB_PORT=5432
DB_NAME=nonprofit_manager
DB_USER=nonprofit_app_user
DB_PASSWORD=your_strong_random_password

# SSL enforcement (recommended: true for strict validation)
# Set to false ONLY for self-signed certificates in development
DB_SSL_REJECT_UNAUTHORIZED=true

# For LUKS-backed and self-hosted deployments, the backend disables DB TLS automatically.
# Do not rely on DB_SSL_ENABLED for local Postgres over the compose network.

# (Optional) Custom CA certificate path
# DB_SSL_CA_PATH=/path/to/ca-bundle.crt
```

### Redis Encryption in Transit

**Redis should use TLS in production for sensitive data caching.**

#### Managed Redis Service (Recommended)

Use AWS ElastiCache, Azure Cache for Redis, or GCP Memorystore:

1. Enable "Encryption at rest" and "Encryption in transit" options
2. They automatically provide rediss:// (TLS) endpoints
3. Update environment variable:

```bash
# Production Redis with TLS
REDIS_URL=rediss://:AUTH_TOKEN_HERE@your-redis.cache.amazonaws.com:6380
REDIS_ENABLED=true
REDIS_TLS_REJECT_UNAUTHORIZED=true
```

#### Self-Hosted Redis with TLS

If running Redis yourself:

```bash
# Generate TLS certificates for Redis
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/redis/redis.key \
  -out /etc/redis/redis.crt

# Configure Redis (redis.conf)
port 0  # Disable unencrypted port
tls-port 6380
tls-cert-file /etc/redis/redis.crt
tls-key-file /etc/redis/redis.key
requirepass YOUR_STRONG_PASSWORD

# Connect backend via TLS
REDIS_URL=rediss://:YOUR_STRONG_PASSWORD@localhost:6380
```

### HSTS (HTTP Strict Transport Security)

The backend automatically sets HSTS headers in production:

```typescript
// Set by Helmet.js middleware in backend/src/index.ts
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

This tells browsers to **always** use HTTPS for your domain. To enable HSTS preload:
1. Visit https://hstspreload.org
2. Submit your domain (requires HSTS header with max-age ≥ 31536000)
3. Add to browser preload list (prevents even the first request from being HTTP)

### Security Headers Verification

After deployment, verify your security headers:

```bash
# Check HSTS header
curl -I https://your-domain.com

# Expected headers:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Referrer-Policy: no-referrer

# Use online checker: securityheaders.com
```

---

## Environment Setup

### Environment Variables
Create production `.env` files for backend and frontend:

**Backend `.env`:**
```bash
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=nonprofit_manager
DB_USER=your_db_user
DB_PASSWORD=strong_password_here
DB_SSL_REJECT_UNAUTHORIZED=true

# Redis
REDIS_URL=rediss://:your_redis_password@your-redis-host:6380
REDIS_ENABLED=true
REDIS_TLS_REJECT_UNAUTHORIZED=true

# JWT - CHANGE THESE!
JWT_SECRET=your_strong_secret_key_minimum_32_characters
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS (must be HTTPS in production)
CORS_ORIGIN=https://westcat.ca

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1500
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=75
REGISTRATION_MAX_ATTEMPTS=75
MAX_LOGIN_ATTEMPTS=15
ACCOUNT_LOCKOUT_DURATION_MS=300000
PUBLIC_EVENT_CHECKIN_RATE_LIMIT_WINDOW_MS=600000
PUBLIC_EVENT_CHECKIN_RATE_LIMIT_MAX_REQUESTS=300
# Password reset uses the built-in 30/hour default.

# Security
MAX_LOGIN_ATTEMPTS=15
ACCOUNT_LOCKOUT_DURATION_MS=300000
ENFORCE_SECURE_CONFIG=true

# Monitoring
SENTRY_DSN=your_sentry_dsn
ENABLE_MONITORING=true
```

**Frontend `.env`:**
```bash
VITE_API_URL=/api
VITE_ENABLE_ANALYTICS=true
VITE_ANALYTICS_ID=your_analytics_id
```

## Docker Deployment

This is the container-first workflow for this checkout.

### 1. Clone Repository

```bash
git clone github.com/your-org/nonprofit-manager.git
cd nonprofit-manager
```

### 2. Configure Environment

```bash
# Copy and edit environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit with your production values
nano backend/.env
nano frontend/.env
```

### 3. Build Images

Use the repo-native direct-build path first:

```bash
make docker-build
make docker-validate
```

If you want the raw Docker commands instead:

```bash
docker build --build-context contracts=contracts -f backend/Dockerfile -t nonprofit-manager-backend:latest backend
docker build --build-context contracts=contracts -f frontend/Dockerfile -t nonprofit-manager-frontend:latest frontend
```

### 4. Publish or Run the Images

Push the images to your registry or hand them to your runtime or orchestrator. This checkout does not include the full compose overlay set referenced by older docs.

### 5. Verify Deployment

```bash
# Check backend health
curl http://localhost:8000/health

# Check frontend
curl http://localhost:8001/
```

When using a public reverse proxy or load balancer, keep the backend and frontend loopback-bound and point ingress at the published ports or containers. The public `/health` endpoint should reflect backend health.

## Manual Deployment

The rest of this section describes generic manual/self-managed production deployment.

### Backend Deployment

```bash
cd /path/to/nonprofit-manager

# Install dependencies
npm ci

# Build TypeScript
cd backend
npm run build

# Start with PM2 (recommended)
npm install -g pm2
pm2 start dist/index.js --name nonprofit-backend

# Or use systemd service (see systemd section below)
```

### Frontend Deployment

```bash
cd /path/to/nonprofit-manager

# Install dependencies
npm ci

# Build for production
cd frontend
npm run build

# Serve with nginx (recommended)
# Copy dist/ contents to /var/www/nonprofit-manager/
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect to HTTPS
    return 301 $server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Frontend
    location / {
        root /var/www/nonprofit-manager;
        try_files $uri $uri/ /index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }

    # Backend API
    location /api {
        proxy_pass localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Database Migration

### Canonical Repo Flow

For compose-backed environments, use the repo helpers instead of hand-running migration files:

```bash
make db-migrate
make db-verify
```

`make db-migrate` brings up or inspects the current database contract, and `make db-verify` validates the isolated `_test` database against the migration manifest.

### Manual PostgreSQL Setup

If you are managing PostgreSQL directly, apply the bootstrap contract explicitly:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE nonprofit_manager;

# Create user (if needed)
CREATE USER nonprofit_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE nonprofit_manager TO nonprofit_user;

# Exit psql
\q

# Run the bootstrap contract
psql -U nonprofit_user -d nonprofit_manager -f database/initdb/000_init.sql
```

### Future Migrations

```bash
# Create new migration file
touch database/migrations/003_your_migration_name.sql

# Run new migration
psql -U nonprofit_user -d nonprofit_manager -f database/migrations/003_your_migration_name.sql
```

### Backup Strategy

- `managed`
  - Use provider-encrypted automated backups and snapshots.
  - Do not rely on `./scripts/db-backup.sh`; it exits non-zero by design in this mode.
- `luks`
  - Set `BACKUP_DIR` to an absolute path on the encrypted mount, then schedule `./scripts/db-backup.sh`.
- `self_hosted`
  - Set `BACKUP_DIR` to an absolute host path on the runtime host and document the operational risk acceptance alongside your backup schedule.

For one-off migrations or disaster recovery that need a database-creating archive instead of the recurring SQL and gzip flow, use [db-export-archive.sh](../../scripts/db-export-archive.sh) and [db-restore-archive.sh](../../scripts/db-restore-archive.sh). Those helpers wrap `pg_dump -Fc -C --no-owner --no-acl` and `pg_restore --clean --if-exists --create -d postgres`.

```bash
# Daily automated backup for local Postgres production modes
0 2 * * * BACKUP_DIR=/srv/nonprofit-manager/backups/database ./scripts/db-backup.sh

# Restore from backup
gunzip -c /srv/nonprofit-manager/backups/database/backup_20260201_020000.sql.gz | psql -U nonprofit_user -d nonprofit_manager
```

## Local CI Runner (No GitHub Actions)

This project uses a local runner to validate changes without paid CI/CD services.

### Run Local CI

```bash
make ci          # Lint, type-check, tests, and build
make ci-fast     # Lint and type-check only
make ci-full     # Coverage + security audit + build
make ci-unit     # Unit-test coverage without integration or E2E
```

### Optional Git Hooks

```bash
make hooks
```

This installs local hooks for the repo's standard lint/type-check flow.

### Migration Verification (Local)

Migration verification only runs against a database whose name ends with `_test`.

```bash
export DB_NAME=nonprofit_manager_test
export DB_USER=postgres
export DB_PASSWORD=your_password
make db-verify
```

### Manual Deployment Process

```bash
# Run local CI before deploy
make ci

# Tag a release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

Before release, review the checklist in `../development/RELEASE_CHECKLIST.md`.

## Monitoring & Maintenance

### Health Checks

```bash
# Backend health endpoint
curl https://westcat.ca/health

# Compatibility aliases remain available
curl https://westcat.ca/api/health

# Expected response
{"status":"ok","timestamp":"2026-02-01T..."}
```

### Log Management

```bash
# View Docker logs if you are running named containers locally
docker logs nonprofit-manager-backend
docker logs nonprofit-manager-frontend

# PM2 logs (manual deployment)
pm2 logs nonprofit-backend
```

### Reset Auth Lockouts

Use the backend helper to clear persisted account lockouts and auth rate-limit buckets
before restarting backend processes:

```bash
cd backend
npm run auth:reset-state
```

Then restart the backend so any in-memory fallback state is cleared.

### Performance Monitoring

1. **Application Performance Monitoring (APM)**
   - Sentry for error tracking
   - Custom metrics with Prometheus
   - Grafana dashboards

2. **Database Monitoring**
   ```sql
   -- Check active connections
   SELECT count(*) FROM pg_stat_activity;
   
   -- Check slow queries
   SELECT query, mean_exec_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_exec_time DESC 
   LIMIT 10;
   ```

3. **Server Resources**
   ```bash
   # CPU and memory usage
   docker stats
   
   # Disk usage
   df -h
   ```

### Security Audits

```bash
# Run security audit
npm audit

# Check Docker image vulnerabilities
docker scan nonprofit-manager-backend:latest
docker scan nonprofit-manager-frontend:latest
```

## Rollback Procedures

### Docker Rollback

```bash
# List available tags
docker images | grep nonprofit

# Stop current containers
docker stop nonprofit-manager-backend nonprofit-manager-frontend

# Deploy previous version
# Redeploy the previous tagged images through your orchestrator
```

### Database Rollback

```bash
# Restore from backup
psql -U nonprofit_user -d nonprofit_manager < /backups/nonprofit_20260131.sql
```

### Emergency Rollback

```bash
# Quick rollback script
#!/bin/bash
docker stop nonprofit-manager-backend nonprofit-manager-frontend
git checkout tags/v1.0.0  # Replace with stable version
make docker-build
# Redeploy the rebuilt previous-tag images through your orchestrator
```

## Troubleshooting

### Backend Won't Start

```bash
# Check logs
docker logs nonprofit-manager-backend

# Common issues:
# 1. Database connection failed
#    - Verify DB_HOST, DB_USER, DB_PASSWORD in .env
# 2. Port already in use
#    - Change PORT in .env
# 3. Missing environment variables
#    - Ensure all required vars are set
```

### Frontend Build Failures

```bash
# Clear cache and rebuild
rm -rf frontend/node_modules
rm -rf frontend/dist
npm install
npm run build
```

### Database Connection Issues

```bash
# Test connection
docker exec -it nonprofit-manager-postgres psql -U postgres -c "SELECT version();"

# Check PostgreSQL logs
docker logs nonprofit-manager-postgres
```

## Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificate installed
- [ ] DB at-rest mode configured (`managed`, `luks`, or `self_hosted`)
- [ ] Managed backup/snapshot policy enabled, LUKS mapper verified, or self-hosted risk acceptance documented
- [ ] Database backups automated
- [ ] Backup storage satisfies the same at-rest encryption policy as primary database storage
- [ ] Monitoring alerts configured
- [ ] Rate limiting enabled
- [ ] Security headers set
- [ ] CORS configured correctly
- [ ] Logs aggregation setup
- [ ] Health checks working
- [ ] Rollback procedure tested
- [ ] Documentation updated
- [ ] Team trained on deployment process

## Support

For deployment issues:
- Email: maintainer@westcat.ca
- Organization: Example Organization
- Contributor workflow: [../../CONTRIBUTING.md](../../CONTRIBUTING.md)
