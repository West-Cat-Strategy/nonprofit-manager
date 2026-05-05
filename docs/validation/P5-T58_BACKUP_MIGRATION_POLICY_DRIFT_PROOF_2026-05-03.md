# P5-T58 Backup Migration Policy Drift Proof

**Date:** 2026-05-03
**Status:** Review

## Scope

`P5-T58` tightened backup redaction and migration policy drift checks.

Implemented changes:

- Expanded default backup redaction in `backend/src/services/backupService.ts` for token, challenge, key, and public-management-token fields introduced by newer Phase 5 surfaces.
- Review-batch follow-up expanded default redaction for `portal_signup_requests.password_hash`, `email_settings.smtp_pass_encrypted`, `email_settings.imap_pass_encrypted`, `twilio_settings.auth_token_encrypted`, social-media encrypted app/page tokens, and `webhook_endpoints.secret`.
- May 4 closeout expanded default redaction for `saved_reports.public_token`.
- Added focused backup redaction coverage in `backend/src/__tests__/services/backupService.test.ts`.
- Refactored `scripts/check-migration-manifest-policy.ts` into reusable analyzer functions and added checks for orphan migration files, duplicate manifest IDs, and duplicate pure numeric migration file IDs.
- Added fixture-based tooling coverage in `scripts/tests/tooling-contracts.test.cjs`, including acceptance for intentional suffix migrations such as `060a` and `060b`.
- Renumbered the orphan case-closure checklist migration from `109_case_closure_checklists.sql` to `118_case_closure_checklists.sql`, then wired it into `database/migrations/manifest.tsv` and `database/initdb/000_init.sql`.

## Guardrails

- No runtime API, frontend, Docker runtime, communications delivery, or public website behavior changed for this row.
- The migration-policy change preserves suffix-style migration IDs while catching duplicate pure numeric migration filenames.
- The migration renumbering preserves the existing checklist DDL while restoring manifest/initdb parity.

## Validation

| Command | Result | Notes |
|---|---|---|
| `node scripts/check-migration-manifest-policy.ts` | Passed | New orphan and duplicate checks passed on the current tree. |
| `node --test scripts/tests/tooling-contracts.test.cjs` | Passed | 26 tooling contract tests passed. |
| `npm --workspace backend test -- --runTestsByPath src/__tests__/services/backupService.test.ts src/__tests__/integration/backupExport.test.ts --runInBand` | Passed | 2 suites, 4 tests. |
| `bash scripts/verify-migrations.sh` | Passed | Worker-reported migration verification proof. |
| `make db-verify` | Passed | Worker-reported Docker-backed database verification proof. |
| `make lint` | Passed | Confirms migration manifest policy participates in the root lint gate. |
| `git diff --check` | Passed | Worker-reported clean whitespace proof for P5-T58-owned files. |

Review-batch follow-up:

| Command | Result | Notes |
|---|---|---|
| `cd backend && npx jest --runInBand src/modules/dashboard/services/__tests__/workqueueSummaryService.test.ts src/modules/dashboard/__tests__/dashboard.queueViews.routes.test.ts src/__tests__/services/portalAuthService.test.ts src/modules/portalAuth/controllers/__tests__/portalAuthController.test.ts src/__tests__/services/backupService.test.ts` | Passed | 5 suites / 44 tests, including focused backup redaction coverage. |
| `cd backend && npm run type-check` | Passed | Backend type-check remained green after backup and portal follow-up edits. |
| `node scripts/check-migration-manifest-policy.ts` | Passed | Includes migration `120` manifest/initdb listing policy. |
| `git diff --check` | Passed | Clean whitespace proof for the combined dirty tree. |
| `make db-verify` | Passed | May 4 closeout after Docker Desktop was started; migration manifest/initdb verification completed successfully with migrations `118` and `120` present. |
| `cd backend && npx jest --runInBand src/__tests__/services/backupService.test.ts src/__tests__/services/portalAuthService.test.ts src/modules/portalAuth/controllers/__tests__/portalAuthController.test.ts src/modules/portalAdmin/controllers/__tests__/portalAdminController.test.ts src/modules/dashboard/services/__tests__/workqueueSummaryService.test.ts src/__tests__/scripts/checkRouteValidationPolicy.test.ts` | Passed | May 4 closeout, 6 suites / 58 tests, including `saved_reports.public_token` redaction coverage. |
| `make lint`, `make typecheck`, `npm run knip`, `git diff --check` | Passed | May 4 broad local confidence gates after closeout fixes. |
