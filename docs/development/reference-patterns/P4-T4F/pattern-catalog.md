# P4-T4F CRM + Cases Reporting Pattern Catalog

**Last Updated:** 2026-04-19


## Scope

- Target: reporting-only enhancement lane for CRM opportunities + case workload analytics in `nonprofit-manager`.
- Parent task linkage: `P4-T4` parallel stream (`P4-T4F`) with no change to team-chat delivery scope.
- Reuse policy: adapt only where permissive; architecture-only for GPL/AGPL/noassertion sources.
- Legacy source note: the source paths below name historical flat-workspace references. Use the current central reference store and local manifest for new source review.

## Source Patterns and Adoption Mode

| Pattern ID | Source | Path | Behavior | Reuse Class | Target Candidates | Risk | Priority |
|---|---|---|---|---|---|---|---|
| P01 | `nm--open-mercato` | Historical flat reference workspace; not part of the current central clone set | Widget-data/pipeline-summary query-shape patterns for stage metrics, weighted value, and board-summary fields. | `adapt_with_attribution` | `backend/src/modules/reports/services/reportService.ts`, `backend/src/modules/reports/services/reportTemplateService.ts` | Medium | High |
| P02 | `wm--twenty` (+ `nm--twenty`) | Historical flat reference workspace; not part of the current central clone set | Pipeline semantics: stage ordering, probability semantics, won/lost/closed lifecycle flags. | `architecture_only` | `backend/src/modules/reports/services/reportService.ts`, `backend/src/types/report.ts`, `frontend/src/types/report.ts` | Medium-High | Medium |
| P03 | `wm--openproject` | Historical flat reference workspace; not part of the current central clone set | Organization-scoped reporting execution patterns, including scheduled execution context propagation and scope-aware summary aggregation. | `architecture_only` | `backend/src/controllers/reportController.ts`, `backend/src/modules/scheduledReports/services/scheduledReportService.ts`, `backend/src/services/caseService.ts` | Medium-High | High |

## Attribution Notes

- Open-Mercato (MIT) informed query shape and KPI rollup adaptation.
- Twenty + OpenProject patterns are architecture-only; no direct source copy is used.
