# Database Schema Documentation

**Last Updated:** 2026-04-18

Use this file for schema/bootstrap orientation only. For live database runtime setup, migrations, and environment-specific operations, use [../docs/deployment/DB_SETUP.md](../docs/deployment/DB_SETUP.md) and the repo scripts it references.

## Overview

The Nonprofit Manager database schema follows the Microsoft Common Data Model (CDM) conventions for entity naming and relationships. This ensures consistency, interoperability, and industry best practices.

## Core Entities

### Users (CDM: SystemUser)
System users who can access the platform. Supports role-based access control (RBAC).

### Accounts (CDM: Account)
Organizations or individuals that the nonprofit interacts with. Can represent donors, sponsors, partner organizations, etc.

### Contacts (CDM: Contact)
Individual people associated with accounts or tracked independently. Primary entity for managing relationships.

### Volunteers
Extends the Contact entity with volunteer-specific fields like skills, availability, and background checks.

### Events (CDM: Campaign/Event)
Scheduled activities, fundraisers, or programs that the nonprofit organizes.

### Event Registrations
Junction table linking contacts to events, tracking registration status and attendance.

### Donations (CDM: Opportunity/Transaction)
Financial contributions from accounts or contacts, including one-time and recurring donations.

### Tasks (CDM: Task)
Work items assigned to users, supporting project management and workflow tracking.

### Activities (CDM: Activity)
Log of interactions and communications with accounts and contacts (emails, calls, meetings, notes).

## CDM Alignment

The schema uses CDM-standard field names where applicable:
- `created_at`, `updated_at`, `created_by`, `modified_by` for audit trails
- `is_active` for soft deletion
- Standardized address fields (`address_line1`, `city`, `state_province`, `postal_code`, `country`)
- UUID primary keys for scalability

## Database Structure

Treat the files under `database/` and the migration scripts as the source of truth. This README is intentionally higher-level and should not replace the environment-specific deployment or verification guides.

### Migrations
Database migrations are stored in `database/migrations/` and are ordered by `database/migrations/manifest.tsv`. Canonical migration filenames follow `NNN_descriptive_name.sql`, with letter suffixes allowed when a sequence split must remain backward compatible (for example, `060a_*`, `060b_*`).

**Migration Best Practices:**
- Never modify existing migration files
- Always add new migrations for schema changes
- Test migrations on a copy of production data before applying
- Include rollback instructions in comments when possible

### Seeds
Seed data is stored in `database/seeds/` and contains optional demo/test data for development and testing environments. The default init path loads only the starter bootstrap data from `database/initdb/000_init.sql` and does not include the demo contact bundle.

**Available Seeds:**
- `001_default_users.sql` - Default admin and test users
- `002_starter_templates.sql` - Template configurations
- `003_mock_data.sql` - Optional comprehensive demo bundle for development
- `004_mock_data_no_users.sql` - Optional demo bundle without user accounts
- `005_kingdom_hearts_mock_data.sql` - Optional specialized demo bundle
- `006_theme_presets.sql` - UI theme configurations
- `007_data_scopes.sql` - Data access scope definitions
- `008_outcome_definitions.sql` - Default outcome definitions used by case tracking and reporting

### Initialization
The `database/initdb/000_init.sql` script runs the canonical migration chain in manifest order and loads only the starter bootstrap seeds (`002_starter_templates.sql`, `006_theme_presets.sql`, `007_data_scopes.sql`, and `008_outcome_definitions.sql`) for development environments.

## Migration Management

### Applying Migrations

**Development Environment:**
```bash
# Using the optional Docker dev stack (recommended)
make dev
make db-migrate

# Show canonical migration status
./scripts/db-migrate.sh --status

# Verify migrations against the isolated test database
make db-verify

# Or replay the canonical bootstrap contract against a disposable native Postgres database
psql -U postgres -d nonprofit_manager -f database/initdb/000_init.sql
```

**Production Environment:**
```bash
# Use the canonical migration runner
COMPOSE_MODE=prod ./scripts/db-migrate.sh
```

### Migration Scripts

- `scripts/db-migrate.sh` - Starts or inspects the active database contract and reports migration status
- `scripts/verify-migrations.sh` - Rebuilds or verifies the isolated `*_test` database contract, including manifest/initdb parity, starter bootstrap seeds, the disposable app-role/RLS probe, forbidden duplicate indexes, and the audit-log partition window

### Migration Tracking

The system uses `schema_migrations` to track applied canonical migrations:
- `filename` - Applied migration filename
- `migration_id` - Stable canonical migration identifier
- `canonical_filename` - Canonical filename for the applied migration
- `applied_at` - Timestamp when applied

Legacy compatibility fields such as `id` and `checksum` still exist in the table, but they are not the active repo-enforced contract. Treat the manifest plus `database/initdb/000_init.sql` as canonical.

## Database Operations

### Backup and Restore

**Backup:**
```bash
# Using pg_dump
pg_dump -U postgres -h localhost -d nonprofit_manager > backup_$(date +%Y%m%d_%H%M%S).sql

# Using Docker
docker exec nonprofit-db pg_dump -U postgres nonprofit_manager > backup.sql
```

**Restore:**
```bash
# Using psql
psql -U postgres -d nonprofit_manager < backup.sql

# Using Docker
docker exec -i nonprofit-db psql -U postgres -d nonprofit_manager < backup.sql
```

### Health Checks

The database includes health check endpoints for monitoring:
- Connection availability via `pg_isready`
- Custom health checks in application code

## Environment Configuration

### Development
- Container: `nonprofit-db-dev`
- Port: `8002`
- Database: `nonprofit_manager`
- Auto-initialization with migrations and seeds

### Production
- Container: `nonprofit-db`
- Port: `8012`
- Database: `nonprofit_manager`
- Bootstrap through the repo helper or `database/initdb/000_init.sql`, not individual migration files

## Security Considerations

- Row Level Security (RLS) implemented for multi-tenant data isolation
- PII encryption for sensitive fields
- Audit logging for all data modifications
- API key authentication for external integrations
- MFA enforcement for sensitive roles

## Performance Optimization

- Indexes on frequently queried columns
- Partitioning for large tables (future enhancement)
- Connection pooling via pg_bouncer (future enhancement)
- Query optimization with EXPLAIN ANALYZE

## Monitoring and Maintenance

### Key Metrics to Monitor
- Connection count and pool utilization
- Query performance and slow queries
- Table sizes and growth trends
- Replication lag (if using replicas)

### Regular Maintenance Tasks
- `VACUUM` for table maintenance
- `REINDEX` for index optimization
- `ANALYZE` for query planner statistics
- Archive old audit logs

## Troubleshooting

### Common Issues

**Migration Failures:**
- Run `make db-verify` to validate manifest/initdb parity and the isolated bootstrap contract
- Verify database permissions
- Ensure dependent objects exist

**Connection Issues:**
- Verify container is running: `docker ps`
- Check environment variables
- Test connectivity against the runtime you chose:
  - Docker dev host port: `pg_isready -h localhost -p 8002`
  - Direct/local Postgres: use the actual port from your env config

**Performance Issues:**
- Run `EXPLAIN ANALYZE` on slow queries
- Check for missing indexes
- Monitor connection pool usage
