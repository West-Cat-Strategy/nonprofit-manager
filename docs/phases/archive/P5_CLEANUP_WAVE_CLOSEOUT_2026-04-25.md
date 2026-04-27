# Phase 5 Cleanup Wave Closeout

**Last Updated:** 2026-04-25

**Date:** 2026-04-25

This artifact preserves the signoff chain for the cleanup implementation rows produced by the Phase 5 dead-code, dead-docs, and modularity/simplicity review pass. These rows no longer own a concrete next step on the live workboard.

## Summary

- Retired confirmed-unused backend root service shims while preserving module-owned implementations and route/worker behavior.
- Retired frontend builder/editor/template root wrappers and moved tests to feature-owned builder paths.
- Hardened Knip entrypoints and policy-tooling coverage so future unused-code findings are more precise.
- Added docs navigation and archive indexing links for active publishing, validation, reference-pattern, and historical surfaces.
- Completed behavior-preserving implementation-size cleanup for oversized route-schema, Mailchimp service/modal, shared case-type, and UI files.

## Removed Rows

| Row | Disposition | Evidence |
|---|---|---|
| `P5-T9A` | Removed from live board; backend root service shim retirement complete. | [../../validation/P5_CLEANUP_WAVE_PROOF_2026-04-25.md](../../validation/P5_CLEANUP_WAVE_PROOF_2026-04-25.md) records retired shims, canonical module-path doc updates, compatibility-ledger notes, and backend proof. |
| `P5-T9B` | Removed from live board; frontend builder root component shim retirement complete. | [../../validation/P5_CLEANUP_WAVE_PROOF_2026-04-25.md](../../validation/P5_CLEANUP_WAVE_PROOF_2026-04-25.md) records retired root builder/editor/template wrappers, migrated tests, and stale baseline removal. |
| `P5-T9C` | Removed from live board; Knip configuration hardening complete. | [../../validation/P5_CLEANUP_WAVE_PROOF_2026-04-25.md](../../validation/P5_CLEANUP_WAVE_PROOF_2026-04-25.md) records the green `npm run knip` proof. |
| `P5-T10A` | Removed from live board; docs navigation and archive indexing cleanup complete. | [../../validation/P5_CLEANUP_WAVE_PROOF_2026-04-25.md](../../validation/P5_CLEANUP_WAVE_PROOF_2026-04-25.md) records the navigation additions and green link-check proof. |
| `P5-T11A` | Removed from live board; implementation-size policy cleanup complete. | [../../validation/P5_CLEANUP_WAVE_PROOF_2026-04-25.md](../../validation/P5_CLEANUP_WAVE_PROOF_2026-04-25.md) records the behavior-preserving extractions and green lint/type/test proof. |

## Validation

The row-local proof note records green `make lint-implementation-size`, backend and frontend type-checks, root `make typecheck`, `npm run knip`, `make check-links`, `make lint-doc-api-versioning`, `make test-tooling`, `make db-verify`, targeted backend and frontend behavior tests, `cd frontend && npm run lint`, `make lint`, and `git diff --check`.

`P5-T12` remains a separate full E2E/Playwright review lane; its fresh host-first and Docker follow-on proof is recorded in [../../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md](../../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md).
