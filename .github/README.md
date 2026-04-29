# GitHub Contributor Guidance

These files route GitHub-side contributor tools and repository metadata. They do not replace the repo's canonical docs, local `make` control plane, local release gate, or workboard.

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
- [dependabot.yml](dependabot.yml) keeps npm dependency update PRs enabled without using GitHub Actions.
- [CODEOWNERS](CODEOWNERS) contains workflow ownership metadata for review routing.

## Guardrails

Tracked GitHub Actions workflows are intentionally absent. CI, security scanning, Docker validation, SBOM generation, and deployment gating happen locally through `make release-check`, `make release-staging`, and `make release-production`. Local `make` commands remain the canonical command surface and must stay documented in [docs/testing/TESTING.md](../docs/testing/TESTING.md).

Do not add GitHub Actions, GitHub-hosted deploy automation, GitHub MCP config, third-party SaaS review bots, Semgrep, Trivy, Harden-Runner, Redocly, Knip expansion, or other hosted CI/CD tooling without a separate tracked approval.
