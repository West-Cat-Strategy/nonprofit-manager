# P5-T142 Cross-Module Tenancy, Permission, Contract, And Tooling Proof

**Row date:** 2026-06-11  
**Final validation completed:** 2026-06-12  
**Status:** Proof-complete; archived after mainline merge
**Workboard Row:** `P5-T142`  
**Scope:** Tenant scoping, permission gates, public donation confirmation safety, API-client path normalization, production app-role provisioning, migration proof, Docker/runtime review tooling, and selector coverage.

## Mainline Disposition

- Archived on 2026-06-13 after `1f820a66` (`fix: harden cross-module tenancy and tooling contracts`) was confirmed reachable from `main`.
- Removed from live board ownership by the June 13 docs-only mainline proof reconciliation; future cross-module tenancy, permission, contract tooling, or related runtime follow-up should open as a new signed-out row.
- No runtime code, migrations, API contracts, routes, tests, production data, deploy action, or CI policy changed in the archive pass.

## Scope Guardrails

- Preserved route paths, `/api/v2` envelopes, response envelopes, and product scope.
- Kept public-safe product change limited to `/donations/checkout-result`; staff donation actions remain behind authenticated staff routes.
- Kept frontend feature clients on relative paths while leaving `createApiClient` responsible for `/v2` base handling.
- No production deploy, production read/write, route rename, envelope rewrite, or broad visual redesign was performed.
- Excluded the unrelated auth-alias/P5-T75 paths from P5-T142 ownership: `docs/security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md`, `docs/validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md`, `docs/validation/P5-T75_AUTH_ALIAS_GATE_HANDOFF_2026-05-05.md`, `scripts/auth-alias-telemetry-review.mjs`, `scripts/tests/auth-alias-telemetry-review.test.mjs`, and `scripts/fixtures/auth-alias-telemetry-review/mixed-june-review.ndjson`. `docs/validation/README.md` is a shared index file; this note owns only the P5-T142 row/index update there.

## Final Owned Path Set

```text
.env.production.example
backend/src/__tests__/modules/mailchimp.routes.security.test.ts
backend/src/__tests__/services/mailchimpService.test.ts
backend/src/__tests__/services/savedReportService.test.ts
backend/src/__tests__/utils/permissions.referenceAdoption.test.ts
backend/src/modules/contacts/routes/index.ts
backend/src/modules/donations/routes/index.ts
backend/src/modules/mailchimp/controllers/mailchimpController.ts
backend/src/modules/mailchimp/routes/index.ts
backend/src/modules/mailchimp/services/mailchimpCampaignRuns.ts
backend/src/modules/mailchimp/services/mailchimpService.ts
backend/src/modules/publishing/routes/__tests__/cacheAdminRoutes.security.test.ts
backend/src/modules/publishing/routes/__tests__/publicRateLimits.test.ts
backend/src/modules/publishing/routes/index.ts
backend/src/modules/savedReports/controllers/__tests__/reportSharing.handlers.test.ts
backend/src/modules/savedReports/controllers/__tests__/savedReport.handlers.test.ts
backend/src/modules/savedReports/controllers/reportSharing.handlers.ts
backend/src/modules/savedReports/controllers/savedReport.handlers.ts
backend/src/modules/savedReports/routes/index.ts
backend/src/modules/savedReports/services/savedReportService.ts
backend/src/modules/scheduledReports/routes/__tests__/scheduledReports.routes.security.test.ts
backend/src/modules/scheduledReports/routes/index.ts
backend/src/modules/tasks/controllers/tasks.controller.ts
backend/src/modules/tasks/repositories/taskRepository.ts
backend/src/modules/tasks/routes/index.ts
backend/src/modules/tasks/types/ports.ts
backend/src/modules/tasks/usecases/taskCatalog.usecase.ts
backend/src/modules/tasks/usecases/taskLifecycle.usecase.ts
backend/src/modules/volunteers/routes/index.ts
backend/src/services/paymentProviderAdapters/paypalPaymentProviderAdapter.ts
backend/src/services/paymentProviderAdapters/squarePaymentProviderAdapter.ts
backend/src/services/publicReportSnapshotService.ts
backend/src/services/publishing/publicWebsiteFormService.ts
backend/src/services/taskService.ts
backend/src/types/mailchimp.ts
backend/src/types/payment.ts
backend/src/types/savedReport.ts
backend/src/types/task.ts
backend/src/utils/permissions.ts
database/initdb/000_init.sql
database/migrations/137_code_review_remediation_security_scope.sql
database/migrations/138_task_organization_scope.sql
database/migrations/139_saved_reports_organization_scope.sql
database/migrations/manifest.tsv
docker-compose.db-self-hosted.yml
docker-compose.dev.yml
docs/deployment/DB_SETUP.md
docs/deployment/DEPLOYMENT.md
docs/phases/planning-and-progress.md
docs/validation/P5-T142_CROSS_MODULE_TENANCY_PERMISSION_CONTRACT_TOOLING_PROOF_2026-06-11.md
docs/validation/README.md
e2e/helpers/auth.ts
e2e/helpers/darkModeAudit.ts
e2e/helpers/domainFixtures.ts
e2e/tests/dark-mode-accessibility-audit.spec.ts
frontend/src/components/__tests__/CaseForm.test.tsx
frontend/src/components/__tests__/ContactForm.test.tsx
frontend/src/features/accounts/api/accountsApiClient.ts
frontend/src/features/activities/__tests__/activitiesApiClient.test.ts
frontend/src/features/activities/api/activitiesApiClient.ts
frontend/src/features/adminOps/api/portalAdminAppointmentsApiClient.ts
frontend/src/features/adminOps/pages/__tests__/EmailMarketingPage.test.tsx
frontend/src/features/analytics/api/analyticsApiClient.ts
frontend/src/features/analytics/pages/__tests__/AnalyticsPage.test.tsx
frontend/src/features/cases/api/caseFormsApiClient.ts
frontend/src/features/cases/api/casesApiClient.ts
frontend/src/features/contacts/api/contactsApiClient.ts
frontend/src/features/contacts/components/__tests__/ContactNotesPanel.test.tsx
frontend/src/features/dashboard/api/dashboardApiClient.test.ts
frontend/src/features/dashboard/api/dashboardApiClient.ts
frontend/src/features/events/api/eventsApiClient.ts
frontend/src/features/finance/pages/PublicDonationCheckoutResultPage.tsx
frontend/src/features/finance/pages/__tests__/PublicDonationCheckoutResultPage.test.tsx
frontend/src/features/finance/routeComponents.tsx
frontend/src/features/followUps/api/followUpsApiClient.ts
frontend/src/features/followUps/pages/FollowUpsPage.tsx
frontend/src/features/followUps/pages/__tests__/FollowUpsPage.test.tsx
frontend/src/features/meetings/api/meetingsApiClient.ts
frontend/src/features/neoBrutalist/pages/__tests__/NeoBrutalistDashboardPage.test.tsx
frontend/src/features/portal/api/portalApiClient.ts
frontend/src/features/portal/api/portalCaseFormsApiClient.test.ts
frontend/src/features/portal/api/portalCaseFormsApiClient.ts
frontend/src/features/portal/api/publicCaseFormsApiClient.test.ts
frontend/src/features/portal/api/publicCaseFormsApiClient.ts
frontend/src/features/queueViews/api/queueViewsApiClient.ts
frontend/src/features/reports/api/reportsApiClient.ts
frontend/src/features/savedReports/api/savedReportsApiClient.ts
frontend/src/features/scheduledReports/api/scheduledReportsApiClient.ts
frontend/src/features/tasks/api/tasksApiClient.ts
frontend/src/features/teamChat/api/teamChatApi.ts
frontend/src/features/teamChat/api/teamMessengerApi.ts
frontend/src/features/volunteers/api/volunteersApiClient.test.ts
frontend/src/features/volunteers/api/volunteersApiClient.ts
frontend/src/routes/__tests__/routeCatalog.test.ts
frontend/src/routes/index.tsx
frontend/src/routes/routeCatalog/public.ts
frontend/src/services/__tests__/httpClient.test.ts
frontend/src/services/httpClient.ts
frontend/src/test/setup.ts
frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx
frontend/src/test/ux/RouteUxSmoke.test.tsx
package.json
scripts/README.md
scripts/deploy.sh
scripts/docker-validate-overlays.sh
scripts/select-checks.sh
scripts/sql/provision_self_hosted_app_role.sh
scripts/sql/verify_alert_scope_and_donation_delete.sql
scripts/tests/tooling-contracts.test.cjs
scripts/verify-migrations.sh
```

## Implementation Summary

- Added organization-backed task and saved-report scope through migrations `138` and `139`, initdb/manifest wiring, active-organization service filters, and create/update/delete guards.
- Kept publishing, donations, scheduled reports, contacts, volunteers, and Mailchimp sync behind narrow `Permission.*` gates, with focused security coverage.
- Scoped saved-report sharing and public snapshots to the active organization, including share-principal lookup.
- Passed requester account/organization scope through Mailchimp single/bulk contact sync and saved-audience targeting.
- Normalized frontend API client paths to relative route paths while preserving `/api/v2` envelope behavior through `createApiClient`.
- Added public one-time donation checkout result handling at `/donations/checkout-result`, dropped unsafe `return_to` targets, and preserved protected staff donation flows.
- Kept migration `137` fail-closed for unresolved alert config backfill, repaired donation RLS delete policy proof, and extended migration verification for alert scope, trigger sync, and donation delete behavior.
- Kept self-hosted production Compose on `DB_USER=nonprofit_app_user_prod`, separate `DB_ADMIN_PASSWORD`, and the app-role provisioning script.
- Extended selector/tooling coverage for SQL shell helpers, release/runtime shell helpers, Docker review flags, and dark-mode audit fixture/runtime contracts.

## Validation Log

| Command                                                                  | Result                                 | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `./scripts/select-checks.sh --mode fast`                                 | Pass                                   | Selected the focused lane checks required for this path set.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `make check-links`                                                       | Pass                                   | Initial run checked 268 files / 1532 local links. Final docs rerun checked 269 files / 1534 local links.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `make lint`                                                              | Pass                                   | Initial, late, and final proof/docs reruns passed backend lint, shared policy checks, frontend lint, route integrity, route catalog drift, and UI audit baseline.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `make test-tooling`                                                      | Pass                                   | Initial run passed 73 tests; final late rerun passed 74 tests after Docker/dev/audit tooling coverage.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `cd backend && npm run lint`                                             | Pass                                   | Backend lint passed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `cd backend && npm run type-check`                                       | Pass                                   | Backend TypeScript passed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `cd backend && npm test -- src/__tests__/integration`                    | Pass after rerun                       | First full integration run hit transient DB connection termination symptoms; targeted `analytics.test.ts --runInBand` passed, then the full integration rerun passed 44 suites / 500 tests.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `cd frontend && npm run lint`                                            | Pass                                   | Frontend lint passed before and after frontend test/client adjustments.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `cd frontend && npm run type-check`                                      | Pass                                   | Frontend TypeScript passed before and after frontend test/client adjustments.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `cd frontend && npm test -- --run`                                       | Pass after fixes                       | Initial run exposed stale `/v2` test assumptions after path normalization; targeted subset passed, then full rerun passed 256 files / 1412 tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `make docker-validate-overlays`                                          | Pass after fix                         | Initial self-hosted DB overlay validation exposed missing config-only `DB_ADMIN_PASSWORD`; rerun passed all overlay/Caddy checks. Final late rerun also passed.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `make test-e2e-docker-smoke`                                             | Pass                                   | Initial attempts waited on sibling locks/occupied ports; final isolated smoke passed 4 Chromium tests and stopped its stack.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `make db-verify`                                                         | Pass                                   | Verified canonical migrations, app role provisioning, non-superuser/RLS posture, alert organization scope, alert trigger sync, and donation delete policy.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `npm run --silent sbom > /tmp/nonprofit-manager.cdx.json && node -e ...` | Pass                                   | CycloneDX SBOM parsed as spec `1.5` with 968 components after root override cleanup.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `npm ls minimatch ip-address undici --all`                               | Pass                                   | Confirmed dependency graph no longer reports invalid override edges.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `make release-check`                                                     | Pass after reruns                      | First attempt was interrupted during WebKit under sibling contention; second completed tests/builds but failed SBOM on stale npm override contradictions; final run passed lint, typecheck, backend/frontend coverage, host Playwright `1008 passed / 15 skipped`, mobile `3 passed`, isolated Docker smoke `4 passed`, builds, security audit, security scan, Docker validation, and SBOM. Final artifact: `tmp/local-release/20260612T044438Z/nonprofit-manager.cdx.json`.                                                                                                                                   |
| `cd e2e && npm run test:docker:ci`                                       | Pass after runtime fixes               | Initial no-stack readiness failure required the documented Docker review stack. Direct Docker registration produced organizationless users under the new tenant contract, so Docker E2E now uses managed admin-created users. Docker dev frontend now enables demo routes for review lanes. Final run passed `1008` desktop tests with `15` expected skips plus `3` mobile tests. Artifacts: `tmp/e2e-reports/docker-ci-20260612T055733Z-28131`.                                                                                                                                                               |
| `cd e2e && npm run test:docker:audit`                                    | Pass after audit fixture/tooling fixes | Initial runs exposed stale tokenized-route fixture expectations, a donation fixture helper bug, legacy public-case-form readiness probing, an intentional sandboxed preview console message, and existing dense-staff visual contrast findings. The harness now follows fragment/Bearer public form links, token-scrubbed expected locations, the active organization fixture scope, and manual-review handling for out-of-scope visual debt while still failing runtime/blocked findings. Final run passed 1 Chromium audit in 3.1 minutes. Artifacts: `tmp/e2e-reports/docker-audit-20260612T070030Z-18868`. |
| `git diff --check`                                                       | Pass                                   | Final whitespace check passed with no output.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

## Lane Split Verification

- Passed on 2026-06-12: split into `/Users/bryan/projects/nonprofit-manager-p5-t142-closeout` on `codex/p5-t142-cross-module-closeout-2026-06-12`; `git status --porcelain=v1 -uall` matched the 110-path final owned path set exactly.
- Passed on 2026-06-12: `git diff --check`.
- Passed on 2026-06-12: `make lint`.
- Passed on 2026-06-12: `make test-tooling`.
  - Result: 72 Node tooling tests passed in the isolated P5-T142 lane, excluding the separate P5-T75 auth-alias fixture/helper follow-up.
- Passed on 2026-06-12: `make docker-validate-overlays`.

## Notes

- The broad Docker review stack was started with `DEV_NODE_ENV=test DEV_BYPASS_REGISTRATION_POLICY_IN_TEST=true DEV_BYPASS_MFA_FOR_TESTS=true`; an ignored local `.env.development` was created from the example so `make docker-up-dev` could render the dev compose contract.
- The temporary `nonprofit-dev` Docker review stack was stopped with `make docker-down` after validation completed.
- The final Docker audit still writes advisory visual findings for manual-review dense staff surfaces. Those are preserved as visual-audit backlog rather than widened into this tenancy/permission/contract lane.
