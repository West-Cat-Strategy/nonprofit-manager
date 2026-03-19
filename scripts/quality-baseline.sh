#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

run() {
  echo "==> $*"
  "$@"
}

cd "$ROOT_DIR"

run node scripts/check-rate-limit-key-policy.ts
run node scripts/check-success-envelope-policy.ts
run node scripts/check-route-validation-policy.ts
run node scripts/check-query-contract-policy.ts
run node scripts/check-express-validator-policy.ts
run node scripts/check-controller-sql-policy.ts
run node scripts/check-auth-guard-policy.ts
run node scripts/check-migration-manifest-policy.ts
run node scripts/check-duplicate-test-tree.ts
run node scripts/check-v2-module-ownership-policy.ts
run node scripts/check-module-boundary-policy.ts
run node scripts/check-module-route-proxy-policy.ts
run node scripts/check-canonical-module-import-policy.ts
run node scripts/check-implementation-size-policy.ts
run node scripts/check-frontend-feature-boundary-policy.ts
run node scripts/check-frontend-legacy-slice-import-policy.ts
run node scripts/check-frontend-legacy-page-path-policy.ts
run node scripts/check-backend-legacy-controller-wrapper-policy.ts
run node scripts/check-route-integrity.ts
run node scripts/check-route-catalog-drift.ts
run node scripts/ui-audit.ts

echo "Quality baseline complete."
