# App UI/UX Audit

Generated: 2026-03-06T00:12:19.788Z

## Baseline

- Static route issues before fixes: 4
- Broken targets: /alerts/history, /alerts/instances, /users, /volunteers/assignments/new
- Disallowed inline-style hotspots: 6
- Runtime audit status: blocked in this environment pending Docker-backed Playwright execution

## Post-Fix Static Audit

- Route integrity: pass
- Route catalog drift: pass
- Broken targets remaining: 0
- Hardcoded color utilities: 0
- Semantic token utilities: 6338
- Disallowed inline-style paths remaining: 0

## Workflow Surfaces

| Surface | Baseline | Post-Fix | Notes |
| --- | --- | --- | --- |
| Staff Navigation | 3/3/2/2 (broken) | 4/4/4/4 (available) | Navigation and utility links are catalog-driven and validated by route-integrity checks. |
| Admin User Management | 3/3/1/1 (broken) | 4/4/4/4 (available) | The card now routes to `/settings/admin?section=users` and the admin side-nav uses the route catalog. |
| Alerts Workspace | 2/2/1/1 (missing-ui) | 4/4/4/4 (available) | Configuration, triggered alerts, and history routes now share a consistent shell with cross-links. |
| Dashboard Volunteer Widget | 3/3/1/1 (broken) | 4/4/4/4 (available) | The shortcut now routes to the volunteer management surface instead of a dead-end create page. |
| Portal Navigation | 3/3/3/3 (available) | 4/4/4/4 (available) | Portal navigation now consumes the shared route catalog and aligns with the shared shell. |

## High-Traffic Route Ratings

Scores are `readability/accessibility/efficiency/workflowClarity`.

| Route | Baseline | Post-Fix | Access |
| --- | --- | --- | --- |
| Sign In | 4/4/4/4 (available) | 4/4/4/4 (available) | public |
| Portal Dashboard | 4/4/4/4 (available) | 4/4/4/4 (available) | portal |
| Dashboard | 4/4/4/4 (available) | 4/4/4/4 (available) | staff |
| People | 4/4/4/4 (available) | 4/4/4/4 (available) | staff |
| Events | 4/4/4/4 (available) | 4/4/4/4 (available) | staff |
| Tasks | 4/4/4/4 (available) | 4/4/4/4 (available) | staff |
| Cases | 4/4/4/4 (available) | 4/4/4/4 (available) | staff |
| Donations | 4/4/4/4 (available) | 4/4/4/4 (available) | staff |
| Analytics | 4/4/4/4 (available) | 4/4/4/4 (available) | staff |
| Reports | 4/4/4/4 (available) | 4/4/4/4 (available) | staff |
| Alerts | 2/2/1/1 (missing-ui) | 4/4/4/4 (available) | staff |
| Admin Settings | 3/3/2/2 (available) | 4/4/4/4 (role-gated) | admin |

## Runtime Audit Gate

- Status: blocked
- Reason: Docker-backed Playwright audit could not run in this execution environment because the Docker daemon/socket was unavailable on March 6, 2026.
- Required commands:
  - `npx playwright test tests/link-health.spec.ts --project=chromium`
  - `npx playwright test tests/navigation-links.spec.ts --project=chromium`

