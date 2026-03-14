# P4-T9H Final Report

Date: 2026-03-13  
Task: `P4-T9H`  
Status: `Blocked` (implementation complete, perf evidence captured, and the strict closure rerun is now blocked by an out-of-scope frontend route-smoke failure)

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

- `cd frontend && npm test -- --run src/features/adminOps/pages/__tests__/UserSettingsPage.test.tsx src/features/adminOps/pages/portalAdmin/panels/__tests__/PortalPanels.test.tsx` -> pass
- `cd backend && npx jest --runInBand src/__tests__/services/accountService.test.ts src/__tests__/services/contactService.test.ts src/__tests__/services/taskService.test.ts src/__tests__/services/caseService.test.ts` -> pass
- `make db-verify` -> pass
- `scripts/select-checks.sh --files "<changed-file set>" --mode strict` -> emitted strict sequence successfully

Additional closure rerun evidence:

- `cd frontend && npx eslint src/features/builder/components/TemplateSettingsDialog.tsx src/features/builder/pages/PageEditorPage.tsx src/features/builder/components/templateSettingsDraft.ts` -> pass
- `cd frontend && npm run build` -> pass
- `cd backend && npx jest --runInBand src/__tests__/integration/adminEmailSettings.test.ts` -> pass
- `make lint` -> pass (warning only in `frontend/src/features/tasks/pages/TaskListPage.tsx`)
- `make typecheck` -> pass
- `cd backend && npm run test:unit` -> pass
- `cd backend && npm run test:integration` -> pass
- `node scripts/ui-audit.ts` -> pass

## Strict Closure Blocker

The builder lint/build issue and the admin email-settings integration-test drift are both cleared. The new first failing strict command is step 6:

- `cd frontend && npm test -- --run`

It now fails in an out-of-scope route-smoke path:

- `frontend/src/pages/__tests__/RouteUxSmoke.test.tsx`
  - failing case: `renders H1 and primary action without console errors for 'intake-new' route`
  - visible assertion failure: could not find the `Create contact` button
- `frontend/src/components/contactForm/sections/RolesSection.tsx`
  - unhandled error: `TypeError: availableRoles.filter is not a function`

Targeted repro confirms the same failure:

- `cd frontend && npm test -- --run src/pages/__tests__/RouteUxSmoke.test.tsx` -> fail

Because the first remaining strict-gate failure is now this broader frontend route-smoke regression, `P4-T9H` remains blocked until the intake/contact-form issue is routed or resolved in its owning stream.

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

`P4-T9A` rerun evidence shares the same closure lane. Its two previously known blockers are cleared in this pass:

1. The builder export-rule/build failure is fixed by moving `TemplateSettingsDraft` and `toTemplateSettingsDraft` into `frontend/src/features/builder/components/templateSettingsDraft.ts`.
2. The admin email-settings integration drift is fixed in test-only form by reading `response.body.data?.data ?? response.body.data`.

However, the ordered closure sequence is now blocked earlier by the same out-of-scope frontend route-smoke failure, so the unchanged `make ci-full` and `cd e2e && npm run test:ci` reruns were not reached in this pass.

## Next Step

1. Route or resolve the unrelated intake/contact-form route-smoke regression (`RouteUxSmoke` / `RolesSection`), then rerun the strict selector sequence from step 6: `cd frontend && npm test -- --run`.
2. Once that earlier frontend gate is clear, rerun the remaining closure commands for this lane in order: `make db-verify`, `cd e2e && npm run test:smoke`, `make ci-full`, and `cd e2e && npm run test:ci`.
3. If the downstream `P4-T9A` commands surface a new first failure after that rerun, document that gate with fresh evidence; otherwise move `P4-T9H` to review using the existing perf artifacts.
