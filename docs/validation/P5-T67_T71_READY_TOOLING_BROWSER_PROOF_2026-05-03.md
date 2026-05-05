# P5-T67 / P5-T71 Ready Tooling And Public Browser Proof - 2026-05-03

## Scope

`P5-T67` re-homes the legacy verification entrypoints as supported
compatibility wrappers around the current `make` and `scripts/select-checks.sh`
contracts.

`P5-T71` adds focused public browser proof coverage for the P5-T42 follow-on:
managed website forms, public event registration, donation checkout, and public
action blocks for petition signatures, donation pledges, and support-letter
requests.

No runtime app behavior changed in this lane.

## Implementation Notes

- `scripts/verify.sh` now delegates to `scripts/select-checks.sh`, supports
  `--mode`, `--base`, `--files`, and `--print-only`, and runs the emitted
  commands in order when not in print-only mode.
- `scripts/verify-pr.sh` now requires an explicit PR number, reads the changed
  file list with `gh pr diff`, delegates to `scripts/select-checks.sh`, and
  supports `--mode` and `--print-only`.
- Verification docs now mark older bespoke verifier references as historical and
  route current work through Makefile targets or selector-backed wrappers.
- `e2e/fixtures/publicBrowserProof.fixture.ts` creates a temporary public site,
  template pages, public event, public actions, payment-provider settings, and
  cleanup hooks for the focused browser proof.
- `e2e/tests/public-browser-proof.spec.ts` submits the public forms from browser
  pages and asserts successful managed-form, event-registration, donation, and
  public-action responses.

## Validation

| Command | Result |
|---|---|
| `npm ci` | Pass; installed this worktree's missing workspace dependencies before validation |
| `make test-tooling` | Fail, `25` passed / `1` failed; selector/wrapper tests passed, blocked by pre-existing `e2e-host-ci-report.sh --dry-run` slice-path contract outside this lane |
| `node --test --test-name-pattern "verify compatibility\|PR verification" scripts/tests/tooling-contracts.test.cjs` | Pass, `2` wrapper compatibility tests |
| `./scripts/select-checks.sh --mode fast` | Pass; emitted docs, tooling, backend, frontend, E2E smoke, Docker smoke, and DB verification recommendations for the current mixed diff |
| `cd e2e && npm run test -- --project=chromium tests/public-browser-proof.spec.ts` | Pass, `1` focused Chromium public browser proof |
| `make check-links` | Pass; checked `172` files and `1446` local links |

## Blockers

- `make test-tooling` still fails on the existing
  `e2e host ci report wrapper resolves default archived report paths in dry-run
  mode` assertion because the dry-run output does not include
  `SLICE_DESKTOP_HTML` under this shell. Worker D did not change
  `scripts/e2e-host-ci-report.sh`; the new selector/wrapper tests pass.
