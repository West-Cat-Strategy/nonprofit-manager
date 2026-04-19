# Historical Phase 2 Integration Coverage Map

**Last Updated:** 2026-04-18

This document keeps the original Phase 2 integration goals visible while mapping them to the current supported backend test workflow.

The active workflow is Jest-first. Historical shell scripts under `backend/tests/integration/` are archival only and are not the supported contributor path.

If you need current commands, use [INTEGRATION_TEST_GUIDE.md](INTEGRATION_TEST_GUIDE.md) and [TESTING.md](TESTING.md) instead of this historical map.

## Supported Commands

```bash
cd backend
npm test -- src/__tests__/integration
npm test -- src/__tests__/integration/authorization.test.ts
npm test -- src/__tests__/integration/events.test.ts
npm test -- src/__tests__/integration/routeGuardrails.test.ts
```

## Phase 2 Scenario Mapping

| Historical scenario | Current coverage anchor | What the suite now checks |
|---|---|---|
| Auth and route guardrails | `backend/src/__tests__/integration/routeGuardrails.test.ts` | Canonical success/error envelopes, auth-required routes, org-context enforcement, validation detail contracts, and module-disable behavior |
| Cross-role authorization behavior | `backend/src/__tests__/integration/authorization.test.ts` | Role-based CRUD access, canonical unauthorized responses, and persisted contract outcomes for seeded resources |
| Event scheduling and registration workflows | `backend/src/__tests__/integration/events.test.ts` | Event CRUD, list/search/filter contracts, registration mutations, check-in behavior, public-event catalog rules, and registration guardrails |
| Guard helper depth | `backend/src/__tests__/services/authGuardService.test.ts` | Safe guard helpers, org-context handling, and response-helper propagation |
| Permission matrix seam | `backend/src/__tests__/utils/permissions.test.ts` | Role alias normalization plus canonical grants and denials |

## Current Expectations

- Add new backend integration coverage under `backend/src/__tests__/integration/`.
- Use `npm test -- <spec>` instead of shell-driven request scripts.
- Keep active API examples on `/api/v2/*`.
- Treat direct shell token workflows and manual cleanup steps as unsupported historical material.

## Historical Context

The original Phase 2 rollout used shell-based scenarios to prove multi-module behavior quickly. That history is still useful for understanding why certain workflows were tested, but the supported execution path has moved to backend Jest suites so the repo can:

- prepare the correct test database contract automatically
- run deterministic assertions inside CI-style local validation
- keep auth, permission, and envelope checks close to the TypeScript code they protect

## Related Docs

- [INTEGRATION_TEST_GUIDE.md](INTEGRATION_TEST_GUIDE.md)
- [TESTING.md](TESTING.md)
- [../../backend/tests/integration/README.md](../../backend/tests/integration/README.md)
