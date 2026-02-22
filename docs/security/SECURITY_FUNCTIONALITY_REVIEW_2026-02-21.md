# Security + Functionality Review Checklist (2026-02-21)

## Scope
- Backend: auth/session role sync behavior, audit triggers, error handling, authorization persistence.
- Frontend: dependency security posture and runtime compatibility.
- DevOps/CI: pipeline reliability, security scan behavior, and scan coverage.

## Findings Checklist (Ordered by Severity)

| Severity | Status | Area | File | Finding | Impact | Exploitability / Regression Risk | Remediation | Verification Evidence |
|---|---|---|---|---|---|---|---|---|
| P0 | Fixed + Verified | Audit logging / authz persistence | `database/migrations/033_audit_logging.sql`, `database/migrations/049_audit_trigger_record_id_fallback.sql` | Audit trigger assumed `OLD.id/NEW.id` for all tables; `user_roles` has no `id`, causing audit-trigger runtime failures during role sync. | `user_roles` writes could fail; authorization state could drift from expected role model. | Critical functional + security consistency risk. | Reworked `audit_trigger_func()` to resolve `record_id` via `id -> user_id -> role_id -> uuid_generate_v4()` with UUID regex guard before cast. Added migration `049` to patch existing databases. | Backend integration tests pass; `make ci` final run passed (`357 passed`, `24 skipped`, `0 unexpected`) and no non-test-path role-sync runtime failures. |
| P0 | Fixed + Verified | Backend auth role sync | `backend/src/services/userRoleService.ts`, `backend/src/__tests__/integration/userRoleSync.test.ts` | Role sync failures were logged but could be swallowed, allowing silent auth role persistence failures. | Login/register success response could mask failed `user_roles` persistence. | Critical authz correctness risk (fail-open behavior). | Preserved table-availability guard; changed sync error path to log + rethrow (fail-closed). Added integration coverage for successful persistence and simulated DB failure returning server error. | `backend/src/__tests__/integration/userRoleSync.test.ts` passes; full backend + CI suite pass. |
| P1 | Fixed + Verified | Dependency security | `backend/package.json`, `backend/package-lock.json`, `frontend/package.json`, `frontend/package-lock.json` | High/moderate vulnerabilities in runtime dependency chains (`jspdf`, `minimatch`, `ajv` paths). | Known vulnerable transitive/runtime packages in shipped dependency graph. | High security risk. | Frontend `jspdf` upgraded to `^4.2.0`; backend removed unused `@sentry/tracing`; applied dependency overrides (`minimatch`, `ajv`) compatible with runtime graph and regenerated lockfiles. | `npm audit --omit=dev` backend: `found 0 vulnerabilities`; frontend: `found 0 vulnerabilities`; `make security-scan` dependencies marked `Fixed`. |
| P1 | Fixed + Verified | Security scan reliability | `scripts/security-scan.sh`, `.gitleaks.toml` | Secret scan coverage was skipped when local `gitleaks` was missing; scan status lacked deterministic remediation signal. | Security scan could appear successful without secret scan execution. | High process/security assurance risk. | Added Docker fallback for `gitleaks`; introduced explicit remediation statuses (`Fixed`, `Known blocked`, `Not Applicable`); added targeted placeholder allowlist (`.gitleaks.toml`) so docs/example tokens do not create false positives while scan still runs. | `make security-scan` (Feb 21, 2026 14:21 PST): Docker gitleaks fallback executed, `no leaks found`; summary reports `Secret scanning: Fixed`. |
| P2 | Fixed + Verified | CI/test reliability | `scripts/ci.sh`, `Makefile`, `e2e/helpers/auth.ts`, `e2e/tests/admin.spec.ts`, `e2e/tests/reports.spec.ts`, `e2e/tests/donations.spec.ts` | Remaining CI errors came from infra sequencing and brittle E2E assertions/permissions-path assumptions. | End-to-end verification could fail despite healthy application behavior. | Medium regression + release confidence risk. | Ensured migrations run before test phases; hardened E2E auth setup for admin-required paths and fixed strict-selector/time-bound flake in donations flow. | Final `make ci` run passed end-to-end (`357 passed`, `24 skipped`, `0 unexpected`). |

## Residual Risks / Blocked Items
- None.

## Verification Summary

| Command | Result |
|---|---|
| `cd /Users/bryan/projects/nonprofit-manager && make ci` | Pass (`CI Pipeline Passed`, `357 passed`, `24 skipped`, `0 unexpected`). |
| `cd /Users/bryan/projects/nonprofit-manager && make security-scan` | Pass (backend/frontend audits clean; Docker gitleaks fallback ran and reported no leaks). |
| `cd /Users/bryan/projects/nonprofit-manager/backend && npm audit --omit=dev` | Pass (`found 0 vulnerabilities`). |
| `cd /Users/bryan/projects/nonprofit-manager/frontend && npm audit --omit=dev` | Pass (`found 0 vulnerabilities`). |

## Internal Behavior Change Note
- No intentional public API contract break was introduced.
- Security hardening change: role-sync persistence now fails closed (server error) when `user_roles` writes fail, instead of silently proceeding.
