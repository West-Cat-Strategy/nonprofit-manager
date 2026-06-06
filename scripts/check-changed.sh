#!/usr/bin/env bash
# scripts/check-changed.sh
# Identifies changed files and runs relevant checks

set -euo pipefail

BLUE='\033[34m'
GREEN='\033[32m'
YELLOW='\033[33m'
RESET='\033[0m'

BASE=""
MODE="fast"
RUN=0
BASE_PROVIDED=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)
      BASE="$2"
      BASE_PROVIDED=1
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --run)
      RUN=1
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if [[ $BASE_PROVIDED -eq 0 ]]; then
  if git rev-parse --verify --quiet main@{upstream} >/dev/null; then
    BASE="main@{upstream}"
  elif git rev-parse --verify --quiet origin/main >/dev/null; then
    BASE="origin/main"
  else
    BASE="main"
  fi
fi

echo -e "${BLUE}Identifying checks for changes relative to $BASE (mode: $MODE)...${RESET}"

# Get the list of checks from select-checks.sh
CHECKS=$(./scripts/select-checks.sh --base "$BASE" --mode "$MODE")

if [[ -z "$CHECKS" ]]; then
  echo -e "${GREEN}No changes detected or no checks required.${RESET}"
  exit 0
fi

echo -e "${YELLOW}Suggested checks:${RESET}"
echo "$CHECKS"

if [[ $RUN -eq 1 ]]; then
  echo ""
  echo -e "${BLUE}Running suggested checks...${RESET}"
  while IFS= read -r cmd; do
    echo -e "${BLUE}==> $cmd${RESET}"
    eval "$cmd"
  done <<< "$CHECKS"
  echo -e "${GREEN}All checks passed!${RESET}"
fi
