# Agents in Nonprofit Manager

**Last Updated:** 2026-04-30

This page explains the three meanings of "agents" in this repo. It is an orientation page, not the canonical source for coding rules, task status, or implementation details.

**Document Role:** Root-level terminology and routing guide.
**Use This Page For:** Understanding what "agents" means in this repo and finding the correct canonical doc.
**Go Elsewhere For:** Product overview in [README.md](README.md), contributor workflow in [CONTRIBUTING.md](CONTRIBUTING.md), runtime setup and ports in [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md), code and documentation conventions in [docs/development/CONVENTIONS.md](docs/development/CONVENTIONS.md), docs navigation in [docs/README.md](docs/README.md), live tracked work in [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md), current phase sequencing in [docs/phases/PHASE_5_DEVELOPMENT_PLAN.md](docs/phases/PHASE_5_DEVELOPMENT_PLAN.md), archived closeouts in [docs/phases/archive/README.md](docs/phases/archive/README.md), and audit or validation artifacts in [docs/validation/README.md](docs/validation/README.md).

1. Developer agents: AI assistants or other assisted-contribution tools working under the repository's contributor rules.
2. Multi-agent coordination: the documented workflow for parallel contributors on larger or modularized tasks.
3. User-agent tracking: browser or client metadata captured by the application for analytics, support, and security monitoring.

There are no autonomous AI agents running independently in the application. The codebase uses normal service/controller patterns plus middleware, jobs, and external integrations.

## Where To Go

| Need | Canonical Doc |
|---|---|
| Product overview for organizations | [README.md](README.md) |
| Contributor workflow and handoff | [CONTRIBUTING.md](CONTRIBUTING.md), then [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md), [docs/development/CONVENTIONS.md](docs/development/CONVENTIONS.md), [docs/development/AGENT_INSTRUCTIONS.md](docs/development/AGENT_INSTRUCTIONS.md), and [docs/testing/TESTING.md](docs/testing/TESTING.md) |
| Tracked or resumed work | [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md); check `Recent Thread Follow-through` first when resuming recent interrupted work |
| Current phase roadmap | [docs/phases/PHASE_5_DEVELOPMENT_PLAN.md](docs/phases/PHASE_5_DEVELOPMENT_PLAN.md) |
| Historical phase proof and earlier workboards | [docs/phases/archive/README.md](docs/phases/archive/README.md) |
| Parallel contributor coordination | [docs/development/SUBAGENT_MODULARIZATION_GUIDE.md](docs/development/SUBAGENT_MODULARIZATION_GUIDE.md) plus the Coordination section in [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md) |
| GitHub Copilot or custom-agent helper routing | [`.github/README.md`](.github/README.md), [`.github/copilot-instructions.md`](.github/copilot-instructions.md), and [`.github/agents/README.md`](.github/agents/README.md); helper guidance only, with canonical policy in the contributor, development, testing, workboard, and validation docs above |
| Validation and audit artifacts | [docs/validation/README.md](docs/validation/README.md) |
| Reference repository storage and compatibility aliases | [docs/reference-repos.md](docs/reference-repos.md), [reference-repos/README.md](reference-repos/README.md), and [reference-repos/manifest.lock.json](reference-repos/manifest.lock.json) |
| Repo-local helper prompts | Tracked detailed persona and benchmark canon lives under [`.codex/skills/nonprofit-manager-persona-analysis/references/`](.codex/skills/nonprofit-manager-persona-analysis/references/source-map.md), [`.codex/skills/nonprofit-manager-persona-validation/references/`](.codex/skills/nonprofit-manager-persona-validation/references/validation-rubric.md), and [`.codex/skills/nonprofit-manager-benchmark-analysis/references/`](.codex/skills/nonprofit-manager-benchmark-analysis/references/cohort-and-sources.md); only those three `references/**` trees are versioned under `.codex`, and other repo-local skill prompts remain helper guidance |

## Developer Agents

Developer agents are AI assistants or assisted-development tools that contribute code, documentation, validation, or review support to the repository.

For the full contributor workflow, validation expectations, handoff rules, technical guardrails, and architecture boundaries, see:

- [**CONTRIBUTING.md**](CONTRIBUTING.md)
- [**docs/development/AGENT_INSTRUCTIONS.md**](docs/development/AGENT_INSTRUCTIONS.md)

Local prompts under `.codex/skills/**` and GitHub-side prompts under `.github/**` may mirror this workflow for contributor tools. The tracked persona-suite references named above are the explicit exception: they are the canonical detailed layer for persona analysis, persona validation, and benchmark synthesis, and only those `references/**` trees are versioned. Other repo-local skill prompts and GitHub helper prompts remain helper guidance rather than tracked repo policy.

## Multi-Agent Coordination

Multi-agent coordination refers to the documented workflow used when multiple contributors are working on the repository at the same time, especially during large refactoring, cleanup, validation, or modularization tasks.

For the live workboard and coordination status, see:

- [**docs/phases/planning-and-progress.md**](docs/phases/planning-and-progress.md)
- [**docs/phases/PHASE_5_DEVELOPMENT_PLAN.md**](docs/phases/PHASE_5_DEVELOPMENT_PLAN.md)

For guidance on splitting large tasks into parallel lanes, see:

- [**docs/development/SUBAGENT_MODULARIZATION_GUIDE.md**](docs/development/SUBAGENT_MODULARIZATION_GUIDE.md)

For earlier closeouts and prior workboard history, use:

- [**docs/phases/archive/README.md**](docs/phases/archive/README.md)

## User-Agent Tracking

The app records HTTP `User-Agent` values as browser or client metadata for analytics, support, and security monitoring. Treat them as operational metadata, not as a secret.

| Area | Code | Purpose |
|---|---|---|
| Portal activity | [backend/src/services/portalActivityService.ts](backend/src/services/portalActivityService.ts) | Logs portal interaction events |
| API key usage | [backend/src/modules/webhooks/services/apiKeyService.ts](backend/src/modules/webhooks/services/apiKeyService.ts) | Tracks API key consumption by client |
| Auth activity | [backend/src/modules/portalAuth/controllers/portalAuthController.ts](backend/src/modules/portalAuth/controllers/portalAuthController.ts) | Records authentication attempts and sessions |
| Publishing events | [backend/src/modules/publishing/controllers/publishingController.ts](backend/src/modules/publishing/controllers/publishingController.ts) | Tracks publishing actions |
| Portal actions | [backend/src/modules/portal/controllers/resources.controller.ts](backend/src/modules/portal/controllers/resources.controller.ts) | Logs portal document and resource actions |

Typical uses:

- Browser compatibility and client distribution analysis
- Bot detection and unusual-client monitoring
- Support debugging when a user reports a browser-specific issue
- API client segmentation for web, mobile, and third-party integrations

## Integration Patterns

Some services behave like automated delivery systems, but they are still ordinary services, not autonomous agents.

- Webhooks: [backend/src/modules/webhooks/services/webhookService.ts](backend/src/modules/webhooks/services/webhookService.ts) and [backend/src/modules/webhooks/services/webhookRetrySchedulerService.ts](backend/src/modules/webhooks/services/webhookRetrySchedulerService.ts) handle async delivery, retries, signatures, and failure handling.
- External service providers: [backend/src/modules/externalServiceProviders/routes/index.ts](backend/src/modules/externalServiceProviders/routes/index.ts) and [backend/src/services/externalServiceProviderService.ts](backend/src/services/externalServiceProviderService.ts) handle provider CRUD, configuration, and usage tracking for integrations.
- For the security and operational contract around these flows, see [docs/security/SECURITY_MONITORING_GUIDE.md](docs/security/SECURITY_MONITORING_GUIDE.md).

## Canonical References

- [README.md](README.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [docs/README.md](docs/README.md)
- [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md)
- [docs/development/CONVENTIONS.md](docs/development/CONVENTIONS.md)
- [docs/development/AGENT_INSTRUCTIONS.md](docs/development/AGENT_INSTRUCTIONS.md)
- [docs/development/SUBAGENT_MODULARIZATION_GUIDE.md](docs/development/SUBAGENT_MODULARIZATION_GUIDE.md)
- [docs/reference-repos.md](docs/reference-repos.md)
- [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md)
- [docs/validation/README.md](docs/validation/README.md)
- [backend/README.md](backend/README.md)
- [frontend/README.md](frontend/README.md)
- [docs/testing/TESTING.md](docs/testing/TESTING.md)
- [docs/security/SECURITY_MONITORING_GUIDE.md](docs/security/SECURITY_MONITORING_GUIDE.md)
