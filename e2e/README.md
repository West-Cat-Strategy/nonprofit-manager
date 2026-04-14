# E2E Tests

**Last Updated:** 2026-04-13

Playwright tests live here. For the overall testing strategy, see [../docs/testing/TESTING.md](../docs/testing/TESTING.md).

## Default Runtime

The Playwright harness starts frontend and backend processes unless `SKIP_WEBSERVER=1`.

Default addresses from `playwright.config.ts`:

- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:3001`
- Public site: `http://127.0.0.1:3001`
- Test database port: `8012`

These defaults are specific to the Playwright-managed runtime. They do not match the optional Docker dev stack or the direct backend/frontend runtime.

Local overrides load in this order:

1. `.env.test`
2. `.env.test.local`

## Setup

```bash
cd e2e
npm ci
cp .env.test.example .env.test.local
```

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
npm run test:report
```

## What The Main Commands Do

- `npm test`: local default run using the Playwright web servers
- `npm run test:smoke`: Chromium smoke slice
- `npm run test:ci`: Chromium, Firefox, and WebKit functional matrix
- `npm run test:docker`: run against an already running Docker app stack on `8005/8004/8006`
- `npm run test:docker:smoke`: Chromium smoke slice against Docker-hosted services on `8005/8004/8006`
- `npm run test:docker:ci`: cross-browser functional slice against Docker-hosted services on `8005/8004/8006`
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

## Strict Route-Health Example

```bash
cd e2e
export ADMIN_USER_EMAIL="admin@example.com"
export ADMIN_USER_PASSWORD="Admin123!@#"
export E2E_REQUIRE_STRICT_ADMIN_AUTH=true
npx playwright test tests/link-health.spec.ts --project=chromium
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

If you want to reuse already running services, set `PW_REUSE_EXISTING_SERVER=1`. If you want to disable Playwright-managed web servers entirely, set `SKIP_WEBSERVER=1` and provide matching `BASE_URL` and `API_URL`, or use the `npm run test:docker*` commands above.

## Related References

- [../docs/testing/TESTING.md](../docs/testing/TESTING.md)
- [../docs/development/GETTING_STARTED.md](../docs/development/GETTING_STARTED.md)
- [playwright.config.ts](playwright.config.ts)
