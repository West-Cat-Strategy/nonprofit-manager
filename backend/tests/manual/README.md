# Manual API Testing Scripts

This directory contains bash scripts for manually testing API endpoints.

## Event Management Tests

### Prerequisites

1. **Running server**: Make sure the backend server is running on `http://localhost:3000`
2. **Database**: Ensure the database is set up with the events migration applied
3. **Authentication token**: Get a valid JWT token by logging in

#### Get Authentication Token

```bash
# Login to get JWT token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }'

# Copy the token from the response
```

### Test Scripts

#### 1. Event API Tests (`test-events-api.sh`)

Tests basic event CRUD operations and filtering.

**Setup:**
1. Open the script and set your JWT token:
   ```bash
   TOKEN="your_jwt_token_here"
   ```

2. Make the script executable:
   ```bash
   chmod +x test-events-api.sh
   ```

3. Run the tests:
   ```bash
   ./test-events-api.sh
   ```

**Tests included:**
- Create event
- Get all events
- Get single event by ID
- Update event
- Get event statistics
- Filter events by type
- Filter events by status
- Search events

#### 2. Event Registration Tests (`test-event-registrations.sh`)

Tests the complete registration flow including capacity management and check-ins.

**Setup:**
1. Get a valid contact ID from your database:
   ```bash
   # Query for a contact
   psql -d nonprofit_manager -c "SELECT id FROM contacts LIMIT 1;"
   ```

2. Open the script and set both token and contact ID:
   ```bash
   TOKEN="your_jwt_token_here"
   CONTACT_ID="contact_uuid_here"
   ```

3. Make the script executable:
   ```bash
   chmod +x test-event-registrations.sh
   ```

4. Run the tests:
   ```bash
   ./test-event-registrations.sh
   ```

**Tests included:**
- Create first registration
- Prevent duplicate registration
- Create second registration (within capacity)
- Test capacity limit enforcement
- Get event registrations
- Update registration status
- Check-in attendee
- Event statistics accuracy
- Cancel registration
- Verify capacity freed after cancellation

## Test Output

Both scripts provide colored output:
- 🟢 Green `✓ PASS`: Test passed
- 🔴 Red `✗ FAIL`: Test failed
- 🟡 Yellow: Warnings or informational messages

### Example Output

```
======================================
Event Management API Test Suite
======================================

Test 1: Create a new event
✓ PASS: Create event
  Event ID: 123e4567-e89b-12d3-a456-426614174000

Test 2: Get all events
✓ PASS: Get all events
  Found 5 event(s)

...

======================================
Test Summary
======================================
Passed: 8
Failed: 0

All tests passed!
```

## Manual Testing with curl

You can also test individual endpoints manually:

### Create Event

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Annual Gala",
    "description": "Our annual fundraising gala",
    "event_type": "fundraiser",
    "start_date": "2024-06-15T18:00:00Z",
    "end_date": "2024-06-15T23:00:00Z",
    "location": "Grand Ballroom",
    "capacity": 200,
    "registration_required": true,
    "status": "published"
  }'
```

### Get All Events

```bash
curl http://localhost:3000/api/events \
  -H "Authorization: Bearer $TOKEN"
```

### Register for Event

```bash
curl -X POST http://localhost:3000/api/events/{event_id}/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "contact_uuid",
    "attendee_name": "John Doe",
    "attendee_email": "john@example.com"
  }'
```

### Check-in Attendee

```bash
curl -X POST http://localhost:3000/api/events/{event_id}/registrations/{reg_id}/checkin \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Token expired or invalid
   - Solution: Get a new token by logging in again

2. **404 Not Found**: Invalid event or registration ID
   - Solution: Verify IDs exist in database

3. **400 Bad Request**: Invalid request data
   - Solution: Check request body matches expected format

4. **Capacity errors**: Event at full capacity
   - Solution: This is expected behavior when testing capacity limits

### Debugging

Enable verbose curl output for debugging:

```bash
# Add -v flag to see full request/response
curl -v -X GET http://localhost:3000/api/events \
  -H "Authorization: Bearer $TOKEN"
```

View server logs for detailed error information.

## Next Steps

After running these manual tests:

1. Review test results and fix any failures
2. Test the frontend UI to ensure it works with the API
3. Run integration tests for the complete event module
4. Consider adding automated API tests using Jest or similar frameworks
