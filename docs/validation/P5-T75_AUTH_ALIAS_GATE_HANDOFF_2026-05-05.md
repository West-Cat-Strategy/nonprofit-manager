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
- The June 17 checkpoint deferral is recorded in [P5-T75_AUTH_ALIAS_CHECKPOINT_2026-06-17.md](P5-T75_AUTH_ALIAS_CHECKPOINT_2026-06-17.md).

## Gate State

- No production zero-usage streak is claimed in this handoff.
- A day counts as clean only when all three tracked auth routes have alias usage ratio `0` and non-zero route traffic.
- Alias retirement still requires 30 consecutive clean production-like days and no active integrator exceptions.
- June 17, 2026 checkpoint outcome: blocked/deferred because required production-like exports were unavailable.
- July 1, 2026 is unavailable for enforcement from the June 17 checkpoint.

## June 17, 2026 Checkpoint Deferral

The June 17 checkpoint was a telemetry and exception review only. It did not remove aliases, add a canonical-only CI guard, publish a cutoff notice, or change `backend/src/validations/auth.ts`.

The required June 1-16, 2026 production-like `auth.alias_input_used` and `Outgoing response` exports were unavailable in ignored local storage, so the helper was not run against production-like evidence. The dated deferral artifact records the clean isolated-worktree preflight, missing `tmp/` inputs, local search result, route-review deferral, and unresolved external exception gate.

For a future low-touch rerun, export the `auth.alias_input_used` and `Outgoing response` logs from the operations-guide queries as JSON, NDJSON, or Kibana `hits.hits` JSON into ignored local storage, then run the helper against the production-like export:

```bash
node scripts/auth-alias-telemetry-review.mjs --input tmp/auth-alias-june17-logs.ndjson --start 2026-06-01 --end 2026-06-16
```

Use `--format json` when the review packet needs a structured copy of the same route rows, alias-event rollups, exception-check rows, and skipped-record counts. The checked-in fixture at `scripts/fixtures/auth-alias-telemetry-review/mixed-june-review.ndjson` is deterministic tooling proof only; it demonstrates blocked, clean, and inconclusive outcomes from real-shaped records and must not be treated as live June production telemetry.

Paste the generated route review table, alias-event rollup, inconclusive-day table when present, and exception-check template into this handoff or a refreshed usage report. The helper uses the tracked auth telemetry route contract from `backend/src/modules/auth/routes/index.ts`: `POST /api/v2/auth/register`, `POST /api/v2/auth/setup`, and `PUT /api/v2/auth/password`.

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

The June 17 route review was blocked because no production-like exports were available:

| Route                        | Complete-day window reviewed | `auth.alias_input_used` count | Total completed requests | Ratio | Clean, inconclusive, or blocked |
| ---------------------------- | ---------------------------- | ----------------------------: | -----------------------: | ----: | ------------------------------- |
| `POST /api/v2/auth/register` | June 1-16, 2026              |                           N/A |                      N/A |   N/A | blocked - exports unavailable   |
| `POST /api/v2/auth/setup`    | June 1-16, 2026              |                           N/A |                      N/A |   N/A | blocked - exports unavailable   |
| `PUT /api/v2/auth/password`  | June 1-16, 2026              |                           N/A |                      N/A |   N/A | blocked - exports unavailable   |

No alias-event rollup is recorded from the June 17 checkpoint because no production-like alias-event export was available:

| Route | Alias field(s) | Correlation ID(s) | User agent/client | Classification                     | Follow-up owner |
| ----- | -------------- | ----------------- | ----------------- | ---------------------------------- | --------------- |
| N/A   | N/A            | N/A               | N/A               | Not reviewed - exports unavailable | N/A             |

The exception gate is not cleared. Repo-local docs/source search found no documented approved active external client exception, but the external owner, support, release, deployment, and customer/integrator evidence sources were unavailable alongside the missing telemetry exports:

| Check source                 | Result      | Required note                                                                                   |
| ---------------------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| API owners                   | Not cleared | External owner evidence unavailable; do not record no active exception                          |
| Support notes                | Not cleared | External support evidence unavailable; do not record no active exception                        |
| Release notes                | Not cleared | External release evidence unavailable; do not record no active exception                        |
| Deployment notes             | Not cleared | External deployment evidence unavailable; do not record no active exception                     |
| Customer/integrator trackers | Not cleared | External customer or integrator tracker evidence unavailable; do not record no active exception |

## Details To Refresh After Review

- The April 14 usage report remains a historical readiness snapshot and monitoring handoff, not proof that production-like traffic has already reached a zero-usage streak.
- The June 17 checkpoint is recorded as blocked/deferred in [P5-T75_AUTH_ALIAS_CHECKPOINT_2026-06-17.md](P5-T75_AUTH_ALIAS_CHECKPOINT_2026-06-17.md) because required production-like exports were unavailable.
- If the review records any non-zero alias usage, inconclusive zero-denominator route day, or active external exception, leave `P5-T75` blocked and keep July 1 as unavailable for enforcement.
- If the review records all clean complete days and no active exceptions, continue collecting evidence until the full 30 consecutive clean production-like days are complete. July 1, 2026 remains the earliest enforcement date, never an automatic enforcement date.

## Follow-Up

Place the real production-like alias-event and denominator exports in ignored local storage, provide external exception evidence, then rerun the telemetry review before reconsidering any retirement path.

## Validation

- Passed on 2026-06-13: P5-T75 June 17 checkpoint resolved as a deferral artifact in `/Users/bryan/projects/nonprofit-manager-p5-t75-checkpoint` on `codex/p5-t75-auth-alias-checkpoint-2026-06-13`.
  - Result: `docs/validation/P5-T75_AUTH_ALIAS_CHECKPOINT_2026-06-17.md` records the clean isolated-worktree preflight, missing June 1-16 production-like exports, blocked route-review outcome, uncleared external exception gate, and no auth runtime/API/schema/CI/cutoff behavior changes.
- Passed on 2026-06-13: `node --test scripts/tests/auth-alias-telemetry-review.test.mjs`
  - Result: 6 focused helper tests passed against generated records and the checked-in mixed June fixture.
- Passed on 2026-06-13: `./scripts/select-checks.sh --files "docs/phases/planning-and-progress.md docs/validation/P5-T75_AUTH_ALIAS_GATE_HANDOFF_2026-05-05.md docs/validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md docs/validation/README.md docs/validation/P5-T75_AUTH_ALIAS_CHECKPOINT_2026-06-17.md" --mode fast`
  - Result: selected `make check-links`.
- Passed on 2026-06-13: `make check-links`
  - Result: checked 270 files and 1545 local links; no broken active-doc links found.
- Passed on 2026-06-13: `npm exec -- prettier --check docs/phases/planning-and-progress.md docs/validation/P5-T75_AUTH_ALIAS_GATE_HANDOFF_2026-05-05.md docs/validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md docs/validation/README.md docs/validation/P5-T75_AUTH_ALIAS_CHECKPOINT_2026-06-17.md`
  - Result: all matched files use Prettier code style.
- Passed on 2026-06-13: `git diff --check`
- Passed on 2026-06-12: split into `/Users/bryan/projects/nonprofit-manager-p5-t75-auth-alias-prep` on `codex/p5-t75-auth-alias-review-prep-2026-06-12`; `git status --porcelain=v1 -uall` matched the 8-path auth-alias prep path set exactly.
  - Scope note: the isolated lane does not include the P5-T142 validation-index row or self-hosted DB-role documentation, and it still makes no auth schema, route behavior, CI guard, cutoff-notice, or enforcement change.
- Passed on 2026-06-12: `node --test scripts/tests/auth-alias-telemetry-review.test.mjs`
  - Result: 6 focused helper tests passed against generated records and the checked-in mixed June fixture, covering blocked, clean, inconclusive, Markdown, JSON, and exception-check row output.
- Passed on 2026-06-12: `make test-tooling`
  - Result: 71 Node tooling tests passed in the isolated P5-T75 lane, including the auth-alias telemetry review helper tests for clean, inconclusive, blocked, Markdown, JSON, and checked-in fixture cases.
- Passed on 2026-06-12: `make check-links`
  - Result: checked 268 files and 1532 local links; no broken active-doc links found.
- Passed on 2026-06-12: `npm exec -- prettier --check docs/security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md docs/validation/P5-T75_AUTH_ALIAS_GATE_HANDOFF_2026-05-05.md docs/validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md docs/validation/README.md scripts/README.md scripts/auth-alias-telemetry-review.mjs scripts/tests/auth-alias-telemetry-review.test.mjs`
  - Result: all matched files use Prettier code style.
- Passed on 2026-06-12: `git diff --check`
- Passed on 2026-06-11: `./scripts/select-checks.sh --files "Makefile docs/security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md docs/validation/P5-T75_AUTH_ALIAS_GATE_HANDOFF_2026-05-05.md docs/validation/README.md scripts/README.md scripts/auth-alias-telemetry-review.mjs scripts/tests/auth-alias-telemetry-review.test.mjs" --mode fast`
  - Result: selected `make check-links`, `make test-tooling`, and `make test-e2e-docker-smoke`.
  - Scope note: this prep lane changed only docs and a deterministic offline log-review helper, with no auth route, schema, container, or runtime behavior changes; focused proof stopped at docs/tooling validation.
- Passed on 2026-06-11: `node --test scripts/tests/auth-alias-telemetry-review.test.mjs`
  - Result: focused helper tests passed against generated records and the checked-in mixed June fixture, covering blocked, clean, inconclusive, Markdown, JSON, and exception-check row output.
- Passed on 2026-06-11: `make test-tooling`
  - Result: 73 Node tooling tests passed, including the auth-alias telemetry review helper tests for clean, inconclusive, blocked, Markdown, JSON, and checked-in fixture cases.
- Passed on 2026-06-11: `make check-links`
  - Result: checked 268 files and 1532 local links; no broken active-doc links found.
- Passed on 2026-06-11: `npm exec -- prettier --check docs/security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md docs/validation/P5-T75_AUTH_ALIAS_GATE_HANDOFF_2026-05-05.md docs/validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md docs/validation/README.md scripts/README.md scripts/auth-alias-telemetry-review.mjs scripts/tests/auth-alias-telemetry-review.test.mjs`
  - Result: all matched files use Prettier code style.
- Passed on 2026-06-11: `git diff --check`
- Passed on 2026-06-10: `./scripts/select-checks.sh --files docs/validation/P5-T75_AUTH_ALIAS_GATE_HANDOFF_2026-05-05.md --mode fast`
  - Result: selected `make check-links` for this docs-only handoff refresh.
- Passed on 2026-06-10: `make check-links`
  - Result: checked 266 files and 1530 local links; no broken active-doc links found.
- Passed on 2026-06-10: `npm exec -- prettier --check docs/validation/P5-T75_AUTH_ALIAS_GATE_HANDOFF_2026-05-05.md`
  - Result: all matched files use Prettier code style.
- Passed on 2026-06-10: `git diff --check`
- Passed on 2026-05-05: `cd backend && npm test -- --runTestsByPath src/__tests__/modules/auth/aliasUsageTelemetry.test.ts`
  - Result: 1 suite passed, 3 tests passed.
  - Note: the existing `--localstorage-file` warning appeared during the backend wrapper run and did not affect the focused telemetry guard.
- Passed on 2026-05-05: `make check-links`
  - Result: checked 207 files and 1567 local links; no broken active-doc links found.
- Passed on 2026-05-05: `git diff --check`
