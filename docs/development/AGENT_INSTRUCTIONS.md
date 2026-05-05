# Agent Instructions For Nonprofit Manager

**Last Updated:** 2026-04-30

Use this file for repo-specific coding-agent guardrails. It is not the setup guide or the full docs catalog.

## Read In This Order

1. [../../CONTRIBUTING.md](../../CONTRIBUTING.md) for contributor workflow, validation defaults, and handoff expectations
2. [GETTING_STARTED.md](GETTING_STARTED.md) for runtime choice, ports, and setup
3. [CONVENTIONS.md](CONVENTIONS.md) for active implementation conventions
4. [../testing/TESTING.md](../testing/TESTING.md) for the validation command map
5. [../../README.md](../../README.md) for product context
6. [../README.md](../README.md) if you need the documentation catalog
7. [../phases/planning-and-progress.md](../phases/planning-and-progress.md) before tracked or resumed work
8. [../validation/README.md](../validation/README.md) when you are following up on audit or validation artifacts

## Core Rules

1. Update [../phases/planning-and-progress.md](../phases/planning-and-progress.md) before starting tracked work.
2. Review `Recent Thread Follow-through` before resuming tracked work or following up on a recent disposed thread.
3. Keep one active task per agent by default unless the workboard documents a coordinated exception.
4. Preserve unrelated user changes already present in the worktree.
5. Prefer repo-native validation commands and policies over ad hoc checks.
6. Update active docs when commands, ports, workflows, or contracts change.
7. Use [SUBAGENT_MODULARIZATION_GUIDE.md](SUBAGENT_MODULARIZATION_GUIDE.md) when tracked modularization work needs coordinated parallel lanes.

## Architecture Checkpoints

- Active application APIs live under `/api/v2/*`.
- Health aliases remain available at `/health`, `/api/health`, and `/api/v2/health`.
- Active backend code belongs under `backend/src/modules/<domain>/`.
- `backend/src/routes/v2/index.ts` should import from `@modules/*` only.
- Active frontend code belongs under `frontend/src/features/<domain>/`.
- `frontend/src/pages/**` is a retired deleted-path-guard surface; do not recreate it, and keep runtime pages in `frontend/src/features/**`.
- Preserve the route -> controller -> service or use case -> data access separation.

## Validation, Auth, Permissions, And Responses

- Validate inputs with Zod and the repo validation middleware.
- Treat `backend/src/services/authGuardService.ts` and `backend/src/utils/permissions.ts` as the implementation sources of truth for auth and permission behavior.
- Do not reintroduce legacy `require*OrError` helpers in new work.
- Preserve the canonical success and error response envelopes already used by the active API surface.

## Documentation Boundaries

- [../../CONTRIBUTING.md](../../CONTRIBUTING.md) owns contributor workflow and handoff.
- [GETTING_STARTED.md](GETTING_STARTED.md) owns runtime setup, ports, and local env guidance.
- [../../README.md](../../README.md) owns the organization-facing adoption overview and product entry point.
- [../README.md](../README.md) is the documentation catalog.
- [../testing/TESTING.md](../testing/TESTING.md) is the validation command map.
- [../validation/README.md](../validation/README.md) owns navigation for validation references, audit snapshots, and remediation trackers.
- Tracked references under [../../.codex/skills/nonprofit-manager-persona-analysis/references/](../../.codex/skills/nonprofit-manager-persona-analysis/references/source-map.md), [../../.codex/skills/nonprofit-manager-persona-validation/references/](../../.codex/skills/nonprofit-manager-persona-validation/references/validation-rubric.md), and [../../.codex/skills/nonprofit-manager-benchmark-analysis/references/](../../.codex/skills/nonprofit-manager-benchmark-analysis/references/cohort-and-sources.md) are the canonical detailed layer for persona analysis, persona validation, and benchmark synthesis. Only those three `references/**` trees are intentionally versioned inside `.codex`; `docs/product/*.md` remains the summary and navigation surface.
- Keep durable contributor-workflow guidance in tracked repo docs; copied live env files, deploy overrides, and local AI or editor workspace directories stay local-only and ignored unless a tracked doc explicitly says otherwise.

## Docs Work

- Use relative links in repo docs.
- Verify commands, ports, and environment guidance from the repo before documenting them as fact.
- Update adjacent entry docs when contributor navigation changes.
- Re-open [../phases/planning-and-progress.md](../phases/planning-and-progress.md) and [../validation/README.md](../validation/README.md) when a resumed task depends on recent audit or remediation context.
- When persona or benchmark details change, update the tracked persona-suite references first and keep `docs/product/*.md` concise.
- Run `make check-links` for docs changes and add `make lint-doc-api-versioning` when API wording or examples changed.
- Run `make lint-openapi` when `docs/api/openapi.yaml` changes.

## Default Validation Commands

Prefer repo-root commands:

```bash
make db-verify
make lint
make typecheck
make test
```

Useful narrower commands:

```bash
cd backend && npm run type-check
cd frontend && npm run type-check
make check-links
make lint-doc-api-versioning
make lint-openapi
make test-tooling
./scripts/select-checks.sh --base HEAD~1 --mode fast
```

`make ci-fast` is a static lint + typecheck pass only. Use [../testing/TESTING.md](../testing/TESTING.md) for the current meaning of `make ci*`, `make test-coverage*`, and the broader review-lane commands.

## Do Not Assume

- Do not assume Docker dev, direct runtime, and Playwright use the same ports or env settings.
- Do not assume a package-level `npm run typecheck` script exists; this repo uses `npm run type-check`.
- Do not assume GitHub Actions is the required default gate; local repo validation commands are the documented baseline.
- Do not assume the host coverage/review lanes are Docker-free; the current `make test-coverage*` and `make ci-full` flows still need Docker for Redis and isolated test DB bootstrap.
- Do not export the full development env into CI-style coverage lanes; use the documented commands as-is so the isolated test DB contract stays pinned to `127.0.0.1:8012`.
