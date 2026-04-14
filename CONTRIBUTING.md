# Contributing to Nonprofit Manager

**Last Updated:** 2026-04-13

Use this guide when you are contributing code, docs, or release support to Nonprofit Manager.

## Start Here

Read these in order before you make changes:

1. [README.md](README.md)
2. [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md)
3. [docs/development/CONVENTIONS.md](docs/development/CONVENTIONS.md)
4. [docs/development/AGENT_INSTRUCTIONS.md](docs/development/AGENT_INSTRUCTIONS.md)
5. [docs/testing/TESTING.md](docs/testing/TESTING.md)

If the work is tracked, update [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md) before you start. The workboard is the source of truth for status, ownership, and blockers.

## Working Agreement

- Keep changes scoped to the task you signed out.
- Preserve unrelated user edits in the worktree.
- Prefer the repo-native `make` targets and check matrices over ad hoc validation.
- Keep active docs in sync with command, port, or workflow changes.

## Validation

Use the smallest validation set that still covers your change:

```bash
make lint
make typecheck
make test
```

For docs-only changes:

```bash
make check-links
make lint-doc-api-versioning
```

For smaller mixed changes, use the selector helper:

```bash
./scripts/select-checks.sh --base HEAD~1 --mode fast
```

## Documentation Hygiene

- Keep repo links relative in Markdown docs.
- Use `/api/v2/*` in active API docs unless you are documenting a health alias or compatibility exception.
- Treat `docs/INDEX.md` as the catalog and [docs/README.md](docs/README.md) as the short docs landing page.
- Use [scripts/README.md](scripts/README.md) when you need the root helper-script index.
- Call out runtime-specific ports explicitly instead of implying one universal local setup.
- Keep root `make` commands as the primary contributor interface and use package scripts only for narrower checks.

## When You Finish

- Update the workboard if you touched a tracked task.
- Add concise notes about any remaining risk or follow-up.
- Run the relevant validation commands before handing off.
