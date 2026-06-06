# Phase 5 Security Review

**Last Updated:** 2026-06-05

> Superseded historical review: the April security review below is retained for Phase 5 context, but its dependency-remediation snapshot is no longer current. Current supply-chain and security-remediation proof lives in [SECURITY_REMEDIATION_PROOF_2026-06-05.md](SECURITY_REMEDIATION_PROOF_2026-06-05.md): the root production audit reports `found 0 vulnerabilities`, `npm explain uuid --workspaces --include-workspace-root` reports `uuid@11.1.1`, and `make security-scan` is green.

## Scope

- Historical security-focused repo review used to improve the Phase 5 plan and workboard without inventing a separate product wave.
- Original inputs: the April Phase 5 workboard and plan, active security docs, repo-local policy checks, `make security-scan`, and official external guidance available at that time.
- Current remediation state is tracked in [SECURITY_REMEDIATION_PROOF_2026-06-05.md](SECURITY_REMEDIATION_PROOF_2026-06-05.md), not this historical review.

## Historical Repo Snapshot

- `node scripts/check-auth-guard-policy.ts` passes.
- `node scripts/check-rate-limit-key-policy.ts` passes.
- June 5 reconciliation supersedes the older dependency snapshot: the root override keeps `exceljs@4.4.0` on `uuid@11.1.1`, the production audit reports `found 0 vulnerabilities`, and the proof note records a green `make security-scan`.
- The repo already has meaningful runtime controls in place:
  - Helmet, CORS, CSRF, rate limiting, metrics, and Sentry are wired through `backend/src/index.ts`, `backend/src/middleware/metrics.ts`, and `backend/src/config/sentry.ts`.
  - Structured logging and optional log aggregation are wired through `backend/src/config/logger.ts`.
  - Targeted security coverage already exists for active surfaces, including `backend/src/__tests__/modules/mailchimp.routes.security.test.ts`, `backend/src/__tests__/modules/payments.routes.security.test.ts`, `backend/src/__tests__/modules/reconciliation.routes.security.test.ts`, `backend/src/__tests__/services/paymentProviderService.ssrf.test.ts`, and `backend/src/__tests__/services/webhookService.secretExposure.test.ts`.
- Planning gap: Phase 5 did not yet treat the security baseline, auth-alias operational visibility, and supply-chain follow-through as live tracked work even though they now affect the active validation lane.
- Process drift: resolved under `P5-T8`; the helper security-contract reference now points at the current `scripts/security-scan.sh` / `make security-scan` baseline instead of the removed daily-report helper.
- CI/CD update: `P5-T20` makes CI/CD local-only. Keep `make security-scan` and `make release-check` as the current supply-chain baseline, with GitHub retained for hosting, npm Dependabot, vulnerability alerts, and secret scanning rather than hosted CI gates.

## External Guidance Applied

- [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/) is the clearest acceptance baseline for auth, session, access control, logging, admin actions, and SSRF-adjacent integrations in this codebase.
- [OWASP API Security Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/) keeps broken object and function authorization, unrestricted resource consumption, SSRF, and unsafe API consumption front and center for portal, payments, webhooks, Mailchimp, and publishing flows.
- GitHub-native [Dependabot alerts](https://docs.github.com/code-security/supply-chain-security/managing-vulnerabilities-in-your-projects-dependencies/about-alerts-for-vulnerable-dependencies?azure-portal=true), secret scanning, and push protection remain useful repository-host controls. GitHub CodeQL, dependency-review gates, and artifact attestations are no longer current CI/CD recommendations unless a future tracked row reopens hosted CI.
- [`npm sbom`](https://docs.npmjs.com/cli/v10/commands/npm-sbom) is the lightest current path to release-time SBOM generation; CycloneDX becomes more attractive later if multi-workspace BOM depth or richer consumers require it.
- [OpenTelemetry JS](https://opentelemetry.io/docs/languages/js/) is mature enough for backend traces and metrics, but JS logs are still in development and browser instrumentation remains experimental.
- [Semgrep](https://semgrep.dev/docs/) and [Trivy](https://trivy.dev/docs/latest/guide/target/repository/) are useful next scanners, but only after assigning triage ownership so the repo does not accumulate ignored noise.

## Recommendations

### Now

1. Keep security inside `P5-T2B` as a tracked validation sub-lane rather than adding a fourth product wave.
2. Keep the now-green supply-chain baseline green by preserving the root `exceljs@4.4.0` override that resolves `uuid@11.1.1`, and rerun `npm run audit:prod`, `npm explain uuid --workspaces --include-workspace-root`, and `make security-scan` whenever backend dependencies move.
3. Operationalize the auth-alias daily-ratio dashboard from `docs/security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md` once the shared host gate is green so the deprecation gate stops living only in docs.
4. Make `P5-T3` and `P5-T5` carry explicit security acceptance criteria:
   - email and preview work keeps route-security and sanitization coverage current;
   - portal follow-through keeps object-level authorization plus PII and audit expectations current;
   - outbound integration changes keep SSRF-sensitive and secret-exposure proof current.
5. Keep continuous scanning local-first: rerun `make security-scan` whenever dependencies or security-sensitive code moves, and use GitHub-native Dependabot, vulnerability alerts, secret scanning, and push protection as repository-host signals rather than CI/CD gates.
6. Keep SBOM generation in the release flow through `make release-check`, which writes a validated CycloneDX SBOM under ignored `tmp/local-release/<timestamp>/`.

### Later

- Pilot Semgrep custom rules for repo-specific guardrails after baseline CI scanning has an owner.
- Add Trivy repo and image scanning when Docker build and deploy flows become the next real bottleneck.
- Add backend-only OpenTelemetry traces and metrics across auth, portal, payments, webhooks, and outbound provider calls.
- Add artifact signing and attestations only after the release pipeline is stable enough to enforce provenance instead of merely recording it.

## Nonprofit And Compliance Notes

- If portal or case-management surfaces can carry health, disability, rehab, or similarly sensitive service records, keep minimum-necessary access, export controls, immutable audits, and revocation flows ahead of broad feature widening.
- Shared devices, volunteer turnover, and delegated admin handoffs are common nonprofit realities. Session revocation, role-change auditing, and passkey rollout deserve explicit roadmap space even when the core auth stack already exists.
- Keep payment capture on provider-hosted surfaces wherever possible. That keeps PCI scope smaller while the team improves broader app-level security monitoring and operational controls.

## Commands Run

| Command | Result | Notes |
|---|---|---|
| `node scripts/check-auth-guard-policy.ts` | Pass | No auth-guard policy regressions detected. |
| `node scripts/check-rate-limit-key-policy.ts` | Pass | Rate-limit key policy still holds. |
| `npm run audit:prod` | Pass | June 5 proof reports `found 0 vulnerabilities`. |
| `npm explain uuid --workspaces --include-workspace-root` | Pass | June 5 proof reports `uuid@11.1.1`. |
| `make security-scan` | Pass | June 5 proof records a green root production audit plus gitleaks worktree/history scans with no leaks. |

## Workboard Use

This note is the row-local planning artifact for the `security-hardening` sub-lane inside `P5-T2B`. It should stay current while the shared validation lane owns:

- the now-landed dependency remediation tracked in [SECURITY_REMEDIATION_PROOF_2026-06-05.md](SECURITY_REMEDIATION_PROOF_2026-06-05.md),
- the queued auth-alias operational dashboard follow-through once the shared host gate is green,
- and the security acceptance criteria that active `P5-T3` and `P5-T5` work must keep green.
