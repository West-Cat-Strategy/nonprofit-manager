#!/usr/bin/env bash
set -euo pipefail

# Load common utilities and configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
source "$SCRIPT_DIR/lib/config.sh"

print_header "Quality Baseline Report"

if is_git_repo; then
  echo "Repository: $(basename "$PROJECT_ROOT")"
  echo "Branch: $(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
fi
echo "Generated: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

echo "## File inventory"
echo "TypeScript files: $(rg --files "${PROJECT_ROOT}/backend/src" "${PROJECT_ROOT}/frontend/src" -g '*.ts' -g '*.tsx' | wc -l | tr -d ' ')"
echo "Backend source files: $(rg --files "${PROJECT_ROOT}/backend/src" -g '*.ts' | wc -l | tr -d ' ')"
echo "Frontend source files: $(rg --files "${PROJECT_ROOT}/frontend/src" -g '*.ts' -g '*.tsx' | wc -l | tr -d ' ')"
echo ""

echo "## Largest backend files (top 10 by lines)"
rg --files "${PROJECT_ROOT}/backend/src" -g '*.ts' | xargs wc -l | sort -rn | head -n 10
echo ""

echo "## Largest frontend files (top 10 by lines)"
rg --files "${PROJECT_ROOT}/frontend/src" -g '*.ts' -g '*.tsx' | xargs wc -l | sort -rn | head -n 10
echo ""

echo "## Complexity signals"
echo "TODO/FIXME/HACK markers: $(rg -n 'TODO|FIXME|HACK' "${PROJECT_ROOT}/backend/src" "${PROJECT_ROOT}/frontend/src" | wc -l | tr -d ' ')"
echo "any usage count: $(rg -n '\\bany\\b' "${PROJECT_ROOT}/backend/src" "${PROJECT_ROOT}/frontend/src" | wc -l | tr -d ' ')"
echo "eslint-disable count: $(rg -n 'eslint-disable' "${PROJECT_ROOT}/backend/src" "${PROJECT_ROOT}/frontend/src" | wc -l | tr -d ' ')"
echo ""

echo "## Quality gates"
echo "Running backend lint..."
(cd "${PROJECT_ROOT}/backend" && npm run lint >/dev/null)
echo "Running backend type-check..."
(cd "${PROJECT_ROOT}/backend" && npm run type-check >/dev/null)
echo "Running frontend lint..."
(cd "${PROJECT_ROOT}/frontend" && npm run lint >/dev/null)
echo "Running frontend type-check..."
(cd "${PROJECT_ROOT}/frontend" && npm run type-check >/dev/null)
log_success "All quality gates passed."
