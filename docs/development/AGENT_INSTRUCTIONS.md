# Agent Instructions For Nonprofit Manager

**Last Updated:** 2026-04-19

Use this file for repo-specific coding-agent guardrails. It is not the setup guide or the full docs catalog.

## Read In This Order

1. [../../CONTRIBUTING.md](../../CONTRIBUTING.md) for contributor workflow, validation defaults, and handoff expectations
2. [GETTING_STARTED.md](GETTING_STARTED.md) for runtime choice, ports, and setup
3. [CONVENTIONS.md](CONVENTIONS.md) for active implementation conventions
4. [../testing/TESTING.md](../testing/TESTING.md) for the validation command map
5. [../../README.md](../../README.md) for product context
6. [../README.md](../README.md) if you need the documentation catalog
7. [../phases/planning-and-progress.md](../phases/planning-and-progress.md) before tracked work

## Core Rules

1. Update [../phases/planning-and-progress.md](../phases/planning-and-progress.md) before starting tracked work.
2. Keep one active task per agent by default unless the workboard documents a coordinated exception.
3. Preserve unrelated user changes already present in the worktree.
4. Prefer repo-native validation commands and policies over ad hoc checks.
5. Update active docs when commands, ports, workflows, or contracts change.
6. Use [SUBAGENT_MODULARIZATION_GUIDE.md](SUBAGENT_MODULARIZATION_GUIDE.md) when tracked modularization work needs coordinated parallel lanes.

## Architecture Checkpoints

- Active application APIs live under `/api/v2/*`.
- Health aliases remain available at `/health`, `/api/health`, and `/api/v2/health`.
- Active backend code belongs under `backend/src/modules/<domain>/`.
- `backend/src/routes/v2/index.ts` should import from `@modules/*` only.
- Active frontend code belongs under `frontend/src/features/<domain>/`.
- `frontend/src/pages/**` is a legacy compatibility path; new runtime pages belong in `frontend/src/features/**`.
- Preserve the route -> controller -> service or use case -> data access separation.

## Validation, Auth, Permissions, And Responses

- Validate inputs with Zod and the repo validation middleware.
- Treat `backend/src/services/authGuardService.ts` and `backend/src/utils/permissions.ts` as the implementation sources of truth for auth and permission behavior.
- Do not reintroduce legacy `require*OrError` helpers in new work.
- Preserve the canonical success and error response envelopes already used by the active API surface.

## Documentation Boundaries

- [../../CONTRIBUTING.md](../../CONTRIBUTING.md) owns contributor workflow and handoff.
- [GETTING_STARTED.md](GETTING_STARTED.md) owns runtime setup, ports, and local env guidance.
- [../../README.md](../../README.md) owns the product overview and contributor handoff.
- [../README.md](../README.md) is the documentation catalog.
- [../testing/TESTING.md](../testing/TESTING.md) is the validation command map.
- Repo-local contributor skills live under [../../.codex/skills/](../../.codex/skills/) and should stay aligned when contributor-workflow guidance changes.

## Docs Work

- Use relative links in repo docs.
- Verify commands, ports, and environment guidance from the repo before documenting them as fact.
- Update adjacent entry docs when contributor navigation changes.
- Run `make check-links` for docs changes and add `make lint-doc-api-versioning` when API wording or examples changed.

## Default Validation Commands

Prefer repo-root commands:

```bash
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
make test-tooling
./scripts/select-checks.sh --base HEAD~1 --mode fast
```

## Do Not Assume

- Do not assume Docker dev, direct runtime, and Playwright use the same ports or env settings.
- Do not assume a package-level `npm run typecheck` script exists; this repo uses `npm run type-check`.
- Do not assume GitHub Actions is the required default gate; local repo validation commands are the documented baseline.
