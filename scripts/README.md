# Scripts Directory

This directory contains utility scripts for the Nonprofit Manager project. All scripts follow consistent patterns and use shared libraries for common functionality.

## Shared Libraries

### `lib/common.sh`
Common utilities used across all scripts:
- Logging functions with consistent colors
- Error handling helpers
- Docker container management
- File and directory operations
- Git information retrieval

### `lib/config.sh`
Configuration constants and defaults:
- Container names and ports
- Database settings
- API endpoints
- File paths and directories

## Available Scripts

### CI and Quality Assurance

#### `ci.sh` - Unified CI Pipeline
Runs linting, type checking, tests, and builds with flexible options.

```bash
# Quick check (lint + typecheck only)
./scripts/ci.sh --quick

# Full CI with tests
./scripts/ci.sh --build --coverage

# Backend only
./scripts/ci.sh --backend-only --verbose

# Help
./scripts/ci.sh --help
```

#### `quality-baseline.sh` - Code Quality Report
Generates a comprehensive report on code quality metrics.

```bash
./scripts/quality-baseline.sh
```

### Database Management

#### `db-migrate.sh` - Database Migrations
Applies pending database migrations in order.

```bash
./scripts/db-migrate.sh
```

#### `db-backup.sh` - Database Backup
Creates timestamped database backups with optional compression.

```bash
./scripts/db-backup.sh
```

#### `db-restore.sh` - Database Restore
Restores database from backup (destructive operation).

```bash
./scripts/db-restore.sh backup_file.sql --confirm-destructive
```

#### `verify-migrations.sh` - Migration Verification
Verifies that migrations can be applied without errors.

```bash
./scripts/verify-migrations.sh
```

### Deployment

#### `deploy.sh` - Application Deployment
Deploys the application locally, to staging, or production.

```bash
# Local deployment
./scripts/deploy.sh local

# Staging deployment
./scripts/deploy.sh staging

# Production deployment (requires confirmation)
./scripts/deploy.sh production
```

### Security

#### `security-scan.sh` - Security Scanning
Runs comprehensive security scans including dependency audits and secret detection.

```bash
./scripts/security-scan.sh
```

### Testing

#### `test-auth-flow.sh` - Authentication Testing
End-to-end testing of the authentication flow.

```bash
./scripts/test-auth-flow.sh
```

### Git Hooks

#### `install-git-hooks.sh` - Git Hook Installation
Installs custom git hooks for the project.

```bash
./scripts/install-git-hooks.sh
```

#### `hooks/pre-commit` - Pre-commit Hook
Runs fast CI checks before allowing commits.

#### `hooks/pre-push` - Pre-push Hook
Runs type checking before allowing pushes.

## Script Patterns

All scripts follow these consistent patterns:

### Error Handling
- Use `set -e` for strict error handling
- Use `log_error` for error messages
- Exit with appropriate error codes

### Logging
- `log_info` - General information
- `log_success` - Successful operations
- `log_warn` - Warnings
- `log_error` - Errors

### Configuration
- Load common libraries first
- Use configuration variables from `lib/config.sh`
- Allow environment variable overrides

### Documentation
- Include usage examples
- Document all command-line options
- Provide help with `--help` flag

## Environment Variables

Scripts respect these environment variables:

- `DB_CONTAINER` - Database container name
- `DB_USER` - Database username
- `DB_NAME` - Database name
- `BACKUP_DIR` - Backup directory path
- `SECURITY_REPORT_DIR` - Security scan reports directory

## Exit Codes

- `0` - Success
- `1` - General error
- `2` - Configuration error
- `3` - Dependency missing

## Development

When adding new scripts:

1. Source the common libraries
2. Follow the established patterns
3. Add comprehensive error handling
4. Include help documentation
5. Update this README

## Troubleshooting

### Common Issues

**Permission denied**
```bash
chmod +x scripts/*.sh
```

**Container not running**
```bash
docker-compose up -d
```

**Database connection failed**
```bash
# Check if database is ready
docker exec nonprofit-db pg_isready -U postgres -d nonprofit_manager
```

**Script not found**
```bash
# Use absolute paths or run from project root
./scripts/ci.sh
```