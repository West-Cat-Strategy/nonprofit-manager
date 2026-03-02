# P4-T2 Adoption Spec

## Scope

Three feature domains were implemented:
- Follow-up lifecycle and reminder scheduling.
- Scheduled reports and recurring email delivery.
- Opportunities stage pipeline module.

## Implementation Map

### Follow-ups

Backend:
- Added follow-up service/controller/routes with Zod validation.
- Added nested endpoints for existing frontend contracts:
  - `/api/cases/:id/follow-ups`
  - `/api/tasks/:id/follow-ups`
- Added follow-up reminder scheduler service + startup wiring.

Data:
- Added `follow_ups` and `follow_up_notifications` tables.

Frontend:
- Added `/follow-ups` route and management page.
- Reused existing follow-up slice/form contracts.

### Scheduled Reports

Backend:
- Added schedule CRUD, toggle, run-now, and run history APIs.
- Added scheduler service with batch claim/process loop.
- Extended `sendMail` for multi-recipient + attachments.

Data:
- Added `scheduled_reports` and `scheduled_report_runs` tables.

Frontend:
- Added `/reports/scheduled` page.
- Added schedule action dialog in saved reports.
- Added `scheduledReportsSlice` for schedule state and runs.

### Opportunities

Backend:
- Added `backend/src/modules/opportunities` module.
- Mounted canonical `/api/v2/opportunities` and alias `/api/opportunities`.
- Added stage reorder validation and transition history writes.

Data:
- Added `opportunity_stages`, `opportunities`, and `opportunity_stage_history`.

Frontend:
- Added `/opportunities` route and board/list page.
- Added `opportunitiesSlice` with stage + opportunity actions.

## Permission Matrix Changes

Added permissions:
- Follow-up: `FOLLOWUP_VIEW`, `FOLLOWUP_CREATE`, `FOLLOWUP_EDIT`, `FOLLOWUP_DELETE`
- Scheduled reports: `SCHEDULED_REPORT_VIEW`, `SCHEDULED_REPORT_MANAGE`
- Opportunities: `OPPORTUNITY_VIEW`, `OPPORTUNITY_CREATE`, `OPPORTUNITY_EDIT`, `OPPORTUNITY_DELETE`, `OPPORTUNITY_STAGE_MANAGE`

Role defaults:
- `admin`, `manager`: full access
- `staff`: follow-up/opportunity create-edit, scheduled-report view
- `member`, `volunteer`: view-only in these domains

## Runtime Flags

Added scheduler flags in `backend/.env.example`:
- Follow-up reminder scheduler enabled/interval/batch
- Scheduled report scheduler enabled/interval/batch/retry/delay/timeout

## Non-Goals in This Wave

Deferred items:
- Raw cron expressions for schedules
- Scheduled PDF report delivery
- Donation auto-conversion workflows to opportunities
