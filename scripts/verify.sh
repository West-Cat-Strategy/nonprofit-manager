#!/usr/bin/env bash
set -euo pipefail
echo "=== nonprofit-manager verification ==="
echo
echo "1. Git state"
git status --short
echo
echo "2. Tooling"
command -v node >/dev/null && node --version
command -v npm >/dev/null && npm --version
command -v docker >/dev/null && docker --version || true
echo
echo "3. Root gates"
make lint
make typecheck
make ci-unit
echo
echo "4. Backend tests"
make test-backend
echo
echo "5. Frontend tests"
make test-frontend
echo
echo "6. E2E smoke"
cd e2e
npm run test:smoke
cd ..
echo
echo "=== verification complete ==="
