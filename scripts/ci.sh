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

    # Backend checks
    if [ "$RUN_BACKEND" = true ]; then
        log_info "Running backend checks..."

        run_step "Backend Lint" "cd backend && npm run lint" "[ \$RUN_LINT = false ]"
        run_step "Backend TypeCheck" "cd backend && npm run type-check" "[ \$RUN_TYPECHECK = false ]"

        if [ "$RUN_TESTS" = true ] && [ "$SKIP_TESTS" = false ]; then
            if [ "$RUN_COVERAGE" = true ]; then
                run_step "Backend Tests (Coverage)" "cd backend && npm test -- --coverage --watchAll=false --runInBand"
            else
                run_step "Backend Tests" "cd backend && npm test -- --watchAll=false --runInBand"
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
            if command_exists "vitest"; then
                if [ "$RUN_COVERAGE" = true ]; then
                    run_step "Frontend Tests (Coverage)" "cd frontend && npm test -- --run --coverage"
                else
                    run_step "Frontend Tests" "cd frontend && npm test -- --run"
                fi
            else
                log_warn "Frontend tests skipped (vitest not available)"
            fi
        else
            [ "$VERBOSE" = true ] && log_info "Frontend tests skipped"
        fi

        if [ "$RUN_BUILD" = true ]; then
            run_step "Frontend Build" "cd frontend && npm run build"
        fi
    fi

    # E2E checks
    if [ "$RUN_E2E" = true ] && [ "$RUN_TESTS" = true ] && [ "$SKIP_TESTS" = false ]; then
        log_info "Running Playwright E2E checks..."
        run_step "E2E Test Infra" "DB_PASSWORD=postgres docker-compose up -d postgres redis"
        run_step "Playwright E2E" "cd e2e && npm run test:ci"
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
