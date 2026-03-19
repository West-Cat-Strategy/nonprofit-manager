#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "P4-T9H capture helper"
echo "Repository root: $ROOT_DIR"
echo "Captured artifacts already live under docs/performance/artifacts/p4-t9h/"
echo "Use this helper as the documented entrypoint for refresh or archival workflows."

