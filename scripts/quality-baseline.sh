#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Quality baseline report"
echo ""

if command -v git >/dev/null 2>&1; then
  echo "Repository: $(basename "${root_dir}")"
  echo "Branch: $(git -C "${root_dir}" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
fi
echo "Generated: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

echo "## File inventory"
echo "TypeScript files: $(rg --files "${root_dir}/backend/src" "${root_dir}/frontend/src" -g '*.ts' -g '*.tsx' | wc -l | tr -d ' ')"
echo "Backend source files: $(rg --files "${root_dir}/backend/src" -g '*.ts' | wc -l | tr -d ' ')"
echo "Frontend source files: $(rg --files "${root_dir}/frontend/src" -g '*.ts' -g '*.tsx' | wc -l | tr -d ' ')"
echo ""

echo "## Largest backend files (top 10 by lines)"
rg --files "${root_dir}/backend/src" -g '*.ts' | xargs wc -l | sort -rn | head -n 10
echo ""

echo "## Largest frontend files (top 10 by lines)"
rg --files "${root_dir}/frontend/src" -g '*.ts' -g '*.tsx' | xargs wc -l | sort -rn | head -n 10
echo ""

echo "## Complexity signals"
echo "TODO/FIXME/HACK markers: $(rg -n 'TODO|FIXME|HACK' "${root_dir}/backend/src" "${root_dir}/frontend/src" | wc -l | tr -d ' ')"
echo "any usage count: $(rg -n '\\bany\\b' "${root_dir}/backend/src" "${root_dir}/frontend/src" | wc -l | tr -d ' ')"
echo "eslint-disable count: $(rg -n 'eslint-disable' "${root_dir}/backend/src" "${root_dir}/frontend/src" | wc -l | tr -d ' ')"
echo ""

echo "## Quality gates"
echo "Running backend lint..."
(cd "${root_dir}/backend" && npm run lint >/dev/null)
echo "Running backend type-check..."
(cd "${root_dir}/backend" && npm run type-check >/dev/null)
echo "Running frontend lint..."
(cd "${root_dir}/frontend" && npm run lint >/dev/null)
echo "Running frontend type-check..."
(cd "${root_dir}/frontend" && npm run type-check >/dev/null)
echo "All quality gates passed."
