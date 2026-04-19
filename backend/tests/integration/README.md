# Legacy Shell Integration Scripts

**Last Updated:** 2026-04-18

This directory contains historical shell-based integration scripts from the earlier Phase 2 test rollout. They are retained for release archaeology and comparison work only.

They are not the supported backend integration workflow.

If you are looking for the current contributor path, use [../../../docs/testing/INTEGRATION_TEST_GUIDE.md](../../../docs/testing/INTEGRATION_TEST_GUIDE.md) instead. Some scripts in this folder still reflect manual token handling and older route assumptions, so do not treat them as up-to-date regression coverage.

## Supported Workflow

Run backend integration coverage through the Jest suites under `backend/src/__tests__/integration/`:

```bash
cd backend
npm test -- src/__tests__/integration
npm test -- src/__tests__/integration/routeGuardrails.test.ts
npm test -- src/__tests__/integration/authorization.test.ts
npm test -- src/__tests__/integration/events.test.ts
npm test -- --coverage src/__tests__/integration
```

`npm test` is the supported entrypoint because it prepares the repo's CI-style backend test database contract before invoking Jest.

## Why The Shell Path Was Demoted

- The scripts in this folder assume a manually managed direct backend runtime.
- They rely on ad hoc shell orchestration rather than the repo's Jest-backed contributor workflow.
- They previously documented manual auth-token setup and cleanup patterns that are no longer part of the supported contract.

## Use This Folder Only For Historical Reference

- Do not treat these scripts as current contributor instructions.
- Do not add new backend coverage here.
- When an old shell scenario still matters, port or validate it in `backend/src/__tests__/integration/` instead.

## Related Docs

- [../../README.md](../../README.md)
- [../../../docs/testing/TESTING.md](../../../docs/testing/TESTING.md)
- [../../../docs/testing/INTEGRATION_TEST_GUIDE.md](../../../docs/testing/INTEGRATION_TEST_GUIDE.md)
