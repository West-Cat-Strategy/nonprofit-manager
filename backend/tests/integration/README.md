# Phase 2 Integration Tests

Integration tests for verifying Phase 2 modules work together correctly.

## Overview

These tests verify:
- Cross-module functionality
- Data consistency
- Business rule enforcement
- Foreign key relationships
- Cascade operations

## Prerequisites

1. **Running Backend Server**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Database Migrated**:
   ```bash
   npm run migrate
   ```

3. **Authentication Token**:
   ```bash
   # Login and export token
   export TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"your_password"}' \
     | jq -r '.token')
   ```

## Running Tests

### Run All Integration Tests

```bash
cd backend/tests/integration
./run-all-integration-tests.sh
```

### Run Individual Test Scenarios

```bash
# Volunteer event registration workflow
./integration-volunteer-event.sh

# Business rules enforcement
./integration-business-rules.sh

# Case management workflow (when available)
./integration-case-workflow.sh

# Other scenarios...
```

## Test Scenarios

### Available Tests

1. **integration-volunteer-event.sh**
   - Creates volunteer contact and record
   - Creates volunteer opportunity event
   - Registers volunteer for event
   - Tests check-in functionality
   - Verifies attendance statistics
   - Tests duplicate prevention

2. **integration-business-rules.sh**
   - Tests capacity limit enforcement
   - Verifies deadline validation
   - Tests cancellation freeing capacity
   - Validates over-capacity prevention

### Planned Tests

3. **integration-case-workflow.sh** (To be implemented)
   - Full case management lifecycle
   - Task creation and assignment
   - Status updates and notes

4. **integration-volunteer-assignment.sh** (To be implemented)
   - Volunteer opportunity creation
   - Assignment and hours logging
   - Task tracking

5. **integration-data-consistency.sh** (To be implemented)
   - Contact updates across modules
   - Foreign key integrity
   - Cascade delete verification

6. **integration-reporting.sh** (To be implemented)
   - Cross-module statistics
   - Filtering and aggregation
   - Report accuracy

## Test Output

Tests provide colored output:
- 🟢 Green `✓`: Test passed
- 🔴 Red `✗`: Test failed

### Example Output

```
========================================
Phase 2 Integration Test Suite
========================================

✓ Server is running

Starting integration tests...

──────────────────────────────────────
Running: Scenario 2: Volunteer Event Registration
──────────────────────────────────────

Integration Test: Volunteer Event Registration

Step 1: Creating volunteer contact...
  ✓ Volunteer contact created

Step 2: Creating volunteer record...
  ✓ Volunteer record created

Step 3: Creating volunteer opportunity event...
  ✓ Event created

[... more steps ...]

Passed: 9
Failed: 0

✓ PASSED: Scenario 2: Volunteer Event Registration

========================================
Integration Test Summary
========================================

Total Scenarios:  6
Passed:           4
Failed:           0

Pass Rate:        100%

All integration tests passed!
```

## Troubleshooting

### Server Not Running

```
ERROR: Server not responding at http://localhost:3000/api
```

**Solution**: Start the backend server:
```bash
cd backend
npm run dev
```

### Authentication Failed

```
WARNING: JWT token not set in this script.
```

**Solution**: Get a fresh token:
```bash
export TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"yourpassword"}' \
  | jq -r '.token')
```

### Test Data Cleanup

If tests leave orphaned data:
```bash
# Manually clean up test data
psql -d nonprofit_manager -c "DELETE FROM events WHERE name LIKE '%Test%';"
psql -d nonprofit_manager -c "DELETE FROM contacts WHERE email LIKE '%@example.com';"
```

## Writing New Integration Tests

### Template

```bash
#!/bin/bash

# Integration Test: [Test Name]
# [Description]

BASE_URL="${BASE_URL:-http://localhost:3000/api}"
TOKEN="${TOKEN:-}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

print_test() {
  if [ $1 -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} $2"
    ((TESTS_PASSED++))
  else
    echo -e "  ${RED}✗${NC} $2"
    ((TESTS_FAILED++))
  fi
}

api_call() {
  local method=$1
  local endpoint=$2
  local data=$3

  if [ -n "$data" ]; then
    curl -s -X "$method" "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -s -X "$method" "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN"
  fi
}

echo "Integration Test: [Test Name]"
echo ""

# Test steps here...

# Cleanup
echo ""
echo "Cleanup: Removing test data..."
# Clean up created resources

echo ""
echo "Test Results: Passed: $TESTS_PASSED, Failed: $TESTS_FAILED"

if [ $TESTS_FAILED -eq 0 ]; then
  exit 0
else
  exit 1
fi
```

## CI/CD Integration

For automated testing in CI/CD:

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'

      - name: Install dependencies
        run: cd backend && npm install

      - name: Setup database
        run: |
          # Setup PostgreSQL
          # Run migrations

      - name: Start server
        run: cd backend && npm run dev &

      - name: Wait for server
        run: sleep 10

      - name: Run integration tests
        run: |
          export TOKEN=$(curl -s ... | jq -r '.token')
          cd backend/tests/integration
          ./run-all-integration-tests.sh
```

## Next Steps

1. Implement remaining test scenarios
2. Add automated test data generation
3. Create Jest-based integration tests
4. Add performance benchmarks
5. Generate coverage reports

## Documentation

For detailed information about integration testing strategy, see:
- [INTEGRATION_TESTING_PHASE2.md](../../docs/INTEGRATION_TESTING_PHASE2.md)
