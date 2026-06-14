# Auth Alias Usage Report

**Last Updated:** 2026-06-13

Date: 2026-04-14

## Status

Legacy auth input aliases remain accepted.

Canonical camelCase fields remain the active contract for:

- `/api/v2/auth/register`
- `/api/v2/auth/setup`
- `/api/v2/auth/password`

Alias removal is still deferred until the telemetry gate in [../security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md](../security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md) is satisfied.

This note is the Phase 5 validation handoff for the operator workflow in [../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md](../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md). Use the guide for query and dashboard setup, and use this report to record what evidence exists today plus what operators must keep watching before alias support can retire.

## Instrumentation And Evidence In Place

- Middleware sink: `backend/src/modules/auth/middleware/aliasUsageTelemetry.ts`
- Coverage: `backend/src/__tests__/modules/auth/aliasUsageTelemetry.test.ts`
- Structured log event: `auth.alias_input_used`
- Shared log denominator source: `backend/src/index.ts` via the `Outgoing response` log stream described in [../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md](../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md)
- Offline review helper and deterministic fixture: `scripts/auth-alias-telemetry-review.mjs` plus `scripts/fixtures/auth-alias-telemetry-review/mixed-june-review.ndjson`
- June 17 checkpoint deferral: [P5-T75_AUTH_ALIAS_CHECKPOINT_2026-06-17.md](P5-T75_AUTH_ALIAS_CHECKPOINT_2026-06-17.md)
- Security monitoring summary: [../security/SECURITY_MONITORING_GUIDE.md](../security/SECURITY_MONITORING_GUIDE.md)
- Phase 5 security lane snapshot: [PHASE_5_SECURITY_REVIEW_2026-04-22.md](PHASE_5_SECURITY_REVIEW_2026-04-22.md)

Captured fields:

- `route`
- `aliasFields`
- `correlationId`
- `userAgent`
- `timestamp`

Current proof covered by `backend/src/__tests__/modules/auth/aliasUsageTelemetry.test.ts`:

- `auth.alias_input_used` is emitted when legacy snake_case fields are present.
- Canonical-only payloads do not emit alias telemetry.
- `/register`, `/setup`, and `/password` each attach the alias telemetry middleware.

## Operator Watchpoints

Operators should watch the daily per-route alias-usage ratios defined in [../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md](../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md):

- `POST /api/v2/auth/register`
- `POST /api/v2/auth/setup`
- `PUT /api/v2/auth/password`

For each route, review:

- The ratio panel: `auth.alias_input_used` events divided by total completed requests for the same route and method.
- The detail table: inspect `aliasFields`, `correlationId`, and `userAgent` to identify which legacy fields and clients are still active.
- Request volume: treat days with zero denominator traffic as inconclusive rather than clean.

Operational review timing and escalation remain the same as the telemetry guide:

- Weekly review for trend direction or regressions.
- A blocker 14 days before July 1, 2026 if any route still shows non-zero usage.
- No alias retirement until all three routes have 30 consecutive clean production-like days and the exception list is empty.

## Current Read

- Validation compatibility remains intentional in `backend/src/validations/auth.ts`.
- Operator-facing query, Lens formula, and table instructions already exist in [../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md](../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md).
- The checked-in mixed June fixture proves the packet generator's route, alias-event, inconclusive-day, exception-check, Markdown, and JSON output shape; it is not live production evidence.
- The June 17 checkpoint is blocked/deferred because the required June 1-16 production-like alias-event and denominator exports were unavailable in ignored local storage; no route ratio, zero-usage streak, or empty-exception claim is recorded from that checkpoint.
- The current evidence base is implementation-plus-test proof and monitoring instructions, not a claim that production has already reached a zero-usage streak.
- No alias removals should ship before July 1, 2026, and only after the telemetry gate in the deprecation checklist is satisfied.

## Evidence Snapshot For Phase 5

- Middleware and route-level coverage prove the alias telemetry hook is wired to the three tracked auth endpoints today.
- The telemetry guide defines the exact KQL, ES|QL, Lens formulas, and review rules operators should use for the production handoff.
- The broader security lane records the surrounding auth/rate-limit guardrail checks as green in [PHASE_5_SECURITY_REVIEW_2026-04-22.md](PHASE_5_SECURITY_REVIEW_2026-04-22.md).

## Remaining Operational Step

Keep alias support in place while operators apply the dashboard/query workflow from [../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md](../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md) to live production-like traffic and collect the zero-usage evidence required by [../security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md](../security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md). The next checkpoint needs the real production-like exports plus complete external exception evidence before any retirement path can be reconsidered. No schema, route-contract, or compatibility changes are part of this handoff.
