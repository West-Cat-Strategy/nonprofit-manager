# P5-T67 Legacy Verification Re-home Proof

Date: 2026-05-05

## Scope

Re-homed the legacy `scripts/verify.sh`, `scripts/verify-pr.sh`, and
`docs/verification/*` surfaces as historical reproduction helpers. The
supported verification contract remains:

- `make test-tooling`
- `./scripts/select-checks.sh --mode fast`
- `make ci-full`

No runtime application files were changed.

## Changes

- `scripts/verify.sh` now prints the current supported verification contract by default and only replays the old broad verifier with `--run-legacy` or `NONPROFIT_MANAGER_RUN_LEGACY_VERIFY=1`.
- `scripts/verify-pr.sh` now prints the current supported verification contract by default and only replays the old GitHub CLI metadata/file-presence checks with `--run-legacy` or `NONPROFIT_MANAGER_RUN_LEGACY_VERIFY=1`.
- `docs/verification/VERIFICATION_SYSTEM.md` and `docs/verification/PR-9-VERIFICATION.md` now describe these files as historical reproduction notes rather than active signoff gates.
- `scripts/README.md`, `docs/README.md`, and `docs/testing/TESTING.md` route current verification back to `make`, `make test-tooling`, `make ci-full`, and `scripts/select-checks.sh`.
- `scripts/tests/tooling-contracts.test.cjs` covers the default historical-helper notices so the scripts do not silently drift back into active gate behavior.

## Validation

| Command | Result |
|---|---|
| `bash -n scripts/verify.sh scripts/verify-pr.sh scripts/select-checks.sh` | Passed |
| `./scripts/verify.sh` | Exited `1` by design after printing the historical-helper notice and current supported contract; no legacy gate ran |
| `./scripts/verify-pr.sh 9` | Exited `1` by design after printing the historical-helper notice and current supported contract; no legacy GitHub CLI gate ran |
| `make test-tooling` | Passed; 32/32 tooling-contract tests |
| `./scripts/select-checks.sh --files "scripts/verify.sh scripts/verify-pr.sh docs/verification/VERIFICATION_SYSTEM.md docs/verification/PR-9-VERIFICATION.md scripts/README.md docs/README.md docs/phases/planning-and-progress.md scripts/tests/tooling-contracts.test.cjs docs/validation/P5-T67_LEGACY_VERIFICATION_REHOME_PROOF_2026-05-05.md" --mode fast` | Passed; emitted `make check-links`, `make test-tooling`, and `make test-e2e-docker-smoke` |
| `make check-links` | Passed; checked 198 files and 1518 local links after final proof/index reconciliation |
| `git diff --check` | Passed |

## Notes

The selector output is broad because the shared worktree has many unrelated
dirty and untracked files. P5-T67 changed only the legacy verification helper,
verification docs, script/docs indexes, tooling contract tests, and row-local
workboard/proof docs.
