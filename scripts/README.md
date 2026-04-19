# Script Index

**Last Updated:** 2026-04-19

This directory contains the repo-local helpers used by the Makefile, deployment scripts, and docs workflow.
Prefer the `make` targets when they exist. Call the scripts directly when you need the narrower entrypoint.

## Core Entry Points

| Script | Purpose | Preferred Entry Point |
|---|---|---|
| [check-links.sh](check-links.sh) | Validate repo Markdown and HTML links used by the active docs. | `make check-links` |
| [check-doc-api-versioning.ts](check-doc-api-versioning.ts) | Enforce active-doc `/api/v2` wording and catch stale API-version references. | `make lint-doc-api-versioning` |
| [ci.sh](ci.sh) | Canonical root CI wrapper that backs the `make ci*` targets and coverage flows. | `make ci` / `make ci-fast` / `make ci-full` / `make ci-unit` / `make test-coverage` |
| [quality-baseline.sh](quality-baseline.sh) | Run the static quality baseline checks used by the repo's policy gates. | `make quality-baseline` |
| [security-scan.sh](security-scan.sh) | Run dependency and secret scanning. | `make security-scan` |
| [db-migrate.sh](db-migrate.sh) | Bootstrap or start the local database contract and isolated test database. | `make db-migrate` |
| [db-backup.sh](db-backup.sh) | Back up the Postgres data volume through the compose contract. | Manual ops / scheduled backups |
| [db-export-archive.sh](db-export-archive.sh) | Export a Postgres custom-format archive through the compose or direct DB contract. | Manual ops / migration prep |
| [db-restore-archive.sh](db-restore-archive.sh) | Restore a Postgres custom-format archive with `pg_restore --create`. | Manual ops / disaster recovery |
| [docker-build-images.sh](docker-build-images.sh) | Centralize the direct Docker build, rebuild, and validation flow, including the shared workspace dependency stages used by clean image rebuilds. | `make docker-build` / `make docker-rebuild` / `make docker-validate` |
| [verify-migrations.sh](verify-migrations.sh) | Verify the isolated `_test` database contract and manifest parity. | `make db-verify` |
| [deploy.sh](deploy.sh) | Run the local, staging, or production deployment wrapper. | `make deploy-local` / `make deploy-staging` / `make deploy` |
| [install-git-hooks.sh](install-git-hooks.sh) | Install the repo-managed hooks into Git's resolved hooks path and preserve differing existing hooks unless you pass `--force`. | `make hooks` / `./scripts/install-git-hooks.sh --dry-run` |
| [select-checks.sh](select-checks.sh) | Suggest a smaller validation set based on changed files, with distinct `fast` and `strict` modes. | `./scripts/select-checks.sh --mode fast` |
| [e2e-playwright.sh](e2e-playwright.sh) | Apply the repo's standard host or Docker Playwright defaults before delegating to the shared runner, while still honoring explicit runtime overrides such as `BASE_URL`, `API_URL`, and `E2E_*_PORT`. | `e2e` package scripts |
| [e2e-run-with-lock.sh](e2e-run-with-lock.sh) | Run Playwright with the shared lock plus built-in port safeguards and externally managed HTTP-readiness preflight/retry checks. | `e2e` package scripts |
| [wait-for-http-ready.sh](wait-for-http-ready.sh) | Poll one or more local HTTP endpoints until they answer successfully. | `make docker-up-dev` / `make test-e2e-docker-smoke` |

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
- `perf/p4-t9h-capture.sh` and `perf/p4-t9h-seed.sql` support the documented performance artifact workflow.
- [support/cbis-case-visibility-repair.sql](support/cbis-case-visibility-repair.sql) is the scoped manual-support SQL helper for auditing and repairing the user-reported CBIS hidden-case records after the case visibility hotfix.

## Backup And Restore Helpers

- `db-backup.sh` remains the recurring SQL and gzip backup path for the documented local-Postgres production modes.
- Use the deployment guide's documented `gunzip -c ... | psql ...` flow for SQL-and-gzip restore drills.
- `db-export-archive.sh` and `db-restore-archive.sh` are the one-off migration and disaster-recovery path when you need `pg_dump -Fc -C --no-owner --no-acl` and `pg_restore --clean --if-exists --create`.
- The archive restore helper requires `DB_RESTORE_CONFIRM=1` and defaults `DB_RESTORE_TARGET_DB=postgres` so the archive can recreate `nonprofit_manager`.
- Compose-backed helpers reuse the existing `DB_COMPOSE_PROJECT`, `DB_COMPOSE_FILE`, and `DB_SERVICE` contract, and also accept `DB_COMPOSE_FILES="..."` when the target stack needs multiple compose manifests plus `DB_COMPOSE_ENV_FILE=.env.production` when the stack depends on a non-default env file.

## Common Validation Flow

If you just need a quick repo check, start with:

```bash
make lint
make typecheck
make test
```

`make test` runs backend/frontend tests, the host Playwright CI matrix, and the isolated Docker-backed smoke gate.
`make test-coverage` is the coverage-focused companion to `make test`: it runs backend and frontend coverage, host Playwright smoke, and the same isolated Docker-backed smoke gate.
`make test-coverage-full` is the higher-confidence coverage lane: it runs backend and frontend coverage, the host Playwright CI matrix, and the isolated Docker-backed smoke gate.
`make test-tooling` runs the targeted tooling-contract regression suite for selector, route-audit, helper-script, and wrapper changes.
The full Playwright CI matrix stays gated to the default browser projects; `Mobile Safari` and `Tablet` remain manual/ad hoc projects that you can run explicitly when needed.

If your change is docs-only, use:

```bash
make check-links
make lint-doc-api-versioning
```

If you need a narrower sequence, ask the selector helper for a recommendation:

```bash
./scripts/select-checks.sh --base HEAD~1 --mode fast
```

Use `--mode strict` when the change touches shared runtime orchestration, hooks, or runtime-facing docs and you want the selector to broaden into higher-confidence root checks.
Code and runtime changes should emit at least one behavior-test command. Docs-only changes stay on docs validation.
