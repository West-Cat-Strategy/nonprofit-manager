# E2E Tests

**Last Updated:** 2026-04-16

Playwright tests live here. For the overall testing strategy, see [../docs/testing/TESTING.md](../docs/testing/TESTING.md).

## Default Runtime

The Playwright harness starts frontend and backend processes unless `SKIP_WEBSERVER=1`.

Default addresses from `playwright.config.ts`:

- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:3001`
- Public site: `http://127.0.0.1:3001`
- Test database port: `8012`

These defaults are specific to the Playwright-managed runtime. They do not match the optional Docker dev stack or the direct backend/frontend runtime.

Local file overrides load in this order:

1. `.env.test`
2. `.env.test.local`

The wrapper-driven runtime commands are mode-defining:

- `npm test`, `npm run test:smoke`, `npm run test:ci`, `npm run test:ci:mobile`, `npm run test:headed`, `npm run test:debug`, and `npm run test:ui` always use the Playwright-managed host contract on `127.0.0.1:5173/3001`.
- `npm run test:docker*` always use the externally managed Docker contract on `127.0.0.1:8005/8004/8006` with `SKIP_WEBSERVER=1`.
- Those wrapper contracts also pin `BYPASS_REGISTRATION_POLICY_IN_TEST=false` for host runs and `BYPASS_REGISTRATION_POLICY_IN_TEST=true` for docker runs.

Those wrapper commands intentionally ignore mixed-mode overrides for `SKIP_WEBSERVER`, `BASE_URL`, `API_URL`, `E2E_BACKEND_PORT`, and `E2E_FRONTEND_PORT`. If you need an ad hoc hybrid target, run `npx playwright test ...` directly with explicit env vars instead of the wrapper script.

## Setup

```bash
cd e2e
npm ci
cp .env.test.example .env.test.local
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
npm run test:docker:ci:mobile
npm run test:report
```

## What The Main Commands Do

- `npm test`: local default run using the Playwright web servers
- `npm run test:smoke`: Chromium smoke slice
- `npm run test:ci`: Chromium, Firefox, and WebKit functional matrix
- `npm run test:ci:mobile`: Mobile Chrome regression slice against the Playwright-managed host runtime
- `npm run test:docker`: run against an already running Docker app stack on `8005/8004/8006`
- `npm run test:docker:smoke`: Chromium smoke slice against Docker-hosted services on `8005/8004/8006`
- `npm run test:docker:ci`: cross-browser functional slice against Docker-hosted services on `8005/8004/8006`
- `npm run test:docker:ci:mobile`: Mobile Chrome regression slice against Docker-hosted services on `8005/8004/8006`
- `npm run test:docker:audit`: dedicated Chromium dark-mode route audit against Docker-hosted services on `8005/8004/8006`
- `npm run test:report`: open the HTML report

`Mobile Safari` and `Tablet` are defined in `playwright.config.ts` for manual/ad hoc `--project` runs. They are intentionally excluded from the CI wrappers above.

## Docker App Stack Runtime

If you want Playwright to target the Docker development stack instead of starting host processes:

```bash
make docker-up-dev
cd e2e
npm run test:docker:smoke
npm run test:docker:ci
npm run test:docker:audit
```

These commands assume:

- Frontend: `http://127.0.0.1:8005`
- Backend API: `http://127.0.0.1:8004`
- Public site: `http://127.0.0.1:8006`
- `SKIP_WEBSERVER=1`
- `PW_REUSE_EXISTING_SERVER=1`
- `make docker-up-dev` uses the starter-only init path, so a fresh volume lands on `/setup` until the E2E helper completes first-time admin setup
- Optional mock-data snapshots that explicitly load `database/seeds/003_mock_data.sql` still expose the seeded `admin@example.com` account described below

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

## Debugging

Useful commands:

```bash
npm run test:headed
npm run test:debug
npx playwright test --debug
```

If you want to reuse already running services on the Playwright-managed host runtime, set `PW_REUSE_EXISTING_SERVER=1`. If you want to target an externally managed runtime without the wrapper defaults, run `npx playwright test ...` directly with explicit `SKIP_WEBSERVER=1`, `BASE_URL`, and `API_URL`, or use the `npm run test:docker*` commands above for the standard Docker contract.

## Related References

- [../docs/testing/TESTING.md](../docs/testing/TESTING.md)
- [../docs/development/GETTING_STARTED.md](../docs/development/GETTING_STARTED.md)
- [playwright.config.ts](playwright.config.ts)
