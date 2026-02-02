#!/bin/bash

# Phase 2 Integration Test Suite
# Runs all integration tests for Phase 2 modules

# Configuration
BASE_URL="http://localhost:3000/api"
TOKEN=""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TOTAL_SCENARIOS=0
PASSED_SCENARIOS=0
FAILED_SCENARIOS=0

echo "========================================"
echo "Phase 2 Integration Test Suite"
echo "========================================"
echo ""

# Check prerequisites
if [ -z "$TOKEN" ]; then
  echo -e "${YELLOW}WARNING: JWT token not set in this script.${NC}"
  echo "Please login and set TOKEN environment variable:"
  echo ""
  echo "  export TOKEN=\$(curl -s -X POST $BASE_URL/auth/login \\"
  echo "    -H \"Content-Type: application/json\" \\"
  echo "    -d '{\"email\":\"admin@example.com\",\"password\":\"yourpassword\"}' \\"
  echo "    | jq -r '.token')"
  echo ""

  if [ -z "$TOKEN" ]; then
    echo -e "${RED}ERROR: No token available. Please set TOKEN and re-run.${NC}"
    exit 1
  fi
fi

# Check server is running
echo "Checking if server is running..."
SERVER_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" || echo "000")

if [ "$SERVER_CHECK" != "200" ] && [ "$SERVER_CHECK" != "404" ]; then
  echo -e "${RED}ERROR: Server not responding at $BASE_URL${NC}"
  echo "Please start the backend server first:"
  echo "  cd backend && npm run dev"
  exit 1
fi

echo -e "${GREEN}✓${NC} Server is running"
echo ""

# Test scenario runner
run_scenario() {
  local scenario_name=$1
  local script_path=$2

  echo "──────────────────────────────────────"
  echo -e "${BLUE}Running:${NC} $scenario_name"
  echo "──────────────────────────────────────"

  ((TOTAL_SCENARIOS++))

  if [ -f "$script_path" ]; then
    if bash "$script_path"; then
      echo -e "${GREEN}✓ PASSED:${NC} $scenario_name"
      ((PASSED_SCENARIOS++))
    else
      echo -e "${RED}✗ FAILED:${NC} $scenario_name"
      ((FAILED_SCENARIOS++))
    fi
  else
    echo -e "${YELLOW}⊘ SKIPPED:${NC} $scenario_name (script not found)"
    echo "  Expected at: $script_path"
  fi

  echo ""
}

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Run all integration test scenarios
echo "Starting integration tests..."
echo ""

run_scenario "Scenario 1: Complete Case Management Workflow" \
  "$SCRIPT_DIR/integration-case-workflow.sh"

run_scenario "Scenario 2: Volunteer Event Registration" \
  "$SCRIPT_DIR/integration-volunteer-event.sh"

run_scenario "Scenario 3: Volunteer Assignment with Tasks" \
  "$SCRIPT_DIR/integration-volunteer-assignment.sh"

run_scenario "Scenario 4: Multi-Module Data Consistency" \
  "$SCRIPT_DIR/integration-data-consistency.sh"

run_scenario "Scenario 5: Capacity and Deadline Enforcement" \
  "$SCRIPT_DIR/integration-business-rules.sh"

run_scenario "Scenario 6: Reporting Across Modules" \
  "$SCRIPT_DIR/integration-reporting.sh"

# Print summary
echo "========================================"
echo "Integration Test Summary"
echo "========================================"
echo ""
echo "Total Scenarios:  $TOTAL_SCENARIOS"
echo -e "${GREEN}Passed:${NC}           $PASSED_SCENARIOS"
echo -e "${RED}Failed:${NC}           $FAILED_SCENARIOS"
echo ""

# Calculate pass rate
if [ $TOTAL_SCENARIOS -gt 0 ]; then
  PASS_RATE=$((PASSED_SCENARIOS * 100 / TOTAL_SCENARIOS))
  echo "Pass Rate:        $PASS_RATE%"
  echo ""
fi

# Exit code
if [ $FAILED_SCENARIOS -eq 0 ] && [ $PASSED_SCENARIOS -gt 0 ]; then
  echo -e "${GREEN}All integration tests passed!${NC}"
  exit 0
elif [ $PASSED_SCENARIOS -eq 0 ]; then
  echo -e "${YELLOW}No tests were executed. Please create test scripts.${NC}"
  exit 1
else
  echo -e "${RED}Some integration tests failed.${NC}"
  exit 1
fi
