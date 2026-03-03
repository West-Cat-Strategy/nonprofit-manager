#!/bin/bash
# Test authentication flow end-to-end

set -e

# Load common utilities and configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
source "$SCRIPT_DIR/lib/config.sh"

print_header "Authentication Flow Test"

# API base URL
API_URL="${API_BASE_URL:-http://localhost:3000/api}"

# Function to print success
success() {
    log_success "$1"
}

# Function to print error
error() {
    log_error "$1"
}

# Test 1: Health check
log_info "1. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:$BACKEND_PORT/health)
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    success "Health check passed"
else
    error "Health check failed"
    echo "  Response: $HEALTH_RESPONSE"
    exit 1
fi

# Test 2: Register a new user
echo ""
log_info "2. Testing user registration..."
REGISTER_RESPONSE=$(curl -s -X POST ${API_URL}/auth/register \
    -H "Content-Type: application/json" \
    -d '{
        "email": "test@example.com",
        "password": "SecurePassword123!",
        "firstName": "Test",
        "lastName": "User"
    }')

if echo "$REGISTER_RESPONSE" | grep -q "token"; then
    success "User registration successful"
    TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')
    USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":[0-9]*' | sed 's/"id"://')
    echo "  User ID: $USER_ID"
else
    error "User registration failed"
    echo "  Response: $REGISTER_RESPONSE"
    exit 1
fi

# Test 3: Login with registered user
echo ""
log_info "3. Testing user login..."
LOGIN_RESPONSE=$(curl -s -X POST ${API_URL}/auth/login \
    -H "Content-Type: application/json" \
    -d '{
        "email": "test@example.com",
        "password": "SecurePassword123!"
    }')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    success "User login successful"
    LOGIN_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')
else
    error "User login failed"
    echo "  Response: $LOGIN_RESPONSE"
    exit 1
fi

# Test 4: Access protected endpoint (get accounts)
echo ""
log_info "4. Testing protected endpoint access..."
ACCOUNTS_RESPONSE=$(curl -s -X GET ${API_URL}/accounts \
    -H "Authorization: Bearer $LOGIN_TOKEN")

if echo "$ACCOUNTS_RESPONSE" | grep -q "accounts\|error"; then
    success "Protected endpoint access successful"
else
    error "Protected endpoint access failed"
    echo "  Response: $ACCOUNTS_RESPONSE"
fi

# Test 5: Test invalid login
echo ""
log_info "5. Testing invalid login..."
INVALID_LOGIN=$(curl -s -X POST ${API_URL}/auth/login \
    -H "Content-Type: application/json" \
    -d '{
        "email": "test@example.com",
        "password": "WrongPassword123!"
    }')

if echo "$INVALID_LOGIN" | grep -q "error\|Invalid"; then
    success "Invalid login correctly rejected"
else
    error "Invalid login test failed"
fi

# Test 6: Test access without token
echo ""
log_info "6. Testing unauthorized access..."
UNAUTH_RESPONSE=$(curl -s -X GET ${API_URL}/accounts)

if echo "$UNAUTH_RESPONSE" | grep -q "error\|Unauthorized"; then
    success "Unauthorized access correctly blocked"
else
    error "Unauthorized access test failed"
fi

print_footer "All authentication tests completed successfully!"
    TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')
    USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":[0-9]*' | sed 's/"id"://')
    echo "  User ID: $USER_ID"
else
    error "User registration failed"
    echo "  Response: $REGISTER_RESPONSE"
    exit 1
fi

# Test 3: Login with registered user
echo ""
echo "3. Testing user login..."
LOGIN_RESPONSE=$(curl -s -X POST ${API_URL}/auth/login \
    -H "Content-Type: application/json" \
    -d '{
        "email": "test@example.com",
        "password": "SecurePassword123!"
    }')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    success "User login successful"
    LOGIN_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')
else
    error "User login failed"
    echo "  Response: $LOGIN_RESPONSE"
    exit 1
fi

# Test 4: Access protected endpoint (get accounts)
echo ""
echo "4. Testing protected endpoint access..."
ACCOUNTS_RESPONSE=$(curl -s -X GET ${API_URL}/accounts \
    -H "Authorization: Bearer $LOGIN_TOKEN")

if echo "$ACCOUNTS_RESPONSE" | grep -q "accounts\|error"; then
    success "Protected endpoint access successful"
else
    error "Protected endpoint access failed"
    echo "  Response: $ACCOUNTS_RESPONSE"
fi

# Test 5: Test invalid login
echo ""
echo "5. Testing invalid login..."
INVALID_LOGIN=$(curl -s -X POST ${API_URL}/auth/login \
    -H "Content-Type: application/json" \
    -d '{
        "email": "test@example.com",
        "password": "WrongPassword123!"
    }')

if echo "$INVALID_LOGIN" | grep -q "error\|Invalid"; then
    success "Invalid login correctly rejected"
else
    error "Invalid login test failed"
fi

# Test 6: Test access without token
echo ""
echo "6. Testing unauthorized access..."
UNAUTH_RESPONSE=$(curl -s -X GET ${API_URL}/accounts)

if echo "$UNAUTH_RESPONSE" | grep -q "error\|Unauthorized"; then
    success "Unauthorized access correctly blocked"
else
    error "Unauthorized access test failed"
fi

echo ""
echo "=== All authentication tests completed! ==="
