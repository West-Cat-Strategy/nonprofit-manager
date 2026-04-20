# Repo Audit (2026-04-18)

**Last Updated:** 2026-04-19


## Scope
- Target: the current dirty worktree in `/Users/bryan/projects/nonprofit-manager` on `main` at `bba5c9cae87d25a18297fb7a76185acc0b15b56c`.
- Method: one lead reviewer plus three parallel subagent lanes covering backend/security, frontend/E2E, and repo health/OSS reuse.
- Mutation policy: no source fixes were applied during the audit; this report is the only file added by the audit pass.
- Important context: `git status --short` already showed a heavily modified worktree before validation began, including many docs/test changes plus untracked `DEPLOYMENT.md`, `backend/src/__tests__/services/authGuardService.test.ts`, and `backend/src/__tests__/utils/permissions.test.ts`.

## Findings

### P0

#### 1. Staff session organization context can fail open
Files: `backend/src/middleware/auth.ts:141-168`, `backend/src/modules/auth/controllers/session.controller.ts:153-159`, `backend/src/modules/auth/lib/authQueries.ts:118-128`

Risk: staff session tokens are issued with a default organization id that is not derived from the authenticated user’s actual membership, and non-admin access is only revalidated when `validateAccess === true`.

Why it matters: a stale or incorrect `organizationId` claim becomes a trust anchor for later request handling. That creates a cross-organization authorization risk in exactly the code path that should be enforcing tenant boundaries.

Smallest credible remediation: stop issuing organization claims from global account lookup, derive the active organization from authenticated membership, and revalidate membership on every staff request unless the route has already proven a stronger tenant binding.

#### 2. The current worktree is not releasable because backend compile and full-suite invariants are broken
Files: `backend/src/modules/cases/queries/lifecycleQueries.ts:14-16,373-378`, `backend/src/modules/cases/repositories/caseServicesRepository.ts:11-35`, `backend/src/modules/cases/services/caseService.ts:122-133,350-370`, `backend/src/__tests__/services/eventReminderAutomationService.test.ts:93-100`

Risk: `make typecheck` fails, `make lint` fails, and `make test` fails with 13 broken suites / 40 failed tests. The failures are concentrated in the actively changing `cases` and reminder automation paths.

Why it matters: this is a release-blocking reliability issue. The repo currently cannot prove that the checked-in behavior matches its own type contracts or its own full backend regression suite.

Smallest credible remediation: treat the `cases` module breakage as a stabilization task before more feature work lands there. Repair the missing exports/signatures first, then rebaseline or split the oversized files only after the module compiles and the failing suites are green again.

### P1

#### 3. Mailchimp integration routes are authenticated but not permission-gated
Files: `backend/src/modules/mailchimp/routes/index.ts:98-149`, `backend/src/modules/mailchimp/controllers/mailchimpController.ts:29-40`

Risk: staff users who can authenticate but should not administer integrations can still read Mailchimp status/lists and hit mutation surfaces.

Why it matters: marketing integrations usually expose audience metadata, campaign state, and outbound actions that should be restricted to narrower admin permissions than general staff login.

Smallest credible remediation: put the existing authorization kernel or explicit permission middleware in front of the Mailchimp route group, not just `authenticate`.

#### 4. Payment intent read and cancel endpoints are auth-only
Files: `backend/src/modules/payments/routes/index.ts:91-106`, `backend/src/modules/payments/controllers/paymentController.ts:184-228`

Risk: any authenticated staff session can access or cancel payment intents without a second authorization check tied to role, scope, or resource ownership.

Why it matters: payment state is financially sensitive. Auth-only protection is too coarse for endpoints that reveal or alter payment state.

Smallest credible remediation: require an explicit payments permission or role guard on read/cancel routes and ensure the controller enforces organization ownership of the underlying intent.

#### 5. Portal sessions are not revalidated against current portal-user state
Files: `backend/src/middleware/portalAuth.ts:22-43`, `backend/src/utils/sessionTokens.ts:94-121`, `backend/src/modules/portalAuth/controllers/portalAuthController.ts:106-176`

Risk: once a portal token is minted, middleware trusts signature and token type only. Suspension, password reset, invite revocation, or account disablement does not invalidate an already-issued session at request time.

Why it matters: portal access is an externally facing ingress surface. Revocation lag after user state changes is a real security and support risk.

Smallest credible remediation: include portal auth revision / current-state checks in middleware, or introduce server-side session storage / revocation lookup for portal sessions.

### P2

#### 6. User settings can overwrite server truth after a transient load failure
Files: `frontend/src/features/adminOps/pages/UserSettingsPage.tsx:124-146`

Risk: if profile fetch fails, the page silently synthesizes a local fallback profile and immediately records that as the saved baseline.

Why it matters: a later successful save can overwrite existing server data with incomplete fallback values, turning a temporary read failure into a destructive write.

Smallest credible remediation: keep fetch failure distinct from a loaded profile state; do not establish a save baseline from synthesized fallback data.

#### 7. Navigation preference cache survives logout inside the same SPA session
Files: `frontend/src/hooks/useNavigationPreferences.ts:85-86,248-251,566-569`, `frontend/src/features/auth/state/authCore.ts:126-137`

Risk: module-level `preferencesSnapshot` is reused after logout/login unless test-only reset helpers are called.

Why it matters: a second user sharing the same browser tab session can inherit and then persist another user’s navigation state.

Smallest credible remediation: clear navigation preference caches in the real logout path, not only in test helpers.

#### 8. Portal API requests inherit the staff organization header from local storage
Files: `frontend/src/services/portalApi.ts:5-7`, `frontend/src/services/httpClient.ts:135-136,182-187`, `frontend/src/features/portal/pages/PortalLoginPage.tsx:14-18`

Risk: the portal client uses the default API client behavior, which sends `X-Organization-Id` from staff-side local storage unless explicitly disabled.

Why it matters: portal auth/bootstrap/reset/invitation flows should not depend on whatever staff organization id happens to be cached in the browser. If backend handlers consult or log that header, the trust boundary becomes muddier than intended.

Smallest credible remediation: create the portal client with `includeOrganizationHeader: false` by default and only opt in on portal endpoints that genuinely need it.

Status: needs follow-up verification on the backend side to confirm whether portal routes currently ignore this header everywhere.

#### 9. Route-health E2E coverage has both false positives and contract drift
Files: `e2e/tests/link-health.spec.ts:106-112,204-210`, `frontend/src/features/adminOps/adminRouteManifest.ts:141-145`

Risk: `assertRouteLoads` only asserts `page.goto()` status and does not fail on client-side console/network errors, while the suite also expects some legacy routes to fall through even though the app declares explicit redirects for them.

Why it matters: this creates the worst testing combination: routes can look healthy when their data loads fail, and healthy redirects can look broken because the test suite is asserting an outdated contract.

Smallest credible remediation: drive E2E route coverage from the same route catalog/manifest that owns redirect declarations, and fail the audit when route-level console/network errors occur on “healthy” pages.

#### 10. Long-running Playwright audits lose their web server, so accessibility and startup signals are not trustworthy
Files: `e2e/playwright.config.ts:171-212`, `scripts/e2e-playwright.sh:68,93`, `e2e/test-results/dark-mode-accessibility-report.md:7-14,25-1062`

Risk: the dark-mode audit recorded 147 audited routes and 112 critical findings, but those findings were overwhelmingly `ERR_CONNECTION_REFUSED` / timeout failures after the frontend server disappeared. The startup performance test failed with the same connection-refused symptom.

Why it matters: the audit harness currently cannot distinguish “route is inaccessible” from “the dev server died.” That weakens accessibility, performance, and route-health confidence.

Smallest credible remediation: stabilize the long-lived runtime contract before expanding route audits further. Either run against a more durable served build for long audits or explicitly health-check and restart the web server between route batches.

#### 11. Frontend production dependencies still include a known moderate DOMPurify vulnerability
Files: `frontend/package.json:41-46`, `package-lock.json:10883-10885`

Risk: `npm audit --omit=dev` reports `dompurify <= 3.3.3` vulnerable to GHSA-39q2-94rc-95cp, and the current lockfile resolves `dompurify-3.3.3.tgz`.

Why it matters: even a moderate sanitizer vulnerability is worth treating seriously on a platform that handles rich content, user input, and public-facing pages.

Smallest credible remediation: upgrade the transitive chain past `3.3.3`, regenerate the lockfile, and rerun `make security-scan` plus targeted content-sanitization tests.

### P3

#### 12. API key middleware has unsafe-by-default ergonomics
Files: `backend/src/middleware/apiKeyAuth.ts:1-13,37-47`, `backend/src/services/apiKeyService.ts:212-224`

Risk: the middleware accepts credentials in a query string and only increments per-key rate-limit state without enforcing it.

Why it matters: query-string API keys leak into logs, histories, and proxies. The rate-limit comment explicitly says enforcement is outside the remediation slice, so future route adoption could inherit an incomplete security posture.

Smallest credible remediation: remove query-string extraction, enforce limits in the same request path that records them, and only expose the middleware through a route wrapper that makes scope checks mandatory.

Note: repo search did not find current runtime route wiring for `authenticateApiKey`, so this is a latent footgun rather than a confirmed active exploit path.

#### 13. Payment webhook freshness rejects valid delayed retries after five minutes
Files: `backend/src/modules/payments/controllers/paymentController.ts:468-479`

Risk: the inbound payment webhook handler rejects events older than five minutes even when the provider legitimately retries delivery after network or worker delays.

Why it matters: webhook correctness should usually rely on signature validation plus idempotency, not a tight age cutoff that can discard authentic retries.

Smallest credible remediation: replace the hard five-minute freshness rejection with provider-specific replay protection rooted in signed timestamps where available, while letting idempotency tables absorb duplicates.

#### 14. Portal admin authorization bypasses the centralized authorization kernel
Files: `backend/src/modules/portalAdmin/controllers/portalAdminController.ts:37-43`, `backend/src/services/authorization/authorizationKernelService.ts:204-212`

Risk: portal admin access is decided with `req.user?.role === 'admin'` instead of the shared authorization kernel used elsewhere.

Why it matters: even if today’s role model makes this work, it creates drift from the repo’s intended source of truth and makes future dynamic-role or multi-role changes more likely to fail inconsistently.

Smallest credible remediation: route portal admin authorization through the shared kernel / permission helpers so role normalization and future access-control changes stay centralized.

## Cross-Cutting Themes

### Simplicity and duplication
- Auth and tenant context are split across JWT claims, org headers, portal/staff clients, and hand-rolled role checks. That duplication is the common root behind the highest-severity auth findings.
- Frontend form and server-state handling remains highly bespoke. The `UserSettingsPage` fallback logic and navigation-preference cache bug are both examples of hand-maintained state machines drifting from intended behavior.

### Reliability and test signal quality
- Targeted backend security suites passed, which is a real strength.
- Repo-wide confidence is still weak because full backend validation is red and the longest-running Playwright audits are unstable.
- Some E2E coverage currently checks transport success but not page health, creating false confidence when API calls fail after route load.

### Performance and efficiency
- `knip` found no dead-code/dependency issues in the scanned categories, and the frontend bundle-size gate passed with a comfortable margin.
- The quality baseline still flagged implementation-size growth in `backend/src/modules/cases/queries/catalogQueries.ts` and `backend/src/modules/contacts/usecases/contactImportExport.usecase.ts`, which is a maintenance-efficiency warning even where runtime performance is still acceptable.

### Docs, runtime, and process drift
- `make check-links` passed, so active-doc link hygiene is strong.
- The larger drift is between declared contracts and runtime behavior: route audit expectations, manual API clients, and the current dirty worktree all point to process signal being less trustworthy than the docs/link surface implies.

## OSS Reuse Opportunities

### Adopt dependency

| Candidate | Why it fits here | Maintenance / licensing / fit tradeoffs | Sources |
|---|---|---|---|
| `@tanstack/react-table` | The frontend has many admin/data-heavy screens but no standardized headless data-grid foundation. TanStack Table is explicitly designed as a headless datagrid layer, which fits this repo’s custom UI approach. | MIT-licensed and actively maintained. Migration cost is moderate, but visual lock-in is low because it does not impose markup or styling. Good fit for preserving the existing design system while retiring bespoke grid logic. | [TanStack Table docs](https://tanstack.com/table/latest/docs), [TanStack Table GitHub](https://github.com/TanStack/table) |
| `@tanstack/react-form` | Complex profile/settings/auth flows are currently managed with custom snapshots and imperative state transitions. TanStack Form is built for type-safe, headless form state and would directly target that class of bug. | MIT-licensed and actively maintained. Migration cost is real, so start with high-risk forms instead of blanket conversion. Best fit where dirty-state, async validation, or nested field behavior is already bespoke and fragile. | [TanStack Form docs](https://tanstack.com/form/docs), [TanStack Form GitHub](https://github.com/TanStack/form) |
| `@hey-api/openapi-ts` | The repo already maintains `docs/api/openapi.yaml`, yet frontend clients are still hand-written. `openapi-ts` can generate SDKs, Zod schemas, and TanStack Query hooks from the existing spec. | MIT-licensed. Lower churn than a full backend contract rewrite, but it only helps if the OpenAPI spec becomes trustworthy enough to generate from in CI. Good fit as an incremental client-generation layer after spec validation is tightened. | [Hey API docs](https://heyapi.dev/), [openapi-ts GitHub](https://github.com/hey-api/openapi-ts) |

### Borrow pattern

| Candidate | Why it fits here | Maintenance / licensing / fit tradeoffs | Sources |
|---|---|---|---|
| `ts-rest` contract-first patterns | The repo already uses Zod heavily. `ts-rest` shows an incremental contract-first model where server/client share an HTTP contract and optional OpenAPI output. | MIT-licensed and incrementally adoptable, but a full migration would be larger than the current repo needs. Best fit is borrowing the pattern for new modules or the next major API surface, not rewriting all existing Express routes at once. | [ts-rest contract overview](https://ts-rest.com/contract/overview), [ts-rest OpenAPI](https://ts-rest.com/openapi), [ts-rest GitHub](https://github.com/ts-rest/ts-rest) |
| Better Auth auth-hardening patterns | Better Auth’s docs are useful here for path-specific rate limits, organization-scoped access control, and TOTP/backup-code semantics. Those are the exact areas where the current auth stack is leaking complexity. | Better Auth is MIT-licensed and actively maintained, but a full replacement would be high-churn because this repo has dual staff/portal auth, custom org context, and repo-specific envelopes/policy scripts. Borrow targeted ideas; do not replace the auth core wholesale in one step. | [Rate limit](https://better-auth.com/docs/concepts/rate-limit), [Organization](https://better-auth.com/docs/plugins/organization), [2FA](https://better-auth.com/docs/plugins/2fa), [Better Auth GitHub](https://github.com/better-auth/better-auth) |
| OpenTelemetry traces/metrics | Backend correlation ids and structured logs already exist, so the next leverage point is standardized tracing/metrics across auth, payments, and webhooks. OpenTelemetry JS documents traces and metrics as stable. | OpenTelemetry JS is Apache-2.0. Good fit for backend traces/metrics, but the official JS docs still list logs as development and browser instrumentation as experimental. Borrow instrumentation patterns first; do not plan around browser logging maturity yet. | [OpenTelemetry JS docs](https://opentelemetry.io/docs/languages/js/), [OpenTelemetry JS GitHub](https://github.com/open-telemetry/opentelemetry-js) |
| Playwright harness patterns | The current harness already approximates Playwright’s `webServer` and auth-state patterns, but the implementation has drifted. The official docs are a good baseline for `reuseExistingServer` behavior and saved auth state. | Playwright is Apache-2.0. This is a harness refactor, not a product rewrite. The payoff is high because current route/a11y/perf suites are limited more by harness reliability than by missing assertions. | [Playwright webServer docs](https://playwright.dev/docs/test-webserver), [Playwright auth docs](https://playwright.dev/docs/auth), [Playwright license](https://github.com/microsoft/playwright/blob/main/LICENSE) |

### Keep custom

| Candidate | Why it should stay custom for now | Maintenance / licensing / fit tradeoffs | Sources |
|---|---|---|---|
| Core auth/session stack | The app has repo-specific staff auth, portal auth, organization context, canonical envelopes, and policy scripts. Replacing that entire surface with a framework would add migration risk faster than it would remove complexity. | Better Auth is a strong reference point, but the fit here is selective borrowing, not wholesale adoption. Keep the current stack and harden its trust boundaries first. | [Better Auth GitHub](https://github.com/better-auth/better-auth), [Organization docs](https://better-auth.com/docs/plugins/organization) |
| Current webhook outbox / scheduler model | The repo already has a domain-aware webhook outbox, retry scheduler, and queue helpers. The immediate problem is correctness and observability, not lack of a queue library. | BullMQ is MIT-licensed and actively maintained, and its retry/backoff model is a good reference. Adopt BullMQ only if this repo needs richer queue operations such as dead-letter tooling, concurrency controls across multiple workers, or queue inspection UIs that materially exceed the current scheduler design. | [BullMQ retry docs](https://docs.bullmq.io/guide/retrying-failing-jobs), [BullMQ GitHub](https://github.com/taskforcesh/bullmq) |

## Evidence

### Commands run

| Command | Result | Notes |
|---|---|---|
| `make quality-baseline` | Fail | Policy suite mostly passed, then stopped on implementation-size regressions: `catalogQueries.ts` 918 lines vs 912 baseline; `contactImportExport.usecase.ts` 1077 vs 1024. |
| `make lint` | Fail | `backend/src/modules/cases/repositories/caseOutcomesRepository.ts:25` has unused `organizationId`. |
| `make typecheck` | Fail | Broken `cases` module exports/signatures/types in `lifecycleQueries.ts`, `caseServicesRepository.ts`, and `caseService.ts`. |
| `make security-scan` | Partial fail | Backend audit clean; frontend audit reports one moderate `dompurify <= 3.3.3` advisory. |
| `npx --yes knip@6.4.1 --config knip.json --include files,dependencies,unlisted,unresolved,binaries` | Pass | No output; no issues reported. |
| `make check-links` | Pass | `91 files` / `795 local links`; no broken active-doc links. |
| `node scripts/check-auth-guard-policy.ts` | Pass | Auth guard policy currently satisfied. |
| `node scripts/check-rate-limit-key-policy.ts` | Pass | Rate-limit key policy currently satisfied. |
| `cd backend && npm test -- src/__tests__/integration/routeGuardrails.test.ts` | Pass | `57/57` tests passed. |
| `cd backend && npm test -- src/__tests__/integration/authorization.test.ts src/__tests__/integration/auth.mfa.test.ts src/__tests__/integration/portalAuth.test.ts src/__tests__/modules/payments.routes.security.test.ts src/__tests__/modules/reconciliation.routes.security.test.ts src/__tests__/services/paymentProviderService.ssrf.test.ts src/__tests__/services/webhookService.secretExposure.test.ts` | Pass | `54/54` tests passed. |
| `cd frontend && npm run type-check && npm test -- --run src/routes/__tests__/routeCatalog.test.ts src/routes/__tests__/adminRedirects.test.tsx src/test/ux/RouteUxSmoke.test.tsx` | Pass | `71` tests passed. |
| `PW_REUSE_EXISTING_SERVER=1 cd e2e && npx playwright test tests/link-health.spec.ts tests/navigation-links.spec.ts --project=chromium` | Fail / blocked by runtime issues | Needed existing-server reuse because backend was already on `127.0.0.1:3001`; later stalled on authenticated route timeouts and exposed `/demo/operations` runtime 401s that the health assertion did not catch. |
| `PW_REUSE_EXISTING_SERVER=1 cd e2e && npx playwright test tests/dark-mode-accessibility-audit.spec.ts tests/performance.startup.spec.ts --project=chromium` | Fail | Dark-mode audit wrote `112` critical findings dominated by `ERR_CONNECTION_REFUSED`; startup performance test failed with the same server-loss symptom. |
| `./scripts/select-checks.sh --base HEAD~1 --mode fast` | Pass | Suggested `make check-links`, `make lint-doc-api-versioning`, `make test`. |
| `cd frontend && npm run build && node ../scripts/check-frontend-bundle-size.js` | Pass | Build passed; main bundle `97,899` raw bytes / `18,066` gzip vs `122,880` byte cap. |
| `make test` | Fail | `13` failed suites, `186` passed suites, `40` failed tests, `1622` passed tests. Representative failures were in `cases` query/repository/use-case tests and `eventReminderAutomationService.test.ts`. |
| `cd frontend && npm audit --json --omit=dev` | Fail | Confirms one moderate `dompurify` advisory with a fix available. |

### Attribution and confidence notes
- All validation ran against the dirty worktree exactly as it existed before the audit report was created.
- No code or config fixes were made before running the commands above.
- Targeted backend security suites passed even while repo-wide lint/typecheck/full-suite validation failed. That means the repo has real security guardrails, but release confidence is still reduced by broader integration breakage.
- The accessibility/performance audit results are mixed evidence: they do prove harness instability, but they do not prove 112 distinct accessibility defects because the frontend server was no longer serving many routes.

## Strengths Worth Keeping
- The repo has unusually strong policy automation for route validation, auth guards, module ownership, module boundaries, and link health. Those scripts caught real issues quickly and should remain part of the default contributor workflow.
- Targeted security coverage is meaningful, not ceremonial. Route guardrails, authorization, MFA, portal auth, payments/reconciliation security, SSRF, and webhook secret-exposure suites all passed in this worktree.
- Frontend size discipline is working: the build and bundle-size guard passed cleanly.
- The backend already has a credible foundation for structured logging, correlation ids, scheduler separation, and webhook outbox processing. The next step is hardening and instrumentation, not replacing that foundation from scratch.
