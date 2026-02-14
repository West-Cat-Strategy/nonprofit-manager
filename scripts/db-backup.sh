#!/bin/bash
# Database Backup Script
# Creates timestamped backups of the PostgreSQL database

set -e

# Load common utilities and configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
source "$SCRIPT_DIR/lib/config.sh"

# Configuration overrides
BACKUP_DIR="${BACKUP_DIR:-$BACKUP_DIR}"
DB_CONTAINER="${DB_CONTAINER:-$DB_CONTAINER}"
DB_USER="${DB_USER:-$DB_USER}"
DB_NAME="${DB_NAME:-$DB_NAME}"

print_header "Database Backup"

# Configuration
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/database/backups}"
DB_CONTAINER="${DB_CONTAINER:-nonprofit-db}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-nonprofit_manager}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

echo ""
echo "========================================"
echo "  Database Backup"
echo "========================================"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if database container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    log_error "Database container '$DB_CONTAINER' is not running"
    log_info "Start it with: docker-compose up -d postgres"
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

# Get database size for logging
DB_SIZE=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c \
    "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null || echo "unknown")

log_info "Starting backup of database '$DB_NAME' (size: $DB_SIZE)"
log_info "Backup file: $BACKUP_FILE"

# Create the backup
if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges --clean --if-exists > "$BACKUP_FILE" 2>&1; then
    # Get backup file size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_success "Backup completed successfully"
    log_info "Backup size: $BACKUP_SIZE"

    # Create a compressed version
    COMPRESSED_FILE="${BACKUP_FILE}.gz"
    if gzip -c "$BACKUP_FILE" > "$COMPRESSED_FILE"; then
        COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
        log_success "Compressed backup created: $COMPRESSED_FILE ($COMPRESSED_SIZE)"
        log_info "Compression ratio: $(echo "scale=1; $(stat -f%z "$BACKUP_FILE") * 100 / $(stat -f%z "$COMPRESSED_FILE")" | bc)% of original size"
    fi

    # Clean up old backups (keep last 10)
    log_info "Cleaning up old backups..."
    ls -t "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
    ls -t "$BACKUP_DIR"/backup_*.sql 2>/dev/null | tail -n +11 | xargs -r rm -f

    echo ""
    echo "========================================"
    log_success "Backup completed!"
    echo "Location: $BACKUP_FILE"
    if [ -f "$COMPRESSED_FILE" ]; then
        echo "Compressed: $COMPRESSED_FILE"
    fi
    echo "========================================"
else
    log_error "Backup failed!"
    rm -f "$BACKUP_FILE" 2>/dev/null || true
    exit 1
fi