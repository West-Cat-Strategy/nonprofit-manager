# P5-T51 Workbench Intake and Portal Escalation Queue Polish Proof

**Date:** 2026-05-03

## Scope

`P5-T51` adds focused dashboard/workbench queue visibility for current intake-resolution and portal-escalation queues.

Implemented scope:

- Added authenticated `GET /api/v2/dashboard/workqueue-summary`.
- Added permission-filtered summary cards: portal signup contact-resolution counts require `admin:users`, and portal escalation counts require `case:view`.
- Counted pending signup requests with `resolution_status = 'needs_contact_resolution'` and linked staff to the existing portal access surface.
- Counted open/in-review portal escalations scoped to the current account/organization when present and to current-user or unassigned ownership.
- Added workbench focus-panel cards with counts, zero-state detail, and existing-action links only.
- Review-batch follow-up: portal-escalation summary cards now fail closed with zero rows when tenant context is missing instead of allowing an unscoped count fallback.
- May 4 closeout: the related `P5-T54` portal signup `account_id` follow-up keeps no-match signup requests tenant-visible before contact resolution.

Out of scope:

- Database migrations, route catalog changes, portal authentication changes, public portal runtime changes, portal-admin panel rewrites, dashboard-side approve/reject/resolve mutations, generic workflow tooling, saved-queue builders, new queue engines, workflow studio, and unrelated case-routing changes.

## Interface Summary

New response shape from `/api/v2/dashboard/workqueue-summary`:

- `id`: `intake_resolution` or `portal_escalations`
- `label`, `count`, `detail`, `permissionScope`, and `primaryAction`
- Optional `rows` for portal escalation case links

No route catalog, public portal runtime, or queue-view save contract changed. The review-batch follow-up adds migration `120_portal_signup_manual_no_match.sql` for the related portal signup resolution contract under `P5-T54`; the dashboard workqueue API response shape did not change.

## Validation

Passed:

```bash
cd backend && npx jest --runTestsByPath src/modules/dashboard/__tests__/dashboard.queueViews.routes.test.ts src/modules/dashboard/services/__tests__/workqueueSummaryService.test.ts --runInBand
cd backend && npm run type-check
cd backend && npx eslint src/modules/dashboard/routes/index.ts src/modules/dashboard/services/workqueueSummaryService.ts src/modules/dashboard/__tests__/dashboard.queueViews.routes.test.ts src/modules/dashboard/services/__tests__/workqueueSummaryService.test.ts
cd frontend && npm test -- --run src/features/dashboard/pages/__tests__/WorkbenchDashboardPage.test.tsx
cd frontend && npm run type-check
cd frontend && npm run lint
node scripts/check-frontend-feature-boundary-policy.ts
make check-links
git diff --check
```

Review-batch follow-up:

```bash
cd backend && npx jest --runInBand src/modules/dashboard/services/__tests__/workqueueSummaryService.test.ts src/modules/dashboard/__tests__/dashboard.queueViews.routes.test.ts src/__tests__/services/portalAuthService.test.ts src/modules/portalAuth/controllers/__tests__/portalAuthController.test.ts src/__tests__/services/backupService.test.ts
cd backend && npm run type-check
node scripts/check-migration-manifest-policy.ts
git diff --check
```

The focused backend follow-up passed 5 suites / 44 tests.

May 4 closeout:

```bash
make db-verify
cd backend && npx jest --runInBand src/__tests__/services/backupService.test.ts src/__tests__/services/portalAuthService.test.ts src/modules/portalAuth/controllers/__tests__/portalAuthController.test.ts src/modules/portalAdmin/controllers/__tests__/portalAdminController.test.ts src/modules/dashboard/services/__tests__/workqueueSummaryService.test.ts src/__tests__/scripts/checkRouteValidationPolicy.test.ts
make typecheck
make lint
git diff --check
```

The Docker-backed database proof passed after Docker Desktop was started; focused backend closeout passed 6 suites / 58 tests.

Known validation notes:

- The backend Jest command emitted the existing `--localstorage-file` warning; it did not affect test results.
- `make db-verify` was not run because this row does not change migrations, `database/initdb/000_init.sql`, or `database/migrations/manifest.tsv`.
- The earlier Docker-daemon blocker at `/Users/bryan/.docker/run/docker.sock` was cleared by starting Docker Desktop for the May 4 closeout.
