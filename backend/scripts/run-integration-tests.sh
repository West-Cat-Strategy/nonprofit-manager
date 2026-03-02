#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -eq 0 ]]; then
  exec npx jest --forceExit src/__tests__/integration
fi

exec npx jest --forceExit "$@"
