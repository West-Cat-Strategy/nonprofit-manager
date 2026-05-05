#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

pr_number=""
mode="strict"
print_only=0

usage() {
  cat <<'EOF'
Usage: scripts/verify-pr.sh <PR_NUMBER> [--mode fast|strict] [--print-only]

Compatibility wrapper for PR-oriented verification. It reads the PR changed-file
list with gh, delegates check selection to scripts/select-checks.sh, then runs
the emitted make/package commands in order.

Use --print-only to inspect the selected commands without running them.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      mode="${2:-}"
      shift 2
      ;;
    --print-only|--dry-run)
      print_only=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      if [[ -n "$pr_number" ]]; then
        echo "Unexpected extra argument: $1" >&2
        usage >&2
        exit 2
      fi
      pr_number="$1"
      shift
      ;;
  esac
done

if [[ -z "$pr_number" ]]; then
  echo "PR number is required." >&2
  usage >&2
  exit 2
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required for PR verification." >&2
  exit 127
fi

changed_files=()
while IFS= read -r file; do
  [[ -n "$file" ]] && changed_files+=("$file")
done < <(gh pr diff "$pr_number" --name-only)
if [[ ${#changed_files[@]} -eq 0 ]]; then
  echo "PR #$pr_number has no changed files according to gh pr diff." >&2
  exit 1
fi

files_arg="$(printf '%s\n' "${changed_files[@]}")"
commands=()
while IFS= read -r command; do
  [[ -n "$command" ]] && commands+=("$command")
done < <("$SCRIPT_DIR/select-checks.sh" --mode "$mode" --files "$files_arg")

if [[ "$print_only" -eq 1 ]]; then
  if [[ ${#commands[@]} -gt 0 ]]; then
    printf '%s\n' "${commands[@]}"
  fi
  exit 0
fi

echo "=== PR verification compatibility wrapper: #$pr_number ==="
echo "Mode: $mode"
echo

echo "Changed files:"
printf '  %s\n' "${changed_files[@]}"
echo

if [[ ${#commands[@]} -gt 0 ]]; then
  for command in "${commands[@]}"; do
    echo ">>> $command"
    (cd "$PROJECT_ROOT" && bash -lc "$command")
  done
fi

echo
echo "=== PR verification complete ==="
