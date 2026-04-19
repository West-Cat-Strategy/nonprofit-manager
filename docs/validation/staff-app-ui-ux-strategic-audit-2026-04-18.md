# Staff App UI/UX Strategic Audit

**Last Updated:** 2026-04-18

## Scope

- Audit date: `2026-04-18`
- Surface: authenticated staff app only
- Review lanes: navigation and information architecture, workflow ergonomics, and visual cohesion
- Primary comparison docs: [../product/persona-workflows.md](../product/persona-workflows.md) and [../help-center/staff/quick-start.html](../help-center/staff/quick-start.html)
- Representative staff surfaces reviewed: Workbench, People, Cases, Donations, and Report Builder

## Evidence Summary

- `Live evidence observed`
  - The staff login route rendered on the Playwright-managed frontend contract at `http://127.0.0.1:5173/login`.
  - A fresh login screenshot was captured at [artifacts/staff-audit-login-page-2026-04-18.png](artifacts/staff-audit-login-page-2026-04-18.png).
  - The login surface confirms the current shell tone and also exposes repeated runtime auth failures in the console while the page remains visually polished.
- `Live runtime blocked`
  - The preferred Playwright-managed authenticated walkthrough was blocked on `2026-04-18` because the isolated test database failed during `096_database_hardening_and_event_tenancy.sql` with `cannot change name of input parameter "account_id"` while recreating `can_access_account(uuid)`.
  - After that migration failure, the Playwright-managed backend on `127.0.0.1:3001` returned `500` for `/api/v2/auth/setup-status`, `/api/v2/auth/registration-status`, and `/api/v2/auth/login`, preventing an authenticated staff walkthrough.
  - A direct-runtime fallback was also attempted on `127.0.0.1:5174` against a direct backend on `127.0.0.1:3000`; `/health/live` returned `200`, but the same auth and setup endpoints still returned `500`, so the authenticated walkthrough remained blocked.
- `Static evidence reviewed`
  - Code and route ownership: [../../frontend/src/components/Navigation.tsx](../../frontend/src/components/Navigation.tsx), [../../frontend/src/components/navigation/MobileNavigationDrawer.tsx](../../frontend/src/components/navigation/MobileNavigationDrawer.tsx), [../../frontend/src/components/workspace/WorkspaceHeader.tsx](../../frontend/src/components/workspace/WorkspaceHeader.tsx), [../../frontend/src/components/workspace/SurfaceContextBar.tsx](../../frontend/src/components/workspace/SurfaceContextBar.tsx), [../../frontend/src/features/navigation/hooks/useStaffNavigationViewModel.ts](../../frontend/src/features/navigation/hooks/useStaffNavigationViewModel.ts), [../../frontend/src/hooks/useNavigationPreferences.ts](../../frontend/src/hooks/useNavigationPreferences.ts), and the route catalog files under [../../frontend/src/routes/routeCatalog/](../../frontend/src/routes/routeCatalog/).
  - Representative page implementations: [../../frontend/src/features/dashboard/pages/WorkbenchDashboardPage.tsx](../../frontend/src/features/dashboard/pages/WorkbenchDashboardPage.tsx), [../../frontend/src/features/contacts/pages/ContactListPage.tsx](../../frontend/src/features/contacts/pages/ContactListPage.tsx), [../../frontend/src/features/cases/pages/CaseListPage.tsx](../../frontend/src/features/cases/pages/CaseListPage.tsx), [../../frontend/src/features/finance/pages/DonationListPage.tsx](../../frontend/src/features/finance/pages/DonationListPage.tsx), and [../../frontend/src/features/reports/pages/ReportBuilderPage.tsx](../../frontend/src/features/reports/pages/ReportBuilderPage.tsx).
  - Existing staff screenshots: [../help-center/staff/assets/screenshots/quick-start/dashboard-entry-point.png](../help-center/staff/assets/screenshots/quick-start/dashboard-entry-point.png), [../help-center/staff/assets/screenshots/people-accounts/people-list.png](../help-center/staff/assets/screenshots/people-accounts/people-list.png), [../help-center/staff/assets/screenshots/cases/cases-list.png](../help-center/staff/assets/screenshots/cases/cases-list.png), [../help-center/staff/assets/screenshots/donations/donations-list.png](../help-center/staff/assets/screenshots/donations/donations-list.png), and [../help-center/staff/assets/screenshots/reports/report-builder.png](../help-center/staff/assets/screenshots/reports/report-builder.png).

## Findings

### Navigation And Information Architecture

1. `Critical friction`: the default desktop navigation hides too much of the documented daily staff path behind `More`.
   Evidence: [../help-center/staff/quick-start.html](../help-center/staff/quick-start.html) trains staff on Workbench, People, Events, Donations, and Reports as the stable first-day path, but [../../frontend/src/features/navigation/hooks/useStaffNavigationViewModel.ts](../../frontend/src/features/navigation/hooks/useStaffNavigationViewModel.ts) hard-caps desktop primary visibility while [../../frontend/src/routes/routeCatalog/staffFinanceRoutes.ts](../../frontend/src/routes/routeCatalog/staffFinanceRoutes.ts) and [../../frontend/src/routes/routeCatalog/staffInsightsRoutes.ts](../../frontend/src/routes/routeCatalog/staffInsightsRoutes.ts) place Donations and Reports deeper in the hierarchy.

2. `High-value improvement`: desktop and mobile teach different maps of the same workspace.
   Evidence: the desktop rail is driven by nav grouping and ordering, while mobile re-sorts by `mobilePriority`, producing a different set of first-touch destinations from the same catalog. See [../../frontend/src/features/navigation/hooks/useStaffNavigationViewModel.ts](../../frontend/src/features/navigation/hooks/useStaffNavigationViewModel.ts), [../../frontend/src/routes/routeCatalog/staffHomeRoutes.ts](../../frontend/src/routes/routeCatalog/staffHomeRoutes.ts), and [../../frontend/src/routes/peopleRouteDescriptors.tsx](../../frontend/src/routes/peopleRouteDescriptors.tsx).

3. `High-value improvement`: naming drift forces staff to translate between `Home`, `Dashboard`, and `Workbench Overview`.
   Evidence: [../../frontend/src/routes/routeCatalog/staffHomeRoutes.ts](../../frontend/src/routes/routeCatalog/staffHomeRoutes.ts), [../../frontend/src/components/Navigation.tsx](../../frontend/src/components/Navigation.tsx), and [../help-center/staff/quick-start.html](../help-center/staff/quick-start.html) describe the same destination differently.

4. `High-value improvement`: the context bar computes useful local navigation but the staff shell suppresses it.
   Evidence: [../../frontend/src/components/workspace/SurfaceContextBar.tsx](../../frontend/src/components/workspace/SurfaceContextBar.tsx) supports local navigation, but [../../frontend/src/components/workspace/WorkspaceHeader.tsx](../../frontend/src/components/workspace/WorkspaceHeader.tsx) sets `showLocalNavigation={false}`, leaving breadcrumbs without a browsable in-area map for deeper staff surfaces.

### Workflow UX

5. `Critical friction`: Workbench behaves more like a configuration hub than a workload triage surface.
   Evidence: the quick-start expects Workbench to be the first stop for reviewing work that needs attention, but [../../frontend/src/features/dashboard/pages/WorkbenchDashboardPage.tsx](../../frontend/src/features/dashboard/pages/WorkbenchDashboardPage.tsx) and the current screenshot emphasize `Manage Navigation`, `Customize View`, and `Customize Layout` alongside operational actions.

6. `High-value improvement`: People search adds ceremony instead of reducing time to the primary task.
   Evidence: [../help-center/staff/quick-start.html](../help-center/staff/quick-start.html) tells staff to search for an existing person before creating one, but [../../frontend/src/features/contacts/pages/ContactListPage.tsx](../../frontend/src/features/contacts/pages/ContactListPage.tsx) and [../../frontend/src/features/people/components/FilterPanel.tsx](../../frontend/src/features/people/components/FilterPanel.tsx) wrap a simple live-search use case in a heavier `Refine results` ritual and retain dense row actions that compete with simply opening a record.

7. `Critical friction`: Cases supports queue-heavy work, but the first viewport is overloaded before staff can start triage.
   Evidence: [../../frontend/src/features/cases/pages/CaseListPage.tsx](../../frontend/src/features/cases/pages/CaseListPage.tsx) stacks metrics, search, multiple filters, sort, saved views, quick filters, toggles, chips, and bulk actions above the main work area, which clashes with the queue-first case-manager expectations in [../product/persona-workflows.md](../product/persona-workflows.md).

8. `High-value improvement`: filter interaction semantics vary too much across core staff modules.
   Evidence: People behaves like a live-search screen, Donations refreshes on filter changes, and Cases mixes staged and immediate filtering. See [../../frontend/src/features/contacts/hooks/useContactListPage.tsx](../../frontend/src/features/contacts/hooks/useContactListPage.tsx), [../../frontend/src/features/finance/pages/DonationListPage.tsx](../../frontend/src/features/finance/pages/DonationListPage.tsx), and [../../frontend/src/features/cases/hooks/useCaseListQueryState.ts](../../frontend/src/features/cases/hooks/useCaseListQueryState.ts).

9. `High-value improvement`: Report Builder is powerful but too expert-first for recurring nonprofit reporting.
   Evidence: [../help-center/staff/quick-start.html](../help-center/staff/quick-start.html) frames reporting as a short recurring workflow, but [../../frontend/src/features/reports/pages/ReportBuilderPage.tsx](../../frontend/src/features/reports/pages/ReportBuilderPage.tsx) exposes a long builder stack before the simpler repeatable path is clear.

10. `High-value improvement`: Donations is the cleanest reviewed operational page, but row-level action density still dilutes the primary task.
    Evidence: [../../frontend/src/features/finance/pages/DonationListPage.tsx](../../frontend/src/features/finance/pages/DonationListPage.tsx) pairs clear summary stats and a strong top-level CTA with dense per-row action clusters, which weakens scanability during everyday exception handling.

### Visual System

11. `High-value improvement`: the shell feels like one product, but the feature surfaces do not.
    Evidence: [../../frontend/src/components/Navigation.tsx](../../frontend/src/components/Navigation.tsx) and [../../frontend/src/components/workspace/SurfaceContextBar.tsx](../../frontend/src/components/workspace/SurfaceContextBar.tsx) share a restrained pill-and-border language, while the reviewed page surfaces swing between airy white layouts, neo-brutalist queue panels, bright status bands, and mixed CTA styles.

12. `High-value improvement`: the current theme system changes too much of the product’s personality for an operational staff workspace.
    Evidence: [../../frontend/src/theme/themeRegistry.ts](../../frontend/src/theme/themeRegistry.ts) and the theme styles in [../../frontend/public/themes/](../../frontend/public/themes/) vary fonts, radius, shadows, and component tone in addition to color, which makes the app feel visually inconsistent across staff surfaces and complicates onboarding expectations.

## Backlog

### Quick Wins

- Choose one canonical label for the home hub and use it consistently across navigation, breadcrumbs, screenshots, and help-center content.
- Promote the default daily staff destinations so Donations and Reports do not feel peripheral to the main workspace.
- Let the shared context bar own the page-primary action and demote customization or admin controls into tertiary menus where possible.
- Reduce row action density on People and Donations so `Open` or `View` is the dominant first action and specialist actions move into overflow menus.

### Structural UX Changes

- Restore lightweight staff local navigation in the shared header so deeper routes expose sibling destinations without a forced return to global overflow.
- Standardize list-page semantics: live basic filters, collapsible advanced filters, and `Apply` only where query cost justifies it.
- Recenter Workbench on active queues, resume-work links, and exceptions instead of shortcut management and layout controls.
- Split Cases and Report Builder into a clearer basic path plus advanced panels so daily work starts above the fold.

### Design-System Decisions

- Reduce the staff workspace to one primary visual language plus explicit accessibility variants such as high contrast.
- Define canonical page archetypes for overview, list and queue, and builder screens so spacing, heading scale, KPI treatment, and CTA hierarchy stay consistent.
- Normalize semantic color use so high-contrast yellows, aqua table bands, strong black borders, and accent pills each mean something stable across modules instead of reflecting page-local taste.

## Commands And Artifacts

```bash
# Playwright-managed live review attempt
DB_AUTO_START=true COMPOSE_MODE=ci DB_HOST=127.0.0.1 DB_PORT=8012 DB_NAME=nonprofit_manager_test DB_USER=postgres DB_PASSWORD=postgres ./scripts/db-migrate.sh
cd backend && NODE_ENV=test PORT=3001 ... npx ts-node -r tsconfig-paths/register --transpileOnly src/index.ts
cd frontend && VITE_API_URL=http://127.0.0.1:3001/api npm run dev -- --host 127.0.0.1 --port 5173

# Direct-runtime fallback
cd backend && NODE_ENV=development PORT=3000 DB_HOST=127.0.0.1 DB_PORT=8002 DB_NAME=nonprofit_manager DB_USER=nonprofit_app_user DB_PASSWORD=nonprofit_app_password REDIS_ENABLED=false CORS_ORIGIN=http://127.0.0.1:5174,http://localhost:5174 npx ts-node -r tsconfig-paths/register --transpileOnly src/index.ts
cd frontend && VITE_API_URL=http://127.0.0.1:3000/api npm run dev -- --host 127.0.0.1 --port 5174

# Fresh login screenshot artifact
playwright-cli -s=staff-audit screenshot --filename output/playwright/staff-audit/login-page.png
```

## Bottom Line

The staff app already contains most of the right capabilities, but the experience currently asks staff to spend too much attention on navigation translation, configuration controls, and page-local interaction rules before they can simply do the work. The shell is the strongest part of the product. The next UI/UX wave should focus on making the default staff path easier to find, simplifying the first screen of the main work queues, and narrowing the staff visual system to one dependable operational identity.
