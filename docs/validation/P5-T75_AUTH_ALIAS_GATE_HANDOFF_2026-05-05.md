# P5-T75 Auth Alias Gate Handoff

**Date:** 2026-05-05
**Status:** Operationally resolved as intentionally blocked/deferred

## Summary

`P5-T75` remains blocked by the auth-alias telemetry calendar, not by missing implementation access. Legacy `snake_case` auth input aliases remain accepted intentionally while operators collect production-like alias-usage evidence.

No auth schemas, route behavior, public API contracts, CI policy guard, or release cutoff notice changed in this handoff.

## Current Evidence

- Alias telemetry middleware is already wired before validation transforms for `/api/v2/auth/register`, `/api/v2/auth/setup`, and `/api/v2/auth/password`.
- Guardrail coverage remains in `backend/src/__tests__/modules/auth/aliasUsageTelemetry.test.ts`.
- The current telemetry workflow is documented in [../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md](../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md).
- The current deprecation gate is documented in [../security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md](../security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md).
- The existing readiness snapshot remains [AUTH_ALIAS_USAGE_REPORT_2026-04-14.md](AUTH_ALIAS_USAGE_REPORT_2026-04-14.md).

## Gate State

- No production zero-usage streak is claimed in this handoff.
- A day counts as clean only when all three tracked auth routes have alias usage ratio `0` and non-zero route traffic.
- Alias retirement still requires 30 consecutive clean production-like days and no active integrator exceptions.
- Next checkpoint: June 17, 2026.
- Earliest enforcement date: July 1, 2026.

## June 17, 2026 Review Prep

The June 17 checkpoint is a telemetry and exception review only. It must not remove aliases, add a canonical-only CI guard, publish a cutoff notice, or change `backend/src/validations/auth.ts` unless the telemetry gate is later satisfied and enforcement is explicitly authorized.

Run the production-like log review from [../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md](../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md) against complete days first. If the review happens at the scheduled 09:00 America/Vancouver follow-up, the complete-day window to inspect for the July 1 path is June 1 through June 16, 2026; June 17 itself should be treated as partial until the day closes.

For a low-touch run, export the `auth.alias_input_used` and `Outgoing response` logs from the operations-guide queries as JSON, NDJSON, or Kibana `hits.hits` JSON, then run:

```bash
node scripts/auth-alias-telemetry-review.mjs --input tmp/auth-alias-june17-logs.ndjson --start 2026-06-01 --end 2026-06-16
```

Paste the generated route review table, alias-event rollup, and exception-check template into this handoff or a refreshed usage report. The helper uses the tracked auth telemetry route contract from `backend/src/modules/auth/routes/index.ts`: `POST /api/v2/auth/register`, `POST /api/v2/auth/setup`, and `PUT /api/v2/auth/password`.

Check these route-specific counters and denominators:

| Route                        | Alias event fields to inspect                                      | Denominator log                                                             |
| ---------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `POST /api/v2/auth/register` | `first_name`, `last_name`, `password_confirm`                      | `Outgoing response` with `method="POST"` and `path="/api/v2/auth/register"` |
| `POST /api/v2/auth/setup`    | `first_name`, `last_name`, `password_confirm`, `organization_name` | `Outgoing response` with `method="POST"` and `path="/api/v2/auth/setup"`    |
| `PUT /api/v2/auth/password`  | `current_password`, `new_password`, `new_password_confirm`         | `Outgoing response` with `method="PUT"` and `path="/api/v2/auth/password"`  |

For each route and each complete day:

- Confirm `auth.alias_input_used` count is exactly `0`.
- Confirm total completed request count is non-zero; zero route traffic is inconclusive, not clean.
- Inspect the alias detail table fields `timestamp`, `route`, `aliasFields`, `correlationId`, and `userAgent` for any event in the checkpoint window.
- If any alias event exists, group it by route, alias field, user agent/client, and correlation ID before deciding whether it is an active external dependency, test traffic leakage, or noise that should be excluded with documented rationale.

Also perform the exception check before preparing any July 1 retirement path:

- Confirm whether API owners, support notes, release notes, deployment notes, or customer/integrator trackers document an approved external client exception for snake_case auth inputs.
- If no exception exists, record "no active integrator exceptions found" in the refreshed handoff or usage report.
- If an exception exists, record the client/integrator, affected route and fields, owner, expiry/review date, and migration plan; keep `P5-T75` blocked and defer enforcement.

Checkpoint outcomes:

- Any non-zero alias usage, any zero-denominator/inconclusive route day in the required streak, or any active exception means July 1 enforcement is not ready. Publish a dated deferral in this handoff or [AUTH_ALIAS_USAGE_REPORT_2026-04-14.md](AUTH_ALIAS_USAGE_REPORT_2026-04-14.md), and keep the schemas and route contracts unchanged.
- If all complete days remain clean and no exceptions are active, continue collecting evidence until the full 30 consecutive clean production-like days are complete. A release notice, CI/policy guard, and schema removal branch may be prepared after that gate is satisfied, but canonical-only enforcement still must not land before July 1, 2026.

## June 17 Review Record Template

Use this table to record the route/day evidence from the complete-day window before changing the row status:

| Route                        | Complete-day window reviewed | `auth.alias_input_used` count | Total completed requests | Ratio | Clean, inconclusive, or blocked |
| ---------------------------- | ---------------------------- | ----------------------------: | -----------------------: | ----: | ------------------------------- |
| `POST /api/v2/auth/register` | June 1-16, 2026              |                           TBD |                      TBD |   TBD | TBD                             |
| `POST /api/v2/auth/setup`    | June 1-16, 2026              |                           TBD |                      TBD |   TBD | TBD                             |
| `PUT /api/v2/auth/password`  | June 1-16, 2026              |                           TBD |                      TBD |   TBD | TBD                             |

For any non-zero alias event, add a short event rollup before deciding the outcome:

| Route | Alias field(s) | Correlation ID(s) | User agent/client | Classification                                       | Follow-up owner |
| ----- | -------------- | ----------------- | ----------------- | ---------------------------------------------------- | --------------- |
| TBD   | TBD            | TBD               | TBD               | Active dependency, test leakage, or documented noise | TBD             |

Record the exception check in the refreshed note:

| Check source                 | Result | Required note                                                     |
| ---------------------------- | ------ | ----------------------------------------------------------------- |
| API owners                   | TBD    | Record no active exception, or client/owner/expiry/migration plan |
| Support notes                | TBD    | Record no active exception, or client/owner/expiry/migration plan |
| Release notes                | TBD    | Record no active exception, or client/owner/expiry/migration plan |
| Deployment notes             | TBD    | Record no active exception, or client/owner/expiry/migration plan |
| Customer/integrator trackers | TBD    | Record no active exception, or client/owner/expiry/migration plan |

## Details To Refresh After Review

- The April 14 usage report remains a historical readiness snapshot and monitoring handoff, not proof that production-like traffic has already reached a zero-usage streak.
- This handoff is still future-tense until the June 17 checkpoint happens. After the checkpoint, replace the scheduled-follow-up wording below with the actual review result or a dated deferral reason.
- If the review records any non-zero alias usage, inconclusive zero-denominator route day, or active external exception, leave `P5-T75` blocked and keep July 1 as unavailable for enforcement.
- If the review records all clean complete days and no active exceptions, continue collecting evidence until the full 30 consecutive clean production-like days are complete. July 1, 2026 remains the earliest enforcement date, never an automatic enforcement date.

## Follow-Up

A thread follow-up is scheduled for June 17, 2026 at 09:00 America/Vancouver to review telemetry ratios and documented exceptions, then either publish an explicit deferral or prepare the July 1 retirement path.

## Validation

- Passed on 2026-06-11: `./scripts/select-checks.sh --files "Makefile docs/security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md docs/validation/P5-T75_AUTH_ALIAS_GATE_HANDOFF_2026-05-05.md docs/validation/README.md scripts/README.md scripts/auth-alias-telemetry-review.mjs scripts/tests/auth-alias-telemetry-review.test.mjs" --mode fast`
  - Result: selected `make check-links`, `make test-tooling`, and `make test-e2e-docker-smoke`.
  - Scope note: this prep lane changed only docs and a deterministic offline log-review helper, with no auth route, schema, container, or runtime behavior changes; focused proof stopped at docs/tooling validation.
- Passed on 2026-06-11: `make test-tooling`
  - Result: 69 Node tooling tests passed, including the new auth-alias telemetry review helper tests for clean, inconclusive, blocked, and CLI Markdown-output cases.
- Passed on 2026-06-11: `make check-links`
  - Result: checked 266 files and 1520 local links; no broken active-doc links found.
- Passed on 2026-06-11: `npm exec -- prettier --check docs/security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md docs/validation/P5-T75_AUTH_ALIAS_GATE_HANDOFF_2026-05-05.md docs/validation/README.md scripts/README.md scripts/auth-alias-telemetry-review.mjs scripts/tests/auth-alias-telemetry-review.test.mjs`
  - Result: all matched files use Prettier code style.
- Passed on 2026-06-11: `git diff --check`
- Passed on 2026-05-05: `cd backend && npm test -- --runTestsByPath src/__tests__/modules/auth/aliasUsageTelemetry.test.ts`
  - Result: 1 suite passed, 3 tests passed.
  - Note: the existing `--localstorage-file` warning appeared during the backend wrapper run and did not affect the focused telemetry guard.
- Passed on 2026-05-05: `make check-links`
  - Result: checked 207 files and 1567 local links; no broken active-doc links found.
- Passed on 2026-05-05: `git diff --check`
