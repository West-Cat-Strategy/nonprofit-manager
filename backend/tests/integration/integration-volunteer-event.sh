#!/bin/bash

# Integration Test: Volunteer Event Registration
# Tests the complete workflow of volunteer registration for events

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
    return 1
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

echo "Integration Test: Volunteer Event Registration"
echo ""

# Step 1: Create volunteer contact
echo "Step 1: Creating volunteer contact..."
CONTACT_DATA='{
  "first_name": "Alice",
  "last_name": "Volunteer",
  "email": "alice.volunteer@example.com",
  "phone": "555-0200",
  "contact_type": "individual"
}'

CONTACT_RESPONSE=$(api_call POST /contacts "$CONTACT_DATA")
CONTACT_ID=$(echo "$CONTACT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$CONTACT_ID" ]; then
  print_test 0 "Volunteer contact created"
else
  print_test 1 "Failed to create volunteer contact"
  echo "Response: $CONTACT_RESPONSE"
  exit 1
fi

# Step 2: Create volunteer record
echo ""
echo "Step 2: Creating volunteer record..."
VOLUNTEER_DATA='{
  "contact_id": "'"$CONTACT_ID"'",
  "skills": ["event planning", "community outreach"],
  "availability": "weekends",
  "status": "active"
}'

VOLUNTEER_RESPONSE=$(api_call POST /volunteers "$VOLUNTEER_DATA")
VOLUNTEER_ID=$(echo "$VOLUNTEER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$VOLUNTEER_ID" ]; then
  print_test 0 "Volunteer record created"
else
  print_test 1 "Failed to create volunteer record"
  exit 1
fi

# Step 3: Create volunteer opportunity event
echo ""
echo "Step 3: Creating volunteer opportunity event..."
EVENT_DATA='{
  "name": "Community Cleanup Day",
  "description": "Help clean up the local park",
  "event_type": "volunteer_opportunity",
  "start_date": "2024-08-15T09:00:00Z",
  "end_date": "2024-08-15T15:00:00Z",
  "location": "Central Park",
  "capacity": 20,
  "registration_required": true,
  "registration_deadline": "2024-08-14T23:59:59Z",
  "status": "published"
}'

EVENT_RESPONSE=$(api_call POST /events "$EVENT_DATA")
EVENT_ID=$(echo "$EVENT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$EVENT_ID" ]; then
  print_test 0 "Event created"
else
  print_test 1 "Failed to create event"
  exit 1
fi

# Step 4: Register volunteer for event
echo ""
echo "Step 4: Registering volunteer for event..."
REGISTRATION_DATA='{
  "contact_id": "'"$CONTACT_ID"'",
  "attendee_name": "Alice Volunteer",
  "attendee_email": "alice.volunteer@example.com"
}'

REG_RESPONSE=$(api_call POST "/events/$EVENT_ID/register" "$REGISTRATION_DATA")
REG_ID=$(echo "$REG_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$REG_ID" ]; then
  print_test 0 "Volunteer registered for event"
else
  print_test 1 "Failed to register volunteer"
  echo "Response: $REG_RESPONSE"
fi

# Step 5: Verify registration appears in event list
echo ""
echo "Step 5: Verifying registration in event registrations..."
REGS_LIST=$(api_call GET "/events/$EVENT_ID/registrations")
REG_COUNT=$(echo "$REGS_LIST" | grep -c "$CONTACT_ID" || echo "0")

if [ "$REG_COUNT" -gt 0 ]; then
  print_test 0 "Registration appears in event registrations list"
else
  print_test 1 "Registration not found in list"
fi

# Step 6: Test duplicate registration prevention
echo ""
echo "Step 6: Testing duplicate registration prevention..."
DUPLICATE_RESPONSE=$(api_call POST "/events/$EVENT_ID/register" "$REGISTRATION_DATA")

if echo "$DUPLICATE_RESPONSE" | grep -q "already registered\|error"; then
  print_test 0 "Duplicate registration prevented"
else
  print_test 1 "Duplicate registration was allowed (should be prevented)"
fi

# Step 7: Update registration status to confirmed
echo ""
echo "Step 7: Updating registration status..."
UPDATE_DATA='{"status": "confirmed"}'

UPDATE_RESPONSE=$(api_call PUT "/events/$EVENT_ID/registrations/$REG_ID" "$UPDATE_DATA")
UPDATED_STATUS=$(echo "$UPDATE_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$UPDATED_STATUS" = "confirmed" ]; then
  print_test 0 "Registration status updated to confirmed"
else
  print_test 1 "Failed to update registration status"
fi

# Step 8: Check-in volunteer at event
echo ""
echo "Step 8: Checking in volunteer..."
CHECKIN_RESPONSE=$(api_call POST "/events/$EVENT_ID/registrations/$REG_ID/checkin" "{}")
CHECKIN_TIME=$(echo "$CHECKIN_RESPONSE" | grep -o '"check_in_time"')

if [ -n "$CHECKIN_TIME" ]; then
  print_test 0 "Volunteer checked in successfully"
else
  print_test 1 "Failed to check in volunteer"
  echo "Response: $CHECKIN_RESPONSE"
fi

# Step 9: Verify attendance statistics
echo ""
echo "Step 9: Verifying event statistics..."
STATS_RESPONSE=$(api_call GET "/events/$EVENT_ID/stats")
ATTENDED_COUNT=$(echo "$STATS_RESPONSE" | grep -o '"attended_count":[0-9]*' | grep -o '[0-9]*')

if [ "$ATTENDED_COUNT" = "1" ]; then
  print_test 0 "Attendance statistics accurate (1 attendee)"
else
  print_test 1 "Attendance statistics incorrect (expected 1, got $ATTENDED_COUNT)"
fi

# Cleanup
echo ""
echo "Cleanup: Removing test data..."
api_call DELETE "/events/$EVENT_ID" > /dev/null
api_call DELETE "/volunteers/$VOLUNTEER_ID" > /dev/null
api_call DELETE "/contacts/$CONTACT_ID" > /dev/null

echo ""
echo "──────────────────────────────────────"
echo "Test Results"
echo "──────────────────────────────────────"
echo "Passed: $TESTS_PASSED"
echo "Failed: $TESTS_FAILED"

if [ $TESTS_FAILED -eq 0 ]; then
  exit 0
else
  exit 1
fi
