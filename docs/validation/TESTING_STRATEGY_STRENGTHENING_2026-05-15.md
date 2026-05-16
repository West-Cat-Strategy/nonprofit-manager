# Testing Strategy Strengthening - 2026-05-15

**Status:** Active review note

## Scope

This pass reviewed the current repo-local testing strategy and strengthened the executable routing around it. It did not change application runtime behavior, database schema, public API shape, Playwright specs, or package dependencies.

## Review Findings

- The active testing strategy is appropriately local-first: `docs/testing/TESTING.md`, the root `Makefile`, `scripts/ci.sh`, `scripts/select-checks.sh`, and `e2e/README.md` all route validation through local Make/script contracts instead of GitHub-hosted CI.
- The suite is already broad enough to need lane discipline: the current tracked test inventory includes 590 test/spec files across backend, frontend, and E2E surfaces.
- The command map has a useful ladder: narrow selector/package proof, repo behavior gate, coverage/full gate, and release/review follow-ons.
- The main gap was in strategy implementation, not prose. Runtime-facing docs in strict mode broadened straight from docs checks to the expensive coverage gate without first running the cheap `make test-tooling` suite that proves selector, Makefile, wrapper, and policy-script assumptions.

## Implementation

- Updated `scripts/select-checks.sh` so strict runtime-doc changes emit `make test-tooling` before `make test-coverage-full`.
- Updated `scripts/tests/tooling-contracts.test.cjs` to lock that selector behavior.
- Updated `docs/testing/TESTING.md` and `scripts/README.md` so the documented strategy matches the selector behavior.

## Validation

Passed:

- `make test-tooling` - passed, 51 tooling-contract tests.
- `./scripts/select-checks.sh --files "docs/testing/TESTING.md scripts/README.md" --mode strict` - passed; emitted `make check-links`, `make test-tooling`, and `make test-coverage-full`.
- `git diff --check` - passed.

Blocked:

- `make check-links` - blocked by the separate live workboard link `docs/phases/planning-and-progress.md -> ../validation/CODEBASE_REVIEW_CLEANUP_AUDIT_2026-05-16.md`, whose target file was not present during this pass. This is outside the testing-strategy files changed here.

## Not Run

- Full runtime gates such as `make test`, `make test-coverage-full`, and `make ci-full` were not run because this change only touched docs plus the selector/tooling contract. The selector now recommends the broader runtime lane when runtime-facing docs change command semantics.
