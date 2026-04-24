# P5-T6A Governance and Compliance Oversight Brief (2026-04-24)

**Last Updated:** 2026-04-24

This brief scopes the smallest later-wave governance and compliance oversight slice for `P5-T6A`. It is planning-only: it records repo evidence, inferred future scope, landing zones, sequencing, and handoff notes without authorizing runtime implementation.

## Inputs

- [planning-and-progress.md](planning-and-progress.md)
- [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md)
- [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md)
- [../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md](../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md)
- [../product/persona-workflows.md](../product/persona-workflows.md)
- [../../.codex/skills/nonprofit-manager-persona-analysis/references/governance-and-revenue-personas.md](../../.codex/skills/nonprofit-manager-persona-analysis/references/governance-and-revenue-personas.md)
- [../../.codex/skills/nonprofit-manager-persona-analysis/references/workflow-models.md](../../.codex/skills/nonprofit-manager-persona-analysis/references/workflow-models.md)
- [../../.codex/skills/nonprofit-manager-persona-validation/references/validation-rubric.md](../../.codex/skills/nonprofit-manager-persona-validation/references/validation-rubric.md)

## Scope

`P5-T6A` should tighten five governance-adjacent gaps already visible in the persona audit:

| Capability | Current posture | Later-wave intent |
|---|---|---|
| Board-only posture | `partial`: board users are inferred through broader `viewer` / read-only report access | Define a board-specific visibility posture that consumes dashboards and packets without operational CRUD, builder-first entry points, or broad raw-detail browsing |
| Governance-risk escalation | `partial`: executives can assemble risk context from dashboards, reports, and admin visibility | Create one escalation trail with issue summary, owner, due date, evidence links, status, and board-sensitive visibility |
| Board packet workflow | `partial`: saved and scheduled reports can support packet prep, but there is no packet composer | Add a lightweight packet assembly layer over existing report snapshots and scheduled-report delivery |
| Compliance-document retention | `missing`: no compliance-document vault or retention workflow is first-class | Model retained governance artifacts with category, retention date, review owner, restricted visibility, and external-source links |
| Corrective-action tracking | `partial`: route, access, report, and validation signals exist, but no remediation ledger owns follow-through | Add a small corrective-action ledger tied to governance risk, audit findings, access drift, or report-delivery issues |

## Confirmed Repo Evidence

- Executive Director maps to `admin` with high confidence and already has dashboards, analytics, reports, saved reports, and scheduled reports for oversight. The repo does not prove a first-class board packet composer, formal governance exception workspace, or full IRS 990 workflow.
- Board Member maps to inferred `viewer` / `readonly` posture with high confidence. Read-only reporting is covered, but the current viewer scope is broader than a board-only posture and does not model committee charter traceability, recusal handling, or governance exception routing.
- Nonprofit Administrator maps to `admin` with high confidence. User onboarding and access lifecycle are the strongest governance-adjacent workflows; compliance-document retention is still `missing`, and audit-risk / corrective-action tracking remains `partial`.
- Current proof lives in route contracts, report-access tests, persona route smoke coverage, and the persona workflow audit. The audit also records that browser proof was implemented but local host proof was blocked by a non-default admin credential precondition.
- `P5-T6` is explicitly backlog and planning work. No runtime implementation is authorized until a separately scoped row is signed out.

## Inferred Future Scope

These are future planning targets, not current product claims:

| Future target | Type intent | Concrete landing zones |
|---|---|---|
| `board_visibility_profile` | A board-only posture layered near read-only reporting, with explicit allowed routes and hidden operator controls | `backend/src/utils/roleSlug.ts`, `backend/src/utils/permissions.ts`, `backend/src/modules/admin/usecases/roleCatalogUseCase.ts`, `frontend/src/features/reports/routes/createReportRoutes.tsx`, `frontend/src/features/auth/state/__tests__/reportAccess.test.ts` |
| `governance_escalation` | A small issue / risk trail for executive and board follow-through, not a generic ticketing system | `frontend/src/features/dashboard/pages/WorkbenchDashboardPage.tsx`, `frontend/src/features/reports/pages/ReportsHomePage.tsx`, a future governance surface adjacent to `frontend/src/features/adminOps/**` |
| `board_packet` | A packet wrapper around saved report snapshots, scheduled reports, and executive narrative notes | `frontend/src/features/savedReports/**`, `frontend/src/features/scheduledReports/**`, `frontend/src/features/reports/**` |
| `compliance_artifact` | Retained governance or compliance documents with metadata and review cadence, not legal-document authoring | `frontend/src/features/adminOps/**`, future admin/compliance backend seams adjacent to existing admin modules |
| `corrective_action` | Owner, due date, evidence links, status, and closure note for audit-risk or governance findings | `frontend/src/features/adminOps/**`, `docs/validation/**`, future admin oversight service seams |

## Sequencing

1. Start with `board_visibility_profile` because board-only posture affects every later governance surface. The first proof target should be route visibility, read-only language, and removal of builder/admin-style entry points from board journeys.
2. Add `board_packet` next by wrapping saved reports and scheduled reports instead of creating a new report engine.
3. Add `governance_escalation` as a narrow executive-to-board follow-through trail after packet visibility is settled.
4. Add `compliance_artifact` retention metadata before storing or linking sensitive governance artifacts.
5. Add `corrective_action` last, reusing governance escalation and compliance artifact links so remediation does not become a separate workflow platform.

## Non-Goals

- Annual filing, IRS 990 preparation, charity-regulator submission, and formal filing readiness remain `external only`.
- Legal review, legal advice, board counsel workflows, and privilege-sensitive review remain `external only`.
- Do not build voting, e-signature, committee management, grant compliance, finance close, or accounting-suite workflows in this slice.
- Do not treat generic `viewer` access as board-only posture without explicit route, action, and data-boundary proof.
- Do not turn corrective actions into a generic ticketing system, workflow studio, or custom-field platform.
- Do not claim that document retention exists until a typed artifact model, retention metadata, and access posture are implemented and tested.

## Validation And Handoff Notes

- Docs-only validation for this brief is `make check-links`. No `make lint-doc-api-versioning` is required unless a later edit adds API examples or `/api/v2` wording.
- Future implementation rows should start from the persona validation ladder: `frontend/src/test/ux/personaWorkflowMatrix.ts`, `frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx`, and then `e2e/tests/persona-workflows.spec.ts` after seeded runtime credentials are confirmed.
- The next owner should keep evidence split into `Confirmed repo evidence`, `Inference`, and `External analog guidance`; filing and legal-review outcomes must stay outside the app even if the product later provides packet inputs, artifact retention, or handoff checklists.
- Lead still owns index and workboard updates. This brief should not move `P5-T6A` status by itself.
