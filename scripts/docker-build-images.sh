#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat >&2 <<'EOF'
Usage: scripts/docker-build-images.sh <build|rebuild|validate> [--dry-run]
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 2
fi

mode="$1"
shift

dry_run=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      dry_run=1
      ;;
    *)
      usage
      exit 2
      ;;
  esac
  shift
done

DOCKER_WORKSPACE_BUILD_CONTEXT="${DOCKER_WORKSPACE_BUILD_CONTEXT:---build-context workspace=.}"
BACKEND_DOCKER_IMAGE="${BACKEND_DOCKER_IMAGE:-nonprofit-manager-backend:latest}"
FRONTEND_DOCKER_IMAGE="${FRONTEND_DOCKER_IMAGE:-nonprofit-manager-frontend:latest}"

read -r -a build_context_args <<< "$DOCKER_WORKSPACE_BUILD_CONTEXT"

print_or_run() {
  local -a cmd=("$@")

  if [[ "$dry_run" == "1" ]]; then
    printf '%s\n' "${cmd[*]}"
    return 0
  fi

  "${cmd[@]}"
}

run_build() {
  local dockerfile="$1"
  local context_dir="$2"
  local image_tag="$3"
  local target_name="$4"
  shift 4

  local -a mode_args=("$@")
  local -a cmd=(docker build)

  if [[ ${#build_context_args[@]} -gt 0 ]]; then
    cmd+=("${build_context_args[@]}")
  fi

  if [[ ${#mode_args[@]} -gt 0 ]]; then
    cmd+=("${mode_args[@]}")
  fi

  if [[ -n "$image_tag" ]]; then
    cmd+=(-t "$image_tag")
  fi

  if [[ -n "$target_name" ]]; then
    cmd+=(--target "$target_name")
  fi

  cmd+=(-f "$dockerfile" "$context_dir")
  print_or_run "${cmd[@]}"
}

case "$mode" in
  build)
    run_build backend/Dockerfile backend "$BACKEND_DOCKER_IMAGE" ""
    run_build frontend/Dockerfile frontend "$FRONTEND_DOCKER_IMAGE" ""
    ;;
  rebuild)
    run_build backend/Dockerfile backend "$BACKEND_DOCKER_IMAGE" "" --no-cache
    run_build frontend/Dockerfile frontend "$FRONTEND_DOCKER_IMAGE" "" --no-cache
    ;;
  validate)
    # Validate the explicit workspace npm-install stages so Dockerfile refactors
    # cannot silently skip the shared lockfile path used by clean rebuilds.
    run_build backend/Dockerfile backend "" "workspace-deps" --pull --no-cache
    run_build backend/Dockerfile backend "" "workspace-production-deps" --pull --no-cache
    run_build backend/Dockerfile backend "" "" --pull --no-cache
    run_build frontend/Dockerfile frontend "" "workspace-deps" --pull --no-cache
    run_build frontend/Dockerfile frontend "" "" --pull --no-cache
    ;;
  *)
    usage
    exit 2
    ;;
esac
