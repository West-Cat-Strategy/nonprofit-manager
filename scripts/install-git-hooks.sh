#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_DIR="$ROOT_DIR/.git/hooks"
SOURCE_HOOKS_DIR="$ROOT_DIR/scripts/hooks"

if [[ ! -d "$HOOKS_DIR" ]]; then
  echo "Git hooks directory not found at $HOOKS_DIR" >&2
  exit 1
fi

install_hook() {
  local name="$1"
  local source="$SOURCE_HOOKS_DIR/$name"
  local target="$HOOKS_DIR/$name"

  if [[ ! -f "$source" ]]; then
    echo "Missing source hook: $source" >&2
    exit 1
  fi

  cp "$source" "$target"
}

install_hook pre-commit
install_hook pre-push

chmod +x "$HOOKS_DIR/pre-commit" "$HOOKS_DIR/pre-push"

echo "Installed git hooks:"
echo "  - pre-commit -> scripts/hooks/pre-commit"
echo "  - pre-push -> scripts/hooks/pre-push"
