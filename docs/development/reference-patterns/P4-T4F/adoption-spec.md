# P4-T4F CRM + Cases Reporting Adoption Spec

**Last Updated:** 2026-04-19


## Locked Decisions

1. `P4-T4F` remains a reporting-only parallel lane to `P4-T4`; chat module scope is unchanged.
2. Report entities are canonicalized across backend/frontend types, validation, and DB constraints.
3. Opportunities + case reporting queries are organization scoped for generation and scheduling paths.
4. KPI templates ship as non-parameterized defaults so template-to-builder flow works without extra runtime input.

## Canonical Report Entities

- `accounts, contacts, donations, events, volunteers, tasks, cases, opportunities, expenses, grants, programs`

## Backend Adoption Mapping

- Canonical entity source-of-truth: `backend/src/types/report.ts`.
- Route validation alignment: `backend/src/routes/reports.ts`, `backend/src/routes/savedReports.ts`.
- Permission + scope propagation: `backend/src/controllers/reportController.ts`.
- Opportunity + case KPI fields and computed flags: `backend/src/modules/reports/services/reportService.ts`.
- Scheduled scope propagation: `backend/src/modules/scheduledReports/services/scheduledReportService.ts`.
- Case summary org hardening: `backend/src/modules/cases/controllers/catalog.controller.ts`, `backend/src/modules/cases/usecases/caseCatalog.usecase.ts`, `backend/src/modules/cases/repositories/caseRepository.ts`, `backend/src/services/caseService.ts`.

## Frontend Adoption Mapping

- Canonical entity type alignment: `frontend/src/types/report.ts`.
- Builder entity selection + template discoverability: `frontend/src/pages/analytics/ReportBuilder.tsx`.
- Templates route exposure: `frontend/src/features/analytics/routeComponents.tsx`, `frontend/src/features/alerts/routeComponents.tsx`, `frontend/src/features/dashboard/routeComponents.tsx`, `frontend/src/routes/analyticsRoutes.tsx`.
- Reports cache state alignment: `frontend/src/store/slices/reportsSlice.ts`.

## KPI Template Pack

- `Case Workload Core KPI`
- `Opportunity Pipeline Core KPI`
- `Opportunity Closed Win-Rate KPI`

## Acceptance Criteria

- Cases and opportunities are accepted report entities across route validation + UI selectors.
- Report generation for `cases`/`opportunities` requires organization scope and applies scoped SQL clauses.
- Scheduled report execution forwards org scope into report generation.
- Case summary endpoint excludes out-of-org rows.
- KPI templates are visible at `/reports/templates` and can be applied into builder via `?template=` query.
