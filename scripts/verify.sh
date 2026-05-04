#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

mode="strict"
base=""
files_arg=""
print_only=0

usage() {
  cat <<'EOF'
Usage: scripts/verify.sh [--mode fast|strict] [--base <ref>] [--files "<file list>"] [--print-only]

Compatibility wrapper for the retired broad verifier. The current contract is:
  1. ask scripts/select-checks.sh for the changed-file validation set
  2. run the emitted make/package commands in order

Use --print-only to inspect the selected commands without running them.
EOF
}

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
    --print-only|--dry-run)
      print_only=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

selector_args=(--mode "$mode")
if [[ -n "$base" ]]; then
  selector_args+=(--base "$base")
fi
if [[ -n "$files_arg" ]]; then
  selector_args+=(--files "$files_arg")
fi

commands=()
while IFS= read -r command; do
  [[ -n "$command" ]] && commands+=("$command")
done < <("$SCRIPT_DIR/select-checks.sh" "${selector_args[@]}")

if [[ "$print_only" -eq 1 ]]; then
  if [[ ${#commands[@]} -gt 0 ]]; then
    printf '%s\n' "${commands[@]}"
  fi
  exit 0
fi

echo "=== nonprofit-manager verification compatibility wrapper ==="
echo "Mode: $mode"
if [[ -n "$base" ]]; then
  echo "Base: $base"
fi
echo

if [[ ${#commands[@]} -gt 0 ]]; then
  for command in "${commands[@]}"; do
    echo ">>> $command"
    (cd "$PROJECT_ROOT" && bash -lc "$command")
  done
fi

echo
echo "=== verification complete ==="
