# P5-T105 Report PDF Export Disposition Proof

**Date:** 2026-05-12  
**Status:** Review  
**Workboard row:** [P5-T105](../phases/planning-and-progress.md)

## Scope

Reconcile the direct browser PDF export affordance with the current job-backed report export contract.

Included:

- Remove the direct client-side report-builder PDF export control.
- Preserve CSV and XLSX job-backed export actions.
- Keep scheduled-report attachment formats to CSV and XLSX.
- Document PDF export and PDF scheduling as deferred until a worker-owned job-backed implementation exists.

Excluded:

- Implementing job-backed PDF export.
- Changing backend report export formats.
- Changing worker queue ownership in `P5-T106`.

## Implementation Notes

- `frontend/src/features/reports/hooks/useReportBuilderController.ts` no longer lazy-loads `jspdf` or `jspdf-autotable`.
- `frontend/src/features/reports/pages/ReportBuilderPage.tsx` no longer renders `Export PDF`.
- `frontend/src/types/report.ts` now limits `ReportFormat` to `json`, `csv`, and `xlsx`.
- Report builder, saved report, and scheduled report tests now assert CSV/XLSX remain present while PDF is absent.
- `docs/features/REPORTING_GUIDE.md` explicitly states direct browser-generated PDF export is not exposed.
- Backend direct-export route removal and request-time export bypass cleanup are attributed to `P5-T106`; this proof only claims the PDF affordance disposition and CSV/XLSX queued-export preservation.

## Validation Proof

- Pass: `cd frontend && npm test -- --run src/features/reports/pages/__tests__/ReportBuilderPage.test.tsx src/features/reports/hooks/__tests__/useReportBuilderController.test.tsx src/features/savedReports/pages/__tests__/SavedReportsPage.test.tsx src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx` (4 files, 17 tests).
- Pass: `cd frontend && npm run type-check`.
- Pass: `git diff --check`.
