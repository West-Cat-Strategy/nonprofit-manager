#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

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
    mapfile -t changed_files < <(git -C "$PROJECT_ROOT" diff --name-only "${base}...HEAD")
  else
    mapfile -t changed_files < <(git -C "$PROJECT_ROOT" diff --name-only HEAD~1...HEAD 2>/dev/null || true)
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
has_shared_runtime=0

is_docs_path() {
  case "$1" in
    README.md|CONTRIBUTING.md|AGENTS.md|agents.md|docs/*|backend/README.md|frontend/README.md|frontend/SETUP.md|e2e/README.md|database/README.md)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

is_api_docs_path() {
  case "$1" in
    docs/api/*|README.md|backend/README.md|frontend/README.md|frontend/SETUP.md|e2e/README.md|database/README.md)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

for file in "${changed_files[@]}"; do
  if is_docs_path "$file"; then
    has_docs=1
    if is_api_docs_path "$file"; then
      has_api_docs=1
    fi
    continue
  fi

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
    scripts/*|Makefile|package.json|package-lock.json|tsconfig*.json|docker-compose*.yml|docker-compose*.yaml|contracts/*)
      has_shared_runtime=1
      ;;
    *)
      has_shared_runtime=1
      ;;
  esac
done

surface_count=$((has_backend + has_frontend + has_e2e + has_database + has_shared_runtime))
commands=()

add_command() {
  local command="$1"
  local existing

  for existing in "${commands[@]}"; do
    if [[ "$existing" == "$command" ]]; then
      return
    fi
  done

  commands+=("$command")
}

add_doc_commands() {
  if [[ $has_docs -eq 1 ]]; then
    add_command "make check-links"
  fi

  if [[ $has_api_docs -eq 1 ]]; then
    add_command "make lint-doc-api-versioning"
  fi
}

add_backend_commands() {
  add_command "cd backend && npm run lint"
  add_command "cd backend && npm run type-check"
  add_command "cd backend && npm test -- src/__tests__/integration"
}

add_frontend_commands() {
  add_command "cd frontend && npm run lint"
  add_command "cd frontend && npm run type-check"
  add_command "cd frontend && npm test -- --run"
}

add_e2e_commands() {
  add_command "cd e2e && npm run test:smoke"
}

if [[ "$mode" == "strict" ]]; then
  add_doc_commands

  if [[ $surface_count -eq 0 ]]; then
    :
  elif [[ $has_database -eq 1 || $has_shared_runtime -eq 1 || $surface_count -gt 1 ]]; then
    add_command "make test"
    if [[ $has_database -eq 1 ]]; then
      add_command "make db-verify"
    fi
  elif [[ $has_backend -eq 1 ]]; then
    add_backend_commands
  elif [[ $has_frontend -eq 1 ]]; then
    add_frontend_commands
  elif [[ $has_e2e -eq 1 ]]; then
    add_e2e_commands
  fi
else
  add_doc_commands

  if [[ $surface_count -eq 0 ]]; then
    :
  elif [[ $has_database -eq 1 || $has_shared_runtime -eq 1 || $surface_count -gt 1 ]]; then
    add_command "make test"
    if [[ $has_database -eq 1 ]]; then
      add_command "make db-verify"
    fi
  elif [[ $has_backend -eq 1 ]]; then
    add_backend_commands
  elif [[ $has_frontend -eq 1 ]]; then
    add_frontend_commands
  elif [[ $has_e2e -eq 1 ]]; then
    add_e2e_commands
  fi
fi

if [[ ${#commands[@]} -eq 0 ]]; then
  if [[ "$mode" == "strict" ]]; then
    add_command "make lint"
    add_command "make typecheck"
    add_command "make test"
  else
    add_command "make test"
  fi
fi

printf '%s\n' "${commands[@]}"
