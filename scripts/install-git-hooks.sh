#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required to install hooks" >&2
  exit 1
fi

git -C "$root_dir" config core.hooksPath scripts/hooks

echo "Git hooks installed. Hooks path set to scripts/hooks."
