#!/bin/bash
# Deployment Script
# Deploys the application locally, to staging, or to production

set -e

# Load common utilities and configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
source "$SCRIPT_DIR/lib/config.sh"
source "$SCRIPT_DIR/lib/db-at-rest.sh"

# Configuration file for remote deployments
CONFIG_FILE="${DEPLOY_CONFIG_FILE:-$PROJECT_ROOT/.deploy.conf}"
PROD_ENV_FILE_PATH="$PROJECT_ROOT/.env.production"

# Load configuration if exists
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

# Environment argument
ENVIRONMENT="${1:-local}"

# Validate environment
validate_environment "$ENVIRONMENT" || exit 1

# Get git info
get_git_info

print_header "Deploying to $ENVIRONMENT"

log_info "Git info:"
echo "  Branch: $GIT_BRANCH"
echo "  Commit: $GIT_COMMIT"
[ -n "$GIT_TAG" ] && echo "  Tag: $GIT_TAG"
[ -n "$GIT_DIRTY" ] && log_warn "Working directory has uncommitted changes"
echo ""

log_info "Git info:"
echo "  Branch: $GIT_BRANCH"
echo "  Commit: $GIT_COMMIT"
[ -n "$GIT_TAG" ] && echo "  Tag: $GIT_TAG"
[ -n "$GIT_DIRTY" ] && log_warn "Working directory has uncommitted changes"
echo ""

#------------------------------------------------------------------------------
# Local Deployment
#------------------------------------------------------------------------------
deploy_local() {
    local env_file="$PROD_ENV_FILE_PATH"
    local db_mode compose_files

    log_info "Running pre-deployment checks..."

    # Run fast CI
    if ! "$SCRIPT_DIR/local-ci.sh" --fast; then
        log_error "CI checks failed! Fix issues before deploying."
        exit 1
    fi

    validate_production_db_at_rest_config "$env_file" || exit 1
    db_mode="$(resolve_db_at_rest_mode "$env_file")"
    compose_files="$(compose_files_for_db_at_rest_mode "docker-compose.yml" "$env_file")"

    export COMPOSE_ENV_FILE="$env_file"
    export COMPOSE_MODE=prod
    export COMPOSE_FILES_PROD="$compose_files"

    log_info "Building Docker images..."
    docker_compose_mode prod build

    if [[ "$db_mode" == "managed" ]]; then
        log_info "Starting managed-database service set..."
        docker_compose_mode prod up -d redis
    else
        log_info "Starting self-hosted encrypted database service set..."
        docker_compose_mode prod up -d postgres redis
    fi

    log_info "Running database migrations..."
    "$SCRIPT_DIR/db-migrate.sh"

    log_info "Restarting containers..."
    if [[ "$db_mode" == "managed" ]]; then
        docker_compose_mode prod up -d --no-deps backend
        docker_compose_mode prod up -d --no-deps frontend
    else
        docker_compose_mode prod up -d backend frontend
    fi

    # Wait for health check
    log_info "Waiting for services to be healthy..."
    sleep 5

    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        log_success "Backend is healthy"
    else
        log_warn "Backend health check failed (may still be starting)"
    fi

    echo ""
    log_success "Local deployment complete!"
    echo ""
    echo "  Frontend: http://localhost:8001"
    echo "  Backend:  http://localhost:8000"
    echo ""
}

#------------------------------------------------------------------------------
# Remote Deployment (Staging/Production)
#------------------------------------------------------------------------------
deploy_remote() {
    local env="$1"
    local host_var="${env^^}_HOST"
    local user_var="${env^^}_USER"
    local path_var="${env^^}_PATH"

    local deploy_host="${!host_var:-}"
    local deploy_user="${!user_var:-deploy}"
    local deploy_path="${!path_var:-/opt/nonprofit-manager}"

    # Check if configured
    if [ -z "$deploy_host" ]; then
        log_error "Deployment not configured for $env"
        echo ""
        echo "Create $CONFIG_FILE with:"
        echo ""
        echo "  # ${env^} deployment"
        echo "  ${env^^}_HOST=your-server.example.com"
        echo "  ${env^^}_USER=deploy"
        echo "  ${env^^}_PATH=/opt/nonprofit-manager"
        echo ""
        echo "Alternatively, run 'make deploy-local' to deploy locally."
        exit 1
    fi

    # Production confirmation
    if [ "$env" = "production" ]; then
        echo ""
        log_warn "You are about to deploy to PRODUCTION!"
        log_warn "Host: $deploy_host"
        echo ""
        read -p "Type 'deploy' to confirm: " confirm
        if [ "$confirm" != "deploy" ]; then
            log_error "Deployment cancelled"
            exit 1
        fi
    fi

    # Pre-deployment checks
    log_info "Running CI checks..."
    if ! "$SCRIPT_DIR/local-ci.sh" --build --audit; then
        log_error "CI checks failed!"
        exit 1
    fi

    # Check for uncommitted changes
    if [ -n "$GIT_DIRTY" ]; then
        log_warn "You have uncommitted changes!"
        read -p "Continue anyway? [y/N] " confirm
        if [ "$confirm" != "y" ]; then
            log_error "Deployment cancelled"
            exit 1
        fi
    fi

    log_info "Deploying to $deploy_host..."

    # Build images
    log_info "Building Docker images..."
    docker_compose --env-file "$PROJECT_ROOT/.env.production" build

    # If using a registry, push images
    if [ -n "${REGISTRY:-}" ]; then
        local tag="${GIT_TAG:-$GIT_COMMIT}"
        log_info "Pushing images to registry with tag: $tag"

        docker tag nonprofit-manager-backend:latest "$REGISTRY/nonprofit-manager-backend:$tag"
        docker tag nonprofit-manager-frontend:latest "$REGISTRY/nonprofit-manager-frontend:$tag"
        docker push "$REGISTRY/nonprofit-manager-backend:$tag"
        docker push "$REGISTRY/nonprofit-manager-frontend:$tag"
    fi

    # Deploy via SSH
    log_info "Connecting to $deploy_host..."

    ssh "$deploy_user@$deploy_host" << DEPLOY_SCRIPT
        set -euo pipefail
        cd $deploy_path
        ENV_FILE="./.env.production"

        echo "Pulling latest code..."
        git fetch origin
        git checkout $GIT_COMMIT

        source ./scripts/lib/common.sh
        source ./scripts/lib/config.sh
        source ./scripts/lib/db-at-rest.sh

        validate_production_db_at_rest_config "\$ENV_FILE"
        DB_MODE="\$(resolve_db_at_rest_mode "\$ENV_FILE")"
        COMPOSE_FILES_EFFECTIVE="\$(compose_files_for_db_at_rest_mode "docker-compose.yml" "\$ENV_FILE")"
        export COMPOSE_ENV_FILE="\$ENV_FILE"
        export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_PROD}"
        export COMPOSE_MODE=prod
        export COMPOSE_FILES_PROD="\$COMPOSE_FILES_EFFECTIVE"

        echo "Building/pulling images..."
        docker_compose_mode prod pull 2>/dev/null || docker_compose_mode prod build

        echo "Running migrations..."
        if [[ "\$DB_MODE" == "managed" ]]; then
          docker_compose_mode prod up -d redis
        else
          docker_compose_mode prod up -d postgres redis
        fi
        ./scripts/db-migrate.sh

        echo "Restarting services..."
        if [[ "\$DB_MODE" == "managed" ]]; then
          docker_compose_mode prod up -d --no-deps backend
          docker_compose_mode prod up -d --no-deps frontend
        else
          docker_compose_mode prod up -d backend frontend
        fi

        echo "Cleaning up..."
        docker system prune -f

        echo "Health check..."
        sleep 10
        curl -sf http://localhost:8000/health || echo "Warning: Health check failed"
DEPLOY_SCRIPT

    if [ $? -eq 0 ]; then
        log_success "Deployment to $env complete!"

        # Record deployment
        echo "$(date -Iseconds) | $env | $GIT_COMMIT | $GIT_TAG | $(whoami)" >> "$PROJECT_ROOT/.deploy-history"
    else
        log_error "Deployment failed!"
        exit 1
    fi
}

#------------------------------------------------------------------------------
# Main
#------------------------------------------------------------------------------
case "$ENVIRONMENT" in
    local)
        deploy_local
        ;;
    staging)
        deploy_remote staging
        ;;
    production|prod)
        deploy_remote production
        ;;
    *)
        log_error "Unknown environment: $ENVIRONMENT"
        echo ""
        echo "Usage: $0 [local|staging|production]"
        exit 1
        ;;
esac

echo ""
echo "========================================"
log_success "Deployment Complete!"
echo "========================================"
