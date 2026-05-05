# Verification System
This repository uses `make` targets and selector-backed compatibility wrappers,
not a project bible.

## Entry points
- `make lint`, `make typecheck`, `make test`, and the narrower package/test
  targets in `scripts/README.md` are the supported verification contracts.
- `./scripts/select-checks.sh --mode fast` prints the smallest safe check set
  for the changed files. Use `--mode strict` for shared runtime
  orchestration, hooks, or higher-confidence handoff proof.
- `./scripts/verify.sh` is a supported compatibility wrapper around
  `select-checks.sh`. It runs the selected commands in order, and accepts
  `--print-only` for safe inspection.
- `./scripts/verify-pr.sh <PR_NUMBER>` is a supported compatibility wrapper for
  PR file lists. It reads changed files through `gh pr diff`, delegates to
  `select-checks.sh`, and runs the selected commands in order. Use
  `--print-only` before running an unfamiliar PR lane.

## Historical note

Older verification notes may mention a broad, bespoke `verify.sh` sequence or a
PR-number-specific `verify-pr.sh`. Those flows are historical. Keep them as
reproduction context only; current work should use the Makefile targets directly
or the selector-backed wrappers above.
