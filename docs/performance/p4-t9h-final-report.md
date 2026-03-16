# P4-T9H Final Report

Date: 2026-03-15  
Task: `P4-T9H`  
Status: `Blocked` (implementation complete, perf evidence captured, and the strict closure rerun is now blocked by an out-of-scope backend lint failure)

## Delivered Scope

1. Added migration `075_staff_backend_efficiency_search_indexes.sql` to enable `pg_trgm` and add trigram-backed expression indexes for staff search on cases, tasks, contacts, and accounts.
2. Rewrote account, contact, task, and case catalog search predicates to use one normalized searchable expression instead of broad `OR ... ILIKE` chains while preserving request/response contracts.
3. Replaced duplicate list/count paths with filtered CTE plus `COUNT(*) OVER()` pagination for accounts, contacts, tasks, and cases.
4. Scoped case related-count loading to the current page of case IDs and contact related-count loading to the current page of contact IDs.
5. Reduced task catalog work from three sequential DB passes to two by combining page rows + total and running summary aggregation in parallel.
6. Parallelized recent-activity backend fan-out queries with `Promise.all` without changing merge ordering or response shape.
7. Debounced only free-text list filters on staff accounts, contacts, and tasks pages; non-text filters remain immediate.
8. Absorbed the repo-wide admin-settings implementation-size prerequisite blocking strict closure by decomposing `UserSettingsPage` and `PortalSection` into smaller feature-local pieces with unchanged route/prop behavior.
9. Fixed a task-owned rollout defect in migration `075`: PostgreSQL rejected `concat_ws(...)` in expression indexes because it is not immutable, so the migration and runtime search SQL were aligned to immutable `coalesce(...) || ...` expressions.

## Verification Completed

- `cd frontend && npm test -- --run` -> pass (`137` files, `1127` tests)
- `make db-verify` -> pass; migration `075_staff_backend_efficiency_search_indexes.sql` verifies cleanly
- `cd e2e && npm run test:smoke` -> pass (`2` passed)
- The earlier intake/contact-form route-smoke blocker recorded in this report is stale; the full frontend Vitest gate now passes on `main`

## Strict Closure Blocker

The strict closure rerun resumed after the already-green gates above and stopped at the new first failing command:

- `make ci-full`

It now fails immediately in an out-of-scope backend lint path:

- `backend/src/services/donationService.ts:334`
  - `no-useless-assignment`: value assigned to `paramCount` is not used in subsequent statements
- `backend/src/services/donationService.ts:573`
  - `no-useless-assignment`: value assigned to `paramCount` is not used in subsequent statements

Because this repo-wide backend lint failure sits outside the staff search/list efficiency surfaces, `P4-T9H` remains blocked until the owning stream clears that gate. No task-owned contract or query-path regression surfaced in this closure pass.

## Performance Artifacts

Runtime evidence is now captured with Docker-backed PostgreSQL 16 using:

- `scripts/perf/p4-t9h-capture.sh`
- `scripts/perf/p4-t9h-seed.sql`

Artifacts:

- Summary: `docs/performance/artifacts/p4-t9h/summary.md`
- Raw plans: `docs/performance/artifacts/p4-t9h/raw/*.json`

Measured results for `%supportwave%` search/list paths on the synthetic seeded dataset:

| Domain | Old count+list ms | New list ms | Improvement ms | Primary observed win |
| --- | ---: | ---: | ---: | --- |
| Accounts | 48.497 | 17.108 | 31.389 | Removed duplicate count pass |
| Contacts | 163.641 | 27.188 | 136.453 | Page-scoped related-count work replaced global aggregates |
| Tasks | 55.402 | 2.347 | 53.055 | Combined count+page query plus trigram index usage |
| Cases | 39.230 | 13.812 | 25.418 | Page-scoped note/document aggregates replaced correlated counts |

Plan notes:

- `tasks` used `idx_tasks_staff_search_trgm` via `Bitmap Index Scan`, showing the intended trigram path directly.
- `contacts` and `cases` showed the largest gains from restricting related-table work to the current page rather than scanning/aggregating across every related row.
- `accounts`, `contacts`, and `cases` still preferred base-table seq scans for the synthetic dataset’s size/selectivity, but they still improved materially because the duplicate count/list and repeated related-count work were removed.

## Related Closure Notes

`make ci-full` already contains the full Playwright `test:ci` gate in this repo, so the ordered closure sequence did not require a standalone `cd e2e && npm run test:ci` rerun after this failure. The sequence now stops earlier at backend lint.

## Next Step

1. Route or resolve the unrelated backend lint failure in `backend/src/services/donationService.ts`.
2. Rerun `make ci-full`.
3. If that full CI gate passes, move `P4-T9H` to review using the existing perf artifacts; run a standalone `cd e2e && npm run test:ci` only if repo policy changes to require it after a green `make ci-full`.
