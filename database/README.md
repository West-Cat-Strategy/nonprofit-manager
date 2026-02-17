# Database Schema Documentation

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

### Migrations
Database migrations are stored in `database/migrations/` and should be run in numerical order. Each migration file follows the naming convention: `NNN_descriptive_name.sql`.

**Migration Best Practices:**
- Never modify existing migration files
- Always add new migrations for schema changes
- Test migrations on a copy of production data before applying
- Include rollback instructions in comments when possible

### Seeds
Seed data is stored in `database/seeds/` and contains initial/test data for development and testing environments.

**Available Seeds:**
- `001_default_users.sql` - Default admin and test users
- `002_starter_templates.sql` - Template configurations
- `003_mock_data.sql` - Comprehensive mock data for development
- `004_mock_data_no_users.sql` - Mock data without user accounts
- `005_kingdom_hearts_mock_data.sql` - Specialized mock data
- `006_theme_presets.sql` - UI theme configurations
- `007_data_scopes.sql` - Data access scope definitions

### Initialization
The `database/initdb/000_init.sql` script runs all migrations and seeds in the correct order for development environments.

## Migration Management

### Applying Migrations

**Development Environment:**
```bash
# Using Docker Compose (recommended)
make docker-up
./scripts/db-migrate.sh

# Or directly with psql
psql -U postgres -d nonprofit_manager -f database/migrations/001_initial_schema.sql
```

**Production Environment:**
```bash
# Use the migration script with production container name
DB_CONTAINER=nonprofit-db-prod ./scripts/db-migrate.sh
```

### Migration Scripts

- `scripts/db-migrate.sh` - Applies all pending migrations in order
- `scripts/verify-migrations.sh` - Verifies migrations can be applied without errors

### Migration Tracking

The system uses a `schema_migrations` table to track applied migrations:
- `id` - Auto-incrementing primary key
- `filename` - Migration filename
- `applied_at` - Timestamp when applied
- `checksum` - MD5 hash of the migration file for integrity checking

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
- Manual migration application required

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
- Check migration file syntax
- Verify database permissions
- Ensure dependent objects exist

**Connection Issues:**
- Verify container is running: `docker ps`
- Check environment variables
- Test connectivity: `pg_isready -h localhost -p 5432`

**Performance Issues:**
- Run `EXPLAIN ANALYZE` on slow queries
- Check for missing indexes
- Monitor connection pool usage
