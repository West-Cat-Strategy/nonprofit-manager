# P5-T60 Local Validation Tooling Proof - 2026-05-03

## Scope

`P5-T60` upgraded local validation routing without reintroducing hosted CI as a gate.

## Implementation

- Added `make lint-openapi` backed by `scripts/check-openapi-contract.ts`.
- Added OpenAPI contract linting to shared policy checks and tooling contract tests.
- Updated `scripts/select-checks.sh` so default selection includes committed, staged, dirty tracked, and untracked files.
- Routed package/lockfile changes to `npm run knip` and `make security-audit`, `knip.json` changes to `npm run knip`, and OpenAPI changes to `make lint-openapi`.
- Aligned local Node policy to `>=20.19.0` in root package metadata and `scripts/doctor.sh`.
- Added root `npm run audit` and `npm run audit:prod`.

## Validation

- `make lint-openapi` - passed.
- `make test-tooling` - passed, 30/30.
- `npm run knip` - passed with no findings.
- `make security-audit` - passed, 0 vulnerabilities.
- `npm run audit` - passed, 0 vulnerabilities.
- `git diff --check` - passed.
- `scripts/select-checks.sh --base HEAD --mode fast` for the touched tooling/API/package set emitted `make check-links`, `make lint-doc-api-versioning`, `make test-tooling`, `make lint-openapi`, `npm run knip`, `make security-audit`, and `make test-e2e-docker-smoke`.

## Notes

- Existing dirty review-lane edits in `Makefile`, `docs/testing/TESTING.md`, and `docs/development/GETTING_STARTED.md` were preserved.
