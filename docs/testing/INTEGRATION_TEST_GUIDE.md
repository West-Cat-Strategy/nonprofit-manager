# Integration Test Execution Guide

**Status**: Integration test suite created and ready to run
**Date**: 2026-02-02
**Purpose**: Validate all Phase 2 modules work together correctly

---

## What We Built

### Comprehensive Test Suite

1. **Full System Integration Test** (`integration-full-system.sh`)
   - Tests all 6 Phase 2 modules in a single comprehensive workflow
   - Creates realistic interconnected test data
   - Validates ~30 different integration points
   - Automatically cleans up test data

2. **Automated Setup** (`setup-test-environment.sh`)
   - Checks server availability
   - Obtains authentication token automatically
   - Configures environment for testing
   - Creates reusable configuration

3. **Test Master Runner** (`run-all-integration-tests.sh`)
   - Runs all test scenarios in sequence
   - Provides comprehensive summary
   - Tracks pass/fail rates

4. **Documentation**
   - Test results template for tracking
   - Comprehensive README with instructions
   - Quick start guides

---

## How to Run Integration Tests

### Prerequisites

Before running tests, ensure:

1. **Database is migrated**
   ```bash
   cd backend
   npm run migrate
   ```

2. **You have admin credentials**
   - Email: `admin@example.com`
   - Password: Your admin password

### Option 1: Quick Start (Recommended)

The fastest way to run all tests:

```bash
# 1. Start the backend server (in terminal 1)
cd backend
npm run dev

# 2. Run tests (in terminal 2)
cd backend/tests/integration
./setup-test-environment.sh
# Enter admin password when prompted

# 3. Run comprehensive test
./integration-full-system.sh
```

### Option 2: Run All Test Scenarios

To run the complete test suite:

```bash
# After setup-test-environment.sh
./run-all-integration-tests.sh
```

This runs:
- Full system integration test
- Volunteer event registration test
- Business rules enforcement test
- (Future) Case workflow test
- (Future) Data consistency test
- (Future) Reporting test

### Option 3: Run Individual Tests

For targeted testing:

```bash
# Full system (recommended)
./integration-full-system.sh

# Specific scenarios
./integration-volunteer-event.sh
./integration-business-rules.sh
```

---

## What the Tests Validate

### Module Coverage

#### ✅ Foundation Modules
- Account creation and management
- Contact creation and management
- Account-contact linking
- Multiple contact relationships

#### ✅ Donations Module
- Donation creation
- Donor linking
- Donation history tracking
- Amount and payment tracking

#### ✅ Volunteers Module
- Volunteer record creation
- Contact linking
- Skills and availability tracking
- Hours logging

#### ✅ Events Module
- Event creation with all types
- Registration management
- Capacity enforcement
- Duplicate prevention
- Check-in tracking
- Attendance statistics

#### ✅ Tasks Module
- Task creation
- Status management
- Assignment tracking
- Due date handling

#### ✅ Cases Module
- Case creation
- Client linking
- Notes management
- Status workflow

### Cross-Module Integration

- ✅ **Contact has multiple roles**: Same contact can be donor, volunteer, and client
- ✅ **Account-Contact hierarchy**: Contacts properly linked to accounts
- ✅ **Event-Volunteer relationship**: Volunteers can register for events
- ✅ **Donor-Event relationship**: Donors can attend events
- ✅ **Statistics accuracy**: Counts and aggregations are correct

### Data Integrity

- ✅ **Foreign keys**: All relationships enforced
- ✅ **Cascade deletes**: Child records cleaned up properly
- ✅ **Duplicate prevention**: Same contact can't register twice
- ✅ **Required fields**: Validation working correctly
- ✅ **Constraints**: Business rules enforced (capacity, deadlines)

---

## Expected Results

### Successful Test Run

When all tests pass, you should see:

```
══════════════════════════════════════════════════════════
Integration Test Results
══════════════════════════════════════════════════════════

Total Tests:      30
Passed:           30
Failed:           0
Pass Rate:        100%

✓ ALL INTEGRATION TESTS PASSED!

The system is functioning correctly across all modules.
All cross-module relationships are working as expected.
```

### If Tests Fail

If tests fail, you'll see output like:

```
SECTION 3: Volunteers Module
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Creating volunteer record...
  ✗ Failed to create volunteer record

Total Tests:      15
Passed:           10
Failed:           5
Pass Rate:        67%

✗ SOME INTEGRATION TESTS FAILED
```

---

## Troubleshooting

### Issue: Authentication Failed

**Symptom:**
```
✗ Authentication failed
```

**Solution:**
- Verify admin user exists in database
- Check email is correct: `admin@example.com`
- Verify password is correct
- Ensure database migrations have run

### Issue: Server Not Running

**Symptom:**
```
✗ Server is not running at http://localhost:3000/api
```

**Solution:**
```bash
cd backend
npm run dev
```

Wait for server to fully start before running tests.

### Issue: Database Connection Error

**Symptom:**
Tests fail with database errors

**Solution:**
1. Check PostgreSQL is running
2. Verify database credentials in `.env`
3. Run migrations: `npm run migrate`
4. Check database exists

### Issue: Module Not Found Errors

**Symptom:**
Tests fail because endpoints return 404

**Solution:**
- Verify all backend modules are implemented
- Check routes are properly registered in `server.ts`
- Ensure migrations have created necessary tables

### Issue: Permission Errors

**Symptom:**
Tests fail with 403 Forbidden

**Solution:**
- Ensure user has admin role
- Check authentication middleware
- Verify token is valid (not expired)

---

## Interpreting Results

### Green Tests ✅
Indicates feature is working correctly:
- Module functionality is correct
- Data relationships are maintained
- Business rules are enforced

### Red Tests ❌
Indicates issues that need fixing:
- **Critical**: Blocks core functionality
- **High**: Significantly impacts features
- **Medium**: Has workarounds
- **Low**: Minor issues

### Test Output Details

Each test provides:
- **Test name**: What is being tested
- **Pass/Fail status**: Whether it succeeded
- **Response data**: For debugging failures
- **Cleanup status**: Whether test data was removed

---

## Next Steps After Running Tests

### If All Tests Pass (100%)

Excellent! Your system is working correctly. Next:

1. **Document Results**
   ```bash
   cd backend/tests/integration
   cp TEST_RESULTS_TEMPLATE.md test-results-$(date +%Y%m%d).md
   # Fill in the results
   ```

2. **Update Roadmap**
   - Mark Week 1 integration testing as complete
   - Move to Week 1 remaining tasks or Week 2

3. **Move to Next Phase**
   - Build volunteer components (AvailabilityCalendar, TimeTracker)
   - Write component tests
   - Manual QA testing

### If Some Tests Fail (< 100%)

1. **Document Failures**
   - Copy error messages
   - Note which modules failed
   - Identify patterns (all in one module?)

2. **Prioritize Fixes**
   - **Critical failures** (core CRUD broken): Fix immediately
   - **High priority** (features broken): Fix before proceeding
   - **Medium/Low priority**: Can be addressed later

3. **Fix and Re-test**
   - Fix identified issues
   - Re-run specific test: `./integration-full-system.sh`
   - Verify fix didn't break other tests

4. **Iterate Until Green**
   - Keep fixing and testing
   - Goal is 100% pass rate before proceeding

---

## Test Data

### What Data Is Created

Each test run creates:
- 1 organization account
- 3-4 contacts (donor, volunteer, client)
- 1 volunteer record
- 1 donation
- 1-2 events
- 2-3 event registrations
- 1 task
- 1 case with notes
- 1 volunteer hours log

### Data Cleanup

Tests automatically clean up ALL test data:
- Runs DELETE commands for all created records
- Uses proper cascade deletes
- Leaves database in clean state

You can verify cleanup:
```sql
SELECT * FROM contacts WHERE email LIKE '%@example.com';
SELECT * FROM events WHERE name LIKE '%Test%';
```

Should return 0 results after test completion.

---

## Continuous Integration

### Adding to CI/CD Pipeline

To run tests in GitHub Actions:

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: nonprofit_manager_test
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: cd backend && npm install

      - name: Run migrations
        run: cd backend && npm run migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/nonprofit_manager_test

      - name: Start server
        run: cd backend && npm run dev &
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/nonprofit_manager_test

      - name: Wait for server
        run: sleep 10

      - name: Run integration tests
        run: |
          cd backend/tests/integration
          export ADMIN_PASSWORD=${{ secrets.ADMIN_PASSWORD }}
          ./setup-test-environment.sh
          ./integration-full-system.sh
```

---

## Performance Benchmarks

Track test execution time to identify performance issues:

| Test | Expected Duration | Threshold |
|------|------------------|-----------|
| Full system test | 10-15 seconds | < 30s |
| Setup environment | 2-3 seconds | < 10s |
| Individual tests | 1-2 seconds each | < 5s |

If tests take longer, investigate:
- Database query performance
- API endpoint optimization
- Network latency issues

---

## Best Practices

### Running Tests

1. **Always run on clean database** (or test database)
2. **Run tests before committing** major changes
3. **Document failures** in detail
4. **Re-run after fixes** to verify
5. **Keep test data realistic** but minimal

### Maintaining Tests

1. **Update tests** when adding features
2. **Add new scenarios** for complex workflows
3. **Keep tests independent** (don't rely on order)
4. **Clean up test data** (always)
5. **Review test results** regularly

### Test-Driven Development

For new features:
1. Write integration test first
2. Run test (should fail)
3. Implement feature
4. Run test (should pass)
5. Refactor if needed
6. Commit both code and test

---

## Success Criteria

Integration testing is considered **complete** when:

- ✅ All test scripts execute without errors
- ✅ 100% pass rate achieved
- ✅ All modules tested (6/6 modules)
- ✅ Cross-module relationships validated
- ✅ Data integrity confirmed
- ✅ Business rules enforced
- ✅ Results documented
- ✅ Any issues found are tracked

---

## Additional Resources

- **Test Scripts**: `backend/tests/integration/`
- **Test Documentation**: `backend/tests/integration/README.md`
- **Results Template**: `backend/tests/integration/TEST_RESULTS_TEMPLATE.md`
- **Phase 2 Overview**: `docs/INTEGRATION_TESTING_PHASE2.md`
- **API Documentation**: `docs/API_REFERENCE_*.md`

---

## Quick Reference Commands

```bash
# Start server
cd backend && npm run dev

# Setup and run all tests
cd backend/tests/integration
./setup-test-environment.sh
./run-all-integration-tests.sh

# Run specific test
./integration-full-system.sh

# Check server status
curl http://localhost:3000/api/health

# Clean test data (if needed)
psql -d nonprofit_manager -c "DELETE FROM contacts WHERE email LIKE '%@example.com';"
```

---

## Conclusion

The integration test suite is **ready to run** and will validate that all Phase 2 modules work together correctly. Running these tests is the next critical step in ensuring system quality before proceeding to additional features.

**Action Required**: Run the tests and document results!

```bash
cd backend/tests/integration
./setup-test-environment.sh
./integration-full-system.sh
```
