# Troubleshooting Guide

**Last Updated:** 2026-04-18

Use this guide when the repo is not behaving like the setup or validation docs say it should. Start with [GETTING_STARTED.md](GETTING_STARTED.md) for the intended runtime contract and [../testing/TESTING.md](../testing/TESTING.md) for the active validation matrix; use this file when reality diverges from those docs.

## Start With The Right Contract

- Docker development uses frontend `8005`, backend `8004`, Postgres `8002`, and Redis `8003`.
- Direct backend runtime uses `3000` unless you changed `backend/.env`.
- The Playwright harness defaults to frontend `5173` and backend `3001`.
- If a doc, script, or test assumes a different host or port, verify which runtime you actually chose before debugging deeper.

## Common Issues

### Backend or Jest runs hang

- Ensure `NODE_ENV=test` is set for backend test runs that expect the test contract.
- Re-run the narrow failing command from `backend/` with open-handle output:

```bash
cd backend
npm test -- --runInBand --detectOpenHandles
```

- If the failure only appears in a repo-root flow, compare it with [../testing/TESTING.md](../testing/TESTING.md) to confirm whether a narrower backend command is the better repro path.

### Database connection errors

- Verify PostgreSQL is running and reachable for the runtime you chose.
- Confirm `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in the relevant env file.
- If you are using the compose dev stack, the expected database port is `8002`.
- If you are running direct backend tests against a dedicated test database, confirm the env file and database name match the test workflow you intended.

### Frontend cannot reach the API

- Confirm `frontend/.env.local` points at the backend runtime you actually started.
- Direct backend runtime typically uses `http://localhost:3000/api`.
- Docker development typically uses `http://localhost:8004/api`.
- If the browser app is up on `8005` but requests are failing, inspect the network target first before changing code.

### Playwright or E2E flows fail to boot

- Confirm you are using the E2E harness contract from [../../e2e/README.md](../../e2e/README.md) instead of mixing it with the Docker or direct-runtime ports.
- Re-check `e2e/.env.test` and `e2e/.env.test.local` if the harness is pointing at the wrong backend or frontend host.
- When the managed harness is the failing surface, prefer the E2E-specific commands in [../testing/TESTING.md](../testing/TESTING.md) or [../../e2e/README.md](../../e2e/README.md) over ad hoc startup sequences.

### Docs validation fails

- Run `make check-links` from the repo root and fix the first broken relative link before chasing later failures.
- If API examples or versioned endpoint wording changed, also run:

```bash
make lint-doc-api-versioning
```

- Active application docs should use `/api/v2/*` unless the doc is intentionally covering a health alias or historical compatibility note.

### Auth failures (`401` or `403`)

- Confirm `JWT_SECRET` and other auth-related env settings match the runtime that issued the token.
- Ensure the request includes `Authorization: Bearer <token>` when the route expects a bearer token.
- If the failure is permission-related, compare behavior with the repo rules summarized in [AGENT_INSTRUCTIONS.md](AGENT_INSTRUCTIONS.md) before assuming the auth guard is wrong.

### Local CI or broader repo checks fail

- Start with the smallest relevant repo-root command from [../testing/TESTING.md](../testing/TESTING.md) instead of jumping straight to the broadest CI flow.
- `npm audit` and similar ecosystem checks can require registry access. If you are in a restricted environment, rerun those only when network access is available.

## Useful Narrow Commands

```bash
cd backend && npm run type-check
cd backend && npm test -- --runInBand --detectOpenHandles
cd frontend && npm run type-check
cd e2e && npm run test:smoke
make check-links
```

## When To Escalate

- If the runtime contract itself seems wrong, revisit [GETTING_STARTED.md](GETTING_STARTED.md).
- If command selection is unclear, use [../testing/TESTING.md](../testing/TESTING.md).
- If the issue is specific to Playwright or browser automation, use [../../e2e/README.md](../../e2e/README.md).
- If the issue looks like contributor workflow drift rather than a local setup problem, update the relevant docs instead of leaving the mismatch undocumented.
