# Executive Director Persona Findings Remediation Tracker (2026-04-20)

**Last Updated:** 2026-04-20


This document is the live remediation companion to [executive-director-persona-findings-2026-04-20.md](executive-director-persona-findings-2026-04-20.md). The original findings file remains an immutable snapshot; this tracker records the current implementation state, owner rows, canonical route errata, verification commands, and backlog boundaries for the `P4-T54` remediation wave.

## Status Key

- `open`: not yet remediated in the current worktree
- `partial`: code and/or targeted validation landed, but the full proof slice is still incomplete
- `closed`: implementation and the targeted verification slice for this finding are complete
- `backlog-only`: explicitly outside the current implementation wave; captured here so the snapshot findings stay actionable without pretending the feature work is in scope now

## Active Wave Findings

| Finding | Status | Owner row(s) | Current remediation state | Verification | Closeout date |
|---|---|---|---|---|---|
| 1. MFA-aware persona onboarding proof for admin and manager roles is missing | `closed` | `P4-T54`, `P4-T9` | Reusable MFA/runtime helpers now have fresh-runtime proof in the current tree. A separate starter-only Docker project was brought up with `DEV_BYPASS_MFA_FOR_TESTS=false`, which exposed that first-admin setup was not syncing the admin role mapping before the next password login. `setupFirstUser` now calls `syncUserRole`, the targeted backend auth controller suite passed, and the reset fresh-workspace proof now confirms the admin MFA-enrollment gate plus the seeded manager TOTP flow on the external Docker contract. | `cd backend && npm test -- --runInBand src/__tests__/auth.test.ts`; `cd e2e && E2E_BACKEND_PORT=8114 E2E_FRONTEND_PORT=8115 E2E_PUBLIC_SITE_PORT=8116 E2E_DB_PORT=8112 SKIP_WEBSERVER=1 BYPASS_MFA_FOR_TESTS=false npm run test:docker -- tests/fresh-workspace-multi-user.spec.ts --project=chromium` | 2026-04-20 |
| 2. Persona smoke route probes drift from the canonical mounted contracts | `closed` | `P4-T54`, `P4-T9` | `/api/v2/reports/templates` and `/api/v2/users` remain the canonical persona-smoke targets, and the same fresh-runtime persona proof now passes those canonical route probes without reintroducing the snapshot’s drifted `/api/v2/reports?limit=10` or `/api/v2/admin/users` assumptions. `/api/v2/saved-reports` remains a supporting permission-behavior probe, not the route-contract errata baseline. | `cd backend && DB_HOST=127.0.0.1 DB_PORT=8012 DB_NAME=nonprofit_manager_test DB_USER=postgres DB_PASSWORD=postgres npx jest --runInBand src/__tests__/integration/routeGuardrails.test.ts src/modules/users/controllers/__tests__/userController.test.ts src/modules/admin/controllers/__tests__/adminSurfaceControllers.test.ts`; `cd e2e && E2E_BACKEND_PORT=8114 E2E_FRONTEND_PORT=8115 E2E_PUBLIC_SITE_PORT=8116 E2E_DB_PORT=8112 SKIP_WEBSERVER=1 BYPASS_MFA_FOR_TESTS=false npm run test:docker -- tests/fresh-workspace-multi-user.spec.ts --project=chromium` | 2026-04-20 |
| 3. Executive, board, and nonprofit-admin reporting workflows are still assembled from primitives instead of a persona-aware entry point | `closed` | `P4-T54`, `P4-T1R4` | `/reports` now renders a persona-aware landing workspace instead of a pure redirect, with cards for `Executive + Board Pack`, `Admin Reporting Reliability`, and `Fundraising Cadence`. Existing downstream routes stay intact, and `/reports/templates` now supports direct-link prefiltering via `category` and `tag` query params. | `cd frontend && npm test -- --run src/features/reports/pages/__tests__/ReportTemplatesPage.test.tsx src/features/reports/pages/__tests__/ReportBuilderPage.test.tsx src/features/reports/pages/__tests__/ReportsHomePage.test.tsx src/features/reports/routes/__tests__/createReportRoutes.test.tsx src/features/reports/hooks/__tests__/useReportTemplatesController.test.tsx src/features/dashboard/pages/__tests__/WorkbenchDashboardPage.test.tsx`; `cd frontend && npm run type-check` | 2026-04-19 |
| 4. Fundraiser stewardship workflows are present but not surfaced as a first-class operating path | `closed` | `P4-T54` | Fundraising-oriented system template packs now exist, and both donations and opportunities surfaces include compact fundraiser workflow panels that deep-link into the existing reports home, fundraising template pack, scheduled reports, opportunities pipeline, and communications settings routes. | `cd frontend && npm test -- --run src/features/finance/pages/__tests__/DonationListPage.test.tsx src/features/engagement/opportunities/pages/__tests__/OpportunitiesPage.test.tsx src/features/reports/pages/__tests__/ReportTemplatesPage.test.tsx`; `cd frontend && npm run type-check` | 2026-04-19 |

## Backlog-Only Follow-through

| Finding | Status | Owner row(s) | Current remediation state | Verification | Closeout date |
|---|---|---|---|---|---|
| 5. Dedicated governance-risk escalation workspace | `backlog-only` | — | The snapshot correctly calls out the lack of a first-class governance escalation workspace. `P4-T54` does not introduce a new governance data model or workflow engine; it only adds persona-aware reporting entry points that can support later governance work. | Product backlog only | — |
| 6. Board conflict-of-interest disclosure and recusal workflow | `backlog-only` | — | Still outside current scope because the app has no conflict or recusal model. Keep this visible here so the reporting kickoff is not mistaken for a governance-record system. | Product backlog only | — |
| 7. Delegation-authority matrix and committee charter traceability | `backlog-only` | — | Still outside current scope because the app has no committee charter or delegation matrix model. Do not fold this into reports/dashboard follow-through. | Product backlog only | — |
| 8. Annual board/990 compliance command center | `backlog-only` | — | Remains external-only for the current product boundary. The reporting kickoff can improve inputs, but not replace accounting, legal review, or filing workflows. | Product backlog only | — |
| 9. Compliance-documentation vault and retention workflow | `backlog-only` | — | Still outside current scope because the app lacks a dedicated records-retention and audit-artifact storage model. Keep it separate from the current persona-entry-point wave. | Product backlog only | — |

## Notes

- `P4-T54` is the single active tracked task for this wave. `P4-T1R4` and `P4-T9` remain related rows with explicit cross-references rather than separate parent tasks.
- The current wave intentionally keeps `/api/v2` response envelopes and backend route shapes stable. The main contract changes are frontend-only: `/reports` becomes a real page instead of a pure redirect, and `/reports/templates` gains query-param-aware prefiltering.
- Targeted local verification passed for docs, frontend, and backend once the explicit local test DB settings were provided. The fresh-workspace E2E blocker is now closed: a separate starter-only Docker project reproduced the proof on a true `setupRequired=true` stack, exposed the missing `syncUserRole` call in first-admin setup, and then passed the persona proof after that backend fix and a clean stack reset.
- The snapshot findings file is intentionally left untouched. Any future errata or closeout should be recorded here unless a new dated snapshot is produced.
