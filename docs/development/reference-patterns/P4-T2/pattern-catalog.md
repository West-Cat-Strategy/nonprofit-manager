# P4-T2 Pattern Catalog

Date: 2026-03-02

## PAT-021 Follow-up Lifecycle State Transitions

- Source inspiration: OpenProject reminder lifecycle.
- Problem solved: missing backend for existing follow-up frontend contracts.
- Adopted behavior:
  - explicit completion/cancel/reschedule transitions,
  - recurring follow-up next-instance creation,
  - reminder queue materialization.
- Target files:
  - `backend/src/services/followUpService.ts`
  - `backend/src/controllers/followUpController.ts`
  - `backend/src/routes/followUps.ts`

## PAT-022 Reminder Scheduler Claim-and-Process Loop

- Source inspiration: reminder notification workers with stale lock recovery.
- Problem solved: reliable deferred reminder delivery.
- Adopted behavior:
  - due claim with `FOR UPDATE SKIP LOCKED`,
  - stale `processing` lock recovery,
  - delivery status persistence.
- Target files:
  - `backend/src/services/followUpReminderSchedulerService.ts`
  - `backend/src/services/followUpService.ts`

## PAT-023 Scheduled Report Runtime Model

- Source inspiration: Superset scheduling and run logs.
- Problem solved: no recurring report execution path.
- Adopted behavior:
  - schedule definition + next-run computation,
  - run log table for observability,
  - manual run-now path.
- Target files:
  - `backend/src/services/scheduledReportService.ts`
  - `backend/src/services/scheduledReportSchedulerService.ts`
  - `database/migrations/054_scheduled_reports.sql`

## PAT-024 Email Delivery Extension for Scheduled Exports

- Source inspiration: attachment-based report delivery patterns.
- Problem solved: existing email path only supported single recipient, no attachments.
- Adopted behavior:
  - `to` accepts string array,
  - attachments supported for scheduled exports.
- Target files:
  - `backend/src/services/emailService.ts`

## PAT-025 Opportunity Stage/Pipeline Domain

- Source inspiration: Twenty stage semantics + Open-Mercato pipeline flow.
- Problem solved: no dedicated opportunities domain.
- Adopted behavior:
  - stage CRUD and reorder,
  - opportunity CRUD and move-stage,
  - transition history persistence.
- Target files:
  - `backend/src/modules/opportunities/**`
  - `database/migrations/055_opportunities_pipeline.sql`

## PAT-026 Frontend Operational Surface Alignment

- Source inspiration: cross-domain UX patterns for lifecycle + scheduling + pipelines.
- Problem solved: new backend capabilities lacked route/page/slice integration.
- Adopted behavior:
  - global follow-up management route,
  - scheduled reports management and schedule action on saved reports,
  - opportunities pipeline board/list hybrid.
- Target files:
  - `frontend/src/pages/engagement/followUps/FollowUpsPage.tsx`
  - `frontend/src/pages/analytics/ScheduledReports.tsx`
  - `frontend/src/pages/engagement/opportunities/OpportunitiesPage.tsx`
