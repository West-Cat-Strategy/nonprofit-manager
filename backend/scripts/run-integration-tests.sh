#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -eq 0 ]]; then
  exec npx jest --forceExit --runInBand src/__tests__/integration
fi

exec npx jest --forceExit --runInBand "$@"
