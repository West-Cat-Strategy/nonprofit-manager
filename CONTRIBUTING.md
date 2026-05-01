# Contributing to Nonprofit Manager

**Last Updated:** 2026-04-30

Use this guide when you want to contribute code, documentation, validation, release support, or review help to Nonprofit Manager. The root [README.md](README.md) is the organization-facing project overview; this file is the contributor workflow and validation entry point. Runtime setup details live in [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md).

## Start Here

Read the contributor path in this order when you are taking on a task:

1. [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md) for local setup, runtime choices, ports, and environment notes when your task needs a running stack
2. [docs/development/CONVENTIONS.md](docs/development/CONVENTIONS.md) for code, docs, and workflow conventions
3. [docs/development/AGENT_INSTRUCTIONS.md](docs/development/AGENT_INSTRUCTIONS.md) for repo guardrails, active architecture boundaries, and handoff rules
4. [docs/testing/TESTING.md](docs/testing/TESTING.md) for the validation matrix and runtime-aware test guidance
5. [docs/README.md](docs/README.md) when you need the broader documentation catalog

Use the narrower guides only when your change needs them:

| Need | Guide |
|---|---|
| Product context | [README.md](README.md), [docs/product/README.md](docs/product/README.md), [docs/features/FEATURE_MATRIX.md](docs/features/FEATURE_MATRIX.md) |
| Agent terminology and root-level orientation | [agents.md](agents.md) |
| Live tracked work and current phase roadmap | [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md), [docs/phases/PHASE_5_DEVELOPMENT_PLAN.md](docs/phases/PHASE_5_DEVELOPMENT_PLAN.md) |
| Historical closeouts and archive notes | [docs/phases/archive/README.md](docs/phases/archive/README.md) |
| Validation and audit artifacts | [docs/validation/README.md](docs/validation/README.md) |
| Backend API, public-site, or worker runtime work | [backend/README.md](backend/README.md) |
| API reference and route summaries | [docs/api/README.md](docs/api/README.md) |
| Frontend feature and route work | [frontend/README.md](frontend/README.md) |
| Playwright and browser validation | [e2e/README.md](e2e/README.md) |
| Shared type contracts | [contracts/README.md](contracts/README.md) |
| Database contract and migration orientation | [database/README.md](database/README.md) |
| Helper scripts | [scripts/README.md](scripts/README.md) |

## What Contributions Can Include

Contributions may include:

- Product or implementation changes in the backend, frontend, database, contracts, scripts, or E2E surfaces.
- Documentation updates that keep product, setup, testing, security, deployment, and validation guidance current.
- Tests, validation evidence, audit artifacts, or release-support checks.
- Focused review work that identifies bugs, risks, stale docs, missing validation, or scope-control gaps.

Keep each contribution scoped to the task at hand. If you discover a larger opportunity, document it in the appropriate planning, validation, or handoff surface instead of quietly broadening the current change.

## Contribution Flow

1. Confirm the task scope and whether it is tracked work.
2. If the task is tracked, update [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md) before editing.
3. Choose a runtime only when the task needs one, using [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md) as the setup source of truth.
4. Make the smallest scoped change that solves the task while preserving unrelated work already in the tree.
5. Run the smallest validation set that still covers the change.
6. Update status, risks, validation results, and next steps before handing work off.

## Tracked Work

[docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md) is the source of truth for tracked ownership, status, blockers, and handoff state.

- Check `Recent Thread Follow-through` first when resuming recent interrupted or disposed work.
- Use [docs/phases/PHASE_5_DEVELOPMENT_PLAN.md](docs/phases/PHASE_5_DEVELOPMENT_PLAN.md) for current phase goals and sequencing, not the phase archive.
- Keep one active task per contributor by default unless the workboard documents a coordinated exception.
- For tracked modularization work that needs parallel lanes, follow [docs/development/SUBAGENT_MODULARIZATION_GUIDE.md](docs/development/SUBAGENT_MODULARIZATION_GUIDE.md) and document the coordinated exception before code edits start.
- Use task IDs in commits and pull request titles when the work is tracked.
- Move work to `Blocked` or `Review` as soon as the status changes, with a short reason and next step.

## While You Work

- Preserve unrelated user edits already present in the worktree.
- Prefer repo-root `make` targets over ad hoc command combinations.
- Use current repo patterns rather than reintroducing retired workflows.
- Treat tracked `*.example` env files as templates only. Copied live `.env*`, `.deploy.conf*`, and other local runtime overrides stay ignored and local-only.
- Keep docs synchronized when commands, ports, workflows, contracts, or navigation change.
- Treat [docs/phases/archive/README.md](docs/phases/archive/README.md) as historical context only; do not update archived closeouts to represent current status unless you are fixing a broken link or provenance note.
- In coordinated modularization work, keep one lead owner for shared seams such as the workboard, backend v2 registrar, frontend route catalogs, and final integration validation.

For implementation-specific rules, defer to [docs/development/AGENT_INSTRUCTIONS.md](docs/development/AGENT_INSTRUCTIONS.md) and [docs/development/ARCHITECTURE.md](docs/development/ARCHITECTURE.md).

## Validation

Use the smallest validation set that still covers your change.

| Change Type | Recommended Commands |
|---|---|
| Docs-only | `make check-links` |
| Docs with API wording/examples | `make check-links` and `make lint-doc-api-versioning` |
| Database, migration, or DB contract work | `make db-verify` and the narrowest behavior check that matches the changed surface |
| Smaller scoped code change | `./scripts/select-checks.sh --base HEAD~1 --mode fast` (use `--mode strict` for shared runtime, hook, Docker, or runtime-doc changes) |
| Broader code change | `make lint`, `make typecheck`, and `make test` |
| Higher-confidence validation | `make ci` or `make ci-full` as appropriate |
| Release-facing validation | `make release-check` |

Prefer root commands first. Use package-level scripts only when the change is narrow enough that a package-specific check is the clearest fit.

`make ci-fast` is a lint + typecheck-only static pass. It is useful for quick feedback, but it is not a test lane or a full-confidence pass.

`make typecheck` includes the backend, frontend, and shared `contracts` export smoke check.

Use [docs/testing/TESTING.md](docs/testing/TESTING.md) for the current meaning of `make ci*`, `make test-coverage*`, and `make db-verify`, including current review-lane caveats.

CI/CD is local-only. `make release-check` runs the release gate without deploying; `make release-staging` and `make release-production` run the same gate before delegating to the existing deploy wrapper, which still requires `DEPLOY_EXECUTE=1` for an actual staging or production deploy.

## Documentation Hygiene

- Keep Markdown links relative.
- Keep the docs entry flow aligned: [README.md](README.md) for product orientation, this file for contributor workflow, [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md) for setup, [docs/development/CONVENTIONS.md](docs/development/CONVENTIONS.md) for conventions, [docs/development/AGENT_INSTRUCTIONS.md](docs/development/AGENT_INSTRUCTIONS.md) for guardrails, [docs/testing/TESTING.md](docs/testing/TESTING.md) for validation, then [docs/README.md](docs/README.md) for the full catalog.
- Treat [docs/README.md](docs/README.md) as the primary documentation catalog.
- Use [docs/validation/README.md](docs/validation/README.md) when contributor navigation changes touch audit artifacts, remediation trackers, or validation reference docs.
- Treat [scripts/README.md](scripts/README.md) as the helper-script index.
- Use [contracts/README.md](contracts/README.md) and [database/README.md](database/README.md) when shared-package or database-contract navigation changes.
- Only the three canonical `references/**` trees under `.codex/skills/nonprofit-manager-{persona-analysis,persona-validation,benchmark-analysis}/` are versioned repo content; other `.codex` files remain local helper state.
- Use `/api/v2/*` in active API docs unless you are documenting a health alias or another documented compatibility exception.
- Keep the root [README.md](README.md) user-facing; contributor onboarding belongs here and in `docs/development/*`.

## Before You Hand Off

- Update the workboard if the task is tracked.
- Run the relevant validation commands for the change you made.
- Call out remaining risk, follow-up work, or assumptions.
- Mention the runtime you used if it affects ports, environment setup, or observed behavior.
