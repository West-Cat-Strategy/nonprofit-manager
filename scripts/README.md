# Script Index

**Last Updated:** 2026-04-13

This directory contains the repo-local helpers used by the Makefile, deployment scripts, and docs workflow.
Prefer the `make` targets when they exist. Call the scripts directly when you need the narrower entrypoint.

## Core Entry Points

| Script | Purpose | Preferred Entry Point |
|---|---|---|
| [check-links.sh](check-links.sh) | Validate repo Markdown and HTML links used by the active docs. | `make check-links` |
| [check-doc-api-versioning.ts](check-doc-api-versioning.ts) | Enforce active-doc `/api/v2` wording and catch stale API-version references. | `make lint-doc-api-versioning` |
| [ci.sh](ci.sh) | Root CI wrapper that backs the `make ci*` targets and coverage flows. | `make ci` / `make ci-fast` / `make ci-full` / `make ci-unit` / `make test-coverage` |
| [local-ci.sh](local-ci.sh) | Orchestrate lint, type-check, tests, coverage, and build checks. | `make ci` / `make ci-fast` / `make ci-full` / `make ci-unit` / `make test-coverage` |
| [quality-baseline.sh](quality-baseline.sh) | Run the static quality baseline checks used by the repo's policy gates. | `make quality-baseline` |
| [security-scan.sh](security-scan.sh) | Run dependency and secret scanning. | `make security-scan` |
| [db-migrate.sh](db-migrate.sh) | Bootstrap or start the local database contract and isolated test database. | `make db-migrate` |
| [db-backup.sh](db-backup.sh) | Back up the Postgres data volume through the compose contract. | Manual ops / scheduled backups |
| [db-restore.sh](db-restore.sh) | Restore a database backup through the compose contract. | Manual ops / recovery |
| [verify-migrations.sh](verify-migrations.sh) | Verify the isolated `_test` database contract and manifest parity. | `make db-verify` |
| [deploy.sh](deploy.sh) | Run the local, staging, or production deployment wrapper. | `make deploy-local` / `make deploy-staging` / `make deploy` |
| [install-git-hooks.sh](install-git-hooks.sh) | Install the repo-local git hooks. | `make hooks` |
| [select-checks.sh](select-checks.sh) | Suggest a smaller validation set based on changed files. | `./scripts/select-checks.sh` |
| [test-auth-flow.sh](test-auth-flow.sh) | Thin shell wrapper around the auth flow smoke checker. | `./scripts/test-auth-flow.sh` |
| [test-auth.js](test-auth.js) | Probe public login/setup pages and the auth API. | `./scripts/test-auth-flow.sh` |
| [daily-security-report.py](daily-security-report.py) | Generate a lightweight security-status report from repo checks. | `python3 scripts/daily-security-report.py` |
| [e2e-port-preflight.sh](e2e-port-preflight.sh) | Reserve or clean up the ports used by the Playwright harness. | `e2e` package scripts |
| [e2e-run-with-lock.sh](e2e-run-with-lock.sh) | Run Playwright with the shared lock and port safeguards. | `e2e` package scripts |

## Policy Checks

The `check-*.ts` scripts are the repo policy gates that back `make lint`, `make quality-baseline`, and the static UI/security reports:

- Backend policy gates: `check-rate-limit-key-policy.ts`, `check-success-envelope-policy.ts`, `check-route-validation-policy.ts`, `check-query-contract-policy.ts`, `check-express-validator-policy.ts`, `check-controller-sql-policy.ts`, `check-auth-guard-policy.ts`, `check-migration-manifest-policy.ts`, `check-duplicate-test-tree.ts`, `check-v2-module-ownership-policy.ts`, `check-module-boundary-policy.ts`, `check-module-route-proxy-policy.ts`, `check-canonical-module-import-policy.ts`, `check-implementation-size-policy.ts`, and `check-backend-legacy-controller-wrapper-policy.ts`.
- Frontend policy gates: `check-frontend-feature-boundary-policy.ts`, `check-frontend-legacy-slice-import-policy.ts`, and `check-frontend-legacy-page-path-policy.ts`.
- Route and UI policy gates: `check-route-integrity.ts`, `check-route-catalog-drift.ts`, and `ui-audit.ts`.
- Implementation-size ratchet data lives in `baselines/implementation-size.json`.

## Support Helpers

- [lib/common.sh](lib/common.sh) contains shell helpers shared by the root scripts.
- [lib/config.sh](lib/config.sh) and [lib/import-audit.ts](lib/import-audit.ts) provide shared config/audit helpers for the policy checks.
- `backend/scripts/run-integration-tests.sh` is backend-owned and is invoked from the backend test workflow.
- `reference/sync-reference-repos.sh` and `reference/verify-reference-repos.sh` keep the mirrored reference repositories in sync.
- `perf/p4-t9h-capture.sh` and `perf/p4-t9h-seed.sql` support the documented performance artifact workflow.

## Common Validation Flow

If you just need a quick repo check, start with:

```bash
make lint
make typecheck
make test
make test-coverage
```

`make test-coverage` is the coverage-focused companion to `make test`: it runs backend and frontend coverage plus Playwright smoke tests. The full Playwright CI matrix stays gated to the default browser projects; `Mobile Safari` and `Tablet` remain manual/ad hoc projects that you can run explicitly when needed.

If your change is docs-only, use:

```bash
make check-links
make lint-doc-api-versioning
```

If you need a narrower sequence, ask the selector helper for a recommendation:

```bash
./scripts/select-checks.sh --base HEAD~1 --mode fast
```
