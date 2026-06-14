# P5-T75 Auth Alias Checkpoint

**Checkpoint date:** 2026-06-17
**Prepared:** 2026-06-13
**Status:** Blocked: required complete-day exports unavailable

## Summary

This checkpoint records the attempted P5-T75 June 17 auth-alias review packet workflow without claiming live production-like telemetry evidence. The required complete June 1-16, 2026 `auth.alias_input_used` export and auth-route `Outgoing response` denominator export were not present under ignored local `tmp/` inputs during the 2026-06-13 implementation pass. Because June 14-16, 2026 were still future dates on June 13, the complete-day window could not be honestly reviewed.

No auth schemas, auth route behavior, public API contracts, CI policy guards, alias support, release cutoff notice, or enforcement posture changed.

## Evidence Inputs

| Input                         | Expected location                                                               | Result                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Alias-event export            | `tmp/auth-alias-june17-alias-events.ndjson` or equivalent ignored local export  | Not found                                                              |
| Auth-route denominator export | `tmp/auth-alias-june17-response-logs.ndjson` or equivalent ignored local export | Not found                                                              |
| Complete-day window           | June 1-16, 2026                                                                 | Not reviewable on 2026-06-13 because June 14-16 were not complete      |
| Deterministic fixture         | `scripts/fixtures/auth-alias-telemetry-review/mixed-june-review.ndjson`         | Available for tooling proof only; not used as live checkpoint evidence |

The helper command remains the correct packet-generation path once complete exports are available:

```bash
node scripts/auth-alias-telemetry-review.mjs --input tmp/auth-alias-june17-alias-events.ndjson --input tmp/auth-alias-june17-response-logs.ndjson --start 2026-06-01 --end 2026-06-16 --checkpoint-date 2026-06-17 --output tmp/P5-T75_AUTH_ALIAS_CHECKPOINT_2026-06-17.md
```

## Route Review Table

| Route                        | Complete-day window reviewed | `auth.alias_input_used` count | Total completed requests | Ratio | Clean, inconclusive, or blocked      |
| ---------------------------- | ---------------------------- | ----------------------------: | -----------------------: | ----: | ------------------------------------ |
| `POST /api/v2/auth/register` | June 1-16, 2026              |                  Not reviewed |             Not reviewed |   N/A | blocked: required export unavailable |
| `POST /api/v2/auth/setup`    | June 1-16, 2026              |                  Not reviewed |             Not reviewed |   N/A | blocked: required export unavailable |
| `PUT /api/v2/auth/password`  | June 1-16, 2026              |                  Not reviewed |             Not reviewed |   N/A | blocked: required export unavailable |

## Alias Event Rollup

No live alias-event rollup is recorded in this checkpoint because the required June 1-16 alias-event export was unavailable. Do not infer zero alias usage from this note.

## Inconclusive Route Days

All tracked routes are inconclusive for the June 1-16 checkpoint until complete denominator exports are available. Zero-denominator days cannot be evaluated from the current workspace evidence.

## Manual Exception Review

The helper emits the exception-check rows, but the source checks remain manual operator work. Repo-local search does not replace access to API-owner notes, support systems, release/deployment records, or customer/integrator trackers.

| Check source                 | Result                         | Required note                                                                         |
| ---------------------------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| API owners                   | external-confirmation-required | No repo-local source proves the API-owner exception state for June 1-16.              |
| Support notes                | external-confirmation-required | No repo-local source proves the support-note exception state for June 1-16.           |
| Release notes                | external-confirmation-required | No repo-local source proves the release-note exception state for June 1-16.           |
| Deployment notes             | external-confirmation-required | No repo-local source proves the deployment-note exception state for June 1-16.        |
| Customer/integrator trackers | external-confirmation-required | No repo-local source proves the customer or integrator exception state for June 1-16. |

## Outcome

`P5-T75` remains blocked. July 1, 2026 is not available for enforcement from this evidence state because the complete telemetry window was unavailable and the exception review still requires external confirmation. Continue accepting legacy auth aliases until the 30-day zero-usage telemetry gate is satisfied and enforcement is explicitly approved in a later signed-out row.

## Validation

- Pending: rerun the helper against complete June 1-16 alias-event and denominator exports once they exist under ignored local `tmp/` inputs.
- Pending: complete the manual exception review with the relevant external source owners.
- Passed on 2026-06-13: `node --test scripts/tests/auth-alias-telemetry-review.test.mjs`
  - Result: 8 focused helper tests passed.
- Passed on 2026-06-13: `./scripts/select-checks.sh --files "docs/phases/planning-and-progress.md docs/security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md docs/validation/P5-T75_AUTH_ALIAS_CHECKPOINT_2026-06-17.md docs/validation/P5-T75_AUTH_ALIAS_GATE_HANDOFF_2026-05-05.md docs/validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md docs/validation/README.md scripts/README.md scripts/auth-alias-telemetry-review.mjs scripts/tests/auth-alias-telemetry-review.test.mjs" --mode fast`
  - Result: selected `make check-links`, `make test-tooling`, and `make test-e2e-docker-smoke`.
- Passed on 2026-06-13: `make check-links`
  - Result: checked 271 files and 1559 local links; no broken active-doc links found.
- Passed on 2026-06-13: `make test-tooling`
  - Result: 79 Node tooling tests passed, including the auth-alias telemetry review helper tests.
- Passed on 2026-06-13: `make test-e2e-docker-smoke`
  - Result: isolated Docker smoke stack came up on `18004`/`18005`/`18006`; 5 Chromium smoke/public-site tests passed.
- Passed on 2026-06-13: `npm exec -- prettier --check docs/phases/planning-and-progress.md docs/security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md docs/validation/P5-T75_AUTH_ALIAS_CHECKPOINT_2026-06-17.md docs/validation/P5-T75_AUTH_ALIAS_GATE_HANDOFF_2026-05-05.md docs/validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md docs/validation/README.md scripts/README.md scripts/auth-alias-telemetry-review.mjs scripts/tests/auth-alias-telemetry-review.test.mjs`
  - Result: all matched files use Prettier code style.
- Passed on 2026-06-13: `git diff --check`
