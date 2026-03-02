# Report Generator Guide

## Overview

The reporting system supports ad-hoc analytics and recurring delivery.

Primary capabilities:
- Build custom reports across supported entities.
- Save report definitions for reuse.
- Export in `csv`, `xlsx`, and on-demand `pdf`.
- Schedule recurring report delivery by email.

## Report Builder

1. Navigate to `Reports -> Report Builder`.
2. Select entity, fields, filters, grouping, and aggregations.
3. Run the report preview.
4. Save definition for reuse.

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

- `GET /api/scheduled-reports`
- `GET /api/scheduled-reports/:id`
- `POST /api/scheduled-reports`
- `PUT /api/scheduled-reports/:id`
- `POST /api/scheduled-reports/:id/toggle`
- `POST /api/scheduled-reports/:id/run-now`
- `DELETE /api/scheduled-reports/:id`
- `GET /api/scheduled-reports/:id/runs`

### Runtime controls

Flags:
- `SCHEDULED_REPORT_SCHEDULER_ENABLED`
- `SCHEDULED_REPORT_SCHEDULER_INTERVAL_MS`
- `SCHEDULED_REPORT_SCHEDULER_BATCH_SIZE`
- `SCHEDULED_REPORT_SCHEDULER_RETRY_ATTEMPTS`
- `SCHEDULED_REPORT_SCHEDULER_RETRY_DELAY_MS`
- `SCHEDULED_REPORT_SCHEDULER_TIMEOUT_MS`

Execution behavior:
- Due schedule claiming uses row locking to avoid duplicate processing.
- Each run records status, row count, output metadata, and errors.
- `run-now` creates a run record immediately and preserves normal history.

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
- `frontend/src/pages/analytics/ReportBuilder.tsx`
- `frontend/src/pages/analytics/SavedReports.tsx`
- `frontend/src/pages/analytics/ScheduledReports.tsx`
- `frontend/src/store/slices/scheduledReportsSlice.ts`

Data model:
- `scheduled_reports`
- `scheduled_report_runs`
