#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

POLICY_COMMANDS=(
  "node scripts/check-rate-limit-key-policy.ts"
  "node scripts/check-success-envelope-policy.ts"
  "node scripts/check-route-validation-policy.ts"
  "node scripts/check-query-contract-policy.ts"
  "node scripts/check-express-validator-policy.ts"
  "node scripts/check-controller-sql-policy.ts"
  "node scripts/check-auth-guard-policy.ts"
  "node scripts/check-migration-manifest-policy.ts"
  "node scripts/check-duplicate-test-tree.ts"
  "node scripts/check-doc-api-versioning.ts"
  "node scripts/check-v2-module-ownership-policy.ts"
  "node scripts/check-module-boundary-policy.ts"
  "node scripts/check-module-route-proxy-policy.ts"
  "node scripts/check-canonical-module-import-policy.ts"
  "node scripts/check-implementation-size-policy.ts"
  "node scripts/check-frontend-feature-boundary-policy.ts"
  "node scripts/check-frontend-legacy-slice-import-policy.ts"
  "node scripts/check-frontend-legacy-page-path-policy.ts"
  "node scripts/check-route-integrity.ts"
  "node scripts/check-route-catalog-drift.ts"
  "node scripts/ui-audit.ts --enforce-baseline"
  "node scripts/check-backend-legacy-controller-wrapper-policy.ts"
)

cd "$PROJECT_ROOT"

for command in "${POLICY_COMMANDS[@]}"; do
  run bash -lc "$command"
done
