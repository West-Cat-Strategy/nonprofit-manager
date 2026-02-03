#!/bin/bash
# Local CI Pipeline Script
# Runs lint, typecheck, tests, and build

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Track failures
FAILURES=()

run_step() {
    local step_name="$1"
    local command="$2"

    echo ""
    log_info "Running: $step_name"
    echo "----------------------------------------"

    if eval "$command"; then
        log_success "$step_name passed"
        return 0
    else
        log_error "$step_name failed"
        FAILURES+=("$step_name")
        return 1
    fi
}

cd "$PROJECT_ROOT"

echo ""
echo "========================================"
echo "  Local CI Pipeline"
echo "========================================"
echo ""

# Parse arguments
SKIP_TESTS=false
COVERAGE=false
QUICK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests) SKIP_TESTS=true; shift ;;
        --coverage) COVERAGE=true; shift ;;
        --quick) QUICK=true; shift ;;
        *) shift ;;
    esac
done

# Step 1: Lint
run_step "Backend Lint" "cd backend && npm run lint" || true
run_step "Frontend Lint" "cd frontend && npm run lint" || true

# Step 2: Type Check (skip in quick mode)
if [ "$QUICK" = false ]; then
    run_step "Backend TypeCheck" "cd backend && npx tsc --noEmit" || true
    run_step "Frontend TypeCheck" "cd frontend && npx tsc --noEmit" || true
fi

# Step 3: Tests
if [ "$SKIP_TESTS" = false ]; then
    if [ "$COVERAGE" = true ]; then
        run_step "Backend Tests" "cd backend && npm test -- --coverage --watchAll=false" || true
        run_step "Frontend Tests" "cd frontend && npm test -- --coverage --watchAll=false" || true
    else
        run_step "Backend Tests" "cd backend && npm test -- --watchAll=false" || true
        run_step "Frontend Tests" "cd frontend && npm test -- --watchAll=false" || true
    fi
fi

# Step 4: Build
run_step "Backend Build" "cd backend && npm run build" || true
run_step "Frontend Build" "cd frontend && npm run build" || true

# Summary
echo ""
echo "========================================"
if [ ${#FAILURES[@]} -eq 0 ]; then
    log_success "CI Pipeline Passed!"
    echo "========================================"
    exit 0
else
    log_error "CI Pipeline Failed!"
    echo "Failed steps:"
    for failure in "${FAILURES[@]}"; do
        echo "  - $failure"
    done
    echo "========================================"
    exit 1
fi
