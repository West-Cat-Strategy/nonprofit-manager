# Agents in Nonprofit Manager

This page explains the three meanings of "agents" in this repo. It is an orientation page, not the canonical source for coding rules, task status, or implementation details.

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

Start with the canonical repo docs:

- [CONTRIBUTING.md](CONTRIBUTING.md) for the contributor workflow and handoff path.
- [README.md](README.md) for the product overview and runtime matrix.
- [docs/development/AGENT_INSTRUCTIONS.md](docs/development/AGENT_INSTRUCTIONS.md) for coding-agent guardrails.
- [CONTRIBUTING.md](CONTRIBUTING.md) for branch, review, and handoff workflow.
- [docs/INDEX.md](docs/INDEX.md) for the full documentation catalog.

Repo-specific reminders:

- Keep active backend code under `backend/src/modules/<domain>/` and active frontend code under `frontend/src/features/<domain>/`.
- Active API surfaces use `/api/v2/*`; health aliases remain documented exceptions.
- Validate input with Zod and the repo validation middleware, and use the current auth-guard helpers rather than legacy `require*OrError` wrappers in new work.
- For auth and permission behavior, treat [backend/src/services/authGuardService.ts](backend/src/services/authGuardService.ts) and [backend/src/utils/permissions.ts](backend/src/utils/permissions.ts) as implementation sources of truth.
- Preserve the canonical response envelopes and keep docs, commands, and ports aligned with current repo behavior.
- When implementation details matter, defer to the owning service README or the relevant docs section instead of duplicating policy here.

## Multi-Agent Coordination

The live workboard is [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md). Treat it as the source of truth for tracked work, status changes, ownership, and blockers.

Working rules:

- Sign out tracked work in the workboard before editing code or docs.
- Keep one active task per agent by default; only split work when the task explicitly documents a coordinated parallel path.
- For modularization work that needs subagents, follow [docs/development/SUBAGENT_MODULARIZATION_GUIDE.md](docs/development/SUBAGENT_MODULARIZATION_GUIDE.md) and document the temporary coordinated exception before parallel edits begin.
- Use task IDs in commits and PR titles so work stays traceable.
- Move work to Blocked or Review as soon as the status changes, and record the reason and next step.
- Before marking work Done, follow the validation and review expectations in [CONTRIBUTING.md](CONTRIBUTING.md).

This page intentionally does not duplicate the current phase, active subtasks, or next-ready task list.

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
- [docs/development/AGENT_INSTRUCTIONS.md](docs/development/AGENT_INSTRUCTIONS.md)
- [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md)
- [docs/INDEX.md](docs/INDEX.md)
- [backend/README.md](backend/README.md)
- [frontend/README.md](frontend/README.md)
- [docs/testing/TESTING.md](docs/testing/TESTING.md)
- [docs/features/FEATURE_MATRIX.md](docs/features/FEATURE_MATRIX.md)
- [docs/security/SECURITY_MONITORING_GUIDE.md](docs/security/SECURITY_MONITORING_GUIDE.md)
