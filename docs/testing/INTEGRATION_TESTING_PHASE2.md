# Phase 2 Integration Testing Plan

Comprehensive integration testing for all Phase 2 modules to verify cross-module functionality and data consistency.

## Phase 2 Modules Overview

Phase 2 includes the following modules:
1. **Case Management** - Client case tracking and management
2. **Volunteer Assignment** - Volunteer opportunity assignments
3. **Event Scheduling** - Event management with registration
4. **Task Management** - Task assignment and tracking

## Integration Points

### Module Interactions

```
┌─────────────────┐         ┌──────────────────┐
│  Case Mgmt      │────────▶│  Task Mgmt       │
│                 │         │                  │
│  - Cases        │         │  - Case tasks    │
│  - Services     │         │  - Assignments   │
└─────────────────┘         └──────────────────┘
         │                           │
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌──────────────────┐
│  Volunteer      │────────▶│  Event Sched     │
│  Assignment     │         │                  │
│                 │         │  - Events        │
│  - Opportunities│         │  - Registration  │
│  - Assignments  │         │  - Check-in      │
└─────────────────┘         └──────────────────┘
         │                           │
         │                           │
         └───────────┬───────────────┘
                     │
                     ▼
            ┌────────────────┐
            │   Contacts     │
            │                │
            │  - Volunteers  │
            │  - Clients     │
            └────────────────┘
```

### Key Integration Scenarios

1. **Case → Task**: Creating tasks related to specific cases
2. **Case → Contact**: Linking clients to cases
3. **Volunteer → Event**: Volunteers registering for events
4. **Task → User**: Assigning tasks to staff members
5. **Event → Contact**: Attendee registration linking to contacts
6. **Volunteer Assignment → Contact**: Linking volunteers to opportunities

---

## Test Scenarios

### Scenario 1: Complete Case Management Workflow

**Objective**: Test full lifecycle of a client case with tasks

**Steps**:
1. Create a contact (client)
2. Create a case for the contact
3. Create multiple tasks associated with the case
4. Assign tasks to different users
5. Update task statuses
6. Add case notes
7. Update case status
8. Verify all relationships maintained

**Expected Results**:
- Case correctly linked to contact
- Tasks associated with case
- Task assignments persisted
- Status updates reflected correctly
- Data consistency across modules

**Test Script**: `integration-case-workflow.sh`

---

### Scenario 2: Volunteer Event Registration

**Objective**: Test volunteer registration for events

**Steps**:
1. Create volunteer contact
2. Create volunteer record linked to contact
3. Create an event (volunteer opportunity type)
4. Register volunteer for event
5. Check-in volunteer at event
6. Verify volunteer hours logged (if applicable)
7. Check attendance statistics

**Expected Results**:
- Volunteer correctly registered
- Check-in recorded with timestamp
- Attendance statistics accurate
- No duplicate registrations allowed

**Test Script**: `integration-volunteer-event.sh`

---

### Scenario 3: Volunteer Assignment with Tasks

**Objective**: Test volunteer opportunity assignments with task tracking

**Steps**:
1. Create volunteer contact and record
2. Create volunteer assignment
3. Create tasks for the assignment
4. Update task progress
5. Complete assignment
6. Log volunteer hours
7. Verify hour totals

**Expected Results**:
- Assignment linked to volunteer
- Tasks associated with assignment
- Hours correctly calculated
- Status updates cascaded appropriately

**Test Script**: `integration-volunteer-assignment.sh`

---

### Scenario 4: Multi-Module Data Consistency

**Objective**: Verify data consistency when entities are updated

**Steps**:
1. Create contact with email
2. Create volunteer record for contact
3. Create case for contact
4. Register for event
5. Update contact email
6. Verify email updated in:
   - Volunteer record
   - Case client info
   - Event registration

**Expected Results**:
- Contact changes reflected across all modules
- Foreign key relationships maintained
- No orphaned records

**Test Script**: `integration-data-consistency.sh`

---

### Scenario 5: Capacity and Deadline Enforcement

**Objective**: Test business rule enforcement across modules

**Steps**:
1. Create event with capacity of 2
2. Create 2 valid registrations
3. Attempt 3rd registration (should fail)
4. Cancel 1 registration
5. Attempt new registration (should succeed)
6. Create event with past deadline
7. Attempt registration (should fail)

**Expected Results**:
- Capacity limits enforced
- Cancellation frees capacity
- Deadline validation works
- Appropriate error messages returned

**Test Script**: `integration-business-rules.sh`

---

### Scenario 6: Reporting Across Modules

**Objective**: Verify cross-module reporting and statistics

**Steps**:
1. Create diverse test data:
   - 5 cases (various statuses)
   - 10 events (various types)
   - 20 tasks (various assignments)
   - 15 volunteer assignments
2. Query analytics endpoints
3. Verify counts and aggregations
4. Test filtering across modules

**Expected Results**:
- Accurate counts across modules
- Filtering works correctly
- Statistics calculated properly
- No data leakage between organizations (if multi-tenant)

**Test Script**: `integration-reporting.sh`

---

## Test Data Requirements

### Minimum Test Data

For comprehensive integration testing, create:

- **Users**: 3 staff members (different roles)
- **Contacts**: 10 contacts (mix of individuals and organizations)
- **Volunteers**: 5 volunteer records
- **Cases**: 5 cases (various statuses)
- **Events**: 5 events (various types and statuses)
- **Tasks**: 15 tasks (various assignments)
- **Volunteer Assignments**: 5 assignments
- **Event Registrations**: 10 registrations

### Test Data Script

```bash
# Run test data generation script
./backend/tests/integration/generate-test-data.sh
```

This script creates a full set of interconnected test data for integration testing.

---

## Test Execution

### Manual Testing

1. **Setup Environment**:
   ```bash
   # Ensure database is migrated
   cd backend
   npm run migrate

   # Start backend server
   npm run dev
   ```

2. **Get Authentication Token**:
   ```bash
   # Login and save token
   TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"your_password"}' \
     | jq -r '.token')

   export TOKEN
   ```

3. **Run Integration Tests**:
   ```bash
   cd backend/tests/integration

   # Run all integration tests
   ./run-all-integration-tests.sh

   # Or run individual test scenarios
   ./integration-case-workflow.sh
   ./integration-volunteer-event.sh
   ./integration-volunteer-assignment.sh
   ./integration-data-consistency.sh
   ./integration-business-rules.sh
   ./integration-reporting.sh
   ```

### Automated Testing

For automated CI/CD integration:

```bash
# Run full integration test suite
npm run test:integration

# Run with coverage
npm run test:integration:coverage
```

---

## Success Criteria

### Functionality

- ✅ All CRUD operations work across modules
- ✅ Foreign key relationships maintained
- ✅ Cascade deletes work correctly
- ✅ Business rules enforced (capacity, deadlines, etc.)
- ✅ Data consistency maintained during updates
- ✅ No orphaned records after deletions
- ✅ Cross-module queries return accurate results

### Performance

- ✅ Queries complete in < 500ms for normal datasets
- ✅ No N+1 query issues in related data fetching
- ✅ Pagination works correctly
- ✅ Filtering doesn't cause performance degradation

### Data Integrity

- ✅ Unique constraints enforced
- ✅ Required fields validated
- ✅ Date validations work (start before end, etc.)
- ✅ Status transitions follow business rules
- ✅ Concurrent updates handled correctly

---

## Common Issues and Troubleshooting

### Issue: Foreign Key Violations

**Symptom**: Errors when creating related records

**Solution**:
- Verify parent record exists before creating child
- Check UUID formatting
- Ensure proper foreign key column names

### Issue: Orphaned Records

**Symptom**: Child records remain after parent deletion

**Solution**:
- Verify CASCADE delete is configured on foreign keys
- Check migration files for ON DELETE CASCADE
- Re-run migrations if needed

### Issue: Duplicate Registrations

**Symptom**: Same user registered multiple times

**Solution**:
- Check duplicate prevention logic in registration service
- Verify unique constraint on event_id + contact_id
- Review registration status filtering

### Issue: Capacity Not Updating

**Symptom**: Registered count doesn't match actual registrations

**Solution**:
- Check registered_count calculation in query
- Verify FILTER clause excludes cancelled registrations
- Ensure status updates trigger recalculation

---

## Regression Testing

After major changes to any Phase 2 module:

1. **Run Full Integration Suite**:
   ```bash
   ./backend/tests/integration/run-all-integration-tests.sh
   ```

2. **Verify No Breaking Changes**:
   - Check all test scenarios pass
   - Review any new errors or warnings
   - Validate performance hasn't degraded

3. **Update Tests If Needed**:
   - Add new test cases for new features
   - Update expected results for changed behavior
   - Document any intentional breaking changes

---

## Future Enhancements

### Planned Integration Tests

1. **Multi-tenancy Testing**: Verify data isolation between organizations
2. **Permission Testing**: Test role-based access across modules
3. **Bulk Operations**: Test batch imports and updates
4. **Error Recovery**: Test rollback scenarios
5. **Concurrent Users**: Test simultaneous updates to same records

### Automation Improvements

1. Create Jest integration test suite
2. Add database seeding for consistent test data
3. Implement test fixtures and factories
4. Add CI/CD pipeline integration
5. Generate test coverage reports

---

## Testing Checklist

Before marking Phase 2 as complete:

- [ ] All module APIs tested individually
- [ ] Cross-module workflows tested
- [ ] Data consistency verified
- [ ] Business rules enforced
- [ ] Foreign key relationships validated
- [ ] Cascade deletes working
- [ ] Duplicate prevention working
- [ ] Capacity management working
- [ ] Deadline validation working
- [ ] Statistics and reporting accurate
- [ ] Error handling comprehensive
- [ ] Performance acceptable
- [ ] Documentation complete

---

## Test Results Documentation

### Test Run Template

```markdown
## Integration Test Run - [Date]

**Tester**: [Name]
**Environment**: [Development/Staging]
**Database**: [Version]

### Results Summary

- Total Scenarios: 6
- Passed: X
- Failed: Y
- Skipped: Z

### Detailed Results

#### Scenario 1: Case Management Workflow
- Status: ✅ Pass / ❌ Fail
- Duration: Xs
- Notes: [Any observations]

#### Scenario 2: Volunteer Event Registration
- Status: ✅ Pass / ❌ Fail
- Duration: Xs
- Notes: [Any observations]

[... continue for all scenarios]

### Issues Found

1. [Issue description]
   - Module: [Module name]
   - Severity: High/Medium/Low
   - Steps to reproduce: [Steps]
   - Expected: [Expected behavior]
   - Actual: [Actual behavior]

### Recommendations

[Any recommendations for improvements]
```

---

## Conclusion

Integration testing ensures Phase 2 modules work together seamlessly. All tests must pass before considering Phase 2 complete and moving to Phase 3.

**Next Steps**:
1. Run all integration test scripts
2. Document results
3. Fix any issues found
4. Re-test until all scenarios pass
5. Update planning document with completion status
