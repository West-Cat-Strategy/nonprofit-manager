#!/usr/bin/env bash
set -euo pipefail

mode="full"
run_backend=1
run_frontend=1
run_tests=1
run_audit=0
run_db_verify=0
run_build=0

for arg in "$@"; do
  case "$arg" in
    --fast)
      mode="fast"
      run_tests=0
      ;;
    --audit)
      run_audit=1
      ;;
    --db-verify)
      run_db_verify=1
      ;;
    --build)
      run_build=1
      ;;
    --no-tests)
      run_tests=0
      ;;
    --backend-only)
      run_backend=1
      run_frontend=0
      ;;
    --frontend-only)
      run_backend=0
      run_frontend=1
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

run_section() {
  local label="$1"
  shift
  echo "==> ${label}"
  "$@"
}

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ $run_backend -eq 1 ]]; then
  if [[ -d "${root_dir}/backend" ]]; then
    run_section "Backend lint" bash -lc "cd '${root_dir}/backend' && npm run lint"
    run_section "Backend type-check" bash -lc "cd '${root_dir}/backend' && npm run type-check"
    if [[ $run_tests -eq 1 ]]; then
      run_section "Backend tests" bash -lc "cd '${root_dir}/backend' && npm test -- --runInBand"
    else
      echo "==> Backend tests skipped (${mode})"
    fi
    if [[ $run_build -eq 1 ]]; then
      run_section "Backend build" bash -lc "cd '${root_dir}/backend' && npm run build"
    fi
    if [[ $run_audit -eq 1 ]]; then
      run_section "Backend npm audit" bash -lc "cd '${root_dir}/backend' && npm audit --audit-level=high"
    fi
  else
    echo "==> Backend directory not found; skipping."
  fi
fi

if [[ $run_frontend -eq 1 ]]; then
  if [[ -d "${root_dir}/frontend" ]]; then
    run_section "Frontend lint" bash -lc "cd '${root_dir}/frontend' && npm run lint"
    run_section "Frontend type-check" bash -lc "cd '${root_dir}/frontend' && npm run type-check"
    if [[ $run_tests -eq 1 ]]; then
      if bash -lc "cd '${root_dir}/frontend' && node -e \"require.resolve('vitest')\"" >/dev/null 2>&1; then
        run_section "Frontend tests" bash -lc "cd '${root_dir}/frontend' && npm test -- --run"
      else
        echo "==> Frontend tests skipped (vitest not installed)"
      fi
    else
      echo "==> Frontend tests skipped (${mode})"
    fi
    if [[ $run_build -eq 1 ]]; then
      run_section "Frontend build" bash -lc "cd '${root_dir}/frontend' && npm run build"
    fi
    if [[ $run_audit -eq 1 ]]; then
      run_section "Frontend npm audit" bash -lc "cd '${root_dir}/frontend' && npm audit --audit-level=high"
    fi
  else
    echo "==> Frontend directory not found; skipping."
  fi
fi

if [[ $run_db_verify -eq 1 ]]; then
  run_section "DB migration verification" bash -lc "'${root_dir}/scripts/verify-migrations.sh'"
fi

echo "==> Local CI complete"
