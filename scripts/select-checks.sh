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

Print an ordered set of repo checks based on the changed files.
  fast   emits the smallest safe slice for the touched surfaces
  strict broadens docs/runtime/orchestration changes into higher-confidence checks
EOF
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

case "$mode" in
  fast|strict)
    ;;
  *)
    echo "Unknown mode: $mode (expected fast or strict)" >&2
    exit 2
    ;;
esac

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
has_runtime_orchestration=0
has_runtime_docs=0
has_hook_tooling=0
has_link_checker_tool=0
has_doc_api_linter_tool=0
has_policy_tooling=0
has_security_tooling=0
has_tooling_contracts=0

is_docs_path() {
  case "$1" in
    README.md|CONTRIBUTING.md|AGENTS.md|agents.md|docs/*|backend/README.md|frontend/README.md|frontend/SETUP.md|e2e/README.md|database/README.md|scripts/README.md)
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

is_runtime_docs_path() {
  case "$1" in
    docs/testing/*|docs/development/GETTING_STARTED.md|docs/development/TROUBLESHOOTING.md|docs/development/AGENT_INSTRUCTIONS.md|e2e/README.md|scripts/README.md)
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
    if is_runtime_docs_path "$file"; then
      has_runtime_docs=1
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
    e2e/playwright.config.ts|e2e/package.json)
      has_e2e=1
      has_runtime_orchestration=1
      has_tooling_contracts=1
      ;;
    e2e/*)
      has_e2e=1
      ;;
    database/*)
      has_database=1
      ;;
    scripts/check-links.sh)
      has_link_checker_tool=1
      ;;
    scripts/check-doc-api-versioning.ts)
      has_doc_api_linter_tool=1
      has_tooling_contracts=1
      ;;
    scripts/check-*.ts|scripts/ui-audit.ts)
      has_policy_tooling=1
      has_tooling_contracts=1
      ;;
    scripts/security-scan.sh)
      has_security_tooling=1
      has_tooling_contracts=1
      ;;
    scripts/install-git-hooks.sh|scripts/hooks/*|.githooks/*)
      has_hook_tooling=1
      has_tooling_contracts=1
      ;;
    scripts/db-*.sh|scripts/verify-migrations.sh)
      has_database=1
      has_runtime_orchestration=1
      has_tooling_contracts=1
      ;;
    Makefile|package.json|package-lock.json|tsconfig*.json|docker-compose*.yml|docker-compose*.yaml|contracts/*|scripts/ci.sh|scripts/deploy.sh|scripts/e2e-*.sh|scripts/select-checks.sh|scripts/tests/*|backend/scripts/run-*.sh)
      has_runtime_orchestration=1
      has_tooling_contracts=1
      case "$file" in
        docker-compose*.yml|docker-compose*.yaml)
          has_database=1
          ;;
      esac
      ;;
    *)
      has_runtime_orchestration=1
      ;;
  esac
done

surface_count=$((has_backend + has_frontend + has_e2e + has_database + has_runtime_orchestration))
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

  if [[ $has_link_checker_tool -eq 1 ]]; then
    add_command "make check-links"
  fi

  if [[ $has_doc_api_linter_tool -eq 1 ]]; then
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

add_doc_commands

if [[ $has_policy_tooling -eq 1 ]]; then
  add_command "make lint"
  if [[ "$mode" == "strict" ]]; then
    add_command "make typecheck"
  fi
fi

if [[ $has_security_tooling -eq 1 ]]; then
  add_command "make security-scan"
fi

if [[ $has_tooling_contracts -eq 1 ]]; then
  add_command "make test-tooling"
fi

if [[ $has_hook_tooling -eq 1 ]]; then
  add_command "./scripts/install-git-hooks.sh --dry-run"
  if [[ "$mode" == "strict" ]]; then
    add_command "make lint"
    add_command "make typecheck"
  fi
fi

if [[ $has_runtime_docs -eq 1 && $surface_count -eq 0 && "$mode" == "strict" ]]; then
  add_command "make test-coverage-full"
fi

if [[ "$mode" == "strict" ]]; then
  if [[ $surface_count -eq 0 ]]; then
    :
  elif [[ $has_runtime_orchestration -eq 1 ]]; then
    add_command "make lint"
    add_command "make typecheck"
    add_command "make test-coverage-full"
    if [[ $has_database -eq 1 ]]; then
      add_command "make db-verify"
    fi
  elif [[ $has_database -eq 1 || $surface_count -gt 1 ]]; then
    add_command "make lint"
    add_command "make typecheck"
    add_command "make test"
    if [[ $has_database -eq 1 ]]; then
      add_command "make db-verify"
    fi
  elif [[ $has_backend -eq 1 ]]; then
    add_backend_commands
  elif [[ $has_frontend -eq 1 ]]; then
    add_frontend_commands
  elif [[ $has_e2e -eq 1 ]]; then
    add_command "cd e2e && npm run test:ci"
  fi
else
  if [[ $surface_count -eq 0 ]]; then
    :
  fi

  if [[ $has_backend -eq 1 ]]; then
    add_backend_commands
  fi

  if [[ $has_frontend -eq 1 ]]; then
    add_frontend_commands
  fi

  if [[ $has_e2e -eq 1 ]]; then
    add_e2e_commands
  fi

  if [[ $has_runtime_orchestration -eq 1 ]]; then
    add_command "make test-e2e-docker-smoke"
  fi

  if [[ $has_database -eq 1 ]]; then
    add_command "make db-verify"
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
