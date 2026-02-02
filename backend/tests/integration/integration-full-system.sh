#!/bin/bash

# Comprehensive Integration Test: Full System Validation
# Tests all Phase 2 modules and their relationships

BASE_URL="${BASE_URL:-http://localhost:3000/api}"
TOKEN="${TOKEN:-}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_section() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
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

echo "══════════════════════════════════════════════════════════"
echo "Full System Integration Test Suite"
echo "══════════════════════════════════════════════════════════"
echo ""
echo "This test validates all Phase 2 modules and their relationships:"
echo "  - Accounts & Contacts (Phase 1)"
echo "  - Donations (Phase 2)"
echo "  - Volunteers (Phase 2)"
echo "  - Events (Phase 2)"
echo "  - Tasks (Phase 2)"
echo "  - Cases (Phase 2)"
echo ""

# Check prerequisites
if [ -z "$TOKEN" ]; then
  echo -e "${YELLOW}WARNING: No JWT token set.${NC}"
  echo "Please export TOKEN environment variable before running."
  exit 1
fi

# Track created resources for cleanup
CLEANUP_IDS=()

# ═══════════════════════════════════════════════════════════
# SECTION 1: Create Foundation Data (Accounts & Contacts)
# ═══════════════════════════════════════════════════════════
print_section "SECTION 1: Foundation Data (Accounts & Contacts)"

echo "Creating organizational account..."
ACCOUNT_DATA='{
  "account_name": "Test Nonprofit Foundation",
  "account_type": "organization",
  "industry": "nonprofit",
  "phone": "555-1000",
  "email": "contact@testnonprofit.org",
  "address_line1": "123 Charity Lane",
  "city": "Givingville",
  "state_province": "CA",
  "postal_code": "90001"
}'

ACCOUNT_RESPONSE=$(api_call POST /accounts "$ACCOUNT_DATA")
ACCOUNT_ID=$(echo "$ACCOUNT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$ACCOUNT_ID" ]; then
  print_test 0 "Organization account created"
  CLEANUP_IDS+=("account:$ACCOUNT_ID")
else
  print_test 1 "Failed to create account"
  echo "Response: $ACCOUNT_RESPONSE"
  exit 1
fi

echo ""
echo "Creating individual contacts..."

# Create donor contact
DONOR_DATA='{
  "first_name": "Sarah",
  "last_name": "Generous",
  "email": "sarah.generous@example.com",
  "phone": "555-2001",
  "contact_type": "individual",
  "account_id": "'"$ACCOUNT_ID"'"
}'

DONOR_RESPONSE=$(api_call POST /contacts "$DONOR_DATA")
DONOR_ID=$(echo "$DONOR_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$DONOR_ID" ]; then
  print_test 0 "Donor contact created and linked to account"
  CLEANUP_IDS+=("contact:$DONOR_ID")
else
  print_test 1 "Failed to create donor contact"
fi

# Create volunteer contact
VOLUNTEER_CONTACT_DATA='{
  "first_name": "Mike",
  "last_name": "Helper",
  "email": "mike.helper@example.com",
  "phone": "555-2002",
  "contact_type": "individual"
}'

VOLUNTEER_CONTACT_RESPONSE=$(api_call POST /contacts "$VOLUNTEER_CONTACT_DATA")
VOLUNTEER_CONTACT_ID=$(echo "$VOLUNTEER_CONTACT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$VOLUNTEER_CONTACT_ID" ]; then
  print_test 0 "Volunteer contact created"
  CLEANUP_IDS+=("contact:$VOLUNTEER_CONTACT_ID")
else
  print_test 1 "Failed to create volunteer contact"
fi

# Create client contact
CLIENT_DATA='{
  "first_name": "Emily",
  "last_name": "Johnson",
  "email": "emily.j@example.com",
  "phone": "555-2003",
  "contact_type": "individual"
}'

CLIENT_RESPONSE=$(api_call POST /contacts "$CLIENT_DATA")
CLIENT_ID=$(echo "$CLIENT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$CLIENT_ID" ]; then
  print_test 0 "Client contact created"
  CLEANUP_IDS+=("contact:$CLIENT_ID")
else
  print_test 1 "Failed to create client contact"
fi

# ═══════════════════════════════════════════════════════════
# SECTION 2: Donations Module
# ═══════════════════════════════════════════════════════════
print_section "SECTION 2: Donations Module"

echo "Creating donation from donor..."
DONATION_DATA='{
  "donor_id": "'"$DONOR_ID"'",
  "amount": 500.00,
  "donation_date": "2024-02-01T10:00:00Z",
  "payment_method": "credit_card",
  "campaign": "Annual Fund",
  "notes": "Monthly recurring donor"
}'

DONATION_RESPONSE=$(api_call POST /donations "$DONATION_DATA")
DONATION_ID=$(echo "$DONATION_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$DONATION_ID" ]; then
  print_test 0 "Donation created and linked to donor"
  CLEANUP_IDS+=("donation:$DONATION_ID")
else
  print_test 1 "Failed to create donation"
fi

echo ""
echo "Verifying donation appears in donor's history..."
DONOR_DONATIONS=$(api_call GET "/donors/$DONOR_ID/donations")
DONATION_COUNT=$(echo "$DONOR_DONATIONS" | grep -c "$DONATION_ID" || echo "0")

if [ "$DONATION_COUNT" -gt 0 ]; then
  print_test 0 "Donation linked to donor correctly"
else
  print_test 1 "Donation not found in donor history"
fi

# ═══════════════════════════════════════════════════════════
# SECTION 3: Volunteers Module
# ═══════════════════════════════════════════════════════════
print_section "SECTION 3: Volunteers Module"

echo "Creating volunteer record..."
VOLUNTEER_DATA='{
  "contact_id": "'"$VOLUNTEER_CONTACT_ID"'",
  "skills": ["event planning", "fundraising"],
  "availability": "weekends",
  "status": "active",
  "emergency_contact_name": "Jane Helper",
  "emergency_contact_phone": "555-3000"
}'

VOLUNTEER_RESPONSE=$(api_call POST /volunteers "$VOLUNTEER_DATA")
VOLUNTEER_ID=$(echo "$VOLUNTEER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$VOLUNTEER_ID" ]; then
  print_test 0 "Volunteer record created and linked to contact"
  CLEANUP_IDS+=("volunteer:$VOLUNTEER_ID")
else
  print_test 1 "Failed to create volunteer record"
fi

echo ""
echo "Logging volunteer hours..."
HOURS_DATA='{
  "volunteer_id": "'"$VOLUNTEER_ID"'",
  "log_date": "2024-02-05T14:00:00Z",
  "hours": 4,
  "activity_type": "event_support",
  "description": "Helped with community event setup"
}'

HOURS_RESPONSE=$(api_call POST /volunteer-hours "$HOURS_DATA")
HOURS_ID=$(echo "$HOURS_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$HOURS_ID" ]; then
  print_test 0 "Volunteer hours logged"
  CLEANUP_IDS+=("volunteer_hours:$HOURS_ID")
else
  print_test 1 "Failed to log volunteer hours"
fi

# ═══════════════════════════════════════════════════════════
# SECTION 4: Events Module
# ═══════════════════════════════════════════════════════════
print_section "SECTION 4: Events Module"

echo "Creating fundraising event..."
EVENT_DATA='{
  "name": "Spring Gala 2024",
  "description": "Annual fundraising gala",
  "event_type": "fundraiser",
  "start_date": "2024-03-15T18:00:00Z",
  "end_date": "2024-03-15T23:00:00Z",
  "location": "Grand Ballroom",
  "capacity": 100,
  "registration_required": true,
  "registration_deadline": "2024-03-14T23:59:59Z",
  "status": "published"
}'

EVENT_RESPONSE=$(api_call POST /events "$EVENT_DATA")
EVENT_ID=$(echo "$EVENT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$EVENT_ID" ]; then
  print_test 0 "Event created"
  CLEANUP_IDS+=("event:$EVENT_ID")
else
  print_test 1 "Failed to create event"
fi

echo ""
echo "Registering volunteer for event..."
EVENT_REG_DATA='{
  "contact_id": "'"$VOLUNTEER_CONTACT_ID"'",
  "attendee_name": "Mike Helper",
  "attendee_email": "mike.helper@example.com"
}'

EVENT_REG_RESPONSE=$(api_call POST "/events/$EVENT_ID/register" "$EVENT_REG_DATA")
EVENT_REG_ID=$(echo "$EVENT_REG_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$EVENT_REG_ID" ]; then
  print_test 0 "Volunteer registered for event"
  CLEANUP_IDS+=("event_registration:$EVENT_ID:$EVENT_REG_ID")
else
  print_test 1 "Failed to register for event"
fi

echo ""
echo "Registering donor for event..."
DONOR_REG_DATA='{
  "contact_id": "'"$DONOR_ID"'",
  "attendee_name": "Sarah Generous",
  "attendee_email": "sarah.generous@example.com"
}'

DONOR_REG_RESPONSE=$(api_call POST "/events/$EVENT_ID/register" "$DONOR_REG_DATA")
DONOR_REG_ID=$(echo "$DONOR_REG_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$DONOR_REG_ID" ]; then
  print_test 0 "Donor registered for event"
else
  print_test 1 "Failed to register donor"
fi

echo ""
echo "Checking in volunteer at event..."
CHECKIN_RESPONSE=$(api_call POST "/events/$EVENT_ID/registrations/$EVENT_REG_ID/checkin" "{}")
CHECKIN_STATUS=$(echo "$CHECKIN_RESPONSE" | grep -o '"status":"attended"')

if [ -n "$CHECKIN_STATUS" ]; then
  print_test 0 "Volunteer checked in successfully"
else
  print_test 1 "Failed to check in volunteer"
fi

# ═══════════════════════════════════════════════════════════
# SECTION 5: Tasks Module
# ═══════════════════════════════════════════════════════════
print_section "SECTION 5: Tasks Module"

echo "Creating task for event follow-up..."
TASK_DATA='{
  "title": "Send thank you notes to gala attendees",
  "description": "Personalized thank you notes for all Spring Gala 2024 attendees",
  "priority": "high",
  "status": "pending",
  "due_date": "2024-03-20T17:00:00Z"
}'

TASK_RESPONSE=$(api_call POST /tasks "$TASK_DATA")
TASK_ID=$(echo "$TASK_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$TASK_ID" ]; then
  print_test 0 "Task created"
  CLEANUP_IDS+=("task:$TASK_ID")
else
  print_test 1 "Failed to create task"
fi

echo ""
echo "Updating task status..."
TASK_UPDATE='{"status": "in_progress"}'
TASK_UPDATE_RESPONSE=$(api_call PUT "/tasks/$TASK_ID" "$TASK_UPDATE")
UPDATED_STATUS=$(echo "$TASK_UPDATE_RESPONSE" | grep -o '"status":"in_progress"')

if [ -n "$UPDATED_STATUS" ]; then
  print_test 0 "Task status updated"
else
  print_test 1 "Failed to update task status"
fi

# ═══════════════════════════════════════════════════════════
# SECTION 6: Cases Module
# ═══════════════════════════════════════════════════════════
print_section "SECTION 6: Cases Module"

echo "Creating case for client..."
CASE_DATA='{
  "client_id": "'"$CLIENT_ID"'",
  "case_number": "CASE-2024-001",
  "title": "Housing Assistance",
  "description": "Client needs assistance finding affordable housing",
  "status": "open",
  "priority": "high"
}'

CASE_RESPONSE=$(api_call POST /cases "$CASE_DATA")
CASE_ID=$(echo "$CASE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$CASE_ID" ]; then
  print_test 0 "Case created and linked to client"
  CLEANUP_IDS+=("case:$CASE_ID")
else
  print_test 1 "Failed to create case"
fi

echo ""
echo "Adding case note..."
NOTE_DATA='{
  "case_id": "'"$CASE_ID"'",
  "note": "Initial consultation completed. Client requires assistance within 30 days.",
  "note_type": "general"
}'

NOTE_RESPONSE=$(api_call POST "/cases/$CASE_ID/notes" "$NOTE_DATA")
NOTE_ID=$(echo "$NOTE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$NOTE_ID" ]; then
  print_test 0 "Case note added"
else
  print_test 1 "Failed to add case note"
fi

# ═══════════════════════════════════════════════════════════
# SECTION 7: Cross-Module Relationships
# ═══════════════════════════════════════════════════════════
print_section "SECTION 7: Cross-Module Relationship Verification"

echo "Verifying account has associated contacts..."
ACCOUNT_CONTACTS=$(api_call GET "/accounts/$ACCOUNT_ID/contacts")
ACCOUNT_CONTACT_COUNT=$(echo "$ACCOUNT_CONTACTS" | grep -o '"id"' | wc -l)

if [ "$ACCOUNT_CONTACT_COUNT" -ge 1 ]; then
  print_test 0 "Account has associated contacts ($ACCOUNT_CONTACT_COUNT found)"
else
  print_test 1 "Account has no associated contacts"
fi

echo ""
echo "Verifying contact has multiple relationships..."
CONTACT_DETAILS=$(api_call GET "/contacts/$VOLUNTEER_CONTACT_ID")
HAS_VOLUNTEER=$(echo "$CONTACT_DETAILS" | grep -o '"volunteer"' || echo "")
HAS_EVENT=$(echo "$CONTACT_DETAILS" | grep -o '"event"' || echo "")

if [ -n "$HAS_VOLUNTEER" ] || [ -n "$HAS_EVENT" ]; then
  print_test 0 "Contact has multiple module relationships"
else
  print_test 1 "Contact missing expected relationships"
fi

echo ""
echo "Verifying event statistics are accurate..."
EVENT_STATS=$(api_call GET "/events/$EVENT_ID/stats")
REGISTERED=$(echo "$EVENT_STATS" | grep -o '"total_registrations":[0-9]*' | grep -o '[0-9]*')
ATTENDED=$(echo "$EVENT_STATS" | grep -o '"attended_count":[0-9]*' | grep -o '[0-9]*')

if [ "$REGISTERED" = "2" ] && [ "$ATTENDED" = "1" ]; then
  print_test 0 "Event statistics accurate (2 registered, 1 attended)"
else
  print_test 1 "Event statistics incorrect (expected 2 registered, 1 attended; got $REGISTERED registered, $ATTENDED attended)"
fi

echo ""
echo "Verifying donor has donation history..."
DONOR_PROFILE=$(api_call GET "/donors/$DONOR_ID")
DONATION_TOTAL=$(echo "$DONOR_PROFILE" | grep -o '"total_donated"' || echo "")

if [ -n "$DONATION_TOTAL" ]; then
  print_test 0 "Donor profile shows donation history"
else
  print_test 1 "Donor profile missing donation data"
fi

# ═══════════════════════════════════════════════════════════
# SECTION 8: Data Integrity & Constraints
# ═══════════════════════════════════════════════════════════
print_section "SECTION 8: Data Integrity & Constraints"

echo "Testing duplicate prevention (event registration)..."
DUPLICATE_REG=$(api_call POST "/events/$EVENT_ID/register" "$EVENT_REG_DATA")

if echo "$DUPLICATE_REG" | grep -q "already registered\|error"; then
  print_test 0 "Duplicate registration prevented"
else
  print_test 1 "Duplicate registration allowed (should be prevented)"
fi

echo ""
echo "Testing required field validation..."
INVALID_CONTACT='{"first_name": "", "email": "invalid"}'
INVALID_RESPONSE=$(api_call POST /contacts "$INVALID_CONTACT")

if echo "$INVALID_RESPONSE" | grep -q "error\|required\|invalid"; then
  print_test 0 "Required field validation working"
else
  print_test 1 "Validation not enforcing required fields"
fi

# ═══════════════════════════════════════════════════════════
# CLEANUP
# ═══════════════════════════════════════════════════════════
print_section "CLEANUP"

echo "Removing test data..."
CLEANUP_COUNT=0

for item in "${CLEANUP_IDS[@]}"; do
  IFS=':' read -r type id rest <<< "$item"

  case "$type" in
    "event")
      api_call DELETE "/events/$id" > /dev/null 2>&1
      ((CLEANUP_COUNT++))
      ;;
    "case")
      api_call DELETE "/cases/$id" > /dev/null 2>&1
      ((CLEANUP_COUNT++))
      ;;
    "task")
      api_call DELETE "/tasks/$id" > /dev/null 2>&1
      ((CLEANUP_COUNT++))
      ;;
    "volunteer")
      api_call DELETE "/volunteers/$id" > /dev/null 2>&1
      ((CLEANUP_COUNT++))
      ;;
    "donation")
      api_call DELETE "/donations/$id" > /dev/null 2>&1
      ((CLEANUP_COUNT++))
      ;;
    "contact")
      api_call DELETE "/contacts/$id" > /dev/null 2>&1
      ((CLEANUP_COUNT++))
      ;;
    "account")
      api_call DELETE "/accounts/$id" > /dev/null 2>&1
      ((CLEANUP_COUNT++))
      ;;
  esac
done

echo -e "${GREEN}✓${NC} Cleaned up $CLEANUP_COUNT test records"

# ═══════════════════════════════════════════════════════════
# RESULTS
# ═══════════════════════════════════════════════════════════
echo ""
echo "══════════════════════════════════════════════════════════"
echo "Integration Test Results"
echo "══════════════════════════════════════════════════════════"
echo ""
echo "Total Tests:      $((TESTS_PASSED + TESTS_FAILED))"
echo -e "${GREEN}Passed:${NC}           $TESTS_PASSED"
echo -e "${RED}Failed:${NC}           $TESTS_FAILED"

if [ $((TESTS_PASSED + TESTS_FAILED)) -gt 0 ]; then
  PASS_RATE=$((TESTS_PASSED * 100 / (TESTS_PASSED + TESTS_FAILED)))
  echo "Pass Rate:        $PASS_RATE%"
fi

echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ ALL INTEGRATION TESTS PASSED!${NC}"
  echo ""
  echo "The system is functioning correctly across all modules."
  echo "All cross-module relationships are working as expected."
  exit 0
else
  echo -e "${RED}✗ SOME INTEGRATION TESTS FAILED${NC}"
  echo ""
  echo "Please review the failures above and fix the issues."
  exit 1
fi
