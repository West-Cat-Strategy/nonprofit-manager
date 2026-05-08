# P5-T86 through P5-T89 Security Remediation Proof

**Date:** 2026-05-06
**Status:** Review
**Rows:** `P5-T86`, `P5-T87`, `P5-T88`, `P5-T89`

## Scope

This batch remediates the May 6 subagent security review findings while keeping the existing `P5-T79` through `P5-T85` review rows intact.

- `P5-T86`: tenant/session boundaries for external service providers, portal conversations, portal appointments/reminders, and portal password resets.
- `P5-T87`: public ingress, rate-limit, and validation hardening.
- `P5-T88`: production secrets, token redaction, backup export gating, health/metrics protection, browser diagnostics redaction, and history-aware secret scanning.
- `P5-T89`: dependency audit remediation and external Docker image pinning policy.

## Implementation Notes

- `P5-T86`: added tenant/session boundary contracts across external service providers, portal conversations, portal appointments/reminders, and portal password resets. Portal session revision is now part of the tested revocation boundary.
- `P5-T87`: hardened public/provider ingress by failing closed on write-capable paths, removing caller-controlled tenant/account/org headers from rate-limit buckets, and validating public/staff boundary input.
- `P5-T88`: tightened production secret policy, token/log redaction, backup export redaction defaults and guarded full-export confirmation, health/metrics protection, browser-session diagnostic redaction, and history-aware gitleaks scanning.
- `P5-T89`: cleared the `express-rate-limit`/`ip-address` audit finding and added digest-pinned external helper image policy checks for Compose overlays and security-scan helper images.
- 2026-05-08 Docker follow-up: the deferred Docker CI/audit pass found no additional dependency-audit or pinned-image-policy defect. The only change from the follow-up was an E2E-only public case-form fixture fallback for Docker review stacks where SMTP is intentionally unconfigured.

## Validation Log

| Check | Result | Notes |
|---|---|---|
| Workboard/proof scaffold | Passed | Created active rows and this proof note before code edits. |
| `npm run audit:prod` | Passed | Production dependency audit reported `found 0 vulnerabilities`. |
| `npm run audit` | Passed | Workspace dependency audit including dev dependencies reported `found 0 vulnerabilities`. |
| `node scripts/check-rate-limit-key-policy.ts` | Passed | Confirms rate-limit keys do not use caller-controlled tenant/account/org headers. |
| `node scripts/check-auth-guard-policy.ts` | Passed | Legacy auth-guard usage did not increase. |
| `node scripts/check-docker-image-policy.mjs` | Passed | Docker image policy passed for 22 tracked image references. |
| Focused backend security Jest slice | Passed | 16 suites / 80 tests for tenant/session boundaries, public ingress, rate limits, production security config, backup redaction, health/metrics, log redaction, and public route hardening. The first run found only an unavailable isolated DB listener on `127.0.0.1:8012`; after `make db-verify` started and verified the DB, the same slice passed. |
| `make db-verify` | Passed | Manifest/initdb parity, isolated test DB, migration order, app-role/RLS checks, superseded-index cleanup, and audit partition window all passed. |
| `cd backend && npm run type-check` | Passed | Backend TypeScript check completed cleanly. |
| `cd frontend && npx vitest run src/services/__tests__/browserSessionDiagnostics.test.ts` | Passed | Browser-session diagnostic redaction coverage passed: 1 file / 3 tests. |
| `cd frontend && npm run type-check` | Passed | Frontend TypeScript check completed cleanly. |
| `make security-scan` | Passed | Backend/frontend production audits passed, worktree gitleaks scan found no leaks, and git-history gitleaks scan covered 493 commits with no leaks found. |
| `make docker-validate-overlays` | Passed | Compose image policy, dev/prod/host-access/self-hosted/encrypted/Plausible/ELK overlay config, and Caddyfile validation all passed. |
| `cd e2e && npm run test:docker:ci` | Completed with rerun-clean Firefox failures | Desktop Docker matrix reported `988 passed`, `15 skipped`, and `2 failed` in 47.4 minutes. The failures were Firefox-only route console-error checks for `/settings/api` and portal high-traffic navigation, not Docker image-policy or dependency-audit defects; focused Firefox rerun of the exact failures passed. |
| `cd e2e && npm run test:docker:ci:mobile` | Passed | Mobile Docker tail passed: 3 tests in 13.2 seconds. |
| `cd e2e && npm run test:docker:audit` | Passed | Initial audit run blocked on unconfigured SMTP while creating a public case-form fixture in the Docker review stack. After adding the E2E-only access-token fallback, the audit rerun passed the 152-route sweep in 3.0 minutes. |

## Known Follow-Up

- None for `P5-T86` through `P5-T89`. The broader Docker CI/audit follow-on remains recorded under `P5-T85`; no additional Docker image-policy, dependency-audit, or production security follow-up was opened from this sweep.
