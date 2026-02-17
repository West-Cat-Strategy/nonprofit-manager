#!/usr/bin/env bash
set -euo pipefail

# Load common utilities and configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
source "$SCRIPT_DIR/lib/config.sh"

if ! is_git_repo; then
  log_error "git is required to install hooks"
  exit 1
fi

log_info "Installing git hooks..."
git -C "$PROJECT_ROOT" config core.hooksPath "$GIT_HOOKS_DIR"

log_success "Git hooks installed. Hooks path set to $GIT_HOOKS_DIR."
