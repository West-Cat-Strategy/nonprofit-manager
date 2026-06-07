# P5-T139 Code Review Remediation Proof - 2026-06-06

**Workboard Row:** `P5-T139`
**Status:** Review

## Scope

This row implements the June 6 exhaustive code-review remediation plan.

In scope:

- Donation and alert organization isolation.
- Square webhook signature verification and production webhook config validation.
- Production encryption key fail-fast behavior.
- Public report and case-form path-token compatibility-only routing.
- Public-site CSP tightening without breaking generated runtime behavior.
- Alert contract packaging, selector, nullable frontend contract, and helper docs drift.
- Focused regression tests and validation proof for the changed surfaces.

Out of scope:

- Production deploys, production data reads/writes, imports, or support SQL.
- Product expansion covered by `P5-T6`.
- Auth alias enforcement timing covered by `P5-T75`.
- `P5-T138` fixture-alignment work or the current dirty `main` donation/E2E fixture edits; this review branch remains a P5-T139-only slice.

## Implementation Notes

- Started from clean `main` on branch `codex/p5-t139-code-review-remediation`.
- Preserved route paths and existing `/api/v2` response envelopes unless the security fix requires rejecting an unsafe access shape.
- Added organization predicates through donation list/detail/create/update/delete/summary/receipt paths and alert configs/instances/stats/test metric paths.
- Added migration `137_code_review_remediation_security_scope.sql` to backfill/enforce alert organization scope, alert enum/channel/recipient constraints, and the org-scoped donation delete RLS policy.
- Hardened Square webhook validation to use the configured notification URL plus exact raw body, with production config requiring `SQUARE_WEBHOOK_NOTIFICATION_URL` when Square webhooks are configured.
- Made production `ENCRYPTION_KEY` validation fatal for missing, placeholder, invalid, or passphrase-style values; 32-byte hex and base64 key material remain accepted.
- Disabled public report and public case-form path-token data routes with explicit `legacy_token_path_disabled` responses while preserving Bearer-token root routes.
- Added hash-backed public-site `script-src` CSP for generated inline scripts and removed `unsafe-inline` from backend/public-site Helmet `script-src`.
- Kept modularization ratchets at baseline by extracting donation organization helpers into a module-local helper and moving Square adapter tests under `backend/src/__tests__/services`.

## Final Review Closeout - 2026-06-07

- Closeout was performed in sibling worktree `/Users/bryan/projects/nonprofit-manager-p5-t139-closeout` on branch `codex/p5-t139-code-review-remediation`.
- The branch is based directly on `origin/main` at merge-base `06b7670c74c9a69092e1553a96664288f088dfc4`.
- The final review diff contains 47 tracked paths and does not include the dirty local `main` fixture/E2E edits.
- Implementation audit confirmed the proof note still matches the branch: Square webhook signatures use the configured notification URL plus raw body, production encryption rejects non-key-material secrets, alert and donation paths carry active organization scope, public path-token data routes return `410 legacy_token_path_disabled`, and public-site CSP uses hash-backed inline script allowlisting.

### Final Path Set

```text
backend/Dockerfile
backend/src/__tests__/alertService.test.ts
backend/src/__tests__/config/productionSecurityConfig.test.ts
backend/src/__tests__/integration/legacyApiTombstone.test.ts
backend/src/__tests__/services/donationService.test.ts
backend/src/__tests__/services/squarePaymentProviderAdapter.test.ts
backend/src/config/productionSecurityConfig.ts
backend/src/index.ts
backend/src/modules/alerts/__tests__/alerts.usecase.test.ts
backend/src/modules/alerts/controllers/alertController.ts
backend/src/modules/alerts/repositories/alerts.repository.ts
backend/src/modules/alerts/routes/index.ts
backend/src/modules/alerts/types/contracts.ts
backend/src/modules/alerts/usecases/alerts.usecase.ts
backend/src/modules/cases/controllers/publicForms.controller.ts
backend/src/modules/cases/routes/__tests__/publicCaseFormsRateLimits.test.ts
backend/src/modules/cases/routes/public.ts
backend/src/modules/donations/controllers/donationController.ts
backend/src/modules/donations/services/donationOrganizationScope.ts
backend/src/modules/donations/services/donationService.ts
backend/src/modules/publicReports/controllers/__tests__/reportSharingController.test.ts
backend/src/modules/publicReports/routes/__tests__/publicReportsRateLimits.test.ts
backend/src/modules/publicReports/routes/index.ts
backend/src/modules/publishing/controllers/__tests__/websiteEntryController.test.ts
backend/src/modules/publishing/controllers/websiteEntryController.ts
backend/src/modules/shared/reports/reportSharing.handlers.ts
backend/src/public-site.ts
backend/src/services/paymentProviderAdapters/squarePaymentProviderAdapter.ts
backend/src/utils/encryption.ts
contracts/README.md
database/initdb/000_init.sql
database/migrations/137_code_review_remediation_security_scope.sql
database/migrations/manifest.tsv
docs/phases/planning-and-progress.md
docs/testing/TESTING.md
docs/validation/P5-T137_CALM_OPS_UI_UX_OVERHAUL_PROOF_2026-06-05.md
docs/validation/P5-T139_CODE_REVIEW_REMEDIATION_PROOF_2026-06-06.md
docs/validation/README.md
frontend/Dockerfile
frontend/src/features/alerts/__tests__/alertOptions.test.ts
frontend/src/features/alerts/alertOptions.ts
frontend/src/features/alerts/components/AlertConfigList.tsx
frontend/src/features/alerts/components/AlertConfigModal.tsx
frontend/src/features/alerts/types/contracts.ts
scripts/README.md
scripts/select-checks.sh
scripts/tests/tooling-contracts.test.cjs
```

## Original Proof Log

| Command | Result |
|---|---|
| `npm test -- src/__tests__/config/productionSecurityConfig.test.ts src/__tests__/services/squarePaymentProviderAdapter.test.ts src/modules/publicReports/controllers/__tests__/reportSharingController.test.ts src/modules/publicReports/routes/__tests__/publicReportsRateLimits.test.ts src/modules/cases/routes/__tests__/publicCaseFormsRateLimits.test.ts src/modules/publishing/controllers/__tests__/websiteEntryController.test.ts src/__tests__/alertService.test.ts src/modules/alerts/__tests__/alerts.usecase.test.ts src/__tests__/services/donationService.test.ts --runInBand` from `backend/` | Passed: 9 suites, 81 tests. |
| `npm test -- --run src/features/alerts/__tests__/alertOptions.test.ts src/features/alerts/components/__tests__/AlertConfigModal.test.tsx src/features/alerts/pages/__tests__/AlertsConfigPage.test.tsx src/features/alerts/api/alertsApiClient.test.ts` from `frontend/` | Passed: 4 files, 10 tests. |
| `make test-tooling` | Passed: 64 tooling/selector/policy tests, including the baseline-only selector regression. |
| `make db-verify` | Passed: manifest/initdb contract, isolated DB, migration order, RLS, FK, bootstrap, and audit-partition checks. |
| `make typecheck` | Passed backend, frontend, and contracts type checks. |
| `make lint` | Passed backend lint, shared policy checks, implementation-size policy, modularization boundary ratchet at existing caps, route integrity/catalog checks, UI audit, and frontend lint. |
| `./scripts/select-checks.sh --mode strict --files "$(git status --porcelain=v1 \| sed 's/^...//')"` | Selected `make check-links`, `make test-tooling`, `make lint`, `make typecheck`, `make test-coverage-full`, and `make db-verify`. |
| `make check-links` | Passed: checked 266 files and 1518 local links. |
| `make docker-validate` | Passed: backend and frontend Docker builds completed; both images copied `contracts/alerts.d.ts`. |
| `make security-scan` | Passed: production npm audit found 0 vulnerabilities; gitleaks worktree and history scans found no leaks. |
| `npm test -- src/__tests__/integration/legacyApiTombstone.test.ts --runInBand` from `backend/` | Passed: 1 suite, 14 tests after updating the v2 public-report path-token expectation to allow `legacy_token_path_disabled` rather than the legacy API tombstone code. |
| `git diff --check` | Passed before proof/workboard updates. |
| `make test-coverage-full` | Failed in the broad backend integration coverage suite: 27 suites and 277 tests failed in the run, dominated by the existing active-organization fixture drift (`403` where older integration tests expect login/setup `200`/resource `201`/validation `400`). The run also exposed the public-report path-token tombstone expectation above; that expectation was fixed and rerun targeted. Rerun full coverage after the `P5-T138` org-access fixture-alignment slice is completed. |

## Residual Review Notes

- The earlier `make test-coverage-full` failure remains historical broad-gate context from before the P5-T138 fixture lane was split out; the final P5-T139 closeout intentionally used the narrower validation below to keep this branch P5-T139-only.
- Strict selector still recommends `make test-coverage-full` for the full 47-path review set, but that broad gate was intentionally not rerun in this closeout per the P5-T139-only validation plan.
- The public report/path-token contract intentionally returns `410 legacy_token_path_disabled` on unsafe v2 path-token data routes. Bearer-token root public report and case-form routes remain the supported data contract.

## Final Closeout Proof - 2026-06-07

| Command | Result |
|---|---|
| `npm ci` from the closeout worktree root | Passed: installed isolated worktree dependencies; `found 0 vulnerabilities`. |
| `./scripts/select-checks.sh --mode strict --files "<final 47-path set>"` | Selected `make check-links`, `make test-tooling`, `make lint`, `make typecheck`, `make test-coverage-full`, and `make db-verify`; `make test-coverage-full` intentionally not rerun for this closeout. |
| `git diff --check origin/main..HEAD` | Passed. |
| `npm test -- src/__tests__/config/productionSecurityConfig.test.ts src/__tests__/services/squarePaymentProviderAdapter.test.ts src/__tests__/services/donationService.test.ts src/__tests__/alertService.test.ts src/modules/alerts/__tests__/alerts.usecase.test.ts src/modules/publicReports/controllers/__tests__/reportSharingController.test.ts src/modules/publicReports/routes/__tests__/publicReportsRateLimits.test.ts src/modules/cases/routes/__tests__/publicCaseFormsRateLimits.test.ts src/modules/publishing/controllers/__tests__/websiteEntryController.test.ts src/__tests__/integration/legacyApiTombstone.test.ts --runInBand` from `backend/` | Passed: 10 suites, 95 tests. |
| `npm test -- --run src/features/alerts/__tests__/alertOptions.test.ts src/features/alerts/components/__tests__/AlertConfigModal.test.tsx src/features/alerts/pages/__tests__/AlertsConfigPage.test.tsx src/features/alerts/api/alertsApiClient.test.ts` from `frontend/` | Passed: 4 files, 10 tests. |
| `make check-links` | Passed: checked 266 files and 1518 local links. |
| `make test-tooling` | Passed: 64 tooling/selector/policy tests. |
| `make lint` | Passed: backend lint, shared policy checks, UI audit, route integrity/catalog checks, and frontend lint. |
| `make typecheck` | Passed: backend, frontend, and contracts type checks. |
| `make db-verify` | Passed: manifest/initdb contract, isolated DB, migration order, RLS, FK, bootstrap rows, superseded-index, and audit-partition checks. |
