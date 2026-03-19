#!/usr/bin/env bash
set -euo pipefail

mode="fast"
base=""
files_arg=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      mode="${2:-}"
      shift 2
      ;;
    --base)
      base="${2:-}"
      shift 2
      ;;
    --files)
      files_arg="${2:-}"
      shift 2
      ;;
    -h|--help)
      cat <<'EOF'
Usage: scripts/select-checks.sh [--base <ref>] [--files "<file list>"] [--mode fast|strict]

Print a small, ordered set of repo checks based on the changed files.
EOF
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "$files_arg" ]]; then
  if [[ -n "$base" ]]; then
    if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
      mapfile -t changed_files < <(git diff --name-only "${base}...HEAD")
    else
      echo "scripts/select-checks.sh: git repository metadata is unavailable; pass --files explicitly." >&2
      exit 2
    fi
  else
    mapfile -t changed_files < <(git diff --name-only HEAD~1...HEAD 2>/dev/null || true)
  fi
else
  mapfile -t changed_files < <(printf '%s\n' "$files_arg" | tr ' ' '\n' | sed '/^$/d')
fi

if [[ ${#changed_files[@]} -eq 0 ]]; then
  if [[ "$mode" == "strict" ]]; then
    printf '%s\n' \
      "make lint" \
      "make typecheck" \
      "make test" \
      "make db-verify"
  else
    printf '%s\n' \
      "make lint" \
      "make typecheck"
  fi
  exit 0
fi

has_docs=0
has_api_docs=0
has_backend=0
has_frontend=0
has_e2e=0
has_database=0
has_scripts=0

for file in "${changed_files[@]}"; do
  case "$file" in
    README.md|CONTRIBUTING.md|agents.md|docs/*|backend/README.md|frontend/README.md|frontend/SETUP.md|e2e/README.md|database/README.md)
      has_docs=1
      ;;
  esac

  case "$file" in
    docs/api/*|README.md|backend/README.md|frontend/README.md|frontend/SETUP.md|e2e/README.md|database/README.md)
      has_api_docs=1
      ;;
  esac

  case "$file" in
    backend/*)
      has_backend=1
      ;;
    frontend/*)
      has_frontend=1
      ;;
    e2e/*)
      has_e2e=1
      ;;
    database/*)
      has_database=1
      ;;
    scripts/*|Makefile)
      has_scripts=1
      ;;
  esac
done

commands=()

if [[ "$mode" == "strict" ]]; then
  commands+=("make lint" "make typecheck")
  if [[ $has_docs -eq 1 ]]; then
    commands+=("make check-links")
  fi
  if [[ $has_api_docs -eq 1 ]]; then
    commands+=("make lint-doc-api-versioning")
  fi
  if [[ $has_database -eq 1 ]]; then
    commands+=("make db-verify")
  fi
  if [[ $has_backend -eq 1 || $has_frontend -eq 1 || $has_scripts -eq 1 ]]; then
    commands+=("make test")
  fi
  if [[ $has_e2e -eq 1 ]]; then
    commands+=("cd e2e && npm run test:smoke")
  fi
else
  if [[ $has_docs -eq 1 ]]; then
    commands+=("make check-links")
  fi
  if [[ $has_api_docs -eq 1 ]]; then
    commands+=("make lint-doc-api-versioning")
  fi
  if [[ $has_backend -eq 1 || $has_scripts -eq 1 ]]; then
    commands+=("make lint" "make typecheck")
  fi
  if [[ $has_frontend -eq 1 ]]; then
    commands+=("cd frontend && npm run type-check")
  fi
  if [[ $has_e2e -eq 1 ]]; then
    commands+=("cd e2e && npm run test:smoke")
  fi
  if [[ $has_database -eq 1 ]]; then
    commands+=("make db-verify")
  fi
fi

if [[ ${#commands[@]} -eq 0 ]]; then
  commands+=("make lint" "make typecheck")
fi

printf '%s\n' "${commands[@]}"
