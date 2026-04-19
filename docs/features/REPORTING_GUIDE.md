# Report Generator Guide

**Last Updated:** 2026-04-19


## Overview

The reporting system supports ad-hoc analytics and recurring delivery.

Primary capabilities:
- Build custom reports across supported entities.
- Save report definitions for reuse.
- Share saved reports with specific users and roles.
- Publish optional public snapshot links with explicit CSV/XLSX downloads.
- Export in `csv`, `xlsx`, and on-demand `pdf`.
- Schedule recurring report delivery by email.

## Report Builder

1. Navigate to `Reports -> Report Builder`.
2. Select entity, fields, filters, grouping, and aggregations.
3. Run the report preview.
4. Save definition for reuse.

Builder notes:
- Aggregation-only reports are supported (fields are optional when aggregations are present).
- `between` is available for date/number filters.
- Row limit is configurable per report run (max `10,000`).

Supported export formats:
- `csv`
- `xlsx`
- `pdf` (manual/on-demand export)

## Scheduled Reports

Route:
- `/reports/scheduled`

Saved report cards include a `Schedule` action that opens scheduling controls.

### Scheduling model

- Frequencies: `daily`, `weekly`, `monthly`
- Timezone-aware execution
- Email-first delivery
- Attachment formats: `csv`, `xlsx`
- Recipients: one or more email addresses

### Scheduler endpoints

- `GET /api/v2/scheduled-reports`
- `GET /api/v2/scheduled-reports/:id`
- `POST /api/v2/scheduled-reports`
- `PUT /api/v2/scheduled-reports/:id`
- `POST /api/v2/scheduled-reports/:id/toggle`
- `POST /api/v2/scheduled-reports/:id/run-now`
- `DELETE /api/v2/scheduled-reports/:id`
- `GET /api/v2/scheduled-reports/:id/runs`

### Runtime controls

Flags:
- `SCHEDULED_REPORT_SCHEDULER_ENABLED`
- `SCHEDULED_REPORT_SCHEDULER_INTERVAL_MS`
- `SCHEDULED_REPORT_SCHEDULER_BATCH_SIZE`
- `SCHEDULED_REPORT_SCHEDULER_RETRY_ATTEMPTS`
- `SCHEDULED_REPORT_SCHEDULER_RETRY_DELAY_MS`
- `SCHEDULED_REPORT_SCHEDULER_TIMEOUT_MS`
- `REPORT_PUBLIC_SNAPSHOT_CLEANUP_ENABLED`
- `REPORT_PUBLIC_SNAPSHOT_CLEANUP_INTERVAL_MS`
- `REPORT_PUBLIC_SNAPSHOT_CLEANUP_BATCH_SIZE`
- `REPORT_PUBLIC_SNAPSHOT_RETENTION_DAYS`
- `REPORT_PUBLIC_SNAPSHOT_ROW_CAP`

Execution behavior:
- Due schedule claiming uses row locking to avoid duplicate processing.
- Each run records status, row count, output metadata, and errors.
- `run-now` creates a run record immediately and preserves normal history.

## Saved Report Sharing + Public Snapshots

Saved report list endpoint:
- `GET /api/v2/saved-reports?page=1&limit=20&entity=donations&summary=true`
- `summary` defaults to `true` for list pages to avoid loading heavy `report_definition` blobs

List response shape:

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "total_pages": 0
  }
}
```

Notes:
- Use `summary=true` for index screens.
- Use `GET /api/v2/saved-reports/:id` when full `report_definition` detail is required.

Internal share endpoints:
- `GET /api/v2/saved-reports/share/principals?search=...`
- `POST /api/v2/saved-reports/:id/share`
- `DELETE /api/v2/saved-reports/:id/share`
- `POST /api/v2/saved-reports/:id/public-link`
- `DELETE /api/v2/saved-reports/:id/public-link`

Public endpoints:
- `GET /api/v2/public/reports/:token`
- `GET /api/v2/public/reports/:token/download?format=csv|xlsx`

Lifecycle model:
- Public links generate file snapshots (`csv`, `xlsx`) at link creation time.
- Snapshot generation is capped at `10,000` rows.
- Revoke/expiry sets retention metadata for audit.
- Cleanup scheduler purges retained files after retention window.
- Snapshot metadata row is preserved after purge for audit history.

Storage notes:
- Snapshot artifacts are stored under `uploads/report-snapshots`.
- Ensure `UPLOAD_DIR` is writable in each environment.

### Current limits

- Frequency options are controlled (no raw cron in v1).
- Scheduled attachment formats are `csv` and `xlsx`.
- PDF scheduling is deferred.

## Technical Architecture

Backend:
- `backend/src/services/reportService.ts`
- `backend/src/services/exportService.ts`
- `backend/src/services/scheduledReportService.ts`
- `backend/src/services/scheduledReportSchedulerService.ts`

Frontend:
- `frontend/src/features/reports/pages/ReportBuilderPage.tsx`
- `frontend/src/features/savedReports/pages/SavedReportsPage.tsx`
- `frontend/src/features/scheduledReports/pages/ScheduledReportsPage.tsx`
- `frontend/src/features/scheduledReports/state/index.ts`

Data model:
- `scheduled_reports`
- `scheduled_report_runs`
- `saved_report_public_snapshots`
