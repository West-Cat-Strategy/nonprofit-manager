#!/bin/bash
# Database Migration Script
# Runs all pending SQL migrations in order

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

cd "$PROJECT_ROOT"

# Database settings
DB_CONTAINER="${DB_CONTAINER:-nonprofit-db}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-nonprofit_manager}"
MIGRATIONS_DIR="$PROJECT_ROOT/database/migrations"

echo ""
echo "========================================"
echo "  Database Migrations"
echo "========================================"
echo ""

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    log_error "Migrations directory not found: $MIGRATIONS_DIR"
    exit 1
fi

# Check if database container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    log_error "Database container '$DB_CONTAINER' is not running"
    log_info "Start it with: docker-compose up -d db"
    exit 1
fi

# Wait for database to be ready
log_info "Checking database connection..."
for i in {1..10}; do
    if docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
        break
    fi
    if [ $i -eq 10 ]; then
        log_error "Database not ready after 10 attempts"
        exit 1
    fi
    sleep 1
done
log_success "Database is ready"

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
    echo ""
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
