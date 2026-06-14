# P5-T75 Auth Alias Checkpoint Deferral

**Checkpoint Date:** 2026-06-17
**Recorded:** 2026-06-13
**Status:** Blocked - required production-like exports unavailable

## Summary

The June 17 auth-alias checkpoint could not produce a telemetry packet because the required June 1-16, 2026 production-like exports were not available in ignored local storage.

This artifact is a deferral record, not alias-usage evidence. It does not claim a zero-usage streak, does not clear the exception gate, and does not authorize July 1 enforcement.

No auth schemas, route behavior, public API contracts, CI policy guards, release cutoff notices, or runtime behavior changed for this checkpoint.

## Input Preflight

The checkpoint lane ran in the isolated worktree:

- Worktree: `/Users/bryan/projects/nonprofit-manager-p5-t75-checkpoint`
- Branch: `codex/p5-t75-auth-alias-checkpoint-2026-06-13`
- Preflight status: `git status --short --branch` reported a clean worktree before the deferral docs were written.

The expected ignored input paths were absent:

| Expected input                               | Result  |
| -------------------------------------------- | ------- |
| `tmp/auth-alias-june17-alias-events.ndjson`  | Missing |
| `tmp/auth-alias-june17-response-logs.ndjson` | Missing |

Additional local search result:

- `find tmp -maxdepth 3 -type f` returned no files in the checkpoint worktree.
- Searches for matching auth-alias, denominator, and June 17 export filenames under `/Users/bryan/Desktop`, `/Users/bryan/Downloads`, `/Users/bryan/Documents`, and `/Users/bryan/projects` found no production-like June 1-16 auth-alias exports.
- Searches for `auth.alias_input_used`, `Outgoing response`, and the three tracked auth routes under the same likely local locations found no usable exported log files.

## Route Review

Because the required exports were unavailable, the route review was not run against production-like evidence.

| Route                        | Complete-day window reviewed | `auth.alias_input_used` count | Total completed requests | Ratio | Clean, inconclusive, or blocked |
| ---------------------------- | ---------------------------- | ----------------------------: | -----------------------: | ----: | ------------------------------- |
| `POST /api/v2/auth/register` | June 1-16, 2026              |                           N/A |                      N/A |   N/A | blocked - exports unavailable   |
| `POST /api/v2/auth/setup`    | June 1-16, 2026              |                           N/A |                      N/A |   N/A | blocked - exports unavailable   |
| `PUT /api/v2/auth/password`  | June 1-16, 2026              |                           N/A |                      N/A |   N/A | blocked - exports unavailable   |

No `auth.alias_input_used` event rollup is recorded from this checkpoint because no production-like alias-event export was available. The checked-in mixed June fixture remains deterministic tooling proof only and was not used as checkpoint evidence.

## Exception Check

The exception gate is not cleared.

Repo-local documentation and source searches found policy references to the auth-alias gate, the deterministic fixture, and the existing validation/test coverage, but no repo-local record of an approved active external client exception.

External evidence sources were not available for this checkpoint:

| Check source                 | Result      | Required note                                                                                   |
| ---------------------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| API owners                   | Not cleared | External owner evidence unavailable; do not record no active exception                          |
| Support notes                | Not cleared | External support evidence unavailable; do not record no active exception                        |
| Release notes                | Not cleared | External release evidence unavailable; do not record no active exception                        |
| Deployment notes             | Not cleared | External deployment evidence unavailable; do not record no active exception                     |
| Customer/integrator trackers | Not cleared | External customer or integrator tracker evidence unavailable; do not record no active exception |

## Outcome

`P5-T75` remains blocked.

The July 1, 2026 enforcement path is unavailable from this checkpoint because:

- no production-like June 1-16 telemetry export was reviewed;
- no 30-day zero-usage streak is claimed;
- the external exception check is not cleared.

The next checkpoint must use real production-like alias-event and denominator exports from ignored local storage, plus complete external exception evidence, before any retirement path can be reconsidered.

## Validation

- Passed on 2026-06-13: `node --test scripts/tests/auth-alias-telemetry-review.test.mjs`
  - Result: 6 focused helper tests passed against generated records and the checked-in mixed June fixture.
- Passed on 2026-06-13: `./scripts/select-checks.sh --files "docs/phases/planning-and-progress.md docs/validation/P5-T75_AUTH_ALIAS_GATE_HANDOFF_2026-05-05.md docs/validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md docs/validation/README.md docs/validation/P5-T75_AUTH_ALIAS_CHECKPOINT_2026-06-17.md" --mode fast`
  - Result: selected `make check-links`.
- Passed on 2026-06-13: `make check-links`
  - Result: checked 270 files and 1545 local links; no broken active-doc links found.
- Passed on 2026-06-13: `npm exec -- prettier --check docs/phases/planning-and-progress.md docs/validation/P5-T75_AUTH_ALIAS_GATE_HANDOFF_2026-05-05.md docs/validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md docs/validation/README.md docs/validation/P5-T75_AUTH_ALIAS_CHECKPOINT_2026-06-17.md`
  - Result: all matched files use Prettier code style.
- Passed on 2026-06-13: `git diff --check`
