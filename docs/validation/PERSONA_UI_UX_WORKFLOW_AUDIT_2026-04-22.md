# Persona UI/UX Workflow Audit (2026-04-22)

**Last Updated:** 2026-04-22

## Scope

- Date: `2026-04-22`
- Personas: Executive Director, Fundraiser, Nonprofit Administrator, Board Member, Case Manager, Rehab Worker
- Workflow set: canonical persona pack and workflow models under [../../.codex/skills/nonprofit-manager-persona-analysis/references/](../../.codex/skills/nonprofit-manager-persona-analysis/references/) plus the shared [Persona Validation Rubric](../../.codex/skills/nonprofit-manager-persona-validation/references/validation-rubric.md)
- Validation posture: repo-proof-first UI/UX audit grounded in route contracts, report-access rules, portal workflow coverage, and a thin cross-surface Playwright workflow layer
- Status vocabulary: `supported`, `partial`, `external only`, `missing`

## Summary Matrix

| persona_id | workflow_id | primary routes/surfaces | test layer | current support status | unmet need |
|---|---|---|---|---|---|
| `executive-director` | `executive-director-monthly-strategic-board-pack` | `/dashboard`, `/reports`, `/reports/saved`, `/reports/scheduled` | Frontend route UX smoke passed; Playwright anchor implemented | `partial` | Board packet composer and governance-exception workspace are still route-to-route assemblies instead of one leadership workspace |
| `fundraiser` | `fundraiser-prospect-research-to-pipeline` | `/contacts`, `/opportunities`, `/donations`, `/reports` | Frontend route UX smoke passed; Playwright anchor implemented | `partial` | Donor preference governance, stewardship automation, and grant-deadline orchestration are not first-class fundraiser flows |
| `nonprofit-administrator` | `nonprofit-administrator-user-onboarding-offboarding-access-lifecycle` | `/settings/admin/dashboard`, `/settings/navigation`, `/settings/communications`, `/reports/scheduled` | Frontend route UX smoke passed; Playwright anchor implemented | `supported` | Compliance-document vault is still `missing`; audit-risk ledger remains `partial` |
| `board-member` | `board-member-governance-meeting-cadence-and-packet-review` | `/dashboard`, `/reports`, `/reports/saved`, `/reports/scheduled` | Frontend route UX smoke passed with explicit read-only assertions; Playwright anchor implemented | `partial` | Governance workspace, delegation traceability, and recusal handling remain absent; viewer scope is still broader than board-only posture |
| `case-manager` | `case-manager-handoff-and-transition-workflow` | `/cases`, `/cases/new`, `/follow-ups`, case detail portal and appointments tabs | Frontend route UX smoke passed; portal workflow coverage reused; Playwright anchor implemented | `partial` | Reassessment rigor, handoff packets, and closure-continuity workflow are not standardized as one case-manager lane |
| `rehab-worker` | `rehab-worker-service-authorization-and-referral-transitions` | `/cases`, `/follow-ups`, case detail services and appointments tabs | Frontend route UX smoke passed; portal workflow coverage reused; Playwright anchor implemented | `partial` | Individualized employment plan workflow is `missing`; rehab-specific templates, language, and authorization depth remain partial |

## Audit-Wide Commands Run Or Attempted

- `cd frontend && npm run type-check`
  - Result: `passed`
- `cd frontend && npm test -- --run src/test/ux/PersonaRouteUxSmoke.test.tsx src/routes/__tests__/routeCatalog.test.ts src/features/auth/state/__tests__/reportAccess.test.ts src/features/reports/routes/__tests__/createReportRoutes.test.tsx src/features/reports/pages/__tests__/ReportsHomePage.test.tsx src/features/savedReports/pages/__tests__/SavedReportsPage.test.tsx src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx src/features/portal/pages/__tests__/PortalWorkflowPages.test.tsx`
  - Result: `passed` with `57` tests across `8` files
- `cd e2e && npm test -- --project=chromium tests/persona-workflows.spec.ts`
  - Result: `attempted`
  - Blocker: the local host runtime was already provisioned and did not accept the documented default admin credentials; after the spec was updated to support both starter-only and existing-runtime admin bootstrap, the host run still required explicit `ADMIN_USER_EMAIL` and `ADMIN_USER_PASSWORD` for this non-default local runtime
  - Impact on conclusions: browser proof is not complete in this local environment, but the route-contract, report-access, and portal-shell findings below remain supported by repo evidence and passing frontend tests

## Executive Director

### Workflows Checked

- `executive-director-monthly-strategic-board-pack`
- `executive-director-governance-risk-escalation`

### Confirmed Repo Evidence

- The executive route contract is now explicit in [../../frontend/src/test/ux/personaWorkflowMatrix.ts](../../frontend/src/test/ux/personaWorkflowMatrix.ts) and [../../frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx](../../frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx).
- Workbench, saved reports, scheduled reports, and reports-home persona routing are represented in [../../frontend/src/features/dashboard/pages/WorkbenchDashboardPage.tsx](../../frontend/src/features/dashboard/pages/WorkbenchDashboardPage.tsx), [../../frontend/src/features/reports/pages/ReportsHomePage.tsx](../../frontend/src/features/reports/pages/ReportsHomePage.tsx), [../../frontend/src/features/savedReports/pages/SavedReportsPage.tsx](../../frontend/src/features/savedReports/pages/SavedReportsPage.tsx), and [../../frontend/src/features/scheduledReports/pages/ScheduledReportsPage.tsx](../../frontend/src/features/scheduledReports/pages/ScheduledReportsPage.tsx).
- The thin browser anchor for leadership route flow is codified in [../../e2e/tests/persona-workflows.spec.ts](../../e2e/tests/persona-workflows.spec.ts).

### Inference

- The repo supports executive oversight as an assembled reporting journey rather than as a dedicated “leadership packet” workspace.
- Governance escalation is inferred from report, dashboard, and admin visibility surfaces rather than from a purpose-built escalation module.

### External Analog Guidance

- Comparable nonprofit executive workflows usually expose a board packet composer, risk exception log, and annual compliance packet from one leadership surface.

### Current Gaps Or Drift

- `partial`: board packet composer is still missing as a first-class route. Impact: executive prep still depends on hopping across report templates, saved reports, and schedules. Likely owner: reports/governance-reporting surface.
- `partial`: governance-exception workspace is not first-class. Impact: escalation context is visible, but exception handling remains procedural. Likely owner: executive oversight/admin surface.
- `external only`: 990 and formal compliance packet assembly still sit outside the product. Impact: annual filing workflow cannot be completed in-product. Likely owner: finance/compliance follow-through.

### Commands Run Or Attempted

- Shared frontend persona route lane passed for `/dashboard`, `/reports/saved`, and `/reports/scheduled`.
- Executive browser anchor is implemented in [../../e2e/tests/persona-workflows.spec.ts](../../e2e/tests/persona-workflows.spec.ts), but local host proof was blocked by the admin-credential runtime precondition noted above.

### High-Signal Evidence Paths

- [../../frontend/src/features/dashboard/pages/WorkbenchDashboardPage.tsx](../../frontend/src/features/dashboard/pages/WorkbenchDashboardPage.tsx)
- [../../frontend/src/features/reports/pages/ReportsHomePage.tsx](../../frontend/src/features/reports/pages/ReportsHomePage.tsx)
- [../../frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx](../../frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx)
- [../../e2e/tests/persona-workflows.spec.ts](../../e2e/tests/persona-workflows.spec.ts)

## Fundraiser

### Workflows Checked

- `fundraiser-prospect-research-to-pipeline`
- `fundraiser-gift-entry-verification-acknowledgment-handoff`

### Confirmed Repo Evidence

- Fundraiser first-touch contracts are covered in [../../frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx](../../frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx) across `/contacts`, `/opportunities`, and `/donations`.
- Opportunity and donation workflow cues are present in [../../frontend/src/features/engagement/opportunities/pages/OpportunitiesPage.tsx](../../frontend/src/features/engagement/opportunities/pages/OpportunitiesPage.tsx) and [../../frontend/src/features/finance/pages/DonationListPage.tsx](../../frontend/src/features/finance/pages/DonationListPage.tsx).
- The cross-surface fundraiser browser handoff is implemented in [../../e2e/tests/persona-workflows.spec.ts](../../e2e/tests/persona-workflows.spec.ts).

### Inference

- The repo supports fundraiser handoffs well enough for “lookup, review, verify, hand off,” but not for the full donor-stewardship operating rhythm.

### External Analog Guidance

- Mature fundraiser UX usually adds donor preference governance, automated stewardship checkpoints, and grant or campaign deadline orchestration on top of pipeline and giving data.

### Current Gaps Or Drift

- `partial`: donor preference governance is not a first-class workflow. Impact: stewardship constraints remain external to the main fundraiser path. Likely owner: contacts/communications surface.
- `partial`: stewardship automation is not codified beyond route links and reporting. Impact: follow-through remains manual. Likely owner: fundraising operations + communications.
- `partial`: grant and campaign deadline management is not represented as one workflow. Impact: cadence reporting exists, but time-sensitive campaign control is fragmented. Likely owner: opportunities/reports follow-through.

### Commands Run Or Attempted

- Shared frontend persona route lane passed for `/contacts`, `/opportunities`, and `/donations`.
- Fundraiser browser anchor is implemented in [../../e2e/tests/persona-workflows.spec.ts](../../e2e/tests/persona-workflows.spec.ts), but local host proof was blocked by the same admin-bootstrap precondition.

### High-Signal Evidence Paths

- [../../frontend/src/features/finance/pages/DonationListPage.tsx](../../frontend/src/features/finance/pages/DonationListPage.tsx)
- [../../frontend/src/features/engagement/opportunities/pages/OpportunitiesPage.tsx](../../frontend/src/features/engagement/opportunities/pages/OpportunitiesPage.tsx)
- [../../frontend/src/test/ux/personaWorkflowMatrix.ts](../../frontend/src/test/ux/personaWorkflowMatrix.ts)
- [../../e2e/tests/persona-workflows.spec.ts](../../e2e/tests/persona-workflows.spec.ts)

## Nonprofit Administrator

### Workflows Checked

- `nonprofit-administrator-user-onboarding-offboarding-access-lifecycle`
- `nonprofit-administrator-board-ready-reporting-cycle`

### Confirmed Repo Evidence

- Admin hub, navigation settings, communications settings, and scheduled-report continuity are captured in [../../frontend/src/test/ux/personaWorkflowMatrix.ts](../../frontend/src/test/ux/personaWorkflowMatrix.ts) and [../../frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx](../../frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx).
- The corresponding admin surfaces live in [../../frontend/src/features/adminOps/pages/AdminSettingsPage.tsx](../../frontend/src/features/adminOps/pages/AdminSettingsPage.tsx), [../../frontend/src/features/adminOps/pages/NavigationSettingsPage.tsx](../../frontend/src/features/adminOps/pages/NavigationSettingsPage.tsx), and [../../frontend/src/features/mailchimp/pages/EmailMarketingPage.tsx](../../frontend/src/features/mailchimp/pages/EmailMarketingPage.tsx).
- Existing admin/report continuity coverage is reinforced by [../../frontend/src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx](../../frontend/src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx).

### Inference

- Access lifecycle is strongly represented at the route and admin-shell level, but full compliance ops remain broader than the currently implemented admin UX.

### External Analog Guidance

- Nonprofit-admin suites often pair access lifecycle with a compliance-document vault, corrective-action ledger, and board-report reliability dashboard.

### Current Gaps Or Drift

- `missing`: compliance-document vault is absent. Impact: admins still rely on external storage and retention practice. Likely owner: admin/compliance document surface.
- `partial`: audit-risk ledger and corrective action tracking are not first-class. Impact: route or permission drift can be found, but not managed through a dedicated remediation ledger. Likely owner: admin oversight surface.

### Commands Run Or Attempted

- Shared frontend persona route lane passed for `/settings/admin/dashboard`, `/settings/navigation`, and `/settings/communications`.
- Nonprofit-admin browser anchor is implemented in [../../e2e/tests/persona-workflows.spec.ts](../../e2e/tests/persona-workflows.spec.ts), but local host proof was blocked by the admin-credential precondition.

### High-Signal Evidence Paths

- [../../frontend/src/features/adminOps/pages/AdminSettingsPage.tsx](../../frontend/src/features/adminOps/pages/AdminSettingsPage.tsx)
- [../../frontend/src/features/adminOps/pages/NavigationSettingsPage.tsx](../../frontend/src/features/adminOps/pages/NavigationSettingsPage.tsx)
- [../../frontend/src/features/mailchimp/pages/EmailMarketingPage.tsx](../../frontend/src/features/mailchimp/pages/EmailMarketingPage.tsx)
- [../../frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx](../../frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx)

## Board Member

### Workflows Checked

- `board-member-governance-meeting-cadence-and-packet-review`
- `board-member-board-governance-dashboard-kpis-and-compliance-risk`

### Confirmed Repo Evidence

- Board-viewer route posture is now explicit in [../../frontend/src/features/auth/state/__tests__/reportAccess.test.ts](../../frontend/src/features/auth/state/__tests__/reportAccess.test.ts), [../../frontend/src/features/reports/pages/__tests__/ReportsHomePage.test.tsx](../../frontend/src/features/reports/pages/__tests__/ReportsHomePage.test.tsx), and [../../frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx](../../frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx).
- Read-only report-path routing is still defined in [../../frontend/src/features/reports/routes/createReportRoutes.tsx](../../frontend/src/features/reports/routes/createReportRoutes.tsx) and exercised in existing reports tests.
- The thin board browser anchor is implemented in [../../e2e/tests/persona-workflows.spec.ts](../../e2e/tests/persona-workflows.spec.ts).

### Inference

- Board members can review oversight surfaces today, but those surfaces are still borrowed from the broader viewer role rather than constrained to a board-only domain.

### External Analog Guidance

- Board-focused portals usually add committee workspaces, charter and delegation traceability, recusal workflows, and tighter visibility boundaries than a generic read-only role.

### Current Gaps Or Drift

- `missing`: governance workspace is absent. Impact: packet review is possible, but board collaboration remains outside the product. Likely owner: board/governance reporting surface.
- `missing`: delegation and charter traceability are not modeled. Impact: accountability and committee context stay external. Likely owner: governance/admin follow-through.
- `missing`: recusal handling is not present. Impact: conflict-of-interest workflows still require external process. Likely owner: governance workflow surface.
- `partial`: current viewer scope is broader than intended board posture. Impact: board personas inherit operational visibility that is not board-specific. Likely owner: permissions and role posture review.

### Commands Run Or Attempted

- Shared frontend persona route lane passed and explicitly proved “read-only and not builder-first.”
- Board browser anchor is implemented in [../../e2e/tests/persona-workflows.spec.ts](../../e2e/tests/persona-workflows.spec.ts), but local host proof was blocked by the admin-credential precondition.

### High-Signal Evidence Paths

- [../../frontend/src/features/auth/state/__tests__/reportAccess.test.ts](../../frontend/src/features/auth/state/__tests__/reportAccess.test.ts)
- [../../frontend/src/features/reports/pages/__tests__/ReportsHomePage.test.tsx](../../frontend/src/features/reports/pages/__tests__/ReportsHomePage.test.tsx)
- [../../frontend/src/features/reports/routes/createReportRoutes.tsx](../../frontend/src/features/reports/routes/createReportRoutes.tsx)
- [../../frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx](../../frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx)

## Case Manager

### Workflows Checked

- `case-manager-referral-and-eligibility-compliance-intake`
- `case-manager-handoff-and-transition-workflow`

### Confirmed Repo Evidence

- Case-manager first-touch routes are covered in [../../frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx](../../frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx) for `/cases`, `/cases/new`, and `/follow-ups`.
- Portal-adjacent continuity shells are already exercised in [../../frontend/src/features/portal/pages/__tests__/PortalWorkflowPages.test.tsx](../../frontend/src/features/portal/pages/__tests__/PortalWorkflowPages.test.tsx).
- The browser anchor for case continuity, portal visibility, and appointments tabs is implemented in [../../e2e/tests/persona-workflows.spec.ts](../../e2e/tests/persona-workflows.spec.ts).

### Inference

- The current case-manager UX supports intake and active queue work, but standardized transitions still depend on staff practice more than on product structure.

### External Analog Guidance

- Strong case-management tools usually add reassessment cadence enforcement, structured handoff packets, and closure-continuity summaries tied to the client-facing portal.

### Current Gaps Or Drift

- `partial`: reassessment rigor is not encoded as a first-class cycle. Impact: staff can work cases, but reassessment consistency depends on process. Likely owner: cases/follow-ups surface.
- `partial`: standardized handoff packets are not first-class. Impact: transition quality varies by operator. Likely owner: case detail + reporting follow-through.
- `partial`: closure-continuity workflow is not standardized. Impact: closure can be recorded, but continuity-of-care cues are not one defined UX. Likely owner: case closure and portal coordination surface.

### Commands Run Or Attempted

- Shared frontend persona route lane passed for `/cases`, `/cases/new`, and `/follow-ups`, with portal workflow pages reused for continuity shells.
- Case-manager browser anchor is implemented in [../../e2e/tests/persona-workflows.spec.ts](../../e2e/tests/persona-workflows.spec.ts), but local host proof was blocked by the admin-credential precondition.

### High-Signal Evidence Paths

- [../../frontend/src/features/cases/pages/CaseListPage.tsx](../../frontend/src/features/cases/pages/CaseListPage.tsx)
- [../../frontend/src/features/cases/pages/CaseCreatePage.tsx](../../frontend/src/features/cases/pages/CaseCreatePage.tsx)
- [../../frontend/src/features/followUps/pages/FollowUpsPage.tsx](../../frontend/src/features/followUps/pages/FollowUpsPage.tsx)
- [../../frontend/src/features/portal/pages/__tests__/PortalWorkflowPages.test.tsx](../../frontend/src/features/portal/pages/__tests__/PortalWorkflowPages.test.tsx)
- [../../e2e/tests/persona-workflows.spec.ts](../../e2e/tests/persona-workflows.spec.ts)

## Rehab Worker

### Workflows Checked

- `rehab-worker-follow-up-and-contact-cadence-for-compliance-windows`
- `rehab-worker-service-authorization-and-referral-transitions`

### Confirmed Repo Evidence

- Rehab-worker route expectations are represented in [../../frontend/src/test/ux/personaWorkflowMatrix.ts](../../frontend/src/test/ux/personaWorkflowMatrix.ts) and [../../frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx](../../frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx).
- The current evidence reuses case, follow-up, and portal workflow shells rather than rehab-specific feature modules.
- The browser anchor is implemented in [../../e2e/tests/persona-workflows.spec.ts](../../e2e/tests/persona-workflows.spec.ts) with referral-source, services-tab, and appointments-tab checks.

### Inference

- Rehab-worker support is the most inferred of the six personas because current routes are shared with general case management instead of expressing rehab-specific terminology and artifacts.

### External Analog Guidance

- Vocational-rehab tools typically expose individualized employment plans, authorization checkpoints, placement outcomes, and rehab-specific templates inside the main staff workflow.

### Current Gaps Or Drift

- `missing`: individualized employment plan workflow is absent. Impact: rehab planning still requires external documents or generic case notes. Likely owner: rehab/case-planning surface.
- `partial`: rehab-specific templates and terminology are not first-class. Impact: shared case UX does not fully match rehab mental models. Likely owner: case detail content model and UX copy.
- `partial`: placement and authorization depth are limited. Impact: referral transitions can be documented, but not governed as a dedicated rehab workflow. Likely owner: services/referral integration follow-through.

### Commands Run Or Attempted

- Shared frontend persona route lane passed for `/cases` and `/follow-ups`, with portal-adjacent workflow shells reused as the current continuity surface.
- Rehab-worker browser anchor is implemented in [../../e2e/tests/persona-workflows.spec.ts](../../e2e/tests/persona-workflows.spec.ts), but local host proof was blocked by the admin-credential precondition.

### High-Signal Evidence Paths

- [../../frontend/src/test/ux/personaWorkflowMatrix.ts](../../frontend/src/test/ux/personaWorkflowMatrix.ts)
- [../../frontend/src/features/cases/pages/CaseListPage.tsx](../../frontend/src/features/cases/pages/CaseListPage.tsx)
- [../../frontend/src/features/followUps/pages/FollowUpsPage.tsx](../../frontend/src/features/followUps/pages/FollowUpsPage.tsx)
- [../../e2e/tests/persona-workflows.spec.ts](../../e2e/tests/persona-workflows.spec.ts)
