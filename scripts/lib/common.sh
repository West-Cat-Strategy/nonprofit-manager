#!/bin/bash
# Common utilities for Nonprofit Manager scripts
# Source this file in other scripts to get shared functions

# Color definitions
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export PURPLE='\033[0;35m'
export CYAN='\033[0;36m'
export NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_debug() { echo -e "${PURPLE}[DEBUG]${NC} $1"; }

# Project paths
get_project_root() {
    # Get the absolute path to the project root
    cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if we're in a git repository
is_git_repo() {
    git rev-parse --git-dir >/dev/null 2>&1
}

# Get git information
get_git_info() {
    if is_git_repo; then
        GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
        GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
        GIT_TAG=$(git describe --tags --exact-match 2>/dev/null || echo "")
        GIT_DIRTY=$(git status --porcelain 2>/dev/null | head -1)
    else
        GIT_BRANCH="unknown"
        GIT_COMMIT="unknown"
        GIT_TAG=""
        GIT_DIRTY=""
    fi

    # Export for use in calling scripts
    export GIT_BRANCH GIT_COMMIT GIT_TAG GIT_DIRTY
}

# Check if Docker containers are running
check_docker_containers() {
    local containers=("$@")
    local all_running=true

    for container in "${containers[@]}"; do
        if ! docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            log_error "Container '$container' is not running"
            all_running=false
        fi
    done

    if [ "$all_running" = false ]; then
        log_info "Start containers with: docker-compose up -d"
        return 1
    fi

    return 0
}

# Wait for database to be ready
wait_for_db() {
    local container="${1:-nonprofit-db}"
    local db_user="${2:-postgres}"
    local db_name="${3:-nonprofit_manager}"
    local max_attempts="${4:-10}"

    log_info "Waiting for database to be ready..."
    for i in $(seq 1 "$max_attempts"); do
        if docker exec "$container" pg_isready -U "$db_user" -d "$db_name" >/dev/null 2>&1; then
            log_success "Database is ready"
            return 0
        fi
        if [ $i -eq "$max_attempts" ]; then
            log_error "Database not ready after $max_attempts attempts"
            return 1
        fi
        sleep 1
    done
}

# Run a command with proper error handling and logging
run_cmd() {
    local cmd="$1"
    local description="${2:-Running command}"

    log_info "$description"
    if eval "$cmd"; then
        log_success "$description completed"
        return 0
    else
        log_error "$description failed"
        return 1
    fi
}

# Check if a file exists and is readable
check_file() {
    local file="$1"
    local description="${2:-$file}"

    if [ ! -f "$file" ]; then
        log_error "$description not found: $file"
        return 1
    fi

    if [ ! -r "$file" ]; then
        log_error "$description not readable: $file"
        return 1
    fi

    return 0
}

# Create directory if it doesn't exist
ensure_dir() {
    local dir="$1"
    local description="${2:-Directory}"

    if [ ! -d "$dir" ]; then
        log_info "Creating $description: $dir"
        mkdir -p "$dir" || {
            log_error "Failed to create $description: $dir"
            return 1
        }
    fi
}

# Get configuration value from .env files
get_config() {
    local key="$1"
    local default="${2:-}"

    # Check .env.production first, then .env.development, then .env
    for env_file in ".env.production" ".env.development" ".env"; do
        if [ -f "$env_file" ] && grep -q "^${key}=" "$env_file" 2>/dev/null; then
            grep "^${key}=" "$env_file" | cut -d'=' -f2- | sed 's/^"//' | sed 's/"$//'
            return 0
        fi
    done

    # Return default if not found
    echo "$default"
}

# Validate environment
validate_environment() {
    local env="${1:-development}"

    case "$env" in
        development|staging|production)
            return 0
            ;;
        *)
            log_error "Invalid environment: $env"
            log_info "Valid environments: development, staging, production"
            return 1
            ;;
    esac
}

# Print script header
print_header() {
    local title="$1"
    local subtitle="${2:-}"

    echo ""
    echo "========================================"
    echo "  $title"
    if [ -n "$subtitle" ]; then
        echo "  $subtitle"
    fi
    echo "========================================"
    echo ""
}

# Print script footer
print_footer() {
    local message="${1:-Complete!}"

    echo ""
    echo "========================================"
    log_success "$message"
    echo "========================================"
    echo ""
}

# Confirm destructive action
confirm_destructive() {
    local action="$1"
    local confirm_text="${2:-yes}"

    log_warn "WARNING: $action"
    echo ""
    read -p "Type '$confirm_text' to confirm: " confirm
    if [ "$confirm" != "$confirm_text" ]; then
        log_error "Action cancelled"
        return 1
    fi

    return 0
}