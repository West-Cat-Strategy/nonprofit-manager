#!/bin/bash

# Integration Test: Business Rules Enforcement
# Tests capacity limits and deadline validation

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

echo "Integration Test: Business Rules Enforcement"
echo ""

# Test 1: Create event with capacity limit
echo "Test 1: Creating event with capacity of 2..."
EVENT_DATA='{
  "name": "Capacity Test Event",
  "event_type": "training",
  "start_date": "2024-09-01T10:00:00Z",
  "end_date": "2024-09-01T12:00:00Z",
  "capacity": 2,
  "registration_required": true,
  "status": "published"
}'

EVENT_RESPONSE=$(api_call POST /events "$EVENT_DATA")
EVENT_ID=$(echo "$EVENT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$EVENT_ID" ]; then
  print_test 0 "Event created with capacity limit"
else
  print_test 1 "Failed to create event"
  exit 1
fi

# Test 2: Create first registration
echo ""
echo "Test 2: Creating first registration..."
REG1_DATA='{
  "attendee_name": "Person One",
  "attendee_email": "person1@example.com"
}'

REG1_RESPONSE=$(api_call POST "/events/$EVENT_ID/register" "$REG1_DATA")
REG1_ID=$(echo "$REG1_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$REG1_ID" ]; then
  print_test 0 "First registration created (1/2)"
else
  print_test 1 "Failed to create first registration"
fi

# Test 3: Create second registration
echo ""
echo "Test 3: Creating second registration..."
REG2_DATA='{
  "attendee_name": "Person Two",
  "attendee_email": "person2@example.com"
}'

REG2_RESPONSE=$(api_call POST "/events/$EVENT_ID/register" "$REG2_DATA")
REG2_ID=$(echo "$REG2_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$REG2_ID" ]; then
  print_test 0 "Second registration created (2/2 - at capacity)"
else
  print_test 1 "Failed to create second registration"
fi

# Test 4: Attempt third registration (should fail)
echo ""
echo "Test 4: Attempting third registration (should be rejected)..."
REG3_DATA='{
  "attendee_name": "Person Three",
  "attendee_email": "person3@example.com"
}'

REG3_RESPONSE=$(api_call POST "/events/$EVENT_ID/register" "$REG3_DATA")

if echo "$REG3_RESPONSE" | grep -q "full capacity\|error"; then
  print_test 0 "Third registration rejected (capacity enforced)"
else
  print_test 1 "Third registration was allowed (should be rejected)"
  echo "Response: $REG3_RESPONSE"
fi

# Test 5: Cancel one registration
echo ""
echo "Test 5: Cancelling first registration..."
CANCEL_DATA='{"status": "cancelled"}'

CANCEL_RESPONSE=$(api_call PUT "/events/$EVENT_ID/registrations/$REG1_ID" "$CANCEL_DATA")
CANCELLED_STATUS=$(echo "$CANCEL_RESPONSE" | grep -o '"status":"cancelled"')

if [ -n "$CANCELLED_STATUS" ]; then
  print_test 0 "Registration cancelled"
else
  print_test 1 "Failed to cancel registration"
fi

# Test 6: Attempt new registration (should succeed now)
echo ""
echo "Test 6: Creating new registration after cancellation..."
REG4_DATA='{
  "attendee_name": "Person Four",
  "attendee_email": "person4@example.com"
}'

REG4_RESPONSE=$(api_call POST "/events/$EVENT_ID/register" "$REG4_DATA")
REG4_ID=$(echo "$REG4_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$REG4_ID" ]; then
  print_test 0 "New registration succeeded (capacity freed by cancellation)"
else
  print_test 1 "Failed to register after cancellation"
  echo "Response: $REG4_RESPONSE"
fi

# Test 7: Create event with past deadline
echo ""
echo "Test 7: Creating event with past registration deadline..."
PAST_EVENT_DATA='{
  "name": "Past Deadline Event",
  "event_type": "meeting",
  "start_date": "2024-09-15T10:00:00Z",
  "registration_deadline": "2023-01-01T00:00:00Z",
  "registration_required": true,
  "status": "published"
}'

PAST_EVENT_RESPONSE=$(api_call POST /events "$PAST_EVENT_DATA")
PAST_EVENT_ID=$(echo "$PAST_EVENT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$PAST_EVENT_ID" ]; then
  print_test 0 "Event with past deadline created"
else
  print_test 1 "Failed to create event with past deadline"
  PAST_EVENT_ID=""
fi

# Test 8: Attempt registration after deadline
if [ -n "$PAST_EVENT_ID" ]; then
  echo ""
  echo "Test 8: Attempting registration after deadline..."
  LATE_REG_DATA='{
    "attendee_name": "Late Person",
    "attendee_email": "late@example.com"
  }'

  LATE_REG_RESPONSE=$(api_call POST "/events/$PAST_EVENT_ID/register" "$LATE_REG_DATA")

  if echo "$LATE_REG_RESPONSE" | grep -q "deadline\|error"; then
    print_test 0 "Registration after deadline rejected"
  else
    print_test 1 "Registration after deadline was allowed"
    echo "Response: $LATE_REG_RESPONSE"
  fi
else
  echo ""
  echo "Test 8: Skipped (no event with past deadline)"
fi

# Cleanup
echo ""
echo "Cleanup: Removing test data..."
[ -n "$EVENT_ID" ] && api_call DELETE "/events/$EVENT_ID" > /dev/null
[ -n "$PAST_EVENT_ID" ] && api_call DELETE "/events/$PAST_EVENT_ID" > /dev/null

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
