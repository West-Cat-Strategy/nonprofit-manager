# P5-T93 Safe-Current Dependency Refresh Proof

**Date:** 2026-05-09
**Status:** Superseded - proof-complete in the May 11 revalidation
**Rows:** `P5-T93`

> Supersession note, 2026-05-12: this row-local artifact preserves the original dependency-refresh validation log, including the Playwright host lock blocker observed during that lane. The live workboard and [P5 review-wave revalidation](P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) now treat `P5-T93` as merged and removed from review on 2026-05-11, so the blocker below is historical context rather than a live workboard blocker.

## Scope

Refresh semver-safe npm workspace dependencies from a fresh `origin/main` worktree, repair clean-install drift, and prove local dependency/audit/Docker image policy gates.

Out of scope unless validation exposes a security blocker:

- Node runtime or `engines.node` changes.
- Docker `node:24` base image changes.
- Broad Docker image tag or digest refresh.
- Major-version dependency upgrades outside the current semver ranges.

## Implementation Notes

- Worktree: `/Users/bryan/projects/nonprofit-manager-worktrees/p5-t93-safe-current-deps`
- Branch: `codex/p5-t93-safe-current-deps`
- Base: `origin/main` at `f01b50e5932112d89eefdd6aba158ebdb0df83f9`
- Local environment note: implementation ran under local Node 26, while the repo contract remains `>=20.19.0` and Docker app images remain on the existing Node 24 base.
- Applied semver-safe workspace updates with `npm update --workspaces --include-workspace-root`.
- Repaired clean-install hygiene by removing the unused root `express-rate-limit` devDependency pin and deleting unused Mailchimp cancel/reschedule helper files that were no longer referenced.
- Kept backend `undici` on `7.25.0` because `undici@8.2.0` requires Node `>=22.19.0`; the repo runtime contract remains Node `>=20.19.0` and this lane does not change runtime engines.
- No Docker base image, tag, or digest changes were made.
- Validation exposed two narrow clean-main test/contract drifts while proving the dependency refresh:
  - The dedicated volunteer background-check approval payload now preserves ISO date-only strings instead of coercing them through local-time `Date` parsing before PostgreSQL casts to `date`.
  - The portal duplicate-email signup integration test now asserts the current migration contract: a pending request must not bind either duplicate accountless contact, and any single-tenant generated contact is cleaned up.

## Validation Log

| Check | Result | Notes |
|---|---|---|
| Workboard/proof scaffold | Passed | Added this proof note and the `P5-T93` live workboard row before package edits. |
| `npm ci` | Passed | Clean-install baseline passed before dependency updates; final clean install after package edits also passed with 0 vulnerabilities. |
| `npm outdated --workspaces --include-workspace-root --json` | Passed with findings | Baseline showed semver-safe workspace updates across backend/frontend tooling and runtime packages. Final output only reports `undici` latest `8.2.0`, intentionally deferred because its Node engine floor is above the repo's Node 20.19+ contract. |
| `npm audit --workspaces --include-workspace-root --audit-level=moderate` | Passed | Baseline audit passed with 0 vulnerabilities. |
| `npm run knip` | Passed after cleanup | Baseline found unused root `express-rate-limit` and two unused Mailchimp helper files; final Knip passed with only the local Node 26 `[DEP0205]` warning. |
| `npm ls --workspaces --include-workspace-root --depth=0` | Passed | Baseline reported install drift; final command exits 0. npm still labels optional wasm helper packages as extraneous in output. |
| `npm update --workspaces --include-workspace-root` | Passed | Semver-safe npm workspace dependency refresh applied. |
| `npm run audit:prod` | Passed | 0 vulnerabilities. |
| `npm run audit` | Passed | 0 vulnerabilities. |
| `make lint` | Passed | Root lint and policy gate passed after final source/test fixes. UI audit counts remained 1517 hardcoded color utilities, 9933 semantic token utilities, and 60 inline style usages. |
| `make typecheck` | Passed | Backend, frontend, and contracts type checks passed after final source/test fixes. |
| `make test` | Blocked at Playwright host CI | Backend passed 268/268 suites and 2196/2196 tests; frontend Vitest passed 248/248 files and 1345/1345 tests. The Playwright host CI segment was blocked by an existing shared E2E lock from PID 48709 in the original checkout and needs retry after that lock clears. |
| `make build` | Passed | Backend build, frontend Vite build, and frontend bundle budget check passed after final source/test fixes. |
| `node scripts/check-docker-image-policy.mjs` | Passed | Docker image policy passed for 22 image references. |
| `make docker-validate-overlays` | Passed | Dev, dev+Caddy, production, production host-access, self-hosted DB, encrypted DB, Plausible, ELK, and Caddy validation passed. |
| `git diff --check` | Passed | No whitespace errors. |

## Known Follow-Up

- Historical note: the original lane requested a Playwright host CI retry after the shared `/tmp/nonprofit-manager-e2e.lock` cleared. That retry requirement was superseded by the May 11 revalidation/main reconciliation that removed `P5-T93` from the live board.
