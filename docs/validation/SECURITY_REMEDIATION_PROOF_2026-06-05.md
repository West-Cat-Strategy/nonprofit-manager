# Security Remediation Proof

**Date:** 2026-06-05  
**Branch:** `security-remediation-2026-06-05`  
**Worktree:** `/Users/bryan/projects/nonprofit-manager-security-remediation`

## Scope

This proof supersedes the stale April security-review dependency note that claimed an `exceljs -> uuid@14` remediation was current. The active lockfile now resolves `uuid@11.1.1`, the smallest non-vulnerable CommonJS-compatible target for `exceljs@4.4.0`, and the root production audit is green.

## Remediations Landed

- Auth/tenant isolation now fails closed when authenticated users lack active `user_account_access`; legacy/no-org tokens and explicit org switches are validated against live membership, with no organization-scoped `admin` bypass.
- Meeting manager records are tenant-scoped through migration `135_meeting_tenant_scope.sql`; meeting routes require an active organization context and service queries list/read/write only inside that organization.
- Admin registration review emails open a review screen only; `?mode=complete` no longer triggers approve/reject on page load.
- Tokenized browser flows support new hash-token links, scrub visible path/hash tokens after first load, and keep public case-form packet downloads behind a button-triggered blob download rather than a token-bearing anchor.
- Mautic outbound requests now use guarded DNS resolution, private-address rejection, DNS-pinned Undici dispatchers, and manual redirect rejection.
- People import parsing now enforces shared CSV/XLSX budgets for rows, columns, total cells, cell length, worksheet count, and expanded XLSX archive size before unsafe materialization.
- Staff and portal auth endpoints that set cookies now require JSON request bodies; external service provider create/update/delete routes require admin settings permission.
- `scripts/security-scan.sh` runs the documented root `npm run audit:prod` lane; deploy env loading parses dotenv data without `source`.
- E2E effective-admin cache files no longer persist bearer tokens or passwords and delete legacy sensitive cache files when read.
- SPA production CSP removed `unsafe-inline` from `script-src` by moving the legacy redirect into the bundled frontend entry.

## Residual Risks

- Backend-generated public-site CSP still allows inline scripts/styles because generated pages currently emit inline runtime scripts and style attributes. Removing those safely requires a follow-up renderer change to emit nonce/hash-backed or bundled assets.
- Public tokenized APIs still accept token-scoped backend paths after the first browser load. The frontend now hides/scrubs tokens and new links use fragments, but a full one-time token exchange to httpOnly cookies/nonces remains a follow-up backend contract change.

## Validation

| Command | Result | Notes |
|---|---|---|
| `cd backend && npm run type-check` | Passed | Backend TypeScript clean. |
| `cd backend && npm test -- --runInBand src/modules/shared/import/__tests__/peopleImportParser.test.ts src/ingest/__tests__/ingestEnhanced.test.ts` | Passed | 15 tests passed, including import abuse limits. |
| `cd backend && npm test -- --runInBand src/__tests__/authMiddleware.test.ts src/__tests__/integration/auth.test.ts src/modules/meetings/services/__tests__/meetingService.test.ts src/modules/meetings/__tests__/integration/meetings.test.ts src/__tests__/services/mauticService.test.ts src/modules/externalServiceProviders/__tests__/externalServiceProviders.routes.security.test.ts src/modules/admin/__tests__/usecases/createPendingRegistrationUseCase.test.ts src/modules/cases/usecases/__tests__/caseForms.usecase.test.ts src/modules/savedReports/controllers/__tests__/reportSharing.handlers.test.ts` | Passed | 123 tests passed. |
| `cd frontend && npm run type-check` | Passed | Frontend TypeScript clean. |
| `cd frontend && npm test -- --run src/utils/__tests__/tokenizedRouteToken.test.tsx src/features/auth/pages/__tests__/AdminRegistrationReviewPage.test.tsx src/features/portal/pages/__tests__/PortalAccessPages.test.tsx src/features/portal/pages/__tests__/PublicCaseFormPage.test.tsx src/features/portal/api/publicCaseFormsApiClient.test.ts src/features/savedReports/pages/__tests__/SavedReportsPage.test.tsx src/routes/__tests__/routeCatalog.test.ts src/test/ux/RouteUxSmokeExtended.test.tsx` | Passed | 54 tests passed. |
| `node --test scripts/tests/tooling-contracts.test.cjs` | Passed | 62 tooling-contract tests passed, including dotenv parser and root audit lane checks. |
| `cd e2e && SKIP_WEBSERVER=1 ../node_modules/.bin/playwright test tests/auth-bootstrap.contract.spec.ts --project=chromium` | Passed | 6 auth-cache contract tests passed. |
| `make db-verify` | Passed | Manifest/initdb parity, canonical migrations, RLS, and audit partition checks passed. |
| `npm run audit:prod` | Passed | `found 0 vulnerabilities`. |
| `npm audit signatures --workspaces --include-workspace-root` | Passed | 1078 package signatures verified; 180 attestations verified. |
| `npm explain uuid --workspaces --include-workspace-root` | Passed | Reports `uuid@11.1.1`. |
| `make security-scan` | Passed | Root production audit passed; gitleaks worktree scan found no leaks; gitleaks history scan covered 530 commits and found no leaks. |
