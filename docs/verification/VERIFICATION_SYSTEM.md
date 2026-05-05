# Historical Verification Helpers

This directory is retained for reproducing older verification notes. It is not
the active verification contract.

## Supported Verification Contract

Use the local Make and selector entry points for current work:

- `make test-tooling` for selector, OpenAPI, route-audit, helper-script, and wrapper contract changes.
- `./scripts/select-checks.sh --mode fast` for a scoped recommendation from the current changed-file set.
- `make ci-full` for the broad host/full local gate.

See [../testing/TESTING.md](../testing/TESTING.md) for the active test-command
map and [../../scripts/README.md](../../scripts/README.md) for the helper-script
index.

## Reproduction Helpers

- `../../scripts/verify.sh` is a historical reproduction helper for the former broad verifier. By default it prints the current supported contract; pass `--run-legacy` to replay the old sequence.
- `../../scripts/verify-pr.sh` is a historical reproduction helper for the former PR-number verifier. By default it prints the current supported contract; pass `--run-legacy` to replay the old GitHub CLI metadata and file-presence checks.

Do not use these scripts as signoff gates for new work. Record new validation
proof against the Make and selector commands above.
