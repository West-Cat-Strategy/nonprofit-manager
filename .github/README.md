# GitHub Contributor Guidance

These files route GitHub-side contributor tools and the approved CI/security pilot. They do not replace the repo's canonical docs, local `make` control plane, or workboard.

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
- [workflows/](workflows/) contains the approved GitHub mirrors for full CI, security scanning, CodeQL, and dependency review.
- [dependabot.yml](dependabot.yml), [dependency-review-config.yml](dependency-review-config.yml), and [CODEOWNERS](CODEOWNERS) contain the first supply-chain and workflow ownership configuration.

## Guardrails

The approved GitHub pilot may run `make ci-full`, `make security-scan`, CodeQL, dependency review, and Dependabot updates. Local `make` commands remain the canonical command surface and must stay documented in [docs/testing/TESTING.md](../docs/testing/TESTING.md).

Do not add deploy automation, GitHub MCP config, hooks, third-party SaaS review bots, Semgrep, Trivy, Harden-Runner, Redocly, Knip expansion, or extra workflows without a separate tracked approval.
