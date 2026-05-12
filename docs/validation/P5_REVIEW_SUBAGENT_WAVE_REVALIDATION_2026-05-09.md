# Phase 5 Review Subagent Wave Revalidation

**Date:** 2026-05-09
**Updated:** 2026-05-11

This note captures the validation-only subagent wave for the original 26 `Review` rows on the Phase 5 workboard. The lead lane preserved the occupied queue-view checkout, kept docs and workboard edits lead-owned, and did not make runtime/API changes.

`P5-T93` appeared on the board after the initial baseline and was not part of this 26-row wave. The 2026-05-10 update records the narrower remaining-blocker wave for `P5-T71`, `P5-T78`, `P5-T85`, `P5-T90`, `P5-T91`, `P5-T92`, and `P5-T93`, plus the residual local-gate follow-up row `P5-T94`. The 2026-05-11 update reconciles the post-merge state: `P5-T93`, `P5-T94`, `P5-T95`, `P5-T96`, and `P5-T97` are merged on `main` and are no longer review targets.

## Disposition Summary

| Row | Disposition | Current action |
|---|---|---|
| `P5-T6` | Keep live as scope gate | Docs/reference integrity passed; future runtime work still needs separate signed-out rows. |
| `P5-T63` | Proof-complete | Removed from live board. |
| `P5-T64` | Proof-complete | Removed from live board. |
| `P5-T65` | Proof-complete | Removed from live board. |
| `P5-T67` | Proof-complete | Removed from live board. |
| `P5-T70` | Proof-complete | Removed from live board. |
| `P5-T71` | Proof-complete | Removed from live board on 2026-05-10 after host fixture recovery and passing Chromium public workflow proof. |
| `P5-T72` | Proof-complete | Removed from live board. |
| `P5-T73` | Proof-complete | Removed from live board. |
| `P5-T74` | Proof-complete | Removed from live board. |
| `P5-T76` | Proof-complete | Removed from live board. |
| `P5-T78` | Proof-complete | Removed from live board on 2026-05-10 after host fixture recovery and passing public workflow/starter-site proof. |
| `P5-T79`-`P5-T83` | Proof-complete | Removed from live board. |
| `P5-T84` | Proof-complete | Removed from live board; the later volunteer service size follow-up was tracked and resolved under `P5-T90`. |
| `P5-T85` | Proof-complete | Removed from live board on 2026-05-10 after the newer row-local proof was reconciled: desktop Docker matrix, exact Firefox rerun, mobile tail, and Docker audit had already passed. |
| `P5-T86`-`P5-T89` | Proof-complete | Removed from live board. |
| `P5-T90` | Proof-complete | Removed from live board on 2026-05-10 after `volunteerService.ts` was reduced to 894 lines, implementation-size policy passed, and focused volunteer approval DB proof passed. |
| `P5-T91` | Proof-complete | Removed from live board on 2026-05-10 after the direct `express-serve-static-core` import was removed and focused queue-view backend/frontend proof passed. Residual unrelated Knip findings moved to `P5-T94`. |
| `P5-T92` | Proof-complete | Removed from live board on 2026-05-10 after an explicit reject-click frontend proof was added and focused website forms/type/lint/contracts proof passed. |
| `P5-T93` | Proof-complete | Removed from live board on 2026-05-11 after the safe dependency refresh, testing-strategy overhaul, and case-form authoring diagnostics follow-through were merged on `main`. |
| `P5-T94` | Proof-complete | Removed from live board on 2026-05-11 after Mailchimp campaign-dialog modularity, scoped semantic cleanup, Knip, lint, and typecheck gate proof were merged on `main`. |
| `P5-T95` | Proof-complete | Removed from live board on 2026-05-11 after worker container parity and hardening landed on `main`. |
| `P5-T96` | Proof-complete | Removed from live board on 2026-05-11 after small-VPS runtime and queued report export refactor proof landed on `main`. |
| `P5-T97` | Proof-complete | Removed from live board on 2026-05-11 after controller helper modularity landed on `main`. |

## 2026-05-10 Remaining-Blocker Wave

- `P5-T90`: `backend/src/services/volunteerService.ts` is now 894 lines. `node scripts/check-implementation-size-policy.ts`, focused volunteer approval DB proof, and path-scoped `git diff --check` passed. Root `make lint` now gets past implementation-size policy and fails later at UI audit baseline drift tracked in `P5-T94`.
- `P5-T91`: `backend/src/modules/shared/queueViews/queueViewRoutes.ts` no longer imports `express-serve-static-core`; backend type-check and focused queue-view backend/frontend slices passed. `npm run knip` no longer reports the queue-view dependency but still reports unrelated unused Mailchimp files and the root `express-rate-limit` devDependency, tracked in `P5-T94`.
- `P5-T92`: the forms-console reject-click test now asserts the reject API call, `rejected` status, success notice, and hidden `Accept`/`Reject`/`Fulfill` controls. Focused `WebsiteFormsPage.test.tsx`, frontend type-check, contracts type-check, file-scoped ESLint, direct frontend lint, and path-scoped `git diff --check` passed.
- `P5-T94`: the campaign creation modal state, validation, request-building, preview, test-send, submit, and targeting logic moved into `useCampaignCreateModalForm.ts`; stale semantic dead code in Loop people APIs, website state thunks, builder template thunks, backend direct-role/contact-document helpers, and compatibility exports was removed; the stale Mailchimp helper files are absent, the root `express-rate-limit` devDependency is absent while the backend runtime dependency is preserved, and the UI audit baseline now matches the current static scan.
- `P5-T93`: read-only review found a diagnostics bug where valid single-checkbox questions without options can be reported as option-less. Frontend type-check, frontend lint, `make check-links`, and tracked path-scoped diff checks passed; the focused two-file Vitest command timed out under default file parallelism but passed with `--fileParallelism=false`.
- `P5-T71`/`P5-T78`: host E2E stale state was confirmed as an `e2e/.cache`/isolated DB mismatch. After clearing `e2e/.cache`, rebuilding the isolated DB, and seeding through the starter public-site proof, host Chromium `tests/public-workflows.spec.ts` passed and the starter public-site proof passed.
- `P5-T85`: no Docker rerun was needed. The current P5-T85 proof already records the May 8 fresh Docker review stack, full desktop matrix, exact Firefox rerun, mobile tail, and Docker audit pass; the live board text was stale.
- `P5-T95`/`P5-T96`/`P5-T97`: the row-local proof notes are merged on `main`; they are not live review targets.

## Validation Highlights

- Lead on 2026-05-09: `make typecheck`, `make check-links`, `git diff --check`, and `jq empty reference-repos/manifest.lock.json /Users/bryan/projects/reference-repos/docs/index.json` passed.
- Lead on 2026-05-09: `make lint` failed only at `node scripts/check-implementation-size-policy.ts` because `backend/src/services/volunteerService.ts` exceeded the line cap.
- Lead on 2026-05-10: `make typecheck`, `make check-links`, `git diff --check`, and `cd frontend && npm run lint` passed.
- Lead on 2026-05-10: `P5-T94` cleared the residual local gates. `npm run knip` passed with only the local Node `[DEP0205]` warning, `make lint` passed including UI audit baseline enforcement at `1524/9936/60`, and `make typecheck` passed across backend, frontend, and shared contracts.
- Scope-control: `P5-T6` docs still state that queued runtime work, typed appeals, restrictions, donation batches, memberships, finance breadth, workflow studios, and direct source copying require separate signed-out rows.
- Frontend/tooling/docs: `P5-T63`, `P5-T67`, and `P5-T76` focused tests, frontend type-check/lint, `make test-tooling`, `make check-links`, and diff checks passed.
- Backend/integration contracts: `P5-T64`, `P5-T65`, `P5-T70`, and `P5-T74` focused Jest slices plus backend type-check/lint passed.
- Website/public workflow: `P5-T72` and `P5-T73` focused frontend/backend slices, type-check/lint, docs links, and diff checks passed. `P5-T71` and `P5-T78` browser reruns initially failed before workflow execution at `e2e/helpers/auth.ts` with invalid `admin@example.com` credentials; the 2026-05-10 wave repaired stale host fixture/cache state and reran the browser proof successfully.
- Security/remediation: `P5-T79`-`P5-T84` and `P5-T86`-`P5-T89` focused backend/security slices passed, along with `make db-verify`, `make security-scan`, audits, Docker image policy, overlay validation, and UI audit baseline enforcement.
- Current dirty checkout: `P5-T90` dedicated volunteer approval DB proof passed; `P5-T91` backend/frontend queue-view behavior proof passed; `P5-T92` frontend/public-action/backend behavior tests passed for covered paths.
- Docker/E2E: `make docker-validate-overlays`, `node scripts/check-docker-image-policy.mjs`, pinned nginx smoke, `make docker-build`, `make docker-validate`, Docker Scout quickviews, and `make test-e2e-docker-smoke` passed. The later P5-T85 row-local proof also records the fresh Docker review stack, full Docker desktop matrix, exact Firefox rerun, mobile tail, and Docker audit pass.

## Live Blockers

- No blocker remains in this revalidation note. `P5-T75` remains a separate live, time-gated blocker on the workboard.

## Broad Gate Status

- `make typecheck` passed.
- `make check-links` passed with 215 files and 1400 local links after lead closeout docs were updated.
- `git diff --check` passed.
- `npm run knip` passed with only the local Node `[DEP0205]` warning after the residual Mailchimp/root dependency findings were cleared.
- `make lint` passed end to end, including backend lint, shared policy checks, UI audit baseline enforcement, and frontend lint. UI audit reported `1524/9936/60`.
- `make ci-full` remains deferred. The P5-T85 Docker evidence is reconciled and the local lint/Knip gate is no longer blocked by `P5-T94`.
- 2026-05-11 docs-only reconciliation: `make check-links` passed with 221 files and 1425 local links, and `git diff --check` passed after the live board, archive note, and validation index were updated to remove stale `P5-T93`-`P5-T97` review rows.
