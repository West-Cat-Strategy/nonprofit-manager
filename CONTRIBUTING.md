# Contributing to Nonprofit Manager

**Last Updated:** 2026-04-16

Use this guide when you are contributing code, documentation, validation, or release support to Nonprofit Manager. Treat this file as the contributor entry point. The root [README.md](README.md) is the product overview and contributor handoff; this file is the contributor and developer workflow guide.

## Start Here

Read these in order before making changes:

1. [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md) for environment setup and runtime choice
2. [docs/development/CONVENTIONS.md](docs/development/CONVENTIONS.md) for code, docs, and workflow conventions
3. [docs/development/AGENT_INSTRUCTIONS.md](docs/development/AGENT_INSTRUCTIONS.md) for repo guardrails
4. [docs/testing/TESTING.md](docs/testing/TESTING.md) for the validation matrix and runtime-aware test guidance
5. [docs/INDEX.md](docs/INDEX.md) for the full documentation catalog

Use narrower guides only when your change needs them:

- [backend/README.md](backend/README.md) for backend module and API work
- [frontend/README.md](frontend/README.md) for frontend feature and route work
- [e2e/README.md](e2e/README.md) for Playwright and browser validation
- [scripts/README.md](scripts/README.md) for root helper scripts

## Tracked Work

If your task is tracked, update [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md) before you start editing. The workboard is the source of truth for ownership, status, blockers, and handoff state.

- Keep one active task per agent by default unless the workboard documents a coordinated exception.
- For tracked modularization work that needs parallel lanes, follow [docs/development/SUBAGENT_MODULARIZATION_GUIDE.md](docs/development/SUBAGENT_MODULARIZATION_GUIDE.md) and document the coordinated exception before code edits start.
- Use task IDs in commits and pull request titles when the work is tracked.
- Move work to `Blocked` or `Review` as soon as the status changes, with a short reason and next step.

## Setup And Runtime

Keep setup details in [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md) instead of duplicating them here.

- Choose a runtime before debugging and stay consistent while you work.
- Do not assume Docker dev, direct runtime, and Playwright use the same ports or env settings.
- Verify commands, ports, and environment guidance from the repo before documenting them as fact.

## Working Agreement

- Keep changes scoped to the task you picked up.
- Preserve unrelated user edits already present in the worktree.
- Prefer repo-root `make` targets over ad hoc command combinations.
- Keep docs synchronized when commands, ports, workflows, contracts, or navigation change.
- Use the current repo patterns instead of reintroducing retired ones.
- In coordinated modularization work, keep one lead owner for shared seams such as the workboard, backend v2 registrar, frontend route catalogs, and final integration validation.

For implementation-specific rules, defer to [docs/development/AGENT_INSTRUCTIONS.md](docs/development/AGENT_INSTRUCTIONS.md) and [docs/development/ARCHITECTURE.md](docs/development/ARCHITECTURE.md).

## Validation

Use the smallest validation set that still covers your change.

| Change Type | Recommended Commands |
|---|---|
| Docs-only | `make check-links` |
| Docs with API wording/examples | `make check-links` and `make lint-doc-api-versioning` |
| Smaller scoped code change | `./scripts/select-checks.sh --base HEAD~1 --mode fast` |
| Broader code change | `make lint`, `make typecheck`, and `make test` |
| Full confidence pass | `make ci`, `make ci-fast`, or `make ci-full` as appropriate |

Prefer root commands first. Use package-level scripts only when the change is narrow enough that a package-specific check is the clearest fit.

## Documentation Hygiene

- Keep Markdown links relative.
- Treat [docs/INDEX.md](docs/INDEX.md) as the documentation catalog.
- Treat [docs/README.md](docs/README.md) as the short docs landing page.
- Treat [scripts/README.md](scripts/README.md) as the helper-script index.
- Use `/api/v2/*` in active API docs unless you are documenting a health alias or another documented compatibility exception.
- Keep the root [README.md](README.md) user-facing; contributor onboarding belongs here and in `docs/development/*`.

## Before You Hand Off

- Update the workboard if the task is tracked.
- Run the relevant validation commands for the change you made.
- Call out remaining risk, follow-up work, or assumptions in your handoff.
- Mention the runtime you used if it affects ports, environment setup, or observed behavior.
