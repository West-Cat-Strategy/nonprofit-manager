# P5-T140 Tooling Fixture Isolation Proof - 2026-06-10

**Workboard Row:** `P5-T140`
**Status:** Review
**Branch:** `chore/p5-t140-tooling-fixtures`

## Scope

This row isolates the remaining tooling-contract tests that wrote selector fixture files into the repository root.

In scope:

- Selector default-selection tests for untracked OpenAPI-like files.
- Selector default-selection tests for dirty tracked `knip.json` changes.
- Test-only temp fixtures or helper seams.

Out of scope:

- Selector output changes.
- Make target or package script changes.
- Runtime behavior, route, API, OpenAPI contract, or application code changes.
- Unrelated dirty docs/proof reconciliation already present in the main checkout.

## Implementation Notes

- Added a test-only `runInCwd` helper so individual tooling-contract tests can execute scripts from a fixture repository instead of the repository root.
- Added a temp selector fixture repository helper that copies `scripts/select-checks.sh`, `scripts/lib/common.sh`, and `scripts/lib/config.sh`, initializes Git, and commits a baseline.
- Updated the untracked OpenAPI selector probe to create `openapi.selector-fixture` only inside the temp fixture repository.
- Updated the dirty tracked Knip selector probe to commit and mutate only a temp fixture `knip.json`.
- Left fixture-rooted OpenAPI analyzer tests unchanged; they already call `analyzeOpenApiContract(fixtureRoot)`.

## Validation Log

| Command | Result |
|---|---|
| `make test-tooling` | Passed: 65 tooling/selector/policy tests. |
| `make check-links` | Passed: checked 267 files and 1518 local links. |
| `git diff --check` | Passed. |
