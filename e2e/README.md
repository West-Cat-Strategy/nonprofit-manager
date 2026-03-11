# E2E Tests

**Last Updated:** 2026-03-11

Playwright tests live here. For the overall testing strategy, see [../docs/testing/TESTING.md](../docs/testing/TESTING.md).

## Default Runtime

The Playwright harness starts frontend and backend processes unless `SKIP_WEBSERVER=1`.

Default addresses from `playwright.config.ts`:

- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:3001`
- Test database port: `8012`

Local overrides load in this order:

1. `.env.test.local`
2. `.env.test`

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
- `npm run test:ci`: Chromium, Firefox, and WebKit matrix
- `npm run test:report`: open the HTML report

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

If you want to reuse already running services, set `PW_REUSE_EXISTING_SERVER=1`. If you want to disable Playwright-managed web servers entirely, set `SKIP_WEBSERVER=1` and provide matching `BASE_URL` and `API_URL`.

## Related References

- [../docs/testing/TESTING.md](../docs/testing/TESTING.md)
- [../docs/development/GETTING_STARTED.md](../docs/development/GETTING_STARTED.md)
- [playwright.config.ts](playwright.config.ts)
