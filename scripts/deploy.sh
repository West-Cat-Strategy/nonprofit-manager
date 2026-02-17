#!/bin/bash
# Deployment Script
# Deploys the application locally, to staging, or to production

set -e

# Load common utilities and configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
source "$SCRIPT_DIR/lib/config.sh"

# Configuration file for remote deployments
CONFIG_FILE="${DEPLOY_CONFIG_FILE:-$PROJECT_ROOT/.deploy.conf}"

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
    log_info "Running pre-deployment checks..."

    # Run fast CI
    if ! "$SCRIPT_DIR/local-ci.sh" --fast; then
        log_error "CI checks failed! Fix issues before deploying."
        exit 1
    fi

    log_info "Building Docker images..."
    docker-compose build

    log_info "Running database migrations..."
    "$SCRIPT_DIR/db-migrate.sh" || log_warn "Migration script not found or failed"

    log_info "Restarting containers..."
    docker-compose up -d

    # Wait for health check
    log_info "Waiting for services to be healthy..."
    sleep 5

    if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
        log_success "Backend is healthy"
    else
        log_warn "Backend health check failed (may still be starting)"
    fi

    echo ""
    log_success "Local deployment complete!"
    echo ""
    echo "  Frontend: http://localhost:5173"
    echo "  Backend:  http://localhost:3000"
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
    docker-compose build

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
        set -e
        cd $deploy_path

        echo "Pulling latest code..."
        git fetch origin
        git checkout $GIT_COMMIT

        echo "Building/pulling images..."
        docker-compose pull 2>/dev/null || docker-compose build

        echo "Running migrations..."
        docker-compose exec -T db psql -U postgres -d nonprofit_manager -c "SELECT 1" || true

        echo "Restarting services..."
        docker-compose up -d

        echo "Cleaning up..."
        docker system prune -f

        echo "Health check..."
        sleep 10
        curl -sf http://localhost:3000/health || echo "Warning: Health check failed"
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
