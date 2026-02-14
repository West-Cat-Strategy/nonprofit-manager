#!/bin/bash
# Database Restore Script
# Restores a PostgreSQL database from a backup file

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

print_header "Database Restore"

# Configuration
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/database/backups}"
DB_CONTAINER="${DB_CONTAINER:-nonprofit-db}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-nonprofit_manager}"

echo ""
echo "========================================"
echo "  Database Restore"
echo "========================================"
echo ""

# Check if backup file is provided
if [ $# -eq 0 ]; then
    log_error "Usage: $0 <backup_file.sql> [--confirm-destructive]"
    echo ""
    log_info "Available backups:"
    ls -la "$BACKUP_DIR"/backup_*.sql* 2>/dev/null | head -10 || echo "No backups found in $BACKUP_DIR"
    exit 1
fi

BACKUP_FILE="$1"
CONFIRM_DESTRUCTIVE="${2:-}"

# Validate backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    # Try with backup directory prefix
    if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
    else
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
fi

# Check if it's a compressed file
if [[ "$BACKUP_FILE" == *.gz ]]; then
    log_info "Detected compressed backup file"
    TEMP_FILE=$(mktemp)
    if ! gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"; then
        log_error "Failed to decompress backup file"
        rm -f "$TEMP_FILE"
        exit 1
    fi
    BACKUP_FILE="$TEMP_FILE"
    CLEANUP_TEMP=true
else
    CLEANUP_TEMP=false
fi

# Safety check for destructive operations
if [ "$CONFIRM_DESTRUCTIVE" != "--confirm-destructive" ]; then
    log_warn "WARNING: This will DROP and RECREATE the database '$DB_NAME'"
    log_warn "All existing data will be lost!"
    echo ""
    log_info "To proceed, run:"
    echo "  $0 $1 --confirm-destructive"
    echo ""
    if [ "$CLEANUP_TEMP" = true ]; then
        rm -f "$TEMP_FILE"
    fi
    exit 1
fi

# Check if database container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    log_error "Database container '$DB_CONTAINER' is not running"
    log_info "Start it with: docker-compose up -d postgres"
    if [ "$CLEANUP_TEMP" = true ]; then
        rm -f "$TEMP_FILE"
    fi
    exit 1
fi

# Wait for database to be ready
log_info "Checking database connection..."
for i in {1..10}; do
    if docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" > /dev/null 2>&1; then
        break
    fi
    if [ $i -eq 10 ]; then
        log_error "Database not ready after 10 attempts"
        if [ "$CLEANUP_TEMP" = true ]; then
            rm -f "$TEMP_FILE"
        fi
        exit 1
    fi
    sleep 1
done
log_success "Database is ready"

# Get backup file size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log_info "Restoring from: $(basename "$BACKUP_FILE") ($BACKUP_SIZE)"

# Terminate active connections to the database
log_info "Terminating active connections to '$DB_NAME'..."
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
" > /dev/null 2>&1 || true

# Drop and recreate the database
log_info "Dropping and recreating database '$DB_NAME'..."
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" > /dev/null
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" > /dev/null

# Restore from backup
log_info "Restoring database from backup..."
if docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE" 2>&1; then
    log_success "Database restore completed successfully"

    # Run any post-restore operations (recreate extensions, etc.)
    log_info "Running post-restore operations..."
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
        -- Ensure UUID extension is available
        CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";

        -- Ensure other common extensions
        CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";
    " > /dev/null 2>&1 || true

    echo ""
    echo "========================================"
    log_success "Restore completed!"
    echo "Database: $DB_NAME"
    echo "Backup source: $(basename "$BACKUP_FILE")"
    echo "========================================"
else
    log_error "Database restore failed!"
    exit 1
fi

# Cleanup temporary file
if [ "$CLEANUP_TEMP" = true ]; then
    rm -f "$TEMP_FILE"
fi