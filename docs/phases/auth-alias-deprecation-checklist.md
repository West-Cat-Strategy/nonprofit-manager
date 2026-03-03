# Auth Alias Deprecation Checklist

## Scope
This checklist tracks deferred retirement of legacy auth input aliases (`snake_case`) while preserving current behavior.

Canonical camelCase fields remain the internal/source-of-truth contract for auth flows:
- `firstName`
- `lastName`
- `passwordConfirm`
- `organizationName`
- `currentPassword`
- `newPassword`
- `newPasswordConfirm`

Legacy compatibility aliases currently accepted:
- `first_name`
- `last_name`
- `password_confirm`
- `organization_name`
- `current_password`
- `new_password`
- `new_password_confirm`

## Planned Enforcement Date
- Earliest canonical-only enforcement date: **July 1, 2026**.
- This date is gated by telemetry and may move later if usage remains non-zero.

## Telemetry Gate (Required Before Removal)
1. Instrument/register alias-field usage counters for `register`, `setup`, and `change-password` payload validation paths.
2. Capture daily usage ratio: `alias_requests / total_requests` for each endpoint.
3. Require **30 consecutive days** with zero alias-field usage in production-like traffic.
4. Confirm no active external integrator exceptions are documented.

### Current Instrumentation (March 3, 2026)
- Implemented middleware sink: `backend/src/modules/auth/middleware/aliasUsageTelemetry.ts`
- Attached before validation transforms on:
  - `/api/v2/auth/register`
  - `/api/v2/auth/setup`
  - `/api/v2/auth/password`
- Structured log event emitted: `auth.alias_input_used`
  - fields: `route`, `aliasFields`, `correlationId`, `userAgent`, `timestamp`
- Guardrail test coverage added: `backend/src/__tests__/modules/auth/aliasUsageTelemetry.test.ts`

## Deprecation Execution Checklist
- [ ] Add dashboard/report artifact for alias usage trend.
- [ ] Publish deprecation notice in release notes/docs with cutoff date.
- [ ] Add CI/policy guard to block reintroduction of retired alias keys after cutoff.
- [ ] Remove alias keys from Zod schemas and transforms.
- [ ] Remove related compatibility response fields only after explicit API contract review.
- [ ] Run full verification gates (`make typecheck`, targeted backend/frontend tests, envelope checks).

## Current Phase Status
- **Deferred (no alias removals in this phase).**
