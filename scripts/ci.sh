#!/bin/bash
# Unified CI Pipeline Script
# Runs lint, typecheck, tests, and build with consistent interface

set -e

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
    local infra_compose_args="-f docker-compose.yml"
    if [ -f "docker-compose.host-access.yml" ]; then
        infra_compose_args="$infra_compose_args -f docker-compose.host-access.yml"
    fi
    local ci_e2e_lock_file="${E2E_CI_LOCK_FILE:-/tmp/nonprofit-manager-e2e-ci.lock}"

    # Bring up infra before tests so backend integration tests do not race DB availability.
    if [ "$RUN_TESTS" = true ] && [ "$SKIP_TESTS" = false ] && { [ "$RUN_BACKEND" = true ] || [ "$RUN_E2E" = true ]; }; then
        run_step "Test Infra" "DB_PASSWORD=postgres docker_compose $infra_compose_args up -d postgres redis"
        run_step "DB Migrations" "\"$SCRIPT_DIR/db-migrate.sh\""
        run_step "Test Runner Cleanup" "E2E_LOCK_FILE=$ci_e2e_lock_file \"$SCRIPT_DIR/e2e-lock-cleanup.sh\""
    fi

    # Pin test DB connectivity to CI infra ports to avoid host-specific overrides in backend/.env.test.
    local ci_db_host="${DB_HOST:-localhost}"
    local ci_db_port="${DB_PORT:-5432}"
    local ci_db_name="${DB_NAME:-nonprofit_manager}"
    local ci_db_user="${DB_USER:-postgres}"
    local ci_db_password="${DB_PASSWORD:-postgres}"

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
        run_step "Duplicate Test Tree Policy" "node scripts/check-duplicate-test-tree.ts" "[ \$RUN_LINT = false ]"
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
        run_step "Playwright E2E" "cd e2e && E2E_LOCK_FILE=$ci_e2e_lock_file E2E_RUNNER_ACTION=kill E2E_DB_HOST=$ci_db_host E2E_DB_PORT=$ci_db_port E2E_DB_NAME=$ci_db_name E2E_DB_USER=$ci_db_user E2E_DB_PASSWORD=$ci_db_password npm run test:ci"
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
