#!/bin/bash

# Integration Test Environment Setup
# Prepares environment for running integration tests

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="${BASE_URL:-HTTP://localhost:3000/api}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

echo "══════════════════════════════════════════════════════════"
echo "Integration Test Environment Setup"
echo "══════════════════════════════════════════════════════════"
echo ""

# Step 1: Check if server is running
echo -e "${BLUE}[1/5]${NC} Checking if backend server is running..."
SERVER_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" 2>/dev/null || echo "000")

if [ "$SERVER_CHECK" = "200" ] || [ "$SERVER_CHECK" = "404" ]; then
  echo -e "${GREEN}✓${NC} Server is running at $BASE_URL"
else
  echo -e "${RED}✗${NC} Server is not running at $BASE_URL"
  echo ""
  echo "Please start the backend server:"
  echo "  cd backend"
  echo "  npm run dev"
  echo ""
  exit 1
fi

# Step 2: Check database connection
echo ""
echo -e "${BLUE}[2/5]${NC} Checking database connection..."

# Try to access an endpoint that requires database
DB_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/accounts" 2>/dev/null || echo "000")

if [ "$DB_CHECK" = "401" ] || [ "$DB_CHECK" = "200" ]; then
  echo -e "${GREEN}✓${NC} Database is accessible (HTTP $DB_CHECK)"
else
  echo -e "${YELLOW}⚠${NC}  Database connection uncertain (HTTP $DB_CHECK)"
  echo "This may be normal if auth is required. Continuing..."
fi

# Step 3: Get authentication token
echo ""
echo -e "${BLUE}[3/5]${NC} Obtaining authentication token..."

if [ -z "$ADMIN_PASSWORD" ]; then
  echo -e "${YELLOW}⚠${NC}  ADMIN_PASSWORD not set in environment"
  echo ""
  echo "Please provide admin password:"
  read -s ADMIN_PASSWORD
  echo ""
fi

LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" 2>/dev/null)

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ] && [ ${#TOKEN} -gt 20 ]; then
  echo -e "${GREEN}✓${NC} Authentication successful"
  echo "  Token: ${TOKEN:0:20}..."
else
  echo -e "${RED}✗${NC} Authentication failed"
  echo ""
  echo "Response: $LOGIN_RESPONSE"
  echo ""
  echo "Please check:"
  echo "  - Admin user exists in database"
  echo "  - Email: $ADMIN_EMAIL"
  echo "  - Password is correct"
  echo ""
  exit 1
fi

# Step 4: Verify API access with token
echo ""
echo -e "${BLUE}[4/5]${NC} Verifying API access with token..."

API_TEST=$(curl -s -X GET "$BASE_URL/accounts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

if echo "$API_TEST" | grep -q "accounts\|id\|\[\]"; then
  echo -e "${GREEN}✓${NC} API access confirmed"
else
  echo -e "${RED}✗${NC} API access failed"
  echo "Response: $API_TEST"
  exit 1
fi

# Step 5: Export environment variables
echo ""
echo -e "${BLUE}[5/5]${NC} Setting up environment variables..."

export TOKEN="$TOKEN"
export BASE_URL="$BASE_URL"

echo -e "${GREEN}✓${NC} Environment variables exported"

# Create environment file for reuse
ENV_FILE="$(dirname "$0")/.test-env"
cat > "$ENV_FILE" <<EOF
# Integration Test Environment Variables
# Generated: $(date)
# Valid for: ~24 hours (token expiration)

export TOKEN="$TOKEN"
export BASE_URL="$BASE_URL"
EOF

chmod 600 "$ENV_FILE"

echo ""
echo "══════════════════════════════════════════════════════════"
echo -e "${GREEN}✓ Environment Setup Complete${NC}"
echo "══════════════════════════════════════════════════════════"
echo ""
echo "To run integration tests in this session:"
echo ""
echo -e "  ${BLUE}# Run all tests${NC}"
echo "  ./run-all-integration-tests.sh"
echo ""
echo -e "  ${BLUE}# Run full system test${NC}"
echo "  ./integration-full-system.sh"
echo ""
echo -e "  ${BLUE}# Run specific tests${NC}"
echo "  ./integration-volunteer-event.sh"
echo "  ./integration-business-rules.sh"
echo ""
echo "To reuse this environment in a new terminal:"
echo "  source $(basename $ENV_FILE)"
echo ""
echo -e "${YELLOW}Note:${NC} Token expires after 24 hours. Re-run this script if tests fail with auth errors."
echo ""
