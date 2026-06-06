# Code Review Remediation Proof - 2026-06-05

## Scope

Implemented the code-review remediation batch from an isolated sibling worktree on `codex/code-review-remediation-2026-06-05`.

Primary changes:

- Removed default organization fallback from staff auth session issuance and request context validation.
- Required active organization context for export, analytics, meetings, branding, and custom report generation.
- Scoped legacy exports, analytics summary queries/cache keys, meetings, committees, and admin branding to the active organization.
- Required payment-process permission plus payment-intent ownership resolution before refund creation.
- Moved public report and public case-form access to fragment links plus bearer-token public API calls while preserving temporary legacy path-token routes.
- Added Mautic outbound request guarding with per-request DNS resolution, private IP rejection, pinned Undici dispatch, and disabled redirects.
- Cleaned dependency audit findings with `qs@6.15.2`, `tmp@0.2.6`, and a deliberate `exceljs` lock pin to `uuid@11.1.1`.
- Updated validation tooling so dependency changes select full audit coverage and `check-changed` defaults to upstream `main`.
- Removed staff SPA `script-src 'unsafe-inline'` from the frontend nginx CSP.
- Added shared admin reset-modal dialog shell behavior and property-panel label/id wiring for section and generic style controls.
- Forced protected portal shell routes to refresh portal bootstrap auth before rendering protected portal content.

## Validation

Passed:

| Command | Result |
|---|---|
| `./scripts/select-checks.sh --files "<final changed files>" --mode strict` | Passed; selected `make check-links`, `make security-scan`, `make test-tooling`, `npm run knip`, `npm run audit`, `make security-audit`, `make lint`, `make typecheck`, `make test-coverage-full`, and `make db-verify`. |
| `npm ci --ignore-scripts` | Passed; clean install accepted the manifest/lock pair and reported 0 vulnerabilities. |
| `npm run audit:prod` | Passed; 0 vulnerabilities. |
| `npm run audit` | Passed; 0 vulnerabilities. |
| `make security-audit` | Passed; root production audit returned 0 vulnerabilities. |
| `make security-scan` | Passed; root production audit returned 0 vulnerabilities and both gitleaks worktree/history scans found no leaks. |
| `npm run knip` | Passed. |
| `make test-tooling` | Passed; 58 tooling contract tests. |
| `make lint` | Passed; backend lint, shared policy checks, route integrity, route catalog drift, UI audit baseline, and frontend lint. |
| `make typecheck` | Passed; backend, frontend, and shared contracts. |
| `make check-links` | Passed; checked 261 files and 1505 local links. |
| `make lint-migration-manifest` | Passed. |
| `git diff --check` | Passed. |
| `node scripts/ui-audit.ts --enforce-baseline` | Passed with style baseline `1541/10144/60`. |
| `npm run type-check --workspace backend` | Passed. |
| `npm run type-check --workspace frontend` | Passed. |
| `cd backend && npx jest --runInBand src/__tests__/services/reportService.test.ts src/__tests__/services/analyticsService.test.ts src/modules/meetings/services/__tests__/meetingService.test.ts src/modules/admin/__tests__/usecases/adminSurfaceUseCases.test.ts src/modules/admin/controllers/__tests__/adminSurfaceControllers.test.ts src/__tests__/authMiddleware.test.ts src/__tests__/services/authGuardService.test.ts src/__tests__/modules/payments.intentOwnership.test.ts src/__tests__/services/mauticService.test.ts src/__tests__/utils/rateLimitKeys.test.ts src/modules/publicReports/controllers/__tests__/reportSharingController.test.ts src/modules/cases/controllers/__tests__/publicForms.controller.test.ts src/ingest/__tests__/ingestEnhanced.test.ts src/modules/shared/export/__tests__/tabularExport.test.ts src/modules/contacts/__tests__/contactImportExport.usecase.test.ts` | Passed; 14 suites, 168 tests. |
| `cd backend && npx jest --runInBand src/modules/cases/usecases/__tests__/caseForms.usecase.test.ts src/modules/savedReports/controllers/__tests__/reportSharing.handlers.test.ts src/modules/publicReports/routes/__tests__/publicReportsRateLimits.test.ts src/modules/cases/routes/__tests__/publicCaseFormsRateLimits.test.ts` | Passed; 4 suites, 36 tests. |
| `cd frontend && npx vitest run src/features/portal/api/publicCaseFormsApiClient.test.ts src/features/portal/pages/__tests__/PublicCaseFormPage.test.tsx src/features/savedReports/pages/__tests__/PublicReportSnapshot.test.tsx src/features/builder/components/editor/__tests__/PropertyPanel.test.tsx src/components/__tests__/PortalLayout.test.tsx src/components/auth/__tests__/ProtectedRoute.workspaceModules.test.tsx` | Passed; 6 files, 18 tests. |
| `cd frontend && npx vitest run src/features/savedReports/pages/__tests__/SavedReportsPage.test.tsx src/features/cases/components/__tests__/CaseFormsPanel.test.tsx src/features/portal/pages/__tests__/PublicCaseFormPage.test.tsx src/features/savedReports/pages/__tests__/PublicReportSnapshot.test.tsx` | Passed; 4 files, 16 tests. |

Blocked or caveated:

- `npm --workspace backend test -- --runInBand ...` did not start because the repo validation preflight requires Docker and the local Docker daemon/socket was unavailable.
- Docker-backed gates `make db-verify` and `make test-coverage-full` did not start because the local Docker daemon/socket was unavailable.
- `npm ls qs tmp uuid --workspaces --include-workspace-root --depth=10` reports `uuid@11.1.1 invalid: "^8.3.0" from node_modules/exceljs`. This is expected for the deliberate out-of-range advisory pin; `npm ci --ignore-scripts`, `npm run audit`, `npm run audit:prod`, and focused Excel import/export tests passed.

## Follow-Up Gates

Run after Docker is available:

1. `make db-verify`
2. `make test-coverage-full`
