# Deployment Guide

This guide covers deploying the Nonprofit Manager platform to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Docker Deployment](#docker-deployment)
- [Manual Deployment](#manual-deployment)
- [Database Migration](#database-migration)
- [Local CI Runner](#local-ci-runner-no-github-actions)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Rollback Procedures](#rollback-procedures)

## Prerequisites

### Required Software
- Docker & Docker Compose (recommended)
- Node.js 18+ (for manual deployment)
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

## Docker Deployment (Recommended)

### 1. Clone Repository

```bash
git clone https://github.com/your-org/nonprofit-manager.git
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
curl http://localhost:3000/health

# Check frontend
curl http://localhost:8080/

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
    return 301 https://$server_name$request_uri;
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
        proxy_pass http://localhost:3000;
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
- GitHub Issues: https://github.com/your-org/nonprofit-manager/issues
