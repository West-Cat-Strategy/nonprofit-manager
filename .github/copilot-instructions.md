# Copilot Instructions

Use this file as a bridge into the repository's canonical docs. Do not treat it as a second policy source.

Before editing, read:

- [agents.md](../agents.md)
- [CONTRIBUTING.md](../CONTRIBUTING.md)
- [docs/development/GETTING_STARTED.md](../docs/development/GETTING_STARTED.md)
- [docs/development/CONVENTIONS.md](../docs/development/CONVENTIONS.md)
- [docs/development/AGENT_INSTRUCTIONS.md](../docs/development/AGENT_INSTRUCTIONS.md)
- [docs/testing/TESTING.md](../docs/testing/TESTING.md)
- [docs/phases/planning-and-progress.md](../docs/phases/planning-and-progress.md)
- [docs/validation/README.md](../docs/validation/README.md)

Core rules:

- Preserve the dirty worktree. Do not revert unrelated edits or generated artifacts.
- Check [docs/phases/planning-and-progress.md](../docs/phases/planning-and-progress.md) before starting tracked work. If work is untracked, call that out in the handoff.
- Keep `agents.md` orientation-only. Put durable implementation rules in the canonical docs listed above.
- Do not introduce app-level autonomous agents. "Agent" work here means contributor tooling only.
- Treat `.github/workflows/**`, `.github/dependabot.yml`, dependency review, CodeQL, secret-scan mirroring, and build-only artifact validation as approved only for the tracked GitHub CI/security/build-validation pilot.
- Do not add deploy automation, GitHub MCP config, hooks, third-party PR-review bots, Semgrep, Trivy, Harden-Runner, Redocly, Knip expansion, or extra workflows unless a task explicitly authorizes that tooling layer.
- Follow [docs/development/SUBAGENT_MODULARIZATION_GUIDE.md](../docs/development/SUBAGENT_MODULARIZATION_GUIDE.md) for parallel lane ownership. Shared seams stay lead-owned unless explicitly assigned.
- Prefer the smallest honest validation from [docs/testing/TESTING.md](../docs/testing/TESTING.md). For docs-only changes, run `make check-links`; for API docs wording, also consider `make lint-doc-api-versioning`.

Every handoff should include owned paths, forbidden paths avoided, tests or checks run, and any blockers or shared-seam requests.
