# Contributing to Nonprofit Manager

**Last Updated:** 2026-04-19

Use this guide when you are contributing code, documentation, validation, or release support to Nonprofit Manager. Treat it as the contributor workflow, validation, and handoff entry point. The root [README.md](README.md) stays product-facing; setup and runtime details stay in [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md).

## Start Here

Read these core guides in order when you are orienting to a new task:

1. [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md) for environment setup and runtime choice when your task needs local setup
2. [docs/development/CONVENTIONS.md](docs/development/CONVENTIONS.md) for code, docs, and workflow conventions
3. [docs/development/AGENT_INSTRUCTIONS.md](docs/development/AGENT_INSTRUCTIONS.md) for repo guardrails and active architecture boundaries
4. [docs/testing/TESTING.md](docs/testing/TESTING.md) for the validation matrix and runtime-aware test guidance
5. [docs/README.md](docs/README.md) for the documentation catalog

Use the narrower guides only when your change needs them:

| Need | Guide |
|---|---|
| Product context and contributor handoff | [README.md](README.md) |
| Agent terminology and coordination overview | [agents.md](agents.md) |
| Backend module work | [backend/README.md](backend/README.md) |
| API reference and route summaries | [docs/api/README.md](docs/api/README.md) |
| Frontend feature and route work | [frontend/README.md](frontend/README.md) |
| Playwright and browser validation | [e2e/README.md](e2e/README.md) |
| Helper scripts | [scripts/README.md](scripts/README.md) |
| Documentation catalog | [docs/README.md](docs/README.md) |

## Contribution Flow

1. Confirm the task scope and whether tracked-work updates are required.
2. Choose a runtime only if the task needs one, and use [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md) instead of restating setup details here.
3. Make the smallest scoped change that solves the task while preserving unrelated work already in the tree.
4. Run the smallest validation set that still covers the change.
5. Update tracked status, risks, and next steps before handing work off.

## Tracked Work

If your task is tracked, update [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md) before you start editing. The workboard is the source of truth for ownership, status, blockers, and handoff state.

- Keep one active task per agent by default unless the workboard documents a coordinated exception.
- For tracked modularization work that needs parallel lanes, follow [docs/development/SUBAGENT_MODULARIZATION_GUIDE.md](docs/development/SUBAGENT_MODULARIZATION_GUIDE.md) and document the coordinated exception before code edits start.
- Use task IDs in commits and pull request titles when the work is tracked.
- Move work to `Blocked` or `Review` as soon as the status changes, with a short reason and next step.

## While You Work

- Keep changes scoped to the task you picked up.
- Preserve unrelated user edits already present in the worktree.
- Prefer repo-root `make` targets over ad hoc command combinations.
- Use [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md) for setup, ports, and runtime expectations instead of duplicating them here.
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
| Smaller scoped code change | `./scripts/select-checks.sh --base HEAD~1 --mode fast` (use `--mode strict` for shared runtime, hook, Docker, or runtime-doc changes) |
| Broader code change | `make lint`, `make typecheck`, and `make test` |
| Full confidence pass | `make ci`, `make ci-fast`, or `make ci-full` as appropriate |

Prefer root commands first. Use package-level scripts only when the change is narrow enough that a package-specific check is the clearest fit.

## Documentation Hygiene

- Keep Markdown links relative.
- Keep the docs entry flow aligned: [README.md](README.md), this file, [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md), [docs/development/CONVENTIONS.md](docs/development/CONVENTIONS.md), [docs/development/AGENT_INSTRUCTIONS.md](docs/development/AGENT_INSTRUCTIONS.md), [docs/testing/TESTING.md](docs/testing/TESTING.md), then [docs/README.md](docs/README.md).
- Treat [docs/README.md](docs/README.md) as the primary documentation entry point.
- Treat [scripts/README.md](scripts/README.md) as the helper-script index.
- Use `/api/v2/*` in active API docs unless you are documenting a health alias or another documented compatibility exception.
- Keep the root [README.md](README.md) user-facing; contributor onboarding belongs here and in `docs/development/*`.

## Before You Hand Off

- Update the workboard if the task is tracked.
- Run the relevant validation commands for the change you made.
- Call out remaining risk, follow-up work, or assumptions in your handoff.
- Mention the runtime you used if it affects ports, environment setup, or observed behavior.
