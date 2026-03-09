#!/bin/bash
# Unified CI Pipeline Script
# Runs lint, typecheck, tests, and build with consistent interface

set -e
set +H

HAS_DB_HOST=false
HAS_DB_PORT=false
HAS_DB_NAME=false
HAS_DB_USER=false
HAS_DB_PASSWORD=false
HAS_REDIS_PORT=false

if [[ "${DB_HOST+x}" == "x" ]]; then
    HAS_DB_HOST=true
    INBOUND_DB_HOST="$DB_HOST"
fi

if [[ "${DB_PORT+x}" == "x" ]]; then
    HAS_DB_PORT=true
    INBOUND_DB_PORT="$DB_PORT"
fi

if [[ "${DB_NAME+x}" == "x" ]]; then
    HAS_DB_NAME=true
    INBOUND_DB_NAME="$DB_NAME"
fi

if [[ "${DB_USER+x}" == "x" ]]; then
    HAS_DB_USER=true
    INBOUND_DB_USER="$DB_USER"
fi

if [[ "${DB_PASSWORD+x}" == "x" ]]; then
    HAS_DB_PASSWORD=true
    INBOUND_DB_PASSWORD="$DB_PASSWORD"
fi

if [[ "${REDIS_PORT+x}" == "x" ]]; then
    HAS_REDIS_PORT=true
    INBOUND_REDIS_PORT="$REDIS_PORT"
fi

# Load common utilities and configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
source "$SCRIPT_DIR/lib/config.sh"

# Parse arguments
ENVIRONMENT="development"
RUN_BACKEND=true
RUN_FRONTEND=true
RUN_E2E=true
RUN_LINT=true
RUN_TYPECHECK=true
RUN_TESTS=true
RUN_BUILD=false
RUN_COVERAGE=false
SKIP_TESTS=false
QUICK=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --env=*) ENVIRONMENT="${1#*=}"; shift ;;
        --backend-only) RUN_FRONTEND=false; shift ;;
        --frontend-only) RUN_BACKEND=false; shift ;;
        --no-e2e) RUN_E2E=false; shift ;;
        --no-lint) RUN_LINT=false; shift ;;
        --no-typecheck) RUN_TYPECHECK=false; shift ;;
        --no-tests) RUN_TESTS=false; shift ;;
        --skip-tests) SKIP_TESTS=true; shift ;;
        --build) RUN_BUILD=true; shift ;;
        --coverage) RUN_COVERAGE=true; shift ;;
        --quick) QUICK=true; RUN_TESTS=false; shift ;;
        --verbose) VERBOSE=true; shift ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --env=ENV           Environment (development, staging, production)"
            echo "  --backend-only      Run only backend checks"
            echo "  --frontend-only     Run only frontend checks"
            echo "  --no-e2e            Skip Playwright E2E tests"
            echo "  --no-lint           Skip linting"
            echo "  --no-typecheck      Skip type checking"
            echo "  --no-tests          Skip tests"
            echo "  --skip-tests        Skip tests (alias)"
            echo "  --build             Include build step"
            echo "  --coverage          Run tests with coverage"
            echo "  --quick             Quick mode (lint + typecheck only)"
            echo "  --verbose           Verbose output"
            echo "  --help              Show this help"
            exit 0
            ;;
        *) log_error "Unknown option: $1"; exit 1 ;;
    esac
done

# Validate environment
validate_environment "$ENVIRONMENT" || exit 1

# Track failures and timing
FAILURES=()
STEP_COUNT=0
START_TIME=$(date +%s)
CI_INFRA_COMPOSE_ARGS=""
CI_INFRA_STARTED=false
CI_KEEP_INFRA_RAW="${CI_KEEP_INFRA:-false}"
CI_KEEP_INFRA_NORMALIZED="$(printf '%s' "$CI_KEEP_INFRA_RAW" | tr '[:upper:]' '[:lower:]')"

case "$CI_KEEP_INFRA_NORMALIZED" in
    1|true|yes|on)
        CI_KEEP_INFRA=true
        ;;
    *)
        CI_KEEP_INFRA=false
        ;;
esac

cleanup_ci_infra() {
    if [ "$CI_KEEP_INFRA" = true ]; then
        return 0
    fi

    if [ "$CI_INFRA_STARTED" = true ] && [ -n "$CI_INFRA_COMPOSE_ARGS" ]; then
        docker_compose $CI_INFRA_COMPOSE_ARGS down -v --remove-orphans >/dev/null 2>&1 || true
    fi
}

# Function to run a step with timing and error tracking
run_step() {
    local step_name="$1"
    local command="$2"
    local skip_condition="${3:-}"

    ((STEP_COUNT++))

    # Check skip condition
    if [ -n "$skip_condition" ] && eval "$skip_condition"; then
        [ "$VERBOSE" = true ] && log_info "Skipping: $step_name"
        return 0
    fi

    local step_start=$(date +%s)

    if [ "$VERBOSE" = true ]; then
        log_info "Running: $step_name"
        echo "----------------------------------------"
    fi

    if ( eval "$command" ); then
        local step_end=$(date +%s)
        local duration=$((step_end - step_start))
        if [ "$VERBOSE" = true ]; then
            log_success "$step_name passed (${duration}s)"
        fi
        return 0
    else
        local step_end=$(date +%s)
        local duration=$((step_end - step_start))
        log_error "$step_name failed (${duration}s)"
        FAILURES+=("$step_name")
        return 1
    fi
}

# Main CI function
run_ci() {
    print_header "CI Pipeline" "$ENVIRONMENT environment"

    # Keep backend/.env.test DB host/port defaults reachable during local CI.
    local ci_db_host="localhost"
    local ci_db_port="8012"
    local ci_db_name="nonprofit_manager"
    local ci_db_user="postgres"
    local ci_db_password="postgres"
    local ci_redis_port="8013"

    if [ "$HAS_DB_HOST" = true ]; then
        ci_db_host="$INBOUND_DB_HOST"
    fi

    if [ "$HAS_DB_PORT" = true ]; then
        ci_db_port="$INBOUND_DB_PORT"
    fi

    if [ "$HAS_DB_NAME" = true ]; then
        ci_db_name="$INBOUND_DB_NAME"
    fi

    if [ "$HAS_DB_USER" = true ]; then
        ci_db_user="$INBOUND_DB_USER"
    fi

    if [ "$HAS_DB_PASSWORD" = true ]; then
        ci_db_password="$INBOUND_DB_PASSWORD"
    fi

    if [ "$HAS_REDIS_PORT" = true ]; then
        ci_redis_port="$INBOUND_REDIS_PORT"
    fi

    local ci_project_base="${COMPOSE_PROJECT_CI:-nonprofit-ci}"
    local ci_project_name="${CI_COMPOSE_PROJECT_NAME:-${COMPOSE_PROJECT_NAME:-${ci_project_base}-${USER:-local}-$$}}"
    local reuse_existing_ci_infra=false
    local ci_compose_files="docker-compose.yml"
    local infra_compose_args="-p $ci_project_name -f docker-compose.yml"
    if [ -f "docker-compose.host-access.yml" ]; then
        infra_compose_args="$infra_compose_args -f docker-compose.host-access.yml"
        ci_compose_files="$ci_compose_files docker-compose.host-access.yml"
    fi
    if [ -f "docker-compose.ci.yml" ]; then
        infra_compose_args="$infra_compose_args -f docker-compose.ci.yml"
        ci_compose_files="$ci_compose_files docker-compose.ci.yml"
    fi

    if command -v docker >/dev/null 2>&1 && [[ "$ci_db_host" =~ ^(localhost|127\.0\.0\.1|::1)$ ]]; then
        local existing_postgres_container=""
        local existing_redis_container=""
        local detected_project=""
        local detected_postgres_service=""
        local detected_redis_service=""
        local detected_redis_project=""

        existing_postgres_container="$(
            docker ps --filter "publish=${ci_db_port}" --format '{{.ID}}' | head -n 1
        )"
        existing_redis_container="$(
            docker ps --filter "publish=${ci_redis_port}" --format '{{.ID}}' | head -n 1
        )"

        if [ -n "$existing_postgres_container" ]; then
            detected_postgres_service="$(
                docker inspect -f '{{ index .Config.Labels "com.docker.compose.service" }}' "$existing_postgres_container" 2>/dev/null || true
            )"
            detected_project="$(
                docker inspect -f '{{ index .Config.Labels "com.docker.compose.project" }}' "$existing_postgres_container" 2>/dev/null || true
            )"
        fi

        if [ -n "$existing_redis_container" ]; then
            detected_redis_service="$(
                docker inspect -f '{{ index .Config.Labels "com.docker.compose.service" }}' "$existing_redis_container" 2>/dev/null || true
            )"
            detected_redis_project="$(
                docker inspect -f '{{ index .Config.Labels "com.docker.compose.project" }}' "$existing_redis_container" 2>/dev/null || true
            )"
        fi

        if [ "$detected_postgres_service" = "postgres" ] && [ -n "$detected_project" ]; then
            if [ -z "$existing_redis_container" ] || {
                [ "$detected_redis_service" = "redis" ] && [ "$detected_redis_project" = "$detected_project" ];
            }; then
                ci_project_name="$detected_project"
                reuse_existing_ci_infra=true
                infra_compose_args="-p $ci_project_name -f docker-compose.yml"
                if [ -f "docker-compose.host-access.yml" ]; then
                    infra_compose_args="$infra_compose_args -f docker-compose.host-access.yml"
                fi
                if [ -f "docker-compose.ci.yml" ]; then
                    infra_compose_args="$infra_compose_args -f docker-compose.ci.yml"
                fi
                log_info "Reusing existing CI infra project '$ci_project_name' on ports ${ci_db_port}/${ci_redis_port}"
            fi
        fi
    fi

    CI_INFRA_COMPOSE_ARGS="$infra_compose_args"
    local ci_e2e_lock_file="${E2E_CI_LOCK_FILE:-/tmp/nonprofit-manager-e2e-ci.lock}"
    local admin_user_email="${ADMIN_USER_EMAIL:-admin@example.com}"
    local admin_user_password="${ADMIN_USER_PASSWORD:-Admin123!@#}"
    local admin_user_email_escaped
    local admin_user_password_escaped
    printf -v admin_user_email_escaped '%q' "$admin_user_email"
    printf -v admin_user_password_escaped '%q' "$admin_user_password"

    # Bring up infra before tests so backend integration tests do not race DB availability.
    if [ "$RUN_TESTS" = true ] && [ "$SKIP_TESTS" = false ] && { [ "$RUN_BACKEND" = true ] || [ "$RUN_E2E" = true ]; }; then
        if [ "$reuse_existing_ci_infra" != true ]; then
            CI_INFRA_STARTED=true
        fi
        if [ "$CI_KEEP_INFRA" != true ] && [ "$reuse_existing_ci_infra" != true ]; then
            trap cleanup_ci_infra EXIT
        fi
        run_step "Test Infra" "DB_PASSWORD=postgres docker_compose $infra_compose_args up -d postgres redis"
        run_step "DB Migrations" "DB_HOST=$ci_db_host DB_PORT=$ci_db_port DB_NAME=$ci_db_name DB_USER=$ci_db_user DB_PASSWORD=$ci_db_password COMPOSE_MODE=ci COMPOSE_PROJECT_NAME=$ci_project_name COMPOSE_FILES='$ci_compose_files' \"$SCRIPT_DIR/db-migrate.sh\""
        run_step "Test Runner Cleanup" "E2E_LOCK_FILE=$ci_e2e_lock_file \"$SCRIPT_DIR/e2e-lock-cleanup.sh\""
    fi

    # Pin test DB connectivity to CI infra ports to avoid host-specific overrides in backend/.env.test.
    # Backend checks
    if [ "$RUN_BACKEND" = true ]; then
        log_info "Running backend checks..."

        run_step "Backend Lint" "cd backend && npm run lint" "[ \$RUN_LINT = false ]"
        run_step "Rate Limit Key Policy" "node scripts/check-rate-limit-key-policy.ts" "[ \$RUN_LINT = false ]"
        run_step "Success Envelope Policy" "node scripts/check-success-envelope-policy.ts" "[ \$RUN_LINT = false ]"
        run_step "Route Validation Policy" "node scripts/check-route-validation-policy.ts" "[ \$RUN_LINT = false ]"
        run_step "Query Contract Policy" "node scripts/check-query-contract-policy.ts" "[ \$RUN_LINT = false ]"
        run_step "Express Validator Migration Policy" "node scripts/check-express-validator-policy.ts" "[ \$RUN_LINT = false ]"
        run_step "Controller SQL Boundary Policy" "node scripts/check-controller-sql-policy.ts" "[ \$RUN_LINT = false ]"
        run_step "Legacy Auth Guard Policy" "node scripts/check-auth-guard-policy.ts" "[ \$RUN_LINT = false ]"
        run_step "Migration Manifest Policy" "node scripts/check-migration-manifest-policy.ts" "[ \$RUN_LINT = false ]"
        run_step "Duplicate Test Tree Policy" "node scripts/check-duplicate-test-tree.ts" "[ \$RUN_LINT = false ]"
        run_step "Docs API Versioning Policy" "node scripts/check-doc-api-versioning.ts" "[ \$RUN_LINT = false ]"
        run_step "V2 Module Ownership Policy" "node scripts/check-v2-module-ownership-policy.ts" "[ \$RUN_LINT = false ]"
        run_step "Module Boundary Policy" "node scripts/check-module-boundary-policy.ts" "[ \$RUN_LINT = false ]"
        run_step "Module Route Proxy Policy" "node scripts/check-module-route-proxy-policy.ts" "[ \$RUN_LINT = false ]"
        run_step "Frontend Feature Boundary Policy" "node scripts/check-frontend-feature-boundary-policy.ts" "[ \$RUN_LINT = false ]"
        run_step "Frontend Legacy Slice Import Policy" "node scripts/check-frontend-legacy-slice-import-policy.ts" "[ \$RUN_LINT = false ]"
        run_step "Frontend Legacy Page Path Policy" "node scripts/check-frontend-legacy-page-path-policy.ts" "[ \$RUN_LINT = false ]"
        run_step "Route Integrity Policy" "node scripts/check-route-integrity.ts" "[ \$RUN_LINT = false ]"
        run_step "Route Catalog Drift Policy" "node scripts/check-route-catalog-drift.ts" "[ \$RUN_LINT = false ]"
        run_step "Backend Legacy Controller Wrapper Policy" "node scripts/check-backend-legacy-controller-wrapper-policy.ts" "[ \$RUN_LINT = false ]"
        run_step "Backend TypeCheck" "cd backend && npm run type-check" "[ \$RUN_TYPECHECK = false ]"

        if [ "$RUN_TESTS" = true ] && [ "$SKIP_TESTS" = false ]; then
            if [ "$RUN_COVERAGE" = true ]; then
                run_step "Backend Tests (Coverage)" "cd backend && DB_HOST=$ci_db_host DB_PORT=$ci_db_port DB_NAME=$ci_db_name DB_USER=$ci_db_user DB_PASSWORD=$ci_db_password npm test -- --coverage --watchAll=false --runInBand"
            else
                run_step "Backend Tests" "cd backend && DB_HOST=$ci_db_host DB_PORT=$ci_db_port DB_NAME=$ci_db_name DB_USER=$ci_db_user DB_PASSWORD=$ci_db_password npm test -- --watchAll=false --runInBand"
            fi
        else
            [ "$VERBOSE" = true ] && log_info "Backend tests skipped"
        fi

        if [ "$RUN_BUILD" = true ]; then
            run_step "Backend Build" "cd backend && npm run build"
        fi
    fi

    # Frontend checks
    if [ "$RUN_FRONTEND" = true ]; then
        log_info "Running frontend checks..."

        run_step "Frontend Lint" "cd frontend && npm run lint" "[ \$RUN_LINT = false ]"
        run_step "Frontend TypeCheck" "cd frontend && npm run type-check" "[ \$RUN_TYPECHECK = false ]"

        if [ "$RUN_TESTS" = true ] && [ "$SKIP_TESTS" = false ]; then
            if [ "$RUN_COVERAGE" = true ]; then
                run_step "Frontend Tests (Coverage)" "cd frontend && npm test -- --run --coverage"
            else
                run_step "Frontend Tests" "cd frontend && npm test -- --run"
            fi
        else
            [ "$VERBOSE" = true ] && log_info "Frontend tests skipped"
        fi

        if [ "$RUN_BUILD" = true ]; then
            run_step "Frontend Build" "cd frontend && npm run build"
            run_step "Frontend Bundle Budget" "node scripts/check-frontend-bundle-size.js"
        fi
    fi

    # E2E checks
    if [ "$RUN_E2E" = true ] && [ "$RUN_TESTS" = true ] && [ "$SKIP_TESTS" = false ]; then
        log_info "Running Playwright E2E checks..."
        run_step "E2E Port Preflight" "E2E_PORT_ACTION=kill \"$SCRIPT_DIR/e2e-port-preflight.sh\""
        run_step "E2E Auth Cache Cleanup" "rm -rf e2e/.cache"
        run_step "Playwright E2E" "cd e2e && E2E_LOCK_FILE=$ci_e2e_lock_file E2E_RUNNER_ACTION=kill PW_REUSE_EXISTING_SERVER=0 E2E_COMPOSE_MODE=ci E2E_COMPOSE_PROJECT_NAME=$ci_project_name E2E_COMPOSE_FILES='$ci_compose_files' E2E_DB_HOST=$ci_db_host E2E_DB_PORT=$ci_db_port E2E_DB_NAME=$ci_db_name E2E_DB_USER=$ci_db_user E2E_DB_PASSWORD=$ci_db_password ADMIN_USER_EMAIL=$admin_user_email_escaped ADMIN_USER_PASSWORD=$admin_user_password_escaped npm run test:ci"
    else
        [ "$VERBOSE" = true ] && log_info "Playwright tests skipped"
    fi

    # Summary
    local end_time=$(date +%s)
    local total_duration=$((end_time - START_TIME))

    echo ""
    echo "========================================"

    if [ ${#FAILURES[@]} -eq 0 ]; then
        log_success "CI Pipeline Passed! (${STEP_COUNT} steps, ${total_duration}s)"
        echo "========================================"
        return 0
    else
        log_error "CI Pipeline Failed!"
        echo "Failed steps (${#FAILURES[@]}):"
        for failure in "${FAILURES[@]}"; do
            echo "  - $failure"
        done
        echo "Total time: ${total_duration}s"
        echo "========================================"
        return 1
    fi
}

# Run the CI pipeline
run_ci
