---
applyTo: "docs/**,agents.md,AGENTS.md,CONTRIBUTING.md,README.md"
---

# Docs Path Instructions

Keep docs source-of-truth boundaries intact:

- `agents.md` is orientation and terminology only.
- [../../CONTRIBUTING.md](../../CONTRIBUTING.md) owns contributor workflow.
- [../../docs/development/](../../docs/development/) owns development rules.
- [../../docs/testing/TESTING.md](../../docs/testing/TESTING.md) owns validation guidance.
- [../../docs/phases/planning-and-progress.md](../../docs/phases/planning-and-progress.md) owns live workboard status.
- [../../docs/validation/README.md](../../docs/validation/README.md) owns validation artifact routing.

Prefer links to canonical docs over duplicated policy. Run `make check-links` for docs-only changes.
