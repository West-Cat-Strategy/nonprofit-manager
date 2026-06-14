# Dependency Refresh Proof

**Date:** 2026-06-13
**Branch:** `codex/dependency-refresh-2026-06-13`
**Worktree:** `/Users/bryan/projects/nonprofit-manager-deps-2026-06-13`

## Scope

Refresh direct npm workspace dependency drift on top of `origin/main`, including the selected major upgrades to `redis@6.0.0` and `undici@8.4.1`.

In scope:

- Backend direct dependencies: `redis`, `undici`, `stripe`, `eslint`
- Frontend direct dependencies: `eslint`, `tailwindcss`, `@tailwindcss/vite`
- Root `undici` override alignment
- Dockerfile npm tooling refresh from `npm@11.14.1` to `npm@11.17.0`
- Repository Node floor alignment with `undici@8.4.1`
- Redis and Undici compatibility guardrails for existing runtime behavior

Out of scope:

- Docker Node base image changes; the existing Node 24 base images already satisfy the raised floor.
- Redis server image changes.
- Route, API, database, product, or auth-alias behavior changes.
- Transitive-only major drift from `npm outdated --all`.

## Baseline

| Command | Result |
| --- | --- |
| `npm ci` | Passed; installed workspace dependencies from the clean `origin/main` lockfile and reported `found 0 vulnerabilities`. |
| `npm outdated --workspaces --include-workspace-root --json` | Reported direct drift for `@tailwindcss/vite`, `eslint`, `redis`, `stripe`, `tailwindcss`, and `undici`. |
| `npm run audit:prod` | Passed; reported `found 0 vulnerabilities`. |
| `npm run audit` | Passed; reported `found 0 vulnerabilities`. |

## Implementation Notes

- Updated backend, frontend, and root package manifests plus `package-lock.json` for the direct dependency refresh.
- Raised the repository Node floor to `>=22.19.0` because `undici@8.4.1` requires Node `>=22.19.0`; the existing Docker Node 24 base images already satisfy this.
- Kept Docker base images unchanged and bumped global Dockerfile npm tooling to `npm@11.17.0`.
- Pinned the Redis v6 client to RESP2, the previous keepalive initial delay, and no command timeout so cache, rate-limit, and lockout fallbacks keep their current behavior.
- Opted the app's explicit Undici dispatchers out of HTTP/2 with `allowH2: false` for the Mautic and payment-provider outbound clients.
- Kept the root Undici override version-qualified as `undici@^8.4.1 -> 8.4.1` so the app's direct backend dependency is on Undici v8 while `jsdom@29.1.1` can retain its private `undici@7.27.2` dependency.
- Tightened two existing frontend tests whose assertions could observe loading/async state under the refreshed stack: admin settings now waits for the loaded portal card, and website publishing notices wait for async store updates.

## Validation

| Command | Result |
| --- | --- |
| `npm ls redis undici stripe eslint tailwindcss @tailwindcss/vite jsdom --workspaces --include-workspace-root --depth=4` | Passed; confirmed backend `redis@6.0.0`, backend `undici@8.4.1`, backend `stripe@22.2.1`, workspace `eslint@10.5.0`, frontend `tailwindcss@4.3.1`, frontend `@tailwindcss/vite@4.3.1`, and `jsdom@29.1.1 -> undici@7.27.2`. |
| `npm run typecheck` | Passed. |
| `npm run knip` | Passed. |
| `cd backend && npm test -- src/__tests__/config/redis.test.ts src/__tests__/middleware/rateLimiter.test.ts src/__tests__/middleware/accountLockout.test.ts src/__tests__/services/siteCacheService.test.ts src/__tests__/services/mauticService.test.ts src/__tests__/services/paymentProviderService.ssrf.test.ts src/modules/socialMedia/__tests__/facebookGraphClient.test.ts src/__tests__/integration/plausibleProxy.test.ts` | Passed; 8 suites and 71 tests. |
| `cd frontend && npm test -- --run src/features/adminOps/pages/__tests__/AdminSettingsPage.test.tsx` | Passed; 11 tests. |
| `cd frontend && npm test -- --run src/features/websites/pages/__tests__/WebsitePublishingPage.test.tsx` | Passed; 6 tests. |
| `cd frontend && npm test -- --run --coverage` | Passed; 261 files and 1422 tests. |
| `make check-links` | Passed; checked 270 files and 1542 local links. |
| `make release-check` | Passed with branch-private validation isolation: coverage DB `127.0.0.1:18112/nonprofit_manager_test_deps`, E2E DB `127.0.0.1:18114/nonprofit_manager_test_deps_e2e`, E2E lock `/tmp/nonprofit-manager-e2e-deps.lock`, host ports `3301/5717`, and Docker smoke project `nonprofit-deps-smoke` on ports `18122-18126`. The gate completed backend coverage, frontend coverage, desktop and mobile Playwright, Docker smoke, build, production audit, gitleaks scans, Docker validation, and SBOM generation at `tmp/local-release/20260614T020936Z/nonprofit-manager.cdx.json`. |
| `npm outdated --workspaces --include-workspace-root --json` | Passed after refresh; returned `{}`. |
| `git diff --check` | Passed. |
| Final changed-path review | Passed; the dependency branch contains no `P5-T75` or auth-alias files. |

## Residual Risk

- The dependency tree intentionally contains both backend direct `undici@8.4.1` and `jsdom`'s private `undici@7.27.2`; a global override to v8 breaks that frontend test-runtime dependency shape, so the root override stays scoped to `undici@^8.4.1`.
- Earlier release-gate attempts exposed external validation contention on the shared DB/E2E lock and two async frontend assertion races. The final passing gate used branch-private DB ports, branch-private E2E lock state, and the tightened assertions above.
- Historical `P5-T93` proof remains unchanged.
