#!/bin/bash

# Event Registration API Test Script
# Tests registration, check-in, and capacity management

# Configuration
BASE_URL="HTTP://localhost:3000/api"
TOKEN=""  # Set your JWT token here
CONTACT_ID=""  # Set a valid contact ID from your database

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
print_test() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $2"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}: $2"
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

echo "======================================"
echo "Event Registration API Test Suite"
echo "======================================"
echo ""

# Check prerequisites
if [ -z "$TOKEN" ]; then
  echo -e "${YELLOW}ERROR: JWT token not set.${NC}"
  exit 1
fi

if [ -z "$CONTACT_ID" ]; then
  echo -e "${YELLOW}WARNING: CONTACT_ID not set. Some tests will be skipped.${NC}"
  echo "To run all tests, set CONTACT_ID to a valid contact UUID from your database."
  echo ""
fi

# Setup: Create a test event with capacity
echo "Setup: Creating test event with capacity of 2"
EVENT_DATA='{
  "name": "Registration Test Event",
  "description": "Test event for registration flow",
  "event_type": "training",
  "start_date": "2024-07-01T10:00:00Z",
  "end_date": "2024-07-01T12:00:00Z",
  "location": "Training Room",
  "capacity": 2,
  "registration_required": true,
  "registration_deadline": "2024-06-30T23:59:59Z",
  "status": "published"
}'

CREATE_RESPONSE=$(api_call POST /events "$EVENT_DATA")
EVENT_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$EVENT_ID" ]; then
  echo -e "${GREEN}✓${NC} Test event created with ID: $EVENT_ID"
else
  echo -e "${RED}✗${NC} Failed to create test event"
  echo "Response: $CREATE_RESPONSE"
  exit 1
fi
echo ""

if [ -z "$CONTACT_ID" ]; then
  echo "Skipping registration tests - CONTACT_ID not set"
  echo ""
  echo "======================================"
  echo "Test Summary"
  echo "======================================"
  echo "Setup completed successfully"
  echo "To run registration tests, set CONTACT_ID and re-run"
  exit 0
fi

# Test 1: Create first registration
echo "Test 1: Create first registration"
REG_DATA='{
  "contact_id": "'"$CONTACT_ID"'",
  "attendee_name": "John Doe",
  "attendee_email": "john@example.com",
  "attendee_phone": "555-0100"
}'

REG_RESPONSE=$(api_call POST "/events/$EVENT_ID/register" "$REG_DATA")
REG_ID=$(echo "$REG_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$REG_ID" ]; then
  print_test 0 "Create first registration"
  echo "  Registration ID: $REG_ID"
else
  print_test 1 "Create first registration"
  echo "  Response: $REG_RESPONSE"
fi
echo ""

# Test 2: Prevent duplicate registration
echo "Test 2: Prevent duplicate registration"
DUPLICATE_RESPONSE=$(api_call POST "/events/$EVENT_ID/register" "$REG_DATA")

if [[ "$DUPLICATE_RESPONSE" == *"already registered"* ]] || [[ "$DUPLICATE_RESPONSE" == *"error"* ]]; then
  print_test 0 "Prevent duplicate registration"
  echo "  Correctly prevented duplicate"
else
  print_test 1 "Prevent duplicate registration"
  echo "  Response: $DUPLICATE_RESPONSE"
fi
echo ""

# Test 3: Create second registration (should succeed - capacity is 2)
echo "Test 3: Create second registration (within capacity)"
REG2_DATA='{
  "contact_id": "'"$CONTACT_ID"'",
  "attendee_name": "Jane Smith",
  "attendee_email": "jane@example.com",
  "attendee_phone": "555-0101"
}'

REG2_RESPONSE=$(api_call POST "/events/$EVENT_ID/register" "$REG2_DATA")
REG2_ID=$(echo "$REG2_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$REG2_ID" ]; then
  print_test 0 "Create second registration"
  echo "  Registration ID: $REG2_ID"
else
  print_test 1 "Create second registration"
  echo "  Response: $REG2_RESPONSE"
fi
echo ""

# Test 4: Test capacity limit (should fail - at capacity)
echo "Test 4: Test capacity limit enforcement"
REG3_DATA='{
  "contact_id": "'"$CONTACT_ID"'",
  "attendee_name": "Bob Johnson",
  "attendee_email": "bob@example.com",
  "attendee_phone": "555-0102"
}'

REG3_RESPONSE=$(api_call POST "/events/$EVENT_ID/register" "$REG3_DATA")

if [[ "$REG3_RESPONSE" == *"full capacity"* ]] || [[ "$REG3_RESPONSE" == *"error"* ]]; then
  print_test 0 "Capacity limit enforcement"
  echo "  Correctly prevented over-capacity registration"
else
  print_test 1 "Capacity limit enforcement"
  echo "  Response: $REG3_RESPONSE"
fi
echo ""

# Test 5: Get event registrations
echo "Test 5: Get event registrations"
REGS_RESPONSE=$(api_call GET "/events/$EVENT_ID/registrations")
REG_COUNT=$(echo "$REGS_RESPONSE" | grep -o '"id"' | wc -l)

if [ "$REG_COUNT" -eq 2 ]; then
  print_test 0 "Get event registrations"
  echo "  Found $REG_COUNT registrations"
else
  print_test 1 "Get event registrations"
  echo "  Expected 2, found $REG_COUNT"
fi
echo ""

# Test 6: Update registration status
echo "Test 6: Update registration status"
if [ -n "$REG_ID" ]; then
  UPDATE_DATA='{"status": "confirmed"}'
  UPDATE_RESPONSE=$(api_call PUT "/events/$EVENT_ID/registrations/$REG_ID" "$UPDATE_DATA")
  UPDATED_STATUS=$(echo "$UPDATE_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

  if [ "$UPDATED_STATUS" = "confirmed" ]; then
    print_test 0 "Update registration status"
    echo "  Status updated to: $UPDATED_STATUS"
  else
    print_test 1 "Update registration status"
  fi
else
  print_test 1 "Update registration status (no registration ID)"
fi
echo ""

# Test 7: Check-in attendee
echo "Test 7: Check-in attendee"
if [ -n "$REG_ID" ]; then
  CHECKIN_RESPONSE=$(api_call POST "/events/$EVENT_ID/registrations/$REG_ID/checkin" "{}")
  CHECKIN_TIME=$(echo "$CHECKIN_RESPONSE" | grep -o '"check_in_time"')

  if [ -n "$CHECKIN_TIME" ]; then
    print_test 0 "Check-in attendee"
    echo "  Successfully checked in"
  else
    print_test 1 "Check-in attendee"
    echo "  Response: $CHECKIN_RESPONSE"
  fi
else
  print_test 1 "Check-in attendee (no registration ID)"
fi
echo ""

# Test 8: Get updated event statistics
echo "Test 8: Get updated event statistics"
STATS_RESPONSE=$(api_call GET "/events/$EVENT_ID/stats")
REGISTERED=$(echo "$STATS_RESPONSE" | grep -o '"registered_count":[0-9]*' | grep -o '[0-9]*')
ATTENDED=$(echo "$STATS_RESPONSE" | grep -o '"attended_count":[0-9]*' | grep -o '[0-9]*')

if [ "$REGISTERED" = "2" ] && [ "$ATTENDED" = "1" ]; then
  print_test 0 "Event statistics accuracy"
  echo "  Registered: $REGISTERED, Attended: $ATTENDED"
else
  print_test 1 "Event statistics accuracy"
  echo "  Expected Registered: 2, Attended: 1"
  echo "  Got Registered: $REGISTERED, Attended: $ATTENDED"
fi
echo ""

# Test 9: Cancel registration
echo "Test 9: Cancel registration"
if [ -n "$REG2_ID" ]; then
  CANCEL_DATA='{"status": "cancelled"}'
  CANCEL_RESPONSE=$(api_call PUT "/events/$EVENT_ID/registrations/$REG2_ID" "$CANCEL_DATA")
  CANCELLED_STATUS=$(echo "$CANCEL_RESPONSE" | grep -o '"status":"cancelled"')

  if [ -n "$CANCELLED_STATUS" ]; then
    print_test 0 "Cancel registration"
    echo "  Registration cancelled"
  else
    print_test 1 "Cancel registration"
  fi
else
  print_test 1 "Cancel registration (no registration ID)"
fi
echo ""

# Test 10: Verify capacity freed up after cancellation
echo "Test 10: Verify capacity freed after cancellation"
REG4_DATA='{
  "contact_id": "'"$CONTACT_ID"'",
  "attendee_name": "Alice Wilson",
  "attendee_email": "alice@example.com"
}'

REG4_RESPONSE=$(api_call POST "/events/$EVENT_ID/register" "$REG4_DATA")
REG4_ID=$(echo "$REG4_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$REG4_ID" ]; then
  print_test 0 "Capacity freed after cancellation"
  echo "  New registration successful after cancellation"
else
  print_test 1 "Capacity freed after cancellation"
  echo "  Response: $REG4_RESPONSE"
fi
echo ""

# Cleanup
echo "Cleanup: Deleting test event"
api_call DELETE "/events/$EVENT_ID" > /dev/null
echo -e "${GREEN}✓${NC} Test event deleted"
echo ""

echo "======================================"
echo "Test Summary"
echo "======================================"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed.${NC}"
  exit 1
fi
