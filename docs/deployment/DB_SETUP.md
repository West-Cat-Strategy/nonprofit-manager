# Database Setup Guide

**Complete runbook for setting up the Nonprofit Manager database**

This guide covers multiple setup scenarios to ensure consistent database configuration across all development environments.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (Docker)](#quick-start-docker)
3. [Native PostgreSQL Setup](#native-postgresql-setup)
4. [Running Migrations](#running-migrations)
5. [Loading Seed Data](#loading-seed-data)
6. [Verification](#verification)
7. [Common Scenarios](#common-scenarios)
8. [Troubleshooting](#troubleshooting)
9. [Database Maintenance](#database-maintenance)

---

## Prerequisites

### For Docker Setup (Recommended)
- Docker Engine 20.10+
- Docker Compose 2.0+
- No local PostgreSQL required

### For Native PostgreSQL Setup
- PostgreSQL 14+ installed and running
- `psql` CLI available in PATH
- `createdb` and `dropdb` utilities available
- Sufficient permissions to create databases

**Verify Prerequisites:**
```bash
# Check Docker (if using Docker)
docker --version
docker compose version

# Check PostgreSQL (if using native)
psql --version
which psql
```

---

## Quick Start (Docker)

**Easiest way to get started with zero configuration.**

### 1. Start Database Container

```bash
# From project root
docker compose -f docker-compose.dev.yml up postgres -d
```

This automatically:
- Creates the `nonprofit_manager` database
- Runs all migrations in `database/migrations/` (via `docker-entrypoint-initdb.d`)
- Loads starter bootstrap data from `database/initdb/000_init.sql` (templates, theme presets, data scopes, and outcome definitions only)
- Sets up persistent volume for data storage
- Exposes PostgreSQL on `localhost:8002`

**Default Credentials:**
- **Host:** `localhost`
- **Port:** `8002`
- **Database:** `nonprofit_manager`
- **User:** `postgres`
- **Password:** `postgres`

### 2. Verify Connection

```bash
docker compose -p nonprofit-dev -f docker-compose.dev.yml exec -T postgres psql -U postgres -d nonprofit_manager -c "\dt"
```

**Expected Output:**
```
             List of relations
 Schema |        Name        | Type  |  Owner   
--------+--------------------+-------+----------
 public | accounts           | table | postgres
 public | activities         | table | postgres
 public | contacts           | table | postgres
 public | donations          | table | postgres
 public | event_registrations| table | postgres
 public | events             | table | postgres
 public | tasks              | table | postgres
 public | users              | table | postgres
 public | volunteer_assignments | table | postgres
 public | volunteers         | table | postgres
(10 rows)
```

### 3. Load Optional Demo Data

```bash
docker compose -p nonprofit-dev -f docker-compose.dev.yml exec -T postgres psql -U postgres -d nonprofit_manager < database/seeds/003_mock_data.sql
```

For a no-user demo bundle that still preserves first-time setup flow, use:

```bash
docker compose -p nonprofit-dev -f docker-compose.dev.yml exec -T postgres psql -U postgres -d nonprofit_manager < database/seeds/004_mock_data_no_users.sql
```

### 4. Stop Database

```bash
# Stop but keep data
docker compose -f docker-compose.dev.yml stop postgres

# Stop and remove container (data persists in volume)
docker compose -f docker-compose.dev.yml down
```

---

## Native PostgreSQL Setup

**For users who prefer local PostgreSQL installation.**

### 1. Install PostgreSQL

**macOS (Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql-14 postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)

### 2. Create Databases

```bash
# Create development database
createdb nonprofit_manager

# Create test database (for running tests)
createdb nonprofit_manager_test
```

**If you need to specify user/host:**
```bash
createdb -U postgres -h localhost nonprofit_manager
createdb -U postgres -h localhost nonprofit_manager_test
```

### 3. Verify Database Creation

```bash
psql -U postgres -l | grep nonprofit_manager
```

**Expected Output:**
```
 nonprofit_manager      | postgres | UTF8     | ...
 nonprofit_manager_test | postgres | UTF8     | ...
```

---

## Running Migrations

### Docker Environment

Migrations run automatically on first startup via `docker-entrypoint-initdb.d`.

**To manually re-run migrations:**
```bash
# Connect to running container
docker compose -p nonprofit-dev -f docker-compose.dev.yml exec -T postgres psql -U postgres -d nonprofit_manager < database/migrations/001_initial_schema.sql
docker compose -p nonprofit-dev -f docker-compose.dev.yml exec -T postgres psql -U postgres -d nonprofit_manager < database/migrations/002_audit_logs.sql
```

### Native PostgreSQL

**Run all migrations in order:**
```bash
# From project root
psql -U postgres -d nonprofit_manager -f database/migrations/001_initial_schema.sql
psql -U postgres -d nonprofit_manager -f database/migrations/002_audit_logs.sql
```

**Run migrations with connection string:**
```bash
psql "postgresql://postgres:your_password@localhost:5432/nonprofit_manager" \
  -f database/migrations/001_initial_schema.sql
```

**Check migration status:**
```bash
psql -U postgres -d nonprofit_manager -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
```

---

## Loading Seed Data

Seed behavior differs by file. None of these files run during the default bootstrap:

- `database/seeds/003_mock_data.sql` includes users (default login: `admin@westcat.ca` / `password123`).
- `database/seeds/004_mock_data_no_users.sql` preserves first-time setup behavior (`/setup`).
- `database/seeds/005_kingdom_hearts_mock_data.sql` is a themed optional demo bundle.
- `database/seeds/001_default_users.sql` is placeholder-oriented and not the recommended dev seed path.

### Docker Environment

```bash
docker compose -p nonprofit-dev -f docker-compose.dev.yml exec -T postgres psql -U postgres -d nonprofit_manager < database/seeds/003_mock_data.sql
```

### Native PostgreSQL

```bash
psql -U postgres -d nonprofit_manager -f database/seeds/003_mock_data.sql
```

### Verify Seed Data

```bash
# Docker
docker compose -p nonprofit-dev -f docker-compose.dev.yml exec -T postgres psql -U postgres -d nonprofit_manager -c "SELECT id, email, role FROM users;"

# Native
psql -U postgres -d nonprofit_manager -c "SELECT id, email, role FROM users;"
```

**Expected Default Users:**
- `admin@westcat.ca` (role: admin)
- `manager@westcat.ca` (role: manager)
- `staff@westcat.ca` (role: user)

**Default Password for seeded users:** `password123`

---

## Verification

### 1. Verify Database Exists

```bash
# Docker
docker compose -p nonprofit-dev -f docker-compose.dev.yml exec -T postgres psql -U postgres -c "\l nonprofit_manager"

# Native
psql -U postgres -c "\l nonprofit_manager"
```

### 2. Verify All Tables

```bash
# Docker
docker compose -p nonprofit-dev -f docker-compose.dev.yml exec -T postgres psql -U postgres -d nonprofit_manager -c "\dt"

# Native
psql -U postgres -d nonprofit_manager -c "\dt"
```

**Expected Tables (10 total):**
- `users`
- `accounts`
- `contacts`
- `volunteers`
- `volunteer_assignments`
- `events`
- `event_registrations`
- `donations`
- `tasks`
- `activities`

### 3. Verify Foreign Keys and Indexes

```bash
# Check foreign keys
psql -U postgres -d nonprofit_manager -c "SELECT conname, conrelid::regclass, confrelid::regclass FROM pg_constraint WHERE contype = 'f';"

# Check indexes
psql -U postgres -d nonprofit_manager -c "SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;"
```

### 4. Run Migration Verification Script

```bash
# Set environment variables
export DB_NAME=nonprofit_manager_test
export DB_USER=postgres
export DB_PASSWORD=postgres

# Run verification
make db-verify
```

**Expected behavior:** the isolated `nonprofit_manager_test` database is rebuilt or verified on port `8012`, then the helper reports a populated `schema_migrations` table.

---

## Common Scenarios

### Scenario 1: Fresh Installation

**Using Docker:**
```bash
docker compose -f docker-compose.dev.yml up postgres -d
docker compose -p nonprofit-dev -f docker-compose.dev.yml exec -T postgres psql -U postgres -d nonprofit_manager < database/seeds/003_mock_data.sql
```

**Using Native PostgreSQL:**
```bash
createdb nonprofit_manager
psql -U postgres -d nonprofit_manager -f database/migrations/001_initial_schema.sql
psql -U postgres -d nonprofit_manager -f database/migrations/002_audit_logs.sql
psql -U postgres -d nonprofit_manager -f database/seeds/003_mock_data.sql
```

### Scenario 2: Reset Database (Destructive)

**⚠️ WARNING: This deletes all data!**

**Docker:**
```bash
# Stop and remove container
docker compose -f docker-compose.dev.yml down postgres

# Remove volume (deletes data)
docker volume rm nonprofit-manager_postgres_data_dev

# Restart fresh
docker compose -f docker-compose.dev.yml up postgres -d
```

**Native:**
```bash
dropdb nonprofit_manager
createdb nonprofit_manager
psql -U postgres -d nonprofit_manager -f database/migrations/001_initial_schema.sql
psql -U postgres -d nonprofit_manager -f database/migrations/002_audit_logs.sql
```

### Scenario 3: Apply New Migration

**Docker:**
```bash
docker compose -p nonprofit-dev -f docker-compose.dev.yml exec -T postgres psql -U postgres -d nonprofit_manager < database/migrations/003_new_migration.sql
```

**Native:**
```bash
psql -U postgres -d nonprofit_manager -f database/migrations/003_new_migration.sql
```

### Scenario 4: Backup and Restore

**Backup:**
```bash
# Docker
docker compose -p nonprofit-dev -f docker-compose.dev.yml exec -T postgres pg_dump -U postgres nonprofit_manager > backup_$(date +%Y%m%d).sql

# Native
pg_dump -U postgres nonprofit_manager > backup_$(date +%Y%m%d).sql
```

**Restore:**
```bash
# Docker
docker compose -p nonprofit-dev -f docker-compose.dev.yml exec -T postgres psql -U postgres -d nonprofit_manager < backup_20260201.sql

# Native
psql -U postgres -d nonprofit_manager < backup_20260201.sql
```

### Scenario 5: Connect from Backend Application

**Update `backend/.env`:**
```dotenv
# Docker environment (from host machine)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nonprofit_manager
DB_USER=postgres
DB_PASSWORD=postgres

# Docker environment (from container)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=nonprofit_manager
DB_USER=postgres
DB_PASSWORD=postgres
```

---

## Troubleshooting

### Problem: Cannot connect to PostgreSQL

**Docker:**
```bash
# Check if service is running
docker compose -p nonprofit-dev -f docker-compose.dev.yml ps postgres

# Check service logs
docker compose -p nonprofit-dev -f docker-compose.dev.yml logs postgres

# Check health status
docker compose -p nonprofit-dev -f docker-compose.dev.yml ps postgres

# Restart service
docker compose -p nonprofit-dev -f docker-compose.dev.yml restart postgres
```

**Native:**
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# macOS: Check service status
brew services list | grep postgresql

# Linux: Check service status
sudo systemctl status postgresql

# Start PostgreSQL
# macOS
brew services start postgresql@14
# Linux
sudo systemctl start postgresql
```

### Problem: Permission denied for database

```bash
# Grant all privileges to user
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE nonprofit_manager TO postgres;"
```

### Problem: Database already exists error

```bash
# Drop existing database first (⚠️ deletes data)
dropdb nonprofit_manager
createdb nonprofit_manager
```

### Problem: Migration fails with "relation already exists"

```bash
# Check what tables exist
psql -U postgres -d nonprofit_manager -c "\dt"

# If needed, drop all tables and re-run migrations
psql -U postgres -d nonprofit_manager -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql -U postgres -d nonprofit_manager -f database/migrations/001_initial_schema.sql
```

### Problem: Port 8002 already in use

**Find what's using the port:**
```bash
# macOS/Linux
lsof -i :8002

# Kill the process if needed
kill -9 <PID>
```

**Or change Docker port mapping:**
```yaml
# In docker-compose.dev.yml
ports:
  - "5433:5432"  # Use port 5433 on host
```

### Problem: Slow query performance

```bash
# Check for missing indexes
psql -U postgres -d nonprofit_manager -c "SELECT schemaname, tablename, indexname FROM pg_indexes WHERE schemaname = 'public';"

# Analyze tables
psql -U postgres -d nonprofit_manager -c "ANALYZE;"

# Check query performance
psql -U postgres -d nonprofit_manager -c "EXPLAIN ANALYZE SELECT * FROM users;"
```

---

## Database Maintenance

### Regular Tasks

**1. Vacuum database (reclaim storage):**
```bash
psql -U postgres -d nonprofit_manager -c "VACUUM ANALYZE;"
```

**2. Check database size:**
```bash
psql -U postgres -d nonprofit_manager -c "SELECT pg_size_pretty(pg_database_size('nonprofit_manager'));"
```

**3. Check table sizes:**
```bash
psql -U postgres -d nonprofit_manager -c "
  SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

**4. Check active connections:**
```bash
psql -U postgres -d nonprofit_manager -c "SELECT * FROM pg_stat_activity WHERE datname = 'nonprofit_manager';"
```

### Performance Monitoring

**Check slow queries:**
```bash
psql -U postgres -d nonprofit_manager -c "
  SELECT pid, now() - query_start as duration, query 
  FROM pg_stat_activity 
  WHERE state = 'active' AND now() - query_start > interval '5 seconds';
"
```

**Check index usage:**
```bash
psql -U postgres -d nonprofit_manager -c "
  SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan
  FROM pg_stat_user_indexes
  ORDER BY idx_scan;
"
```

---

## Additional Resources

- [PostgreSQL Official Documentation](https://www.postgresql.org/docs/14/)
- [Docker PostgreSQL Image](https://hub.docker.com/_/postgres)
- [Database Schema Documentation](../../database/README.md)
- [Migration Guide](../deployment/DEPLOYMENT.md#database-migration)

---

**Last Updated:** 2026-03-19  
**Maintained by:** Example Organization  
**Questions?** Contact [maintainer@westcat.ca](mailto:maintainer@westcat.ca)
