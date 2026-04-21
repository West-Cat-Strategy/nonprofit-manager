# E2E Tests

**Last Updated:** 2026-04-20

Playwright tests live here. For the overall testing strategy, see [../docs/testing/TESTING.md](../docs/testing/TESTING.md).

Use [../docs/development/GETTING_STARTED.md](../docs/development/GETTING_STARTED.md) for repo setup and runtime ports. This file owns the Playwright-specific wrapper contracts, runtime assumptions, and debugging notes.

## Default Runtime

The Playwright harness starts frontend and backend processes unless `SKIP_WEBSERVER=1`.

Default addresses from `playwright.config.ts`:

- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:3001`
- Public site: `http://127.0.0.1:3001`
- Test database port: `8012`

These defaults are specific to the Playwright-managed runtime. They do not match the optional Docker dev stack or the direct backend/frontend runtime.

Local file overrides load in this order, with later values overriding earlier ones:

1. `.env.test`
2. `.env.test.local`

That order matches `playwright.config.ts`, which calls `dotenv.config` for `.env.test` first and then `.env.test.local` with `override: true`.

The wrapper-driven runtime commands are mode-defining:

- `npm test`, `npm run test:smoke`, `npm run test:ci`, `npm run test:ci:mobile`, `npm run test:headed`, `npm run test:debug`, and `npm run test:ui` always use the Playwright-managed host contract on `127.0.0.1:5173/3001`.
- `npm run test:docker*` default to the externally managed Docker contract on `127.0.0.1:8005/8004/8006` with `SKIP_WEBSERVER=1`.
- Those wrapper contracts also pin `BYPASS_REGISTRATION_POLICY_IN_TEST=false` for host runs and `BYPASS_REGISTRATION_POLICY_IN_TEST=true` for docker runs.

The wrapper still enforces the host-vs-docker mode contract, but explicit overrides for `BASE_URL`, `API_URL`, `E2E_BACKEND_PORT`, `E2E_FRONTEND_PORT`, `E2E_PUBLIC_SITE_PORT`, and `E2E_DB_PORT` are honored inside that mode. That makes it possible to point `npm run test:docker*` at an alternate externally managed stack such as the repo's isolated smoke project.
Host wrapper runs now default to fresh Playwright-managed services (`PW_REUSE_EXISTING_SERVER=0`) and let Playwright own the web-server readiness check. The shared runner still preflights ports for every mode, and it preflights HTTP readiness URLs for Docker-backed runs plus explicit host reuse runs so externally managed stacks fail on the real endpoints instead of silently falling back to the default `8005/8004/8006` contract.

## Setup

```bash
cp e2e/.env.test.example e2e/.env.test.local
cd /path/to/nonprofit-manager
npm ci
cd e2e
```

`ADMIN_USER_EMAIL` and `ADMIN_USER_PASSWORD` are optional overrides in `.env.test.local`. Leave them blank unless your local snapshot uses a different admin account than the repo defaults below.

`BYPASS_REGISTRATION_POLICY_IN_TEST` in `.env.test.local` is only honored as a direct-registration fallback when you target an externally managed runtime such as `SKIP_WEBSERVER=1`. The Playwright-managed host runtime overrides the backend flag to `false` and creates test users through the managed helper path instead.

Install browsers if needed:

```bash
npx playwright install
```

## Common Commands

```bash
npm test
npm run test:smoke
npm run test:headed
npm run test:debug
npm run test:ui
npm run test:ci
npm run test:ci:mobile
npm run test:ci:report
npm run test:docker
npm run test:docker:smoke
npm run test:docker:ci
npm run test:docker:ci:mobile
npm run test:docker:audit
npm run test:report
```

## What The Main Commands Do

- `npm test`: local default run using the Playwright web servers
- `npm run test:smoke`: Chromium smoke slice
- `npm run test:ci`: Chromium, Firefox, and WebKit functional matrix, then `npm run test:ci:mobile`
- `npm run test:ci:mobile`: Mobile Chrome regression slice against the Playwright-managed host runtime
- `npm run test:ci:report`: same host CI lane as `npm run test:ci`, but archives the desktop and mobile slice reports under `tmp/e2e-reports/host-ci-*`, exposes a top-level `playwright-report` and `test-results.json` pointer for the report that matches the final lane outcome, and opens that report in the background
- `npm run test:docker`: run against an already running Docker app stack, defaulting to `8005/8004/8006`
- `npm run test:docker:smoke`: Chromium smoke slice against Docker-hosted services, defaulting to `8005/8004/8006`
- `npm run test:docker:ci`: cross-browser functional slice against Docker-hosted services, defaulting to `8005/8004/8006`, then `npm run test:docker:ci:mobile`
- `npm run test:docker:ci:mobile`: Mobile Chrome regression slice against Docker-hosted services, defaulting to `8005/8004/8006`
- `npm run test:docker:audit`: dedicated Chromium dark-mode route audit against Docker-hosted services, defaulting to `8005/8004/8006`
- `npm run test:report`: open the HTML report

`Mobile Safari` and `Tablet` are defined in `playwright.config.ts` for manual/ad hoc `--project` runs. They are intentionally excluded from the CI wrappers above.
`npm run test:report` still opens the default last-run report in `e2e/playwright-report`; use `npm run test:ci:report` when you need a preserved archived report for the full host CI lane.

## Preserved Host CI Reports

Use the preserved-report wrapper when you want the host CI lane to leave a durable local artifact instead of reusing the default last-run report folder:

```bash
cd e2e
npm run test:ci:report
```

If `127.0.0.1:5173` is already occupied on your machine, prefix the host review command with an alternate port such as `E2E_FRONTEND_PORT=5317 npm run test:ci:report`.

This wrapper:

- archives each run under `tmp/e2e-reports/host-ci-*`
- preserves separate `desktop/` and `mobile/` slice artifacts inside the run directory
- creates top-level `playwright-report` and `test-results.json` pointers to the report that matches the final lane outcome
- launches `playwright show-report` for that preserved report in the background and writes its server log to `show-report.log`

Optional overrides:

- `E2E_REPORT_ROOT=/absolute/or/relative/path` to change the archive root
- `E2E_REPORT_RUN_ID=host-ci-custom-id` to force a deterministic run directory name

## Root CI-Gated Matrix

Repo-root CI flows call these E2E commands today:

- `make test`: backend tests, frontend tests, `npm run test:ci`, then the named Docker-backed smoke gate `make test-e2e-docker-smoke`
- `make test-e2e-docker-smoke`: provisions the isolated `nonprofit-smoke` compose project on `18005/18004/18006`, runs `npm run test:docker:smoke` against that stack, then tears it down unless `KEEP_SMOKE_STACK=1`
- `make test-coverage`: backend/frontend coverage, `npm run test:smoke`, then `make test-e2e-docker-smoke`
- `make test-coverage-full`: backend/frontend coverage, `npm run test:ci`, then `make test-e2e-docker-smoke`
- `make ci`: `./scripts/ci.sh --build`, which runs `make lint`, `make typecheck`, `make test`, and `make build`
- `make ci-full`: `./scripts/ci.sh --build --audit --coverage`, which runs `make lint`, `make typecheck`, `make test-coverage-full`, `make build`, and `make security-audit`

`make ci-unit` is the unit-only coverage lane and intentionally skips Playwright.
The default gate stops here. Docker cross-browser, Docker audit, `Mobile Safari`, and `Tablet` remain explicit review-lane follow-ons rather than CI-gated defaults.
The coverage-backed root lanes now self-supply the CI Redis URL and backend coverage heap from the wrapper layer. Run them from a clean shell and do not export the full `.env.development` contract into the lane, because it can override the isolated test DB contract.
Even the host review lane still depends on Docker for the Redis sidecar and isolated test DB bootstrap before Playwright starts.

## Full Playwright Review Lane

Use this when you need the broader Phase 5-style browser and runtime review rather than the normal repo gate:

```bash
make ci-full
cd e2e
npm run test:docker:ci
npm run test:docker:audit
```

That sequence gives you:

- the host Playwright CI matrix through `make ci-full`
- the isolated Docker-backed smoke gate through `make ci-full`
- the full Docker cross-browser slice through `npm run test:docker:ci`
- the Docker dark-mode and route-audit slice through `npm run test:docker:audit`

If the host frontend port is occupied, rerun the host command with `E2E_FRONTEND_PORT=<open-port>` such as `E2E_FRONTEND_PORT=5317 make ci-full`.

## Docker App Stack Runtime

If you want Playwright to target the long-lived Docker development stack instead of starting host processes:

```bash
make docker-up-dev
cd e2e
npm run test:docker:smoke
npm run test:docker:ci
npm run test:docker:audit
```

If you want the repo-root Docker smoke gate instead of the package-level command, run:

```bash
make test-e2e-docker-smoke
```

These commands assume:

- Frontend: `http://127.0.0.1:8005`
- Backend API: `http://127.0.0.1:8004`
- Public site: `http://127.0.0.1:8006`
- `SKIP_WEBSERVER=1`
- `PW_REUSE_EXISTING_SERVER=1`
- `make docker-up-dev` uses the starter-only init path, so a fresh volume lands on `/setup` until the E2E helper completes first-time admin setup
- Optional mock-data snapshots that explicitly load `database/seeds/003_mock_data.sql` still expose the seeded `admin@example.com` account described below

If you want the repo-root smoke gate instead of the long-lived dev stack, run:

```bash
make test-e2e-docker-smoke
```

By default that target provisions an isolated compose project named `nonprofit-smoke` on:

- Frontend: `http://127.0.0.1:18005`
- Backend API: `http://127.0.0.1:18004`
- Public site: `http://127.0.0.1:18006`
- Test database: `127.0.0.1:18002`
- Backend MFA bypass: `DEV_BYPASS_MFA_FOR_TESTS=true` for deterministic admin bootstrap in the isolated smoke stack only

Set `KEEP_SMOKE_STACK=1` if you want the isolated smoke stack to stay up for follow-up inspection.

## Admin Credential Contract

When `ADMIN_USER_EMAIL` and `ADMIN_USER_PASSWORD` are unset, the E2E helper chooses the default admin credentials from the runtime:

- Playwright-managed runtime (`npm test`, `npm run test:ci`, headed/debug/UI runs): `admin@example.com` / `Admin123!@#`
- Docker-backed starter-only runtime from `make docker-up-dev`: the helper completes first-time setup with `admin@example.com` / `Admin123!@#`
- Docker-backed runtime with `database/seeds/003_mock_data.sql` loaded explicitly: `admin@example.com` / `password123`

Set `ADMIN_USER_EMAIL` and `ADMIN_USER_PASSWORD` explicitly only when:

- your Docker snapshot uses a different seeded admin account
- your starter-only Docker or Playwright-managed runtime was prepared with a different setup-created admin
- you want strict route-health checks to pin a specific known admin account

## Registration Policy Contract

- Playwright-managed host runs (`npm test`, `npm run test:smoke`, `npm run test:ci`, headed/debug/UI runs) force `BYPASS_REGISTRATION_POLICY_IN_TEST=false`.
- In that runtime, E2E helpers create test users through the authenticated admin-managed user path instead of `/api/v2/auth/register`.
- Wrapper-driven docker runs force `BYPASS_REGISTRATION_POLICY_IN_TEST=true`, which keeps the starter-only first-time setup path plus the seeded-admin direct-registration and shared-user fallback path available.
- Other externally managed runtimes such as ad hoc `SKIP_WEBSERVER=1` runs may still opt into direct registration and shared-user fallback with `BYPASS_REGISTRATION_POLICY_IN_TEST=true`.
- If an externally managed runtime sets `BYPASS_REGISTRATION_POLICY_IN_TEST=false`, the helpers fall back to the managed-user path instead of the direct-registration path.

## Remote macOS WebKit Note

- Host-mode WebKit/Safari projects (`webkit`, `Mobile Safari`, and `Tablet`) require an active Aqua/login session on macOS.
- Running those projects from a background SSH session can leave Playwright's bundled `Playwright.app` idle until the browser launch timeout expires.
- The shared E2E runner now fails fast with an explicit message in that situation; log into the Mac console or Screen Sharing session before rerunning host-mode Safari-backed projects.

## Strict Route-Health Example

```bash
cd e2e
export E2E_REQUIRE_STRICT_ADMIN_AUTH=true
npx playwright test tests/link-health.spec.ts --project=chromium
```

`tests/link-health.spec.ts` now treats a route as healthy only when the browser finishes on the expected client-side location. Canonical routes must stay on the requested path, documented redirects must land on their declared target, and an accidental wildcard fallthrough through `* -> /` never counts as success.

If your local snapshot does not use the repo defaults, add explicit overrides before running the command:

```bash
export ADMIN_USER_EMAIL="admin@example.com"
export ADMIN_USER_PASSWORD="password123"
```

If needed, escalate to the cross-browser slice:

```bash
npx playwright test tests/link-health.spec.ts --project=firefox --project=webkit
```

## Dark Mode Accessibility Audit

Run the full dark-mode route audit and generate a markdown findings report:

```bash
cd e2e
npm run test:docker:audit
```

Or against the default Playwright-managed runtime:

```bash
cd e2e
npx playwright test tests/dark-mode-accessibility-audit.spec.ts --project=chromium
```

Artifacts:

- `test-results/dark-mode-accessibility-report.md`
- `test-results/dark-mode-audit/`

The dark-mode audit now reuses the same route-runtime capture as `tests/link-health.spec.ts` before it inspects visuals. A route only reaches contrast/readability/focus analysis after its document response, final client location, and same-origin runtime surface are clean. Manual-review routes stay advisory for visual findings only; `runtime` and `blocked` findings still fail the spec on every route.

## Debugging

Useful commands:

```bash
npm run test:headed
npm run test:debug
npx playwright test --debug
```

If you want to reuse already running services on the Playwright-managed host runtime, set `PW_REUSE_EXISTING_SERVER=1`; the wrapper will switch its port preflight into reuse mode instead of killing the occupied listeners. If you want to target an externally managed runtime, use `npm run test:docker*` with explicit `E2E_*_PORT`, `BASE_URL`, or `API_URL` overrides, or run `npx playwright test ...` directly when you need a fully custom hybrid contract.

## Related References

- [../docs/testing/TESTING.md](../docs/testing/TESTING.md)
- [../docs/development/GETTING_STARTED.md](../docs/development/GETTING_STARTED.md)
- [playwright.config.ts](playwright.config.ts)
