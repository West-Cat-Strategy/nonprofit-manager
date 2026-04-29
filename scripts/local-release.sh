#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: scripts/local-release.sh <check|staging|production>

Run the local release gate. The staging and production modes run the same gate
before delegating to scripts/deploy.sh. Deployment remains a dry run unless
DEPLOY_EXECUTE=1 is set for the deploy wrapper.
EOF
}

mode="${1:-}"

case "$mode" in
  check|staging|production)
    ;;
  -h|--help)
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

cd "$PROJECT_ROOT"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
artifact_dir="$PROJECT_ROOT/tmp/local-release/$timestamp"
sbom_path="$artifact_dir/nonprofit-manager.cdx.json"

log_info "Running local release gate for mode: $mode"
run make ci-full
run make security-scan
run make docker-validate

mkdir -p "$artifact_dir"
log_info "Generating local CycloneDX SBOM at ${sbom_path#$PROJECT_ROOT/}"
npm run --silent sbom > "$sbom_path"

run node -e '
const fs = require("fs");
const path = process.argv[1];
const sbom = JSON.parse(fs.readFileSync(path, "utf8"));
if (sbom.bomFormat !== "CycloneDX") {
  throw new Error(`Expected CycloneDX SBOM, received ${sbom.bomFormat || "unknown"}`);
}
if (!Array.isArray(sbom.components)) {
  throw new Error("Expected SBOM components array");
}
' "$sbom_path"

log_success "Local release gate passed. Artifact: ${sbom_path#$PROJECT_ROOT/}"

case "$mode" in
  check)
    ;;
  staging|production)
    log_info "Delegating to scripts/deploy.sh $mode. Set DEPLOY_EXECUTE=1 to execute the deploy command."
    run "$SCRIPT_DIR/deploy.sh" "$mode"
    ;;
esac
