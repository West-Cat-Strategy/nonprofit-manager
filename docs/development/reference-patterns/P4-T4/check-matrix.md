# P4-T4 Team Chat Verification Matrix

## Backend

1. `cd backend && npm run type-check`
Reason: compile-time safety across new module/route/validation contracts.

2. `cd backend && npm test -- src/modules/teamChat/__tests__/teamChat.usecase.test.ts`
Reason: validate manager override, mention validation, parent-message constraints, owner guardrails.

3. `cd backend && npm test -- src/__tests__/utils/permissions.referenceAdoption.test.ts`
Reason: confirm permission policy coverage includes team-chat grants/restrictions.

## Frontend

1. `cd frontend && npm run type-check`
Reason: verify route wiring, hooks, and case-tab integration compile with strict TS.

2. `cd frontend && npm test -- src/features/teamChat/__tests__/useVisibilityPolling.test.ts`
Reason: enforce polling pause/resume contract for tab visibility.

## Escalation (if primary checks fail or high-risk rollout)

1. `cd backend && npm test -- src/__tests__/integration/routeGuardrails.test.ts`
Reason: regression safety on auth/validation/error envelope/correlation guardrails.

2. `cd frontend && npm test -- --runInBand`
Reason: broader UI regression signal after routing/navigation changes.
