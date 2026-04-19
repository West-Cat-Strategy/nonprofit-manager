# Backend Integration Test Guide

**Last Updated:** 2026-04-18

This guide documents the supported backend integration-testing workflow for nonprofit-manager. For the repo-wide testing map, start with [TESTING.md](TESTING.md). For runtime setup and ports, use [../development/GETTING_STARTED.md](../development/GETTING_STARTED.md). For backend runtime details, use [../../backend/README.md](../../backend/README.md).

## Supported Command Surface

Run backend integration suites through `npm test` from `backend/`:

```bash
cd backend
npm test -- src/__tests__/integration
npm test -- src/__tests__/integration/routeGuardrails.test.ts
npm test -- src/__tests__/integration/authorization.test.ts
npm test -- src/__tests__/integration/events.test.ts
npm test -- --coverage src/__tests__/integration
```

`npm test` is the supported entrypoint because it prepares the CI-style backend test database contract before invoking Jest.

## What This Covers

- Route and envelope guardrails under `src/__tests__/integration/routeGuardrails.test.ts`
- Authorization and role-access integration coverage under `src/__tests__/integration/authorization.test.ts`
- Event workflow and registration contracts under `src/__tests__/integration/events.test.ts`
- Additional backend integration suites under `src/__tests__/integration/**/*.test.ts`

## When To Run Which Command

| Goal | Command | Notes |
|------|---------|-------|
| Full backend integration sweep | `cd backend && npm test -- src/__tests__/integration` | Runs all backend integration specs with prepared test DB |
| Focused contract check | `cd backend && npm test -- src/__tests__/integration/routeGuardrails.test.ts` | Good for response-envelope, auth, and validation policy work |
| Focused authorization check | `cd backend && npm test -- src/__tests__/integration/authorization.test.ts` | Good for role/permission integration behavior |
| Focused events check | `cd backend && npm test -- src/__tests__/integration/events.test.ts` | Good for event CRUD, registration, and public-event contracts |
| Coverage run | `cd backend && npm test -- --coverage src/__tests__/integration` | Use when you need coverage output for integration specs |

## Supported Validation Pattern

For backend-only changes, pair the narrowest integration slice with the standard backend checks:

```bash
cd backend
npm run lint
npm run type-check
npm test -- <focused spec path>
```

Broaden from a single spec to `src/__tests__/integration` only when the change spans multiple backend contract seams.

## Unsupported Legacy Path

The shell scripts under `backend/tests/integration/` are historical artifacts, not the active contributor workflow.

Do not use them as the supported path for:

- manual auth-token shell setup
- direct `/api/*` shell flows
- ad hoc database cleanup instructions

If an older shell scenario still matters, port the behavior into a Jest integration spec instead of extending the shell scripts.

For historical rollout context only, see [archive/INTEGRATION_TESTING_PHASE2.md](archive/INTEGRATION_TESTING_PHASE2.md). That document is not the active command source of truth.

## Related Docs

- [TESTING.md](TESTING.md)
- [archive/INTEGRATION_TESTING_PHASE2.md](archive/INTEGRATION_TESTING_PHASE2.md) for historical scenario mapping
- [../../backend/README.md](../../backend/README.md)
- [../../backend/tests/integration/README.md](../../backend/tests/integration/README.md) for the historical shell-script directory
