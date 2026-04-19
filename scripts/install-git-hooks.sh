#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: scripts/install-git-hooks.sh [--dry-run] [--force]

Install the repo-managed git hooks into the resolved Git hooks path.
  --dry-run  print the actions without writing files
  --force    replace existing hook files that differ from the repo-managed source
EOF
}

dry_run=0
force=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      dry_run=1
      shift
      ;;
    --force)
      force=1
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

resolve_abs_path() {
  local value="$1"

  if [[ "$value" == /* ]]; then
    printf '%s\n' "$value"
    return 0
  fi

  printf '%s\n' "$PROJECT_ROOT/$value"
}

SOURCE_HOOKS_DIRS=(
  "$PROJECT_ROOT/.githooks"
  "$PROJECT_ROOT/scripts/hooks"
)

hooks_dir_raw="$(git -C "$PROJECT_ROOT" rev-parse --git-path hooks 2>/dev/null || true)"
hooks_path_config="$(git -C "$PROJECT_ROOT" config --get core.hooksPath || true)"

if [[ -z "$hooks_dir_raw" ]]; then
  echo "Unable to resolve the Git hooks directory for $PROJECT_ROOT" >&2
  exit 1
fi

HOOKS_DIR="$(resolve_abs_path "$hooks_dir_raw")"

declare -A seen_hooks=()
hook_names=()

resolve_source_hook() {
  local name="$1"
  local source_dir

  for source_dir in "${SOURCE_HOOKS_DIRS[@]}"; do
    if [[ -f "$source_dir/$name" ]]; then
      printf '%s\n' "$source_dir/$name"
      return 0
    fi
  done

  return 1
}

record_hook_name() {
  local name="$1"

  if [[ -n "${seen_hooks[$name]:-}" ]]; then
    return
  fi

  seen_hooks["$name"]=1
  hook_names+=("$name")
}

discover_hook_names() {
  local source_dir
  local source_path

  for source_dir in "${SOURCE_HOOKS_DIRS[@]}"; do
    [[ -d "$source_dir" ]] || continue

    for source_path in "$source_dir"/*; do
      [[ -f "$source_path" ]] || continue
      record_hook_name "$(basename "$source_path")"
    done
  done
}

same_path() {
  local left="$1"
  local right="$2"

  [[ "$(cd "$(dirname "$left")" && pwd -P)/$(basename "$left")" == "$(cd "$(dirname "$right")" && pwd -P)/$(basename "$right")" ]]
}

ensure_target_dir() {
  if [[ "$dry_run" == "1" ]]; then
    log_info "[dry-run] mkdir -p $HOOKS_DIR"
    return 0
  fi

  mkdir -p "$HOOKS_DIR"
}

install_hook() {
  local name="$1"
  local source="$2"
  local target="$HOOKS_DIR/$name"

  if [[ -e "$target" ]]; then
    if same_path "$source" "$target"; then
      if [[ "$dry_run" == "1" ]]; then
        log_info "[dry-run] chmod +x $target"
      else
        chmod +x "$target"
      fi
      log_success "$name already points at the repo-managed hook source."
      return 0
    fi

    if cmp -s "$source" "$target"; then
      if [[ "$dry_run" == "1" ]]; then
        log_info "[dry-run] chmod +x $target"
      else
        chmod +x "$target"
      fi
      log_success "$name is already installed."
      return 0
    fi

    if [[ "$force" != "1" ]]; then
      log_warn "Skipping $name because $target already exists and differs from $source."
      log_warn "Re-run with --force to replace the existing hook."
      return 0
    fi
  fi

  if [[ "$dry_run" == "1" ]]; then
    log_info "[dry-run] cp $source $target"
    log_info "[dry-run] chmod +x $target"
    return 0
  fi

  cp "$source" "$target"
  chmod +x "$target"
  log_success "Installed $name from $(realpath --relative-to="$PROJECT_ROOT" "$source" 2>/dev/null || printf '%s' "$source")."
}

discover_hook_names

if [[ ${#hook_names[@]} -eq 0 ]]; then
  echo "No repo-managed hook sources found under .githooks or scripts/hooks." >&2
  exit 1
fi

ensure_target_dir

if [[ -n "$hooks_path_config" ]]; then
  log_info "Installing hooks into $HOOKS_DIR (core.hooksPath=$hooks_path_config)."
else
  log_info "Installing hooks into $HOOKS_DIR (Git default/hooksPath-resolved directory)."
fi

for hook_name in "${hook_names[@]}"; do
  source_hook="$(resolve_source_hook "$hook_name" || true)"
  if [[ -z "$source_hook" ]]; then
    echo "Missing source hook: $hook_name" >&2
    exit 1
  fi

  install_hook "$hook_name" "$source_hook"
done

echo "Git hook install complete."
