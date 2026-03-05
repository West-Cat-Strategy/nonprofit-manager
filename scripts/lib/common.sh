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
    cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Resolve the available Docker Compose command.
docker_compose_cmd() {
    if command_exists docker && docker compose version >/dev/null 2>&1; then
        echo "docker compose"
        return 0
    fi

    if command_exists docker-compose; then
        echo "docker-compose"
        return 0
    fi

    return 1
}

# Run Docker Compose commands with v2->v1 fallback.
docker_compose() {
    if command_exists docker && docker compose version >/dev/null 2>&1; then
        docker compose "$@"
        return $?
    fi

    if command_exists docker-compose; then
        docker-compose "$@"
        return $?
    fi

    log_error "Neither 'docker compose' nor 'docker-compose' is available"
    return 127
}

normalize_compose_mode() {
    local mode="${1:-prod}"
    case "$mode" in
        prod|production)
            echo "prod"
            ;;
        dev|development)
            echo "dev"
            ;;
        ci)
            echo "ci"
            ;;
        *)
            log_error "Invalid COMPOSE_MODE: $mode (expected prod|dev|ci)"
            return 1
            ;;
    esac
}

compose_project_for_mode() {
    local mode
    mode="$(normalize_compose_mode "${1:-${COMPOSE_MODE:-prod}}")" || return 1

    case "$mode" in
        prod)
            echo "${COMPOSE_PROJECT_NAME:-${COMPOSE_PROJECT_PROD:-nonprofit-prod}}"
            ;;
        dev)
            echo "${COMPOSE_PROJECT_NAME:-${COMPOSE_PROJECT_DEV:-nonprofit-dev}}"
            ;;
        ci)
            echo "${COMPOSE_PROJECT_NAME:-${COMPOSE_PROJECT_CI:-nonprofit-ci}}"
            ;;
    esac
}

compose_files_for_mode() {
    local mode
    mode="$(normalize_compose_mode "${1:-${COMPOSE_MODE:-prod}}")" || return 1

    if [ -n "${COMPOSE_FILES:-}" ]; then
        echo "${COMPOSE_FILES}"
        return 0
    fi

    case "$mode" in
        prod)
            echo "${COMPOSE_FILES_PROD:-docker-compose.yml}"
            ;;
        dev)
            echo "${COMPOSE_FILES_DEV:-docker-compose.dev.yml}"
            ;;
        ci)
            echo "${COMPOSE_FILES_CI:-docker-compose.yml docker-compose.host-access.yml docker-compose.ci.yml}"
            ;;
    esac
}

compose_flags_for_mode() {
    local mode
    mode="$(normalize_compose_mode "${1:-${COMPOSE_MODE:-prod}}")" || return 1

    local project files_raw
    project="$(compose_project_for_mode "$mode")" || return 1
    files_raw="$(compose_files_for_mode "$mode")" || return 1

    local flags=""
    if [ -n "$project" ]; then
        flags="$flags -p $project"
    fi

    for compose_file in ${files_raw//,/ }; do
        [ -n "$compose_file" ] && flags="$flags -f $compose_file"
    done

    echo "$flags"
}

docker_compose_mode() {
    local mode
    mode="$(normalize_compose_mode "${1:-${COMPOSE_MODE:-prod}}")" || return 1
    shift || true

    local project files_raw
    project="$(compose_project_for_mode "$mode")" || return 1
    files_raw="$(compose_files_for_mode "$mode")" || return 1

    local -a compose_args=()
    if [ -n "$project" ]; then
        compose_args+=("-p" "$project")
    fi

    for compose_file in ${files_raw//,/ }; do
        [ -n "$compose_file" ] && compose_args+=("-f" "$compose_file")
    done

    docker_compose "${compose_args[@]}" "$@"
}

legacy_container_to_service() {
    local candidate="$1"
    case "$candidate" in
        nonprofit-db|nonprofit-db-dev)
            echo "postgres"
            ;;
        nonprofit-redis|nonprofit-redis-dev)
            echo "redis"
            ;;
        nonprofit-backend|nonprofit-backend-dev)
            echo "backend"
            ;;
        nonprofit-frontend|nonprofit-frontend-dev)
            echo "frontend"
            ;;
        *)
            echo "$candidate"
            ;;
    esac
}

check_compose_service_running() {
    local service="$1"
    local mode="${2:-${COMPOSE_MODE:-prod}}"

    local container_id
    container_id="$(docker_compose_mode "$mode" ps -q "$service" 2>/dev/null | head -n 1 || true)"

    if [ -z "$container_id" ]; then
        local compose_cmd compose_flags
        compose_cmd="$(docker_compose_cmd 2>/dev/null || echo "docker compose")"
        compose_flags="$(compose_flags_for_mode "$mode" || true)"
        log_error "Compose service '$service' is not running (mode: $mode)"
        log_info "Start it with: $compose_cmd$compose_flags up -d $service"
        return 1
    fi

    if ! docker inspect -f '{{.State.Running}}' "$container_id" 2>/dev/null | grep -q '^true$'; then
        log_error "Compose service '$service' is not running (mode: $mode)"
        return 1
    fi

    return 0
}

compose_exec() {
    local mode="$1"
    local service="$2"
    shift 2 || true
    docker_compose_mode "$mode" exec -T "$service" "$@"
}

wait_for_db_service() {
    local service="${1:-postgres}"
    local db_user="${2:-postgres}"
    local db_name="${3:-nonprofit_manager}"
    local max_attempts="${4:-10}"
    local mode="${5:-${COMPOSE_MODE:-prod}}"

    log_info "Waiting for database service '$service' to be ready (mode: $mode)..."
    for i in $(seq 1 "$max_attempts"); do
        if compose_exec "$mode" "$service" pg_isready -U "$db_user" -d "$db_name" >/dev/null 2>&1; then
            log_success "Database is ready"
            return 0
        fi
        if [ "$i" -eq "$max_attempts" ]; then
            log_error "Database not ready after $max_attempts attempts"
            return 1
        fi
        sleep 1
    done
}

# Backward-compatible wrapper: now resolves compose services.
check_docker_containers() {
    local mode="${COMPOSE_MODE:-prod}"
    local all_running=true

    for candidate in "$@"; do
        local service
        service="$(legacy_container_to_service "$candidate")"
        if ! check_compose_service_running "$service" "$mode"; then
            all_running=false
        fi
    done

    [ "$all_running" = true ]
}

# Backward-compatible wrapper: now resolves compose services.
wait_for_db() {
    local service_candidate="${1:-postgres}"
    local db_user="${2:-postgres}"
    local db_name="${3:-nonprofit_manager}"
    local max_attempts="${4:-10}"

    local service
    service="$(legacy_container_to_service "$service_candidate")"
    wait_for_db_service "$service" "$db_user" "$db_name" "$max_attempts" "${COMPOSE_MODE:-prod}"
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
