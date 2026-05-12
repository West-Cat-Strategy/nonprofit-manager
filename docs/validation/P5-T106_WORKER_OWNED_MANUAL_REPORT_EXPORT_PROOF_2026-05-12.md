# P5-T106 Worker-Owned Manual Report Export Proof

**Date:** 2026-05-12  
**Status:** Review  
**Workboard row:** [P5-T106](../phases/planning-and-progress.md)

## Scope

Move manual report exports fully onto the existing queued export job flow so API requests enqueue, poll, and download instead of generating export files in request time.

Included:

- Remove the legacy direct `POST /api/v2/reports/export` route.
- Remove the direct export controller and stale frontend API client method.
- Preserve queued CSV/XLSX export creation, status polling, and artifact download.
- Add a route-construction regression proving `POST /export` is absent and `POST /exports` remains present.
- Update API/reporting docs to describe the queued manual export contract.

Excluded:

- Scheduled-report execution changes.
- PDF export implementation.
- Worker runtime or Docker scheduler changes beyond using the existing queued export path.

## Implementation Notes

- `reports` routes now expose manual exports through `/api/v2/reports/exports` only.
- `ReportBuilderPage` and its controller were already using `createExportJob`, polling, and `downloadExportJob`; this row removes the old bypass so new callers cannot regress to request-time manual export generation.
- Downloaded completed export artifacts still use the existing tabular download headers.

## Validation Proof

- Pass: `npm test -- --runTestsByPath src/__tests__/services/publishing/siteSettingsService.test.ts src/__tests__/services/publishing/siteOperationsService.test.ts src/__tests__/services/backupService.test.ts src/__tests__/integration/publishing.test.ts src/modules/reports/controllers/__tests__/report.handlers.test.ts src/__tests__/modules/wave2RouteConstruction.test.ts --runInBand` from `backend` (6 suites, 42 tests).
- Pass: `npm test -- --run src/features/websites/pages/__tests__/WebsiteIntegrationsPage.test.tsx src/features/reports/pages/__tests__/ReportBuilderPage.test.tsx src/features/reports/hooks/__tests__/useReportBuilderController.test.tsx` from `frontend` (3 files, 10 tests).
- Pass: `npm run type-check` from `backend`.
- Pass: `npm run type-check` from `frontend`.
- Pass: `node scripts/check-route-validation-policy.ts`.
- Pass: `node scripts/check-success-envelope-policy.ts`.
- Pass: `git diff --check`.
