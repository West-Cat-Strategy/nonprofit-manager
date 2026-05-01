# P5-T37-T39 Reference Improvements Proof

**Date:** 2026-05-01

## Scope

`P5-T37`, `P5-T38`, and `P5-T39` implemented the narrow borrow-now packet from the May 1 reference review consolidation while keeping `P5-T6` as the scope-control gate.

Implemented scope:

- Added local communications queue controls: reentrant local campaign-run send for `draft`, `scheduled`, and `sending`; recipient drilldown; local-only cancel/reschedule; and recipient `canceled` status support.
- Added staff-only case-form evidence events for submissions, revision requests, reviewed, closed, and cancelled decisions, stored in append-only `case_form_assignment_events`.
- Added scheduled-report health summaries and `Needs attention` filtering from existing report fields.
- Added audit-log health context, refresh, warning, empty, and error states from existing audit-log responses.
- Added migrations `112_local_campaign_run_controls.sql` and `113_case_form_assignment_events.sql`, with manifest and initdb parity.

Out of scope:

- Unsubscribe/List-Unsubscribe, double opt-in, automation canvas, tracking, bounce ingestion, ROI, typed appeals, donation batches, memberships, finance snapshots, scheduler changes, audit retention, e-signature semantics, generic workflow/admin studios, and portal/public evidence exposure.

## Interface Summary

Communications added:

- `GET /api/v2/communications/campaign-runs/:runId/recipients?status=&limit=`
- `POST /api/v2/communications/campaign-runs/:runId/cancel`
- `POST /api/v2/communications/campaign-runs/:runId/reschedule`
- `campaign_run_recipients.status = canceled`

Case forms added staff-only `evidence_events?: CaseFormAssignmentEvent[]` to existing staff assignment detail responses. Portal and public detail responses do not include evidence events.

Audit/report health added no public API or schema changes.

## Validation

Passed:

```bash
cd backend && npm test -- --runInBand backend/src/modules/communications/__tests__/communicationsService.test.ts
cd backend && npm test -- --runInBand backend/src/modules/cases/repositories/__tests__/caseFormsRepository.events.test.ts backend/src/modules/cases/usecases/__tests__/caseForms.usecase.test.ts
cd frontend && npm test -- --run src/features/mailchimp/components/__tests__/EmailMarketingCards.test.tsx src/features/cases/caseForms/__tests__/CaseFormsPreviewHistory.test.tsx src/features/scheduledReports/hooks/__tests__/useScheduledReportsController.test.tsx src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx src/features/adminOps/pages/adminSettings/sections/AuditLogsSection.test.tsx
cd frontend && npm test -- --run src/features/adminOps/pages/__tests__/EmailMarketingPage.test.tsx
cd backend && npm run type-check
cd frontend && npm run type-check
make lint-route-validation
make lint-v2-module-ownership
make db-verify
make check-links
make lint-doc-api-versioning
git diff --check
```

Known validation notes:

- The first attempted case-form backend test run conflicted with the concurrently running isolated test DB container; it passed when rerun serially after the communications backend test finished.
- Jest still emits the existing `--localstorage-file` warning during isolated backend test runs.
