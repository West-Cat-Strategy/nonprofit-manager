#!/bin/bash
# scripts/doctor.sh
# Preflight check for local development environment

BLUE='\033[34m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
RESET='\033[0m'

echo -e "${BLUE}Running environment doctor...${RESET}"
echo ""

ERRORS=0

# 1. Node.js version
REQUIRED_NODE_MAJOR=22
CURRENT_NODE_VERSION=$(node -v | cut -d'v' -f2)
CURRENT_NODE_MAJOR=$(echo $CURRENT_NODE_VERSION | cut -d'.' -f1)

if [ "$CURRENT_NODE_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]; then
    echo -e "  [${RED}FAIL${RESET}] Node.js version is $CURRENT_NODE_VERSION. Required: >= v$REQUIRED_NODE_MAJOR.0.0"
    ERRORS=$((ERRORS + 1))
else
    echo -e "  [${GREEN}PASS${RESET}] Node.js version is $CURRENT_NODE_VERSION."
fi

# 2. Docker
if command -v docker >/dev/null 2>&1; then
    echo -e "  [${GREEN}PASS${RESET}] Docker is installed."
    if docker compose version >/dev/null 2>&1; then
        echo -e "  [${GREEN}PASS${RESET}] Docker Compose is available."
    else
        echo -e "  [${RED}FAIL${RESET}] Docker Compose is not available. Please install Docker Desktop or docker-compose-plugin."
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "  [${RED}FAIL${RESET}] Docker is not installed."
    ERRORS=$((ERRORS + 1))
fi

# 3. gitleaks
if command -v gitleaks >/dev/null 2>&1; then
    echo -e "  [${GREEN}PASS${RESET}] gitleaks is installed."
else
    echo -e "  [${YELLOW}WARN${RESET}] gitleaks is not installed. Secret scanning will be skipped locally. (brew install gitleaks)"
fi

# 4. Environment files
if [ -f ".env.development" ]; then
    echo -e "  [${GREEN}PASS${RESET}] .env.development exists."
else
    echo -e "  [${YELLOW}WARN${RESET}] .env.development is missing. Copy from .env.development.example."
fi

if [ -f ".env.production" ]; then
    echo -e "  [${GREEN}PASS${RESET}] .env.production exists."
else
    echo -e "  [${YELLOW}WARN${RESET}] .env.production is missing. (Required for production builds/deploys)"
fi

# 5. node_modules
if [ -d "node_modules" ] && [ -d "backend/node_modules" ] && [ -d "frontend/node_modules" ]; then
    echo -e "  [${GREEN}PASS${RESET}] node_modules exist."
else
    echo -e "  [${YELLOW}WARN${RESET}] node_modules are incomplete. Run 'make install'."
fi

echo ""
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}Doctor found no critical issues! Your environment is ready.${RESET}"
    exit 0
else
    echo -e "${RED}Doctor found $ERRORS critical issues. Please fix them before proceeding.${RESET}"
    exit 1
fi
