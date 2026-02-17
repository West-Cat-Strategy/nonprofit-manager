#!/bin/bash

# Event API Test Script
# Tests all event management endpoints

# Configuration
BASE_URL="http://localhost:3000/api"
TOKEN=""  # Set your JWT token here

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to print test results
print_test() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $2"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}: $2"
    ((TESTS_FAILED++))
  fi
}

# Helper function to make API calls
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
echo "Event Management API Test Suite"
echo "======================================"
echo ""

# Check if token is set
if [ -z "$TOKEN" ]; then
  echo -e "${YELLOW}WARNING: JWT token not set. Please set TOKEN variable in this script.${NC}"
  echo "You can get a token by logging in:"
  echo "  curl -X POST $BASE_URL/auth/login -H \"Content-Type: application/json\" -d '{\"email\":\"admin@example.com\",\"password\":\"yourpassword\"}'"
  echo ""
  exit 1
fi

# Test 1: Create a new event
echo "Test 1: Create a new event"
EVENT_DATA='{
  "name": "Community Fundraiser",
  "description": "Annual community fundraising event",
  "event_type": "fundraiser",
  "start_date": "2024-06-15T18:00:00Z",
  "end_date": "2024-06-15T22:00:00Z",
  "location": "Community Center",
  "capacity": 100,
  "registration_required": true,
  "registration_deadline": "2024-06-14T23:59:59Z",
  "status": "published"
}'

CREATE_RESPONSE=$(api_call POST /events "$EVENT_DATA")
EVENT_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$EVENT_ID" ]; then
  print_test 0 "Create event"
  echo "  Event ID: $EVENT_ID"
else
  print_test 1 "Create event"
  echo "  Response: $CREATE_RESPONSE"
fi
echo ""

# Test 2: Get all events
echo "Test 2: Get all events"
EVENTS_RESPONSE=$(api_call GET /events)
EVENT_COUNT=$(echo "$EVENTS_RESPONSE" | grep -o '"id"' | wc -l)

if [ "$EVENT_COUNT" -gt 0 ]; then
  print_test 0 "Get all events"
  echo "  Found $EVENT_COUNT event(s)"
else
  print_test 1 "Get all events"
fi
echo ""

# Test 3: Get single event by ID
echo "Test 3: Get event by ID"
if [ -n "$EVENT_ID" ]; then
  SINGLE_EVENT=$(api_call GET "/events/$EVENT_ID")
  EVENT_NAME=$(echo "$SINGLE_EVENT" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)

  if [ "$EVENT_NAME" = "Community Fundraiser" ]; then
    print_test 0 "Get event by ID"
    echo "  Event name: $EVENT_NAME"
  else
    print_test 1 "Get event by ID"
  fi
else
  print_test 1 "Get event by ID (no event ID from creation)"
fi
echo ""

# Test 4: Update event
echo "Test 4: Update event"
if [ -n "$EVENT_ID" ]; then
  UPDATE_DATA='{
    "name": "Community Fundraiser - Updated",
    "capacity": 150
  }'

  UPDATE_RESPONSE=$(api_call PUT "/events/$EVENT_ID" "$UPDATE_DATA")
  UPDATED_NAME=$(echo "$UPDATE_RESPONSE" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)

  if [[ "$UPDATED_NAME" == *"Updated"* ]]; then
    print_test 0 "Update event"
    echo "  New name: $UPDATED_NAME"
  else
    print_test 1 "Update event"
  fi
else
  print_test 1 "Update event (no event ID)"
fi
echo ""

# Test 5: Get event statistics
echo "Test 5: Get event statistics"
if [ -n "$EVENT_ID" ]; then
  STATS_RESPONSE=$(api_call GET "/events/$EVENT_ID/stats")
  HAS_STATS=$(echo "$STATS_RESPONSE" | grep -o '"registered_count"')

  if [ -n "$HAS_STATS" ]; then
    print_test 0 "Get event statistics"
    echo "  Response: $STATS_RESPONSE"
  else
    print_test 1 "Get event statistics"
  fi
else
  print_test 1 "Get event statistics (no event ID)"
fi
echo ""

# Test 6: Create event registration (requires contact_id)
echo "Test 6: Create event registration"
echo "  Note: This requires a valid contact_id from your database"
echo "  Skipping registration tests - requires manual contact_id setup"
echo ""

# Test 7: Filter events by type
echo "Test 7: Filter events by type"
FILTERED_EVENTS=$(api_call GET "/events?event_type=fundraiser")
FILTERED_COUNT=$(echo "$FILTERED_EVENTS" | grep -o '"event_type":"fundraiser"' | wc -l)

if [ "$FILTERED_COUNT" -gt 0 ]; then
  print_test 0 "Filter events by type"
  echo "  Found $FILTERED_COUNT fundraiser event(s)"
else
  print_test 1 "Filter events by type"
fi
echo ""

# Test 8: Filter events by status
echo "Test 8: Filter events by status"
STATUS_FILTERED=$(api_call GET "/events?status=published")
STATUS_COUNT=$(echo "$STATUS_FILTERED" | grep -o '"status":"published"' | wc -l)

if [ "$STATUS_COUNT" -gt 0 ]; then
  print_test 0 "Filter events by status"
  echo "  Found $STATUS_COUNT published event(s)"
else
  print_test 1 "Filter events by status"
fi
echo ""

# Test 9: Search events
echo "Test 9: Search events"
SEARCH_RESULTS=$(api_call GET "/events?search=Community")
SEARCH_COUNT=$(echo "$SEARCH_RESULTS" | grep -o '"name":"[^"]*Community[^"]*"' | wc -l)

if [ "$SEARCH_COUNT" -gt 0 ]; then
  print_test 0 "Search events"
  echo "  Found $SEARCH_COUNT matching event(s)"
else
  print_test 1 "Search events"
fi
echo ""

# Test 10: Delete event (optional - uncomment to test)
# echo "Test 10: Delete event"
# if [ -n "$EVENT_ID" ]; then
#   DELETE_RESPONSE=$(api_call DELETE "/events/$EVENT_ID")
#
#   # Verify deletion
#   VERIFY_DELETE=$(api_call GET "/events/$EVENT_ID")
#   if [[ "$VERIFY_DELETE" == *"not found"* ]] || [[ "$VERIFY_DELETE" == *"404"* ]]; then
#     print_test 0 "Delete event"
#   else
#     print_test 1 "Delete event"
#   fi
# else
#   print_test 1 "Delete event (no event ID)"
# fi
# echo ""

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
