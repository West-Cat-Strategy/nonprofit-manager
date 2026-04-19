# Historical Manual Event API Scripts

**Last Updated:** 2026-04-18

This directory contains old bash scripts for ad hoc event-API exploration. They are retained as narrow historical helpers, not as the supported contributor workflow.

## Use The Active Docs First

- [../../../docs/testing/TESTING.md](../../../docs/testing/TESTING.md) for the active validation matrix
- [../../../docs/testing/INTEGRATION_TEST_GUIDE.md](../../../docs/testing/INTEGRATION_TEST_GUIDE.md) for the supported backend Jest integration path
- [../../../docs/development/GETTING_STARTED.md](../../../docs/development/GETTING_STARTED.md) for direct-backend runtime setup

## Why This Folder Is Historical

- The scripts assume a manually managed direct backend runtime on `localhost:3000`.
- They require hand-managed auth tokens and, for registration coverage, a manually chosen `contact_id`.
- Their embedded curl examples and script defaults predate the repo's active `/api/v2/*` wording, so they may need local patching before they match the current documented contract.

## Files In This Folder

- `test-events-api.sh`: exploratory event CRUD, filter, and stats requests
- `test-event-registrations.sh`: exploratory registration, capacity, and check-in requests

## If You Still Need Them For Local Debugging

1. Start the direct backend runtime using [../../../docs/development/GETTING_STARTED.md](../../../docs/development/GETTING_STARTED.md).
2. Inspect the script before you run it and update route prefixes to `/api/v2/*` if your target runtime does not expose legacy aliases.
3. Supply a current admin token and any required fixture IDs locally in the script.
4. Treat the result as manual exploration only; do not use these scripts as regression proof in place of Jest or Playwright coverage.

## Prefer These Supported Alternatives

```bash
cd backend
npm test -- src/__tests__/integration/events.test.ts
npm test -- src/__tests__/integration/routeGuardrails.test.ts
```

If you need browser-driven end-to-end proof instead of manual API poking, use [../../../e2e/README.md](../../../e2e/README.md).
