#!/bin/bash
# Database Migration Script
# Runs all pending SQL migrations in order

set -euo pipefail

# Load common utilities and configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
source "$SCRIPT_DIR/lib/config.sh"

COMPOSE_MODE="$(normalize_compose_mode "${COMPOSE_MODE:-prod}")"
DB_SERVICE="${DB_SERVICE:-postgres}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-nonprofit_manager}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-database/migrations}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
export DB_PASSWORD
DB_AUTO_START_RAW="$(printf '%s' "${DB_AUTO_START:-false}" | tr '[:upper:]' '[:lower:]')"

case "$DB_AUTO_START_RAW" in
    1|true|yes|on)
        DB_AUTO_START=true
        ;;
    *)
        DB_AUTO_START=false
        ;;
esac

if [[ "$MIGRATIONS_DIR" != /* ]]; then
    MIGRATIONS_DIR="$PROJECT_ROOT/$MIGRATIONS_DIR"
fi

print_header "Database Migrations"

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    log_error "Migrations directory not found: $MIGRATIONS_DIR"
    exit 1
fi

# Check if database service is running
if ! check_compose_service_running "$DB_SERVICE" "$COMPOSE_MODE"; then
    if [ "$DB_AUTO_START" = true ]; then
        log_info "Starting database service '$DB_SERVICE' (mode: $COMPOSE_MODE)..."
        docker_compose_mode "$COMPOSE_MODE" up -d "$DB_SERVICE"
    else
        exit 1
    fi
fi

# Wait for database to be ready
wait_for_db_service "$DB_SERVICE" "$DB_USER" "$DB_NAME" 10 "$COMPOSE_MODE" || exit 1

# Create migrations tracking table if not exists
log_info "Ensuring migrations table exists..."
compose_exec "$COMPOSE_MODE" "$DB_SERVICE" psql -U "$DB_USER" -d "$DB_NAME" << 'EOF_SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64)
);
EOF_SQL

# Get list of already applied migrations
APPLIED_RAW="$(compose_exec "$COMPOSE_MODE" "$DB_SERVICE" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c \
    "SELECT filename FROM schema_migrations ORDER BY filename;" 2>/dev/null || echo "")"
APPLIED="$(printf '%s' "$APPLIED_RAW" | tr -d '\r')"

# Count pending migrations
PENDING_COUNT=0
for migration in "$MIGRATIONS_DIR"/*.sql; do
    [ -f "$migration" ] || continue
    filename=$(basename "$migration")
    if ! printf '%s\n' "$APPLIED" | grep -Fqx "$filename"; then
        PENDING_COUNT=$((PENDING_COUNT + 1))
    fi
done

if [ "$PENDING_COUNT" -eq 0 ]; then
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
    if printf '%s\n' "$APPLIED" | grep -Fqx "$filename"; then
        continue
    fi

    log_info "Applying: $filename"

    # Calculate checksum
    checksum=$(md5sum "$migration" 2>/dev/null | cut -d' ' -f1 || md5 -q "$migration" 2>/dev/null || echo "")

    # Run migration in a transaction
    if compose_exec "$COMPOSE_MODE" "$DB_SERVICE" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < "$migration"; then
        # Record successful migration
        compose_exec "$COMPOSE_MODE" "$DB_SERVICE" psql -U "$DB_USER" -d "$DB_NAME" -c \
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
