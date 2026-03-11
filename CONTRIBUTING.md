# Contributing To Nonprofit Manager

**Last Updated:** 2026-03-11

This repository uses local validation and a workboard-driven workflow. Start with [README.md](README.md) and [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md) before making changes.

## Before You Start

Read these first:

1. [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md)
2. [docs/development/CONVENTIONS.md](docs/development/CONVENTIONS.md)
3. [docs/development/ARCHITECTURE.md](docs/development/ARCHITECTURE.md)

If the work belongs on the workboard, update [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md) before you start editing.

## Tracked Work

For tracked tasks:

- Move the task to `In Progress` before implementation.
- Use the task ID in commit messages and PR titles when applicable.
- Keep the workboard current when status changes to `Blocked`, `Review`, or `Done`.
- Do not reuse unrelated blocked rows for new work.

## Development Workflow

1. Create or switch to the branch you will use.
2. Set up the runtime you need by following [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md).
3. Make the change.
4. Update related docs if behavior, commands, ports, or workflows changed.
5. Run the smallest sufficient verification set for the touched files.
6. Update the workboard status before handoff.

## Validation Expectations

Default repo-root commands:

```bash
make lint
make typecheck
make test
```

For documentation-heavy changes, also run:

```bash
make check-links
make lint-doc-api-versioning
```

For narrower change sets, use the repo selector:

```bash
scripts/select-checks.sh --base HEAD~1 --mode fast
```

Run the emitted commands in order and stop on the first failure.

## Commit And Review Guidance

- Keep commits scoped and descriptive.
- If the work is tracked, include the task ID.
- Use conventional prefixes when they help clarify intent: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- If you open a PR, keep the title consistent with the workboard task when applicable.

Examples:

```text
P4-T15: restructure active contributor documentation
docs: refresh README and testing guides
```

## Documentation Changes

If you touch active docs:

- Update adjacent entry docs when navigation changes
- Verify commands against the repo instead of copying older prose
- Keep runtime modes distinct when ports or env files differ
- Use relative links, not GitHub blob links

See [docs/DOCUMENTATION_STYLE_GUIDE.md](docs/DOCUMENTATION_STYLE_GUIDE.md).

## Handoff Checklist

- [ ] Workboard updated
- [ ] Relevant docs updated
- [ ] Validation commands recorded
- [ ] Known blockers or residual risks written down

## Related References

- [docs/development/AGENT_INSTRUCTIONS.md](docs/development/AGENT_INSTRUCTIONS.md)
- [backend/README.md](backend/README.md)
- [frontend/README.md](frontend/README.md)
- [docs/testing/TESTING.md](docs/testing/TESTING.md)
