# Persona Workflow Audit (2026-04-18)

## Scope

- Date: `2026-04-18`
- Source personas: [Production User Personas](../product/user-personas.md) and [Persona Workflow Planning Pack](../product/persona-workflows.md)
- Scope: Executive Director, Fundraiser, Nonprofit Administrator, Board Member, Case Manager, and Rehab Worker
- Method: one lead synthesis pass plus six persona-specific subagent lanes using non-mutating workflow checks against docs, route catalogs, frontend tests, backend tests, and Playwright specs
- Mutation policy: the audit evidence collection was non-mutating; implementing this validation artifact adds this report plus a catalog entry in [docs/INDEX.md](../INDEX.md)

## Methodology

- Each persona lane started from the existing product persona pack and workflow pack, then traced the current repo surfaces that claim to support that role.
- Evidence sources were limited to current repo docs, route catalogs, backend and frontend implementation seams, existing test files, and commands actually run during the audit pass.
- This document uses four evidence labels throughout:
  - `supported in docs`: the workflow is clearly represented in the current persona pack, help-center docs, feature docs, routes, or API/docs structure
  - `runnable evidence observed`: the audit found passing or partially observed command/test evidence in the current tree
  - `blocked/interrupted attempts`: a command was started or selected but could not complete cleanly because of an external lock, an intentional stop, or local runtime contention
  - `current gaps or drift`: the strongest repo-side mismatch between the documented workflow and current runnable proof

## Persona Findings

### Executive Director

**Workflows checked**

- `executive-director-daily-org-health-scan`
- `executive-director-fundraising-program-oversight-coordination`
- `executive-director-board-leadership-packet-preparation`
- `executive-director-governance-risk-escalation`

**Supported in docs**

- The persona-to-role mapping is implemented in the repo: `Executive Director` maps to `admin` in [contactDirectory.usecase.ts](../../backend/src/modules/contacts/usecases/contactDirectory.usecase.ts).
- The expected dashboard, analytics, reporting, and admin surfaces are present in the route catalogs and module routers: [staffHomeRoutes.ts](../../frontend/src/routes/routeCatalog/staffHomeRoutes.ts), [staffInsightsRoutes.ts](../../frontend/src/routes/routeCatalog/staffInsightsRoutes.ts), [createReportRoutes.tsx](../../frontend/src/features/reports/routes/createReportRoutes.tsx), [adminRouteManifest.ts](../../frontend/src/features/adminOps/adminRouteManifest.ts), and [backend/src/routes/v2/index.ts](../../backend/src/routes/v2/index.ts).
- The supporting docs are aligned at a surface level: [dashboard-analytics.html](../help-center/staff/dashboard-analytics.html), [reports.html](../help-center/staff/reports.html), [REPORTING_GUIDE.md](../features/REPORTING_GUIDE.md), [FEATURE_MATRIX.md](../features/FEATURE_MATRIX.md), and [beta-appendix.html](../help-center/staff/beta-appendix.html).

**Runnable evidence observed**

- Existing test coverage already touches the core executive surfaces: [analytics.spec.ts](../../e2e/tests/analytics.spec.ts), [reports.spec.ts](../../e2e/tests/reports.spec.ts), [admin.spec.ts](../../e2e/tests/admin.spec.ts), [WorkbenchDashboardPage.test.tsx](../../frontend/src/features/dashboard/pages/__tests__/WorkbenchDashboardPage.test.tsx), [SavedReportsPage.test.tsx](../../frontend/src/features/savedReports/pages/__tests__/SavedReportsPage.test.tsx), [ScheduledReportsPage.test.tsx](../../frontend/src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx), and [WorkflowCoverageReportPage.test.tsx](../../frontend/src/features/reports/pages/__tests__/WorkflowCoverageReportPage.test.tsx).
- A focused Playwright slice cleared host preflight and had already passed nine Chromium admin tests before the audit intentionally interrupted it.

**Current gaps or drift**

- The two workflows marked `Supported` are supported mostly as assembled staff infrastructure, not as one explicit Executive Director end-to-end journey.
- `board-leadership-packet-preparation` remains partial: saved reports, scheduled reports, and report sharing exist, but there is no first-class board-packet or leadership-packet workflow.
- `governance-risk-escalation` remains partial: the repo exposes governance-adjacent admin settings and reporting, but not a dedicated executive escalation or board-sensitive handoff flow.
- Dashboard customization and admin settings are explicitly called out as changing areas in the docs, so they are not stable process-of-record surfaces for executive training.

**Commands run or attempted**

- `cd e2e && npm test -- --project=chromium tests/analytics.spec.ts tests/reports.spec.ts tests/admin.spec.ts`
  Result: `interrupted` after host preflight passed and nine Chromium admin tests had already passed.

**High-signal evidence paths**

- [../product/persona-workflows.md](../product/persona-workflows.md)
- [../help-center/staff/dashboard-analytics.html](../help-center/staff/dashboard-analytics.html)
- [../help-center/staff/reports.html](../help-center/staff/reports.html)
- [../../frontend/src/routes/routeCatalog/staffInsightsRoutes.ts](../../frontend/src/routes/routeCatalog/staffInsightsRoutes.ts)
- [../../frontend/src/features/adminOps/adminRouteManifest.ts](../../frontend/src/features/adminOps/adminRouteManifest.ts)
- [../../e2e/tests/reports.spec.ts](../../e2e/tests/reports.spec.ts)

### Fundraiser

**Workflows checked**

- `fundraiser-donor-prospect-triage`
- `fundraiser-cultivation-stewardship-coordination`
- `fundraiser-campaign-board-ready-reporting`
- `fundraiser-gift-entry-verification-acknowledgment-handoff`

**Supported in docs**

- The role maps cleanly onto four real product lanes: People and Accounts, Donations, Reports and Scheduled Reports, and Opportunities. Supporting docs include [people-accounts.html](../help-center/staff/people-accounts.html), [donations.html](../help-center/staff/donations.html), [reports.html](../help-center/staff/reports.html), [REPORTING_GUIDE.md](../features/REPORTING_GUIDE.md), and [OPPORTUNITIES_PIPELINE.md](../features/OPPORTUNITIES_PIPELINE.md).
- The route catalogs and backend mounts line up with that workflow framing: [staffPeopleRoutes.ts](../../frontend/src/routes/routeCatalog/staffPeopleRoutes.ts), [staffFinanceRoutes.ts](../../frontend/src/routes/routeCatalog/staffFinanceRoutes.ts), [staffInsightsRoutes.ts](../../frontend/src/routes/routeCatalog/staffInsightsRoutes.ts), [staffEngagementRoutes.ts](../../frontend/src/routes/routeCatalog/staffEngagementRoutes.ts), [backend/src/routes/v2/index.ts](../../backend/src/routes/v2/index.ts), and [backend/src/modules/donations/routes/index.ts](../../backend/src/modules/donations/routes/index.ts).

**Runnable evidence observed**

- The strongest confirmed proof in this lane is frontend coverage for people triage, donation list/detail behavior, report builder, and scheduled reports: [ContactListPage.test.tsx](../../frontend/src/features/contacts/pages/__tests__/ContactListPage.test.tsx), [AccountListPage.test.tsx](../../frontend/src/features/accounts/pages/__tests__/AccountListPage.test.tsx), [DonationListPage.test.tsx](../../frontend/src/features/finance/pages/__tests__/DonationListPage.test.tsx), [ReportBuilderPage.test.tsx](../../frontend/src/features/reports/pages/__tests__/ReportBuilderPage.test.tsx), and [ScheduledReportsPage.test.tsx](../../frontend/src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx).
- Manual gift entry now has direct proof across the form and browser flow: [DonationForm.test.tsx](../../frontend/src/components/__tests__/DonationForm.test.tsx) verifies donor linkage plus `transaction_id` submission, and [donations.spec.ts](../../e2e/tests/donations.spec.ts) now passes both the UI create path and a negative API boundary check for missing donor linkage.
- The repo also has targeted opportunity and fundraising-adjacent tests available even though this audit did not get clean runtime completion for them: [opportunities.spec.ts](../../e2e/tests/opportunities.spec.ts), [people-directory.spec.ts](../../e2e/tests/people-directory.spec.ts), and [reports.spec.ts](../../e2e/tests/reports.spec.ts).

**Current gaps or drift**

- Fundraiser reporting is broadly strong, but the audit found less donation-specific reporting proof than the persona narrative implies; current runnable evidence is stronger for general report-builder/scheduled-report flows than for fundraiser-specific board or campaign reporting.
- `/people` remains available as a compatibility surface, but it is now explicitly marked legacy and points staff back to `/contacts` and `/accounts`; the remaining risk is SOP cleanup, not a live workflow contradiction.
- Cultivation and stewardship are still only partially evidenced: the opportunities pipeline is present, but solicitation planning, stewardship acknowledgments, and board or executive fundraising handoffs are less clearly proven by runnable evidence.

**Commands run or attempted**

- `npm --workspace frontend run test -- --run src/features/contacts/pages/__tests__/ContactListPage.test.tsx src/features/accounts/pages/__tests__/AccountListPage.test.tsx src/features/finance/pages/__tests__/DonationListPage.test.tsx src/features/reports/pages/__tests__/ReportBuilderPage.test.tsx src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx`
  Result: `passed` with five files and nineteen tests.
- `cd frontend && npm test -- --run src/components/__tests__/DonationForm.test.tsx`
  Result: `passed`.
- `cd e2e && npm test -- --project=chromium tests/donations.spec.ts`
  Result: `passed` with twelve Chromium tests, including the manual create path and the missing-linkage negative API check.
- `npm --workspace e2e run test -- --project=chromium tests/people-directory.spec.ts tests/opportunities.spec.ts tests/donations.spec.ts tests/reports.spec.ts`
  Result: `blocked` because another E2E run already held the wrapper lock.
- `npm --workspace backend run test:unit -- src/__tests__/services/opportunityService.test.ts src/__tests__/services/reportService.test.ts`
  Result: `failed as a narrow-slice validator` because the runner broadened into unrelated cases/auth failures.

**High-signal evidence paths**

- [../help-center/staff/people-accounts.html](../help-center/staff/people-accounts.html)
- [../help-center/staff/donations.html](../help-center/staff/donations.html)
- [../features/OPPORTUNITIES_PIPELINE.md](../features/OPPORTUNITIES_PIPELINE.md)
- [../../frontend/src/routes/routeCatalog/staffFinanceRoutes.ts](../../frontend/src/routes/routeCatalog/staffFinanceRoutes.ts)
- [../../e2e/tests/donations.spec.ts](../../e2e/tests/donations.spec.ts)
- [../../e2e/tests/opportunities.spec.ts](../../e2e/tests/opportunities.spec.ts)

### Nonprofit Administrator

**Workflows checked**

- `nonprofit-administrator-user-onboarding-offboarding-access-provisioning`
- `nonprofit-administrator-settings-branding-communications-provider-upkeep`
- `nonprofit-administrator-operational-reporting-configuration-monitoring`
- `nonprofit-administrator-permissions-route-visibility-setup-drift`

**Supported in docs**

- The admin settings and portal-admin structure are strongly codified in [adminNavigationCatalog.ts](../../frontend/src/features/adminOps/adminNavigationCatalog.ts), [adminRouteManifest.ts](../../frontend/src/features/adminOps/adminRouteManifest.ts), [adminRoutes.tsx](../../frontend/src/routes/adminRoutes.tsx), and [backend/src/modules/admin/routes/index.ts](../../backend/src/modules/admin/routes/index.ts).
- Permissions, roles, groups, branding, organization settings, communications providers, and scheduled reporting are all represented in current code and docs: [permissions.ts](../../backend/src/utils/permissions.ts), [roleCatalogUseCase.ts](../../backend/src/modules/admin/usecases/roleCatalogUseCase.ts), [REPORTING_GUIDE.md](../features/REPORTING_GUIDE.md), [quick-start.html](../help-center/staff/quick-start.html), [faq.html](../help-center/staff/faq.html), and [beta-appendix.html](../help-center/staff/beta-appendix.html).

**Runnable evidence observed**

- Focused frontend admin and route-catalog coverage passed cleanly: [adminRedirects.test.tsx](../../frontend/src/routes/__tests__/adminRedirects.test.tsx), [routeCatalog.test.ts](../../frontend/src/routes/__tests__/routeCatalog.test.ts), [AdminSettings.organization.test.tsx](../../frontend/src/features/adminOps/pages/__tests__/AdminSettings.organization.test.tsx), and [ScheduledReportsPage.test.tsx](../../frontend/src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx).
- Focused backend coverage also passed for permissions, role catalog, admin surfaces, and scheduled reporting: [permissions.test.ts](../../backend/src/__tests__/utils/permissions.test.ts), [roleCatalogUseCase.test.ts](../../backend/src/modules/admin/__tests__/usecases/roleCatalogUseCase.test.ts), [adminSurfaceControllers.test.ts](../../backend/src/modules/admin/controllers/__tests__/adminSurfaceControllers.test.ts), and [scheduledReportService.test.ts](../../backend/src/__tests__/services/scheduledReportService.test.ts).

**Current gaps or drift**

- The original route-catalog integrity concern was a validator truthfulness issue, not a current product mismatch: the checker now traverses transitive catalog sources, including descriptor-driven people routes, and [check-route-catalog-drift.ts](../../scripts/check-route-catalog-drift.ts) passes cleanly.
- The help-center already treats admin settings and provider configuration as changing areas, and the current runnable proof is still much stronger at the unit/component level than at the full operator workflow level.
- Access provisioning is documented as `Supported`, but this audit only validated the role/permission/controller seams, not a full invitation, offboarding, or access-update run.

**Commands run or attempted**

- `node scripts/check-route-catalog-drift.ts`
  Result: `passed`.
- `cd frontend && npm test -- --run src/routes/__tests__/adminRedirects.test.tsx src/routes/__tests__/routeCatalog.test.ts src/features/adminOps/pages/__tests__/AdminSettings.organization.test.tsx src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx`
  Result: `passed` with fifty-six tests.
- `cd backend && npx jest --runInBand src/__tests__/utils/permissions.test.ts src/modules/admin/__tests__/usecases/roleCatalogUseCase.test.ts src/modules/admin/controllers/__tests__/adminSurfaceControllers.test.ts src/__tests__/services/scheduledReportService.test.ts`
  Result: `passed` with fifteen tests.
- `cd e2e && npm test -- --project=chromium tests/admin.spec.ts tests/reports.spec.ts tests/external-service-providers.spec.ts --grep "should load admin settings hub shell|should load portal admin settings route shells|save and schedule KPI report flow remains functional|allows creating and finding a provider record"`
  Result: `blocked` by an active E2E lock holder.

**High-signal evidence paths**

- [../help-center/staff/quick-start.html](../help-center/staff/quick-start.html)
- [../help-center/staff/faq.html](../help-center/staff/faq.html)
- [../help-center/staff/beta-appendix.html](../help-center/staff/beta-appendix.html)
- [../../frontend/src/features/adminOps/adminNavigationCatalog.ts](../../frontend/src/features/adminOps/adminNavigationCatalog.ts)
- [../../backend/src/modules/admin/routes/index.ts](../../backend/src/modules/admin/routes/index.ts)
- [../../backend/src/__tests__/services/scheduledReportService.test.ts](../../backend/src/__tests__/services/scheduledReportService.test.ts)

### Board Member

**Workflows checked**

- `board-member-pre-meeting-oversight-review`
- `board-member-committee-follow-up-action-review`
- `board-member-fundraising-advocacy-touchpoint`
- `board-member-governance-exception-workflow`

**Supported in docs**

- The documented mapping is real: `member` and `readonly` normalize to `viewer` in [roleSlug.ts](../../backend/src/utils/roleSlug.ts), and `viewer` includes dashboard, report, and scheduled-report visibility in [permissions.ts](../../backend/src/utils/permissions.ts).
- The persona docs correctly position this role around dashboards, saved reports, scheduled reports, and low-friction summary access rather than admin CRUD: [user-personas.md](../product/user-personas.md) and [persona-workflows.md](../product/persona-workflows.md).

**Runnable evidence observed**

- Read-only and public-report consumption has direct runnable evidence: [PublicReportSnapshot.test.tsx](../../frontend/src/features/savedReports/pages/__tests__/PublicReportSnapshot.test.tsx), [WorkbenchDashboardPage.test.tsx](../../frontend/src/features/dashboard/pages/__tests__/WorkbenchDashboardPage.test.tsx), [SavedReportsPage.test.tsx](../../frontend/src/features/savedReports/pages/__tests__/SavedReportsPage.test.tsx), [ScheduledReportsPage.test.tsx](../../frontend/src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx), and [report.handlers.test.ts](../../backend/src/modules/reports/controllers/__tests__/report.handlers.test.ts).
- The focused board-member lane also confirmed passing backend tests around report permissions, saved-report handlers, and report sharing.
- The main reports landing path is now capability-aware instead of builder-first: [createReportRoutes.test.tsx](../../frontend/src/features/reports/routes/__tests__/createReportRoutes.test.tsx) proves report managers land on the builder while read-only viewers fall back to saved or scheduled reports, and the saved/scheduled page tests now verify that management actions stay hidden for read-only users.

**Current gaps or drift**

- The current `viewer` permission set is broader than the board persona implies and includes operational visibility such as cases, contacts, follow-ups, and opportunities.
- The governance exception workflow is still correctly described as outside the current app: this audit found no dedicated board workspace or governance-exception surface.

**Commands run or attempted**

- `cd backend && npm run test:unit -- --runInBand src/__tests__/utils/permissions.referenceAdoption.test.ts src/modules/reports/controllers/__tests__/report.handlers.test.ts src/modules/savedReports/controllers/__tests__/savedReport.handlers.test.ts src/modules/savedReports/controllers/__tests__/reportSharing.handlers.test.ts`
  Result: `passed` with four suites and thirty-six tests.
- `cd frontend && npm test -- --run src/features/dashboard/pages/__tests__/WorkbenchDashboardPage.test.tsx src/features/savedReports/pages/__tests__/SavedReportsPage.test.tsx src/features/savedReports/pages/__tests__/PublicReportSnapshot.test.tsx src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx`
  Result: `passed` with four files and twelve tests.
- `cd frontend && npm test -- --run src/features/auth/state/__tests__/reportAccess.test.ts src/features/reports/routes/__tests__/createReportRoutes.test.tsx src/routes/__tests__/routeCatalog.test.ts src/features/reports/pages/__tests__/ReportBuilderPage.test.tsx src/features/savedReports/pages/__tests__/SavedReportsPage.test.tsx src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx`
  Result: `passed`.

**High-signal evidence paths**

- [../product/user-personas.md](../product/user-personas.md)
- [../../backend/src/utils/roleSlug.ts](../../backend/src/utils/roleSlug.ts)
- [../../backend/src/utils/permissions.ts](../../backend/src/utils/permissions.ts)
- [../../frontend/src/features/reports/routes/createReportRoutes.tsx](../../frontend/src/features/reports/routes/createReportRoutes.tsx)
- [../../frontend/src/features/savedReports/pages/SavedReportsPage.tsx](../../frontend/src/features/savedReports/pages/SavedReportsPage.tsx)
- [../../frontend/src/features/scheduledReports/pages/ScheduledReportsPage.tsx](../../frontend/src/features/scheduledReports/pages/ScheduledReportsPage.tsx)

### Case Manager

**Workflows checked**

- `case-manager-intake-and-assessment`
- `case-manager-active-case-progression`
- `case-manager-caseload-review-outcome-monitoring`
- `case-manager-portal-appointments-follow-up-coordination`

**Supported in docs**

- Case intake, detail, queue, portal, and reporting workflows are clearly documented in [cases.html](../help-center/staff/cases.html), [portal/cases.html](../help-center/portal/cases.html), [FOLLOW_UP_LIFECYCLE.md](../features/FOLLOW_UP_LIFECYCLE.md), [CASE_CLIENT_VISIBILITY_AND_FILES.md](../features/CASE_CLIENT_VISIBILITY_AND_FILES.md), [dashboard-analytics.html](../help-center/staff/dashboard-analytics.html), and [reports.html](../help-center/staff/reports.html).
- Staff routes and backend modules exist for case list/create/detail, follow-ups, portal visibility, and reporting: [engagementRoutes.tsx](../../frontend/src/routes/engagementRoutes.tsx), [peopleRoutes.tsx](../../frontend/src/routes/peopleRoutes.tsx), [portalRoutes.tsx](../../frontend/src/routes/portalRoutes.tsx), [backend/src/modules/cases/routes/index.ts](../../backend/src/modules/cases/routes/index.ts), [backend/src/modules/followUps/routes/index.ts](../../backend/src/modules/followUps/routes/index.ts), [backend/src/modules/portal/routes/index.ts](../../backend/src/modules/portal/routes/index.ts), and [backend/src/modules/reports/routes/index.ts](../../backend/src/modules/reports/routes/index.ts).

**Runnable evidence observed**

- Intake and queue entry have strong Playwright evidence through [cases.spec.ts](../../e2e/tests/cases.spec.ts).
- Follow-ups are one of the strongest case-manager lanes today: [followUps.test.ts](../../backend/src/__tests__/integration/followUps.test.ts), [follow-ups.spec.ts](../../e2e/tests/follow-ups.spec.ts), and [FollowUpsPage.tsx](../../frontend/src/features/followUps/pages/FollowUpsPage.tsx) all line up.
- Portal-safe sharing is also strongly evidenced: [caseManagementVisibility.test.ts](../../backend/src/__tests__/integration/caseManagementVisibility.test.ts), [portal-cases-visibility.spec.ts](../../e2e/tests/portal-cases-visibility.spec.ts), and [PortalCasesPage.test.tsx](../../frontend/src/features/portal/pages/__tests__/PortalCasesPage.test.tsx).
- The active case workspace is broad and feature-owned in [CaseDetailPage.tsx](../../frontend/src/features/cases/pages/CaseDetailPage.tsx) and [useCaseDetailPage.tsx](../../frontend/src/features/cases/hooks/useCaseDetailPage.tsx).
- Focused staff-case proof now covers the previously thin seams: [CaseStatusChangeModal.test.tsx](../../frontend/src/features/cases/components/__tests__/CaseStatusChangeModal.test.tsx) exercises status-change notes and outcomes, [CaseListPage.test.tsx](../../frontend/src/features/cases/pages/__tests__/CaseListPage.test.tsx) covers saved-view lifecycle, and [CaseDetailTabs.test.tsx](../../frontend/src/features/cases/pages/__tests__/CaseDetailTabs.test.tsx) verifies the staff appointments tab stays routable inside case detail.

**Current gaps or drift**

- Weekly caseload review is present through dashboard and report surfaces, but runnable proof is shallower than the narrative, especially for supervision and outcomes-review use cases.

**Commands run or attempted**

- `cd frontend && npm test -- --run src/features/cases/pages/__tests__/CaseListPage.test.tsx src/features/cases/pages/__tests__/CaseDetailTabs.test.tsx src/features/cases/components/__tests__/CaseStatusChangeModal.test.tsx`
  Result: `passed` with ten tests.
- Safe targeted commands identified but not rerun during implementation:
  - `cd backend && npm test -- src/__tests__/integration/caseManagementVisibility.test.ts`
  - `cd backend && npm test -- src/__tests__/integration/followUps.test.ts`
  - `cd e2e && npx playwright test tests/cases.spec.ts --project=chromium`
  - `cd e2e && npx playwright test tests/follow-ups.spec.ts --project=chromium`
  - `cd e2e && npx playwright test tests/portal-cases-visibility.spec.ts --project=chromium`

**High-signal evidence paths**

- [../help-center/staff/cases.html](../help-center/staff/cases.html)
- [../features/FOLLOW_UP_LIFECYCLE.md](../features/FOLLOW_UP_LIFECYCLE.md)
- [../features/CASE_CLIENT_VISIBILITY_AND_FILES.md](../features/CASE_CLIENT_VISIBILITY_AND_FILES.md)
- [../../frontend/src/features/cases/pages/CaseDetailPage.tsx](../../frontend/src/features/cases/pages/CaseDetailPage.tsx)
- [../../e2e/tests/cases.spec.ts](../../e2e/tests/cases.spec.ts)
- [../../e2e/tests/follow-ups.spec.ts](../../e2e/tests/follow-ups.spec.ts)

### Rehab Worker

**Workflows checked**

- `rehab-worker-session-prep-client-history-review`
- `rehab-worker-service-delivery-documentation`
- `rehab-worker-progress-monitoring-rehabilitation-plan-adjustment`
- `rehab-worker-appointment-referral-follow-up-resolution`

**Supported in docs**

- The repo intentionally models this lane as inferred `staff` rather than a rehab-specific role in [user-personas.md](../product/user-personas.md).
- The supporting surfaces are the same case, portal, follow-up, appointment, and reporting surfaces documented in [cases.html](../help-center/staff/cases.html), [portal/cases.html](../help-center/portal/cases.html), [CASE_MANAGEMENT_SYSTEM.md](../features/CASE_MANAGEMENT_SYSTEM.md), [CASE_CLIENT_VISIBILITY_AND_FILES.md](../features/CASE_CLIENT_VISIBILITY_AND_FILES.md), [API_REFERENCE_PORTAL_APPOINTMENTS.md](../api/API_REFERENCE_PORTAL_APPOINTMENTS.md), and [REPORTING_GUIDE.md](../features/REPORTING_GUIDE.md).

**Runnable evidence observed**

- Session prep and shared context are strongly supported by case detail and portal case coverage: [CaseDetailTabs.test.tsx](../../frontend/src/features/cases/pages/__tests__/CaseDetailTabs.test.tsx), [PortalCaseDetailPage.test.tsx](../../frontend/src/features/portal/pages/__tests__/PortalCaseDetailPage.test.tsx), and [portal-cases-visibility.spec.ts](../../e2e/tests/portal-cases-visibility.spec.ts).
- Client-visible collaboration boundaries are a major proven strength: [CaseFormsPanel.test.tsx](../../frontend/src/features/cases/components/__tests__/CaseFormsPanel.test.tsx), [portal-cases-visibility.spec.ts](../../e2e/tests/portal-cases-visibility.spec.ts), and [PortalWorkflowPages.test.tsx](../../frontend/src/features/portal/pages/__tests__/PortalWorkflowPages.test.tsx).
- Appointment and follow-up resolution are well evidenced: [FollowUpsPage.test.tsx](../../frontend/src/features/followUps/pages/__tests__/FollowUpsPage.test.tsx), [follow-ups.spec.ts](../../e2e/tests/follow-ups.spec.ts), [portalAppointments.test.ts](../../backend/src/__tests__/integration/portalAppointments.test.ts), and [portal-messaging-appointments.spec.ts](../../e2e/tests/portal-messaging-appointments.spec.ts).
- Generic progress review exists through outcomes and workflow coverage reporting: [OutcomesReportPage.test.tsx](../../frontend/src/features/reports/pages/__tests__/OutcomesReportPage.test.tsx) and [WorkflowCoverageReportPage.test.tsx](../../frontend/src/features/reports/pages/__tests__/WorkflowCoverageReportPage.test.tsx).

**Current gaps or drift**

- This workflow is supported only generically, not through rehab-specific models, terminology, templates, or reports.
- Service delivery documentation is only partially evidenced: notes, forms, follow-ups, and portal collaboration have strong proof, but direct case-service logging or editing has weaker runnable coverage.
- Referral handling is the weakest part of the lane; appointment and follow-up evidence is strong, but the audit did not find equally direct referral-specific proof.
- Progress review exists only as generic outcomes/workflow reporting, not as a rehab-plan-adjustment workflow.

**Commands run or attempted**

- `cd frontend && npm test -- --run src/features/cases/pages/__tests__/CaseDetailTabs.test.tsx src/features/cases/components/__tests__/CaseFormsPanel.test.tsx src/features/followUps/pages/__tests__/FollowUpsPage.test.tsx src/features/portal/pages/__tests__/PortalWorkflowPages.test.tsx src/features/portal/pages/__tests__/PortalCaseDetailPage.test.tsx src/features/reports/pages/__tests__/OutcomesReportPage.test.tsx src/features/reports/pages/__tests__/WorkflowCoverageReportPage.test.tsx`
  Result: `passed` with seven files and nineteen tests.
- `cd backend && npm test -- src/__tests__/integration/followUps.test.ts src/__tests__/integration/portalAppointments.test.ts`
  Result: `failed` during preflight because Docker reported a container-name conflict for `nonprofit-manager-test-postgres`.
- `cd backend && DB_HOST=127.0.0.1 DB_PORT=8012 DB_NAME=nonprofit_manager_test DB_USER=postgres DB_PASSWORD=postgres npx jest src/__tests__/integration/followUps.test.ts --runInBand -t "returns forbidden for viewer-role"`
  Result: `passed`.

**High-signal evidence paths**

- [../features/CASE_MANAGEMENT_SYSTEM.md](../features/CASE_MANAGEMENT_SYSTEM.md)
- [../api/API_REFERENCE_PORTAL_APPOINTMENTS.md](../api/API_REFERENCE_PORTAL_APPOINTMENTS.md)
- [../../frontend/src/routes/routeCatalog/staffEngagementRoutes.ts](../../frontend/src/routes/routeCatalog/staffEngagementRoutes.ts)
- [../../frontend/src/routes/routeCatalog/portal.ts](../../frontend/src/routes/routeCatalog/portal.ts)
- [../../backend/src/__tests__/integration/portalAppointments.test.ts](../../backend/src/__tests__/integration/portalAppointments.test.ts)
- [../../backend/src/__tests__/integration/followUps.test.ts](../../backend/src/__tests__/integration/followUps.test.ts)

## Cross-Cutting Findings

- Executive Director support is strong at the dashboard, reporting, and admin-surface level, but still lacks a single explicit executive journey plus any first-class board-packet or governance-escalation workflow.
- Fundraiser support spans people, donations, reports, and opportunities, and the donation-create contract is now aligned end to end; the remaining evidence gap is fundraiser-specific campaign and board-reporting depth rather than form validity.
- Nonprofit Administrator support is strongest around route wiring, permissions, organization settings, and scheduled reports; route-catalog truthfulness is now aligned, and the main remaining confidence gap is uninterrupted operator workflow coverage.
- Board Member support has real `viewer`-role mapping, capability-aware report landing, and read-only UI gating, but the effective `viewer` permission set is still broader than the documented oversight-only posture.
- Case Manager support is strongest in intake wiring, follow-ups, portal-safe sharing, and now status-change/saved-view/staff-appointments proof; the shallower area remains broader supervision and outcomes-review workflows.
- Rehab Worker support is real but generic rather than rehab-specific; service logging proof is weaker than notes/forms/follow-up proof, while referral and rehab-plan-adjustment workflows remain only partially evidenced.
- Across personas, the docs story is often stronger than the current end-to-end proof. This is especially visible where the repo has solid route catalogs, help-center coverage, or targeted unit tests but weaker uninterrupted Playwright or workflow-level runs.
- Local validation conditions matter. Multiple persona lanes encountered E2E lock contention, interrupted runs, or shared-env backend preflight issues, so this audit treats blocked and interrupted attempts as signal about the validation surface rather than as workflow failures.

## Command Ledger

### Passed

- `node scripts/check-route-catalog-drift.ts`
- `npm --workspace frontend run test -- --run src/features/contacts/pages/__tests__/ContactListPage.test.tsx src/features/accounts/pages/__tests__/AccountListPage.test.tsx src/features/finance/pages/__tests__/DonationListPage.test.tsx src/features/reports/pages/__tests__/ReportBuilderPage.test.tsx src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx`
- `cd frontend && npm test -- --run src/routes/__tests__/adminRedirects.test.tsx src/routes/__tests__/routeCatalog.test.ts src/features/adminOps/pages/__tests__/AdminSettings.organization.test.tsx src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx`
- `cd backend && npx jest --runInBand src/__tests__/utils/permissions.test.ts src/modules/admin/__tests__/usecases/roleCatalogUseCase.test.ts src/modules/admin/controllers/__tests__/adminSurfaceControllers.test.ts src/__tests__/services/scheduledReportService.test.ts`
- `cd backend && npm run test:unit -- --runInBand src/__tests__/utils/permissions.referenceAdoption.test.ts src/modules/reports/controllers/__tests__/report.handlers.test.ts src/modules/savedReports/controllers/__tests__/savedReport.handlers.test.ts src/modules/savedReports/controllers/__tests__/reportSharing.handlers.test.ts`
- `cd frontend && npm test -- --run src/features/dashboard/pages/__tests__/WorkbenchDashboardPage.test.tsx src/features/savedReports/pages/__tests__/SavedReportsPage.test.tsx src/features/savedReports/pages/__tests__/PublicReportSnapshot.test.tsx src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx`
- `cd frontend && npm test -- --run src/features/cases/pages/__tests__/CaseDetailTabs.test.tsx src/features/cases/components/__tests__/CaseFormsPanel.test.tsx src/features/followUps/pages/__tests__/FollowUpsPage.test.tsx src/features/portal/pages/__tests__/PortalWorkflowPages.test.tsx src/features/portal/pages/__tests__/PortalCaseDetailPage.test.tsx src/features/reports/pages/__tests__/OutcomesReportPage.test.tsx src/features/reports/pages/__tests__/WorkflowCoverageReportPage.test.tsx`
- `cd frontend && npm test -- --run src/components/__tests__/DonationForm.test.tsx src/features/auth/state/__tests__/reportAccess.test.ts src/features/reports/routes/__tests__/createReportRoutes.test.tsx src/routes/__tests__/routeCatalog.test.ts src/features/reports/pages/__tests__/ReportBuilderPage.test.tsx src/features/savedReports/pages/__tests__/SavedReportsPage.test.tsx src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx src/features/cases/pages/__tests__/CaseListPage.test.tsx src/features/cases/pages/__tests__/CaseDetailTabs.test.tsx src/features/cases/components/__tests__/CaseStatusChangeModal.test.tsx`
- `cd backend && DB_HOST=127.0.0.1 DB_PORT=8012 DB_NAME=nonprofit_manager_test DB_USER=postgres DB_PASSWORD=postgres npx jest --runInBand src/modules/savedReports/controllers/__tests__/savedReport.handlers.test.ts src/modules/savedReports/controllers/__tests__/reportSharing.handlers.test.ts src/__tests__/modules/wave2RouteConstruction.test.ts src/__tests__/integration/followUps.test.ts -t "returns forbidden for viewer-role|saved report|report sharing|wave2"`
- `cd e2e && npm test -- --project=chromium tests/donations.spec.ts`

### Failed

- `npm --workspace backend run test:unit -- src/__tests__/services/opportunityService.test.ts src/__tests__/services/reportService.test.ts`
- `cd backend && npm test -- src/__tests__/integration/followUps.test.ts src/__tests__/integration/portalAppointments.test.ts`

### Blocked

- `npm --workspace e2e run test -- --project=chromium tests/people-directory.spec.ts tests/opportunities.spec.ts tests/donations.spec.ts tests/reports.spec.ts`
- `cd e2e && npm test -- --project=chromium tests/admin.spec.ts tests/reports.spec.ts tests/external-service-providers.spec.ts --grep "should load admin settings hub shell|should load portal admin settings route shells|save and schedule KPI report flow remains functional|allows creating and finding a provider record"`

### Interrupted

- `cd e2e && npm test -- --project=chromium tests/analytics.spec.ts tests/reports.spec.ts tests/admin.spec.ts`
- `cd frontend && npm test -- --run src/features/cases/pages/__tests__/CaseListPage.test.tsx src/features/cases/pages/__tests__/CaseDetailTabs.test.tsx src/features/portal/pages/__tests__/PortalCasesPage.test.tsx src/features/portal/pages/__tests__/PortalWorkflowPages.test.tsx src/features/dashboard/pages/__tests__/WorkbenchDashboardPage.test.tsx src/features/reports/pages/__tests__/WorkflowCoverageReportPage.test.tsx`

## Attribution And Limits

- This document synthesizes one lead pass plus six persona-specific subagent findings gathered in the current repo state on `2026-04-18`.
- The original audit evidence collection was intentionally non-mutating; this artifact has since been updated to reflect the remediation work and post-change validation state landed on `2026-04-18`.
- A blocked or interrupted command is recorded as evidence about the validation surface, not as proof that the underlying persona workflow fails.
- This is a validation artifact, not a rewrite of the persona pack. The canonical role and workflow definitions remain in [user-personas.md](../product/user-personas.md) and [persona-workflows.md](../product/persona-workflows.md).
