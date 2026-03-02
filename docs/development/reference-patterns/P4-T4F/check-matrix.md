# P4-T4F CRM + Cases Reporting Verification Matrix

## Backend

1. `cd backend && npm run type-check`
Reason: compile-time validation for updated report/case interfaces, controller contracts, and route schemas.

2. `cd backend && npm run lint`
Reason: enforce guardrail consistency on updated controllers/services/routes.

3. `cd backend && npm test -- src/__tests__/services/reportService.test.ts src/__tests__/services/scheduledReportService.test.ts src/__tests__/services/caseService.test.ts src/__tests__/controllers/reportController.test.ts`
Reason: validate KPI fields, scope enforcement, scheduled propagation, and permission/org-context behavior.

## Frontend

1. `cd frontend && npm run type-check`
Reason: verify route wiring and report entity type expansion stays type-safe.

2. `cd frontend && npm test -- src/pages/__tests__/analytics/ReportBuilder.test.tsx src/pages/__tests__/analytics/ReportTemplates.test.tsx src/store/slices/__tests__/reportsSlice.test.ts`
Reason: verify opportunities entity exposure, template route behavior, and reports slice opportunities cache support.

## E2E Targeted

1. `cd e2e && npm test -- tests/reports.spec.ts tests/analytics.spec.ts`
Reason: confirm API-backed cases/opportunities generation flow, template apply flow, and scheduled-report path continuity.

## Escalation (if failures or high-risk release window)

1. `cd backend && npm test -- src/__tests__/integration/reports.test.ts src/__tests__/integration/routeGuardrails.test.ts`
Reason: assert envelope/auth/validation baseline for reporting surfaces.

2. `cd frontend && npm test -- --runInBand`
Reason: broad regression coverage after analytics route and shared report-type changes.
