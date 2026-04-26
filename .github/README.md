# GitHub Contributor Guidance

These files are advisory routing for GitHub Copilot and other GitHub-side contributor tools. They do not replace the repo's canonical docs, local `make` control plane, or workboard.

Start every GitHub-assisted task with:

- [agents.md](../agents.md) for terminology and canonical doc routing.
- [CONTRIBUTING.md](../CONTRIBUTING.md) for contributor workflow.
- [docs/development/AGENT_INSTRUCTIONS.md](../docs/development/AGENT_INSTRUCTIONS.md), [docs/development/CONVENTIONS.md](../docs/development/CONVENTIONS.md), and [docs/development/GETTING_STARTED.md](../docs/development/GETTING_STARTED.md) for coding rules and runtime setup.
- [docs/testing/TESTING.md](../docs/testing/TESTING.md) for validation selection.
- [docs/phases/planning-and-progress.md](../docs/phases/planning-and-progress.md) for tracked work and coordination state.
- [docs/validation/README.md](../docs/validation/README.md) for proof artifacts.

## What Lives Here

- [copilot-instructions.md](copilot-instructions.md) is the short bridge from GitHub Copilot into the canonical repo docs.
- [agents/](agents/) contains thin lane profiles for GitHub Copilot custom agents if that feature is enabled for the repository.
- [instructions/](instructions/) contains path-specific hints that route backend, frontend, docs, scripts, OpenAPI, and E2E work back to the canonical docs.

## What Does Not Live Here

This directory intentionally does not enable GitHub Actions workflows, Dependabot, CodeQL, GitHub MCP servers, hooks, or third-party SaaS review bots. Those tools need a separate permissions, data-exposure, and alert-triage decision before adoption.

Until that decision is made, keep the repository local-first: use the existing `Makefile`, focused test commands, and tracked validation notes.
