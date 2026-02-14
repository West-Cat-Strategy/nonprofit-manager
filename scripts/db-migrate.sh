#!/bin/bash
# Database Migration Script
# Runs all pending SQL migrations in order

set -e

# Load common utilities and configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
source "$SCRIPT_DIR/lib/config.sh"

# Configuration overrides
DB_CONTAINER="${DB_CONTAINER:-$DB_CONTAINER}"
DB_USER="${DB_USER:-$DB_USER}"
DB_NAME="${DB_NAME:-$DB_NAME}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-$MIGRATIONS_DIR}"

print_header "Database Migrations"

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    log_error "Migrations directory not found: $MIGRATIONS_DIR"
    exit 1
fi

# Check if database container is running
check_docker_containers "$DB_CONTAINER" || exit 1

# Wait for database to be ready
wait_for_db "$DB_CONTAINER" "$DB_USER" "$DB_NAME" || exit 1

# Create migrations tracking table if not exists
log_info "Ensuring migrations table exists..."
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" << 'EOF'
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64)
);
EOF

# Get list of already applied migrations
APPLIED=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c \
    "SELECT filename FROM schema_migrations ORDER BY filename;" 2>/dev/null || echo "")

# Count pending migrations
PENDING_COUNT=0
for migration in "$MIGRATIONS_DIR"/*.sql; do
    [ -f "$migration" ] || continue
    filename=$(basename "$migration")
    if ! echo "$APPLIED" | grep -q "^${filename}$"; then
        PENDING_COUNT=$((PENDING_COUNT + 1))
    fi
done

if [ $PENDING_COUNT -eq 0 ]; then
    log_success "No pending migrations"
    print_footer "Migration check complete"
    exit 0
fi

log_info "Found $PENDING_COUNT pending migration(s)"
echo ""

# Run pending migrations in order
APPLIED_COUNT=0
FAILED=false

for migration in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
    [ -f "$migration" ] || continue
    filename=$(basename "$migration")

    # Skip if already applied
    if echo "$APPLIED" | grep -q "^${filename}$"; then
        continue
    fi

    log_info "Applying: $filename"

    # Calculate checksum
    checksum=$(md5sum "$migration" 2>/dev/null | cut -d' ' -f1 || md5 -q "$migration" 2>/dev/null || echo "")

    # Run migration in a transaction
    if docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < "$migration" 2>&1; then
        # Record successful migration
        docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
            "INSERT INTO schema_migrations (filename, checksum) VALUES ('$filename', '$checksum');" > /dev/null

        log_success "Applied: $filename"
        APPLIED_COUNT=$((APPLIED_COUNT + 1))
    else
        log_error "Failed to apply: $filename"
        FAILED=true
        break
    fi
done

echo ""
echo "========================================"
if [ "$FAILED" = true ]; then
    log_error "Migration failed!"
    echo "Applied $APPLIED_COUNT of $PENDING_COUNT migrations before failure"
    exit 1
else
    log_success "Applied $APPLIED_COUNT migration(s)"
fi
echo "========================================"
