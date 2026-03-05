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

### Docker Compose Overlays

Use these commands from the repo root when you need optional overlay stacks:

```bash
# Dev stack + tools profile
docker compose -f docker-compose.dev.yml -f docker-compose.tools.yml --profile tools up -d

# Dev stack + Caddy overlay
docker compose -f docker-compose.dev.yml -f docker-compose.caddy.yml up -d

# Production-like stack + optional DB/Redis host access
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.host-access.yml up -d
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

#### `check-links.sh` - Link Checking
Validates markdown links and highlights any broken references.

```bash
./scripts/check-links.sh
```

#### `check-rate-limit-key-policy.ts` - Rate-limit Key Policy Guardrail
Blocks raw/literal rate-limit key generation and enforces helper-based key composition.

```bash
node scripts/check-rate-limit-key-policy.ts
```

#### `check-success-envelope-policy.ts` - Success Envelope Policy Guardrail
Enforces a no-regression baseline for direct 2xx `res.json()` responses in backend controllers.

```bash
node scripts/check-success-envelope-policy.ts
```

#### `check-route-validation-policy.ts` - Route Validation Guardrail
Enforces required `validateParams`/`validateBody` middleware coverage for critical backend routes.

```bash
node scripts/check-route-validation-policy.ts
```

#### `audit-query-contracts.ts` - Query Contract Audit Snapshot
Builds deterministic query-contract inventory artifacts under `scripts/policies/`:
- `query-contract-audit-baseline.json`
- `query-contract-audit-summary.md`

```bash
node scripts/audit-query-contracts.ts
```

#### `check-query-contract-policy.ts` - Query Contract Guardrail
Enforces no-regression policy for query-validation coverage:
- no new query-consuming routes without `validateQuery`
- no direct controller query regressions
- no non-strict query schema regressions

```bash
node scripts/check-query-contract-policy.ts
```

#### `check-express-validator-policy.ts` - Validation Migration Guardrail
Blocks production `express-validator` usage in routes/controllers/modules after Zod migration.

```bash
node scripts/check-express-validator-policy.ts
```

#### `check-controller-sql-policy.ts` - Controller SQL Boundary Guardrail
Enforces a no-regression baseline for direct SQL in controllers, with strict-zero on migrated controllers.

```bash
node scripts/check-controller-sql-policy.ts
```

#### `check-auth-guard-policy.ts` - Auth Guard Usage Guardrail
Blocks reintroduction of legacy `require*OrError` auth-guard helpers in controllers/modules.

```bash
node scripts/check-auth-guard-policy.ts
```

#### `check-duplicate-test-tree.ts` - Duplicate Test Path Guardrail
Blocks duplicate backend test trees under `backend/backend/src/__tests__`.

```bash
node scripts/check-duplicate-test-tree.ts
```

#### `check-doc-api-versioning.ts` - Docs API Versioning Guardrail
Blocks legacy `/api/*` endpoint examples in project docs (requires `/api/v2/*` or `/health*` for backend health checks).

```bash
node scripts/check-doc-api-versioning.ts
```

#### `select-checks.sh` - Deterministic Check Selector
Chooses the minimal command set for changed files (`fast` or `strict` mode).

```bash
./scripts/select-checks.sh --base HEAD~1 --mode fast
./scripts/select-checks.sh --files \"backend/src/routes/tasks.ts,frontend/src/features/events/api/eventsApiClient.ts\" --mode strict
```

#### `ui-audit.ts` - UI Debt Baseline and Policy Check
Scans frontend route/component files for hardcoded color utilities, semantic token usage, and inline-style hotspots.

```bash
# Print current report
node scripts/ui-audit.ts

# Refresh baseline snapshot
node scripts/ui-audit.ts --write-baseline

# Enforce policy against baseline
node scripts/ui-audit.ts --enforce-baseline
```

`scripts/select-checks.sh` runs this in report mode by default for migration phases.
Use `UI_AUDIT_ENFORCE=true` to force baseline failure mode in strict release gates.

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

- `COMPOSE_MODE` - Compose target mode (`prod`, `dev`, `ci`)
- `COMPOSE_PROJECT_NAME` - Optional compose project override
- `COMPOSE_FILES` - Optional compose file list override (space or comma separated)
- `DB_SERVICE` - Database compose service name (default: `postgres`)
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
docker compose up -d
```

**Database connection failed**
```bash
# Check if database is ready
docker compose -p nonprofit-prod -f docker-compose.yml exec -T postgres pg_isready -U postgres -d nonprofit_manager
```

**Script not found**
```bash
# Use absolute paths or run from project root
./scripts/ci.sh
```
