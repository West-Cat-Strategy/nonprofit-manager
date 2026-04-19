# Agents in Nonprofit Manager

**Last Updated:** 2026-04-18

This page explains the three meanings of "agents" in this repo. It is an orientation page, not the canonical source for coding rules, task status, or implementation details.

**Document Role:** Orientation and terminology only.
**Use This Page For:** Understanding what "agents" means in this repo and finding the correct canonical doc.
**Go Elsewhere For:** Contributor workflow in [CONTRIBUTING.md](CONTRIBUTING.md), runtime setup and ports in [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md), docs navigation in [docs/README.md](docs/README.md), and live tracked work in [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md).

1. Developer agents: AI assistants contributing code and docs under repo rules.
2. Multi-agent coordination: the task workflow for parallel contributors.
3. User-agent tracking: browser/client metadata captured for analytics and security.

There are no autonomous AI agents running independently in the application. The codebase uses normal service/controller patterns plus middleware, jobs, and external integrations.

## Quick Navigation

- [Developer Agents](#developer-agents)
- [Multi-Agent Coordination](#multi-agent-coordination)
- [User-Agent Tracking](#user-agent-tracking)
- [Integration Patterns](#integration-patterns)
- [Canonical References](#canonical-references)

## Developer Agents

Developer agents are AI assistants (like the one you are interacting with now) that contribute code, documentation, and validation support to the repository.

For the full set of technical guardrails, architecture boundaries, and validation requirements for developer agents, see:

- [**docs/development/AGENT_INSTRUCTIONS.md**](docs/development/AGENT_INSTRUCTIONS.md)

## Multi-Agent Coordination

Multi-agent coordination refers to the workflow used when multiple contributors (human or AI) are working on the repository simultaneously, particularly during large refactoring or modularization tasks.

For the live workboard and coordination status, see:

- [**docs/phases/planning-and-progress.md**](docs/phases/planning-and-progress.md)

For guidance on splitting large tasks into parallel lanes, see:

- [**docs/development/SUBAGENT_MODULARIZATION_GUIDE.md**](docs/development/SUBAGENT_MODULARIZATION_GUIDE.md)

## User-Agent Tracking

The app records HTTP `User-Agent` values as browser/client metadata for analytics, support, and security monitoring. Treat them as operational metadata, not as a secret.

| Area | Code | Purpose |
|---|---|---|
| Portal activity | [backend/src/services/portalActivityService.ts](backend/src/services/portalActivityService.ts) | Logs portal interaction events |
| API key usage | [backend/src/services/apiKeyService.ts](backend/src/services/apiKeyService.ts) | Tracks API key consumption by client |
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

- Webhooks: [backend/src/services/webhookService.ts](backend/src/services/webhookService.ts) and [backend/src/services/webhookRetrySchedulerService.ts](backend/src/services/webhookRetrySchedulerService.ts) handle async delivery, retries, signatures, and failure handling.
- External service providers: [backend/src/services/externalServiceProviderService.ts](backend/src/services/externalServiceProviderService.ts) manages provider CRUD, configuration, and usage tracking for integrations.
- For the security and operational contract around these flows, see [docs/security/SECURITY_MONITORING_GUIDE.md](docs/security/SECURITY_MONITORING_GUIDE.md).

## Canonical References

- [README.md](README.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [docs/README.md](docs/README.md)
- [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md)
- [docs/development/AGENT_INSTRUCTIONS.md](docs/development/AGENT_INSTRUCTIONS.md)
- [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md)
- [docs/README.md](docs/README.md)
- [backend/README.md](backend/README.md)
- [frontend/README.md](frontend/README.md)
- [docs/testing/TESTING.md](docs/testing/TESTING.md)
- [docs/features/FEATURE_MATRIX.md](docs/features/FEATURE_MATRIX.md)
- [docs/security/SECURITY_MONITORING_GUIDE.md](docs/security/SECURITY_MONITORING_GUIDE.md)
