# Auth Alias Usage Report

Date: 2026-04-14

## Status

Legacy auth input aliases remain accepted.

Canonical camelCase fields remain the active contract for:

- `/api/v2/auth/register`
- `/api/v2/auth/setup`
- `/api/v2/auth/password`

Alias removal is still deferred until the telemetry gate in [auth-alias-deprecation-checklist.md](auth-alias-deprecation-checklist.md) is satisfied.

## Instrumentation In Place

- Middleware sink: `backend/src/modules/auth/middleware/aliasUsageTelemetry.ts`
- Coverage: `backend/src/__tests__/modules/auth/aliasUsageTelemetry.test.ts`
- Structured log event: `auth.alias_input_used`

Captured fields:

- `route`
- `aliasFields`
- `correlationId`
- `userAgent`
- `timestamp`

## Current Read

- Validation compatibility remains intentional in `backend/src/validations/auth.ts`.
- No alias removals should ship before July 1, 2026.
- The remaining missing piece is operational visibility over the emitted `auth.alias_input_used` events rather than schema or middleware work.

## Next Step

Carry the production-facing dashboard/query work under `P4-T9I` in [planning-and-progress.md](planning-and-progress.md) so `auth.alias_input_used` rolls into a daily usage ratio for the three tracked auth endpoints without reopening `P4-T9A`.

Operational query and dashboard instructions now live in [AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md](AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md).
