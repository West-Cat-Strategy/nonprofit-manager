#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: scripts/e2e-docker-ci-report.sh <ci|audit> [--dry-run]

Run Docker-backed Playwright review lanes while preserving report artifacts under
a unique archive directory in tmp/e2e-reports/.

Modes:
  ci      Run the Docker desktop/browser matrix, then the mobile slice.
  audit   Run the Docker dark-mode route audit slice.

Options:
  --dry-run   Print the resolved report paths and commands without running tests.
EOF
}

if [[ $# -lt 1 ]]; then
  usage >&2
  exit 2
fi

LANE="$1"
shift

case "$LANE" in
  ci|audit)
    ;;
  -h|--help)
    usage
    exit 0
    ;;
  *)
    echo "Unknown Docker E2E report lane: $LANE" >&2
    usage >&2
    exit 2
    ;;
esac

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
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

timestamp() {
  date -u +"%Y%m%dT%H%M%SZ"
}

uppercase() {
  printf '%s' "$1" | tr '[:lower:]' '[:upper:]'
}

resolve_report_root() {
  local report_root="${E2E_REPORT_ROOT:-tmp/e2e-reports}"

  if require_abs_path "$report_root"; then
    printf '%s\n' "$report_root"
    return 0
  fi

  printf '%s\n' "$PROJECT_ROOT/$report_root"
}

create_compat_links() {
  local source_dir="$1"
  local run_dir="$2"

  rm -f "$run_dir/playwright-report" "$run_dir/test-results.json"
  ln -s "$source_dir/playwright-report" "$run_dir/playwright-report"
  ln -s "$source_dir/test-results.json" "$run_dir/test-results.json"
}

run_slice() {
  local slice_name="$1"
  shift

  local slice_dir="$RUN_DIR/$slice_name"
  local slice_html_dir="$slice_dir/playwright-report"
  local slice_json_file="$slice_dir/test-results.json"
  local slice_runner_log_dir="$slice_dir/runner-logs"
  local slice_env_name
  slice_env_name="$(uppercase "$slice_name")"

  if [[ "$DRY_RUN" == "1" ]]; then
    printf 'SLICE_%s_DIR=%s\n' "$slice_env_name" "$slice_dir"
    printf 'SLICE_%s_HTML=%s\n' "$slice_env_name" "$slice_html_dir"
    printf 'SLICE_%s_JSON=%s\n' "$slice_env_name" "$slice_json_file"
    printf 'SLICE_%s_RUNNER_LOG_DIR=%s\n' "$slice_env_name" "$slice_runner_log_dir"
    printf 'SLICE_%s_COMMAND=%s\n' "$slice_env_name" "$*"
    return 0
  fi

  mkdir -p "$slice_dir"
  export E2E_RUNNER_LOG_DIR="$slice_runner_log_dir"
  export PLAYWRIGHT_HTML_OUTPUT_DIR="$slice_html_dir"
  export PLAYWRIGHT_JSON_OUTPUT_FILE="$slice_json_file"

  (
    cd "$PROJECT_ROOT/e2e"
    "$@"
  )
}

REPORT_ROOT="$(resolve_report_root)"
RUN_ID="${E2E_REPORT_RUN_ID:-docker-${LANE}-$(timestamp)-$$}"
RUN_DIR="$REPORT_ROOT/$RUN_ID"
PLAYWRIGHT_BIN="${PLAYWRIGHT_BIN:-$PROJECT_ROOT/node_modules/.bin/playwright}"
OPENED_REPORT_SLICE=""

DESKTOP_COMMAND=(
  env
  CI=1
  bash ../scripts/e2e-playwright.sh docker
  "$PLAYWRIGHT_BIN" test
  --project=chromium
  --project=firefox
  --project=webkit
  --grep-invert "Dark Mode Accessibility Audit|Fresh workspace multi-user session"
)
MOBILE_COMMAND=(
  env
  CI=1
  bash ../scripts/e2e-playwright.sh docker
  "$PLAYWRIGHT_BIN" test
  "--project=Mobile Chrome"
  tests/ux-regression.spec.ts
  --grep "mobile navigation drawer keeps the compact section layout|mobile auth entry routes keep forms above the fold|mobile staff routes use compact cards and avoid horizontal overflow"
)
AUDIT_COMMAND=(
  env
  CI=1
  bash ../scripts/e2e-playwright.sh docker
  "$PLAYWRIGHT_BIN" test
  --project=chromium
  tests/dark-mode-accessibility-audit.spec.ts
)

if [[ "$DRY_RUN" == "1" ]]; then
  printf 'LANE=%s\n' "$LANE"
  printf 'REPORT_ROOT=%s\n' "$REPORT_ROOT"
  printf 'RUN_ID=%s\n' "$RUN_ID"
  printf 'RUN_DIR=%s\n' "$RUN_DIR"
  printf 'PLAYWRIGHT_HTML_OUTPUT_DIR=%s\n' "$RUN_DIR/playwright-report"
  printf 'PLAYWRIGHT_JSON_OUTPUT_FILE=%s\n' "$RUN_DIR/test-results.json"
fi

desktop_status=0
mobile_status=0
audit_status=0
overall_status=0

case "$LANE" in
  ci)
    set +e
    run_slice desktop "${DESKTOP_COMMAND[@]}"
    desktop_status=$?
    set -e

    if [[ "$desktop_status" -eq 0 ]]; then
      set +e
      run_slice mobile "${MOBILE_COMMAND[@]}"
      mobile_status=$?
      set -e
    fi

    if [[ "$desktop_status" -ne 0 ]]; then
      overall_status="$desktop_status"
      OPENED_REPORT_SLICE="desktop"
    elif [[ "$mobile_status" -ne 0 ]]; then
      overall_status="$mobile_status"
      OPENED_REPORT_SLICE="mobile"
    else
      OPENED_REPORT_SLICE="mobile"
    fi
    ;;
  audit)
    set +e
    run_slice audit "${AUDIT_COMMAND[@]}"
    audit_status=$?
    set -e

    overall_status="$audit_status"
    OPENED_REPORT_SLICE="audit"
    ;;
esac

if [[ "$DRY_RUN" == "1" ]]; then
  printf 'DESKTOP_STATUS=%s\n' "$desktop_status"
  printf 'MOBILE_STATUS=%s\n' "$mobile_status"
  printf 'AUDIT_STATUS=%s\n' "$audit_status"
  printf 'OVERALL_STATUS=%s\n' "$overall_status"
  printf 'OPENED_REPORT_SLICE=%s\n' "$OPENED_REPORT_SLICE"
  exit 0
fi

mkdir -p "$RUN_DIR"
create_compat_links "$RUN_DIR/$OPENED_REPORT_SLICE" "$RUN_DIR"

if [[ -f "$RUN_DIR/playwright-report/index.html" || -f "$RUN_DIR/test-results.json" ]]; then
  log_info "Preserved Docker Playwright ${LANE} artifacts under $RUN_DIR"
  log_info "Top-level pointers target the $OPENED_REPORT_SLICE slice."
else
  log_warn "No Playwright report artifacts were produced for the Docker ${LANE} run."
  log_warn "Expected artifact directory: $RUN_DIR/$OPENED_REPORT_SLICE"
fi

exit "$overall_status"
