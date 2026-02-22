# Deployment Guide

This guide covers deploying the Nonprofit Manager platform to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Security: TLS/HTTPS & Encryption](#security-tlshttps--encryption)
- [Environment Setup](#environment-setup)
- [Docker Deployment](https://github.com/West-Cat-Strategy/nonprofit-manager)
- [Manual Deployment](#manual-deployment)
- [Database Migration](#database-migration)
- [Local CI Runner](#local-ci-runner-no-github-actions)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Rollback Procedures](#rollback-procedures)

## Prerequisites

### Required Software
- Docker & Docker Compose (recommended)
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

# JWT - CHANGE THESE!
JWT_SECRET=your_strong_secret_key_minimum_32_characters
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://your-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# Security
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION_MS=900000

# Monitoring
SENTRY_DSN=your_sentry_dsn
ENABLE_MONITORING=true
```

**Frontend `.env`:**
```bash
VITE_API_URL=https://api.your-domain.com/api
VITE_ENABLE_ANALYTICS=true
VITE_ANALYTICS_ID=your_analytics_id
```

## Security: TLS/HTTPS & Encryption

**CRITICAL: These steps are required before production deployment.**

### HTTPS & TLS Termination Strategy

The Nonprofit Manager application **must be served over HTTPS** in production. We recommend using a reverse proxy (nginx, AWS ALB, or Cloudflare) to handle TLS termination.

#### Option 1: Docker with Nginx Reverse Proxy (Recommended)

Set up Nginx as a reverse proxy in front of the Nonprofit Manager backend:

1. **Get SSL Certificate** (using Let's Encrypt):
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate (replace with your domain)
sudo certbot certonly --standalone -d your-domain.com -d api.your-domain.com
```

2. **Configure Nginx** (see full config below in "Nginx Configuration" section)

3. **Key Points:**
   - Enable HTTP/2 for better performance
   - Set `Strict-Transport-Security` (HSTS) header with `max-age=31536000` (1 year) to force HTTPS
   - Redirect all HTTP traffic to HTTPS
   - Configure security headers (X-Frame-Options, X-Content-Type-Options, etc.)

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
   # Use HTTPS URLs in CORS and frontend config
   CORS_ORIGIN=https://your-domain.com
   VITE_API_URL=https://api.your-domain.com/api
   # Don't expose HTTP ports directly
   ```

#### Option 3: Cloud Provider Managed Certificate (Cloudflare, etc.)

If using Cloudflare or similar:

1. Set "Full (strict)" SSL mode to validate your origin certificate
2. Add page rules to force HTTPS
3. Enable "Always Use HTTPS" setting
4. The backend will receive `X-Forwarded-Proto: https` headers automatically

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
- Enables SSL in production (`NODE_ENV=production`)
- Rejects untrusted certificates by default
- Can be configured via environment variables:

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
CORS_ORIGIN=https://your-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# Security
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION_MS=900000
ENFORCE_SECURE_CONFIG=true

# Monitoring
SENTRY_DSN=your_sentry_dsn
ENABLE_MONITORING=true
```

**Frontend `.env`:**
```bash
VITE_API_URL=https://api.your-domain.com/api
VITE_ENABLE_ANALYTICS=true
VITE_ANALYTICS_ID=your_analytics_id
```

## Docker Deployment (Recommended)

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

```bash
docker-compose build
```

### 4. Start Services

```bash
docker-compose up -d
```

### 5. Run Database Migrations

```bash
docker-compose exec postgres psql -U postgres -d nonprofit_manager -f /docker-entrypoint-initdb.d/001_initial_schema.sql
docker-compose exec postgres psql -U postgres -d nonprofit_manager -f /docker-entrypoint-initdb.d/002_audit_logs.sql
```

### 6. Verify Deployment

```bash
# Check backend health
curl localhost:3000/health

# Check frontend
curl localhost:8080/

# View logs
docker-compose logs -f
```

## Manual Deployment

### Backend Deployment

```bash
cd backend

# Install dependencies
npm ci --only=production

# Build TypeScript
npm run build

# Start with PM2 (recommended)
npm install -g pm2
pm2 start dist/index.js --name nonprofit-backend

# Or use systemd service (see systemd section below)
```

### Frontend Deployment

```bash
cd frontend

# Install dependencies
npm ci

# Build for production
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

### Initial Setup

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

# Run migrations
psql -U nonprofit_user -d nonprofit_manager -f database/migrations/001_initial_schema.sql
psql -U nonprofit_user -d nonprofit_manager -f database/migrations/002_audit_logs.sql
```

### Future Migrations

```bash
# Create new migration file
touch database/migrations/003_your_migration_name.sql

# Run new migration
psql -U nonprofit_user -d nonprofit_manager -f database/migrations/003_your_migration_name.sql
```

### Backup Strategy

```bash
# Daily automated backup (add to crontab)
0 2 * * * pg_dump -U nonprofit_user nonprofit_manager | gzip > /backups/nonprofit_$(date +\%Y\%m\%d).sql.gz

# Restore from backup
gunzip -c /backups/nonprofit_20260201.sql.gz | psql -U nonprofit_user -d nonprofit_manager
```

## Local CI Runner (No GitHub Actions)

This project uses a local runner to validate changes without paid CI/CD services.

### Run Local CI

```bash
./scripts/local-ci.sh          # Lint + type-check + tests
./scripts/local-ci.sh --fast   # Lint + type-check only
./scripts/local-ci.sh --audit  # Include npm audit (high+)
./scripts/local-ci.sh --db-verify # Apply migrations to a *_test database
./scripts/local-ci.sh --build  # Build backend + frontend
```

### Optional Git Hooks

```bash
./scripts/install-git-hooks.sh
```

This installs a pre-commit hook that runs the fast local CI checks.

### Migration Verification (Local)

Migration verification only runs against a database whose name ends with `_test`.

```bash
export DB_NAME=nonprofit_manager_test
export DB_USER=postgres
export DB_PASSWORD=your_password
./scripts/local-ci.sh --db-verify
```

### Manual Deployment Process

```bash
# Run local CI before deploy
./scripts/local-ci.sh

# Tag a release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

Before release, review the checklist in `docs/RELEASE_CHECKLIST.md`.

## Monitoring & Maintenance

### Health Checks

```bash
# Backend health endpoint
curl https://api.your-domain.com/health

# Expected response
{"status":"ok","timestamp":"2026-02-01T..."}
```

### Log Management

```bash
# View Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend

# PM2 logs (manual deployment)
pm2 logs nonprofit-backend
```

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
docker-compose down

# Deploy previous version
docker-compose up -d --force-recreate
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
docker-compose down
git checkout tags/v1.0.0  # Replace with stable version
docker-compose build
docker-compose up -d
```

## Troubleshooting

### Backend Won't Start

```bash
# Check logs
docker-compose logs backend

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
docker-compose exec postgres psql -U postgres -c "SELECT version();"

# Check PostgreSQL logs
docker-compose logs postgres
```

## Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificate installed
- [ ] Database backups automated
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
- Email: bryan.crockett@westcat.ca
- Organization: West Cat Strategy Ltd.
- GitHub Issues: https://github.com/West-Cat-Strategy/nonprofit-manager/issues
