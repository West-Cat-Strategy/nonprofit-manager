# Documentation Home

**Last Updated:** 2026-05-07

Use this hub to find the current source of truth quickly. The detailed catalogs live in section indexes; this page stays intentionally short so active guidance does not get buried under archive and proof history.

Tracked `*.example` env files are templates. Copied live `.env*`, deploy override files, and local runtime files stay ignored. Inside `.codex`, only the three persona and benchmark `references/**` trees are versioned canon.

## Start Here

| Need | Start With |
|---|---|
| Product overview for organizations | [../README.md](../README.md) |
| Contributor workflow | [../CONTRIBUTING.md](../CONTRIBUTING.md) |
| Setup, ports, and runtime choices | [development/GETTING_STARTED.md](development/GETTING_STARTED.md) |
| Code and docs conventions | [development/CONVENTIONS.md](development/CONVENTIONS.md) |
| Repo guardrails and architecture boundaries | [development/AGENT_INSTRUCTIONS.md](development/AGENT_INSTRUCTIONS.md) |
| Validation command selection | [testing/TESTING.md](testing/TESTING.md) |
| Live tracked work | [phases/planning-and-progress.md](phases/planning-and-progress.md) |
| Current Phase 5 roadmap | [phases/PHASE_5_DEVELOPMENT_PLAN.md](phases/PHASE_5_DEVELOPMENT_PLAN.md) |
| Validation and audit evidence | [validation/README.md](validation/README.md) |

When resuming tracked or interrupted work, open [phases/planning-and-progress.md](phases/planning-and-progress.md) first and check `Recent Thread Follow-through` before scanning the full board.

## Section Indexes

| Section | Use |
|---|---|
| [API](api/README.md) | `/api/v2` route families, OpenAPI, Postman, and endpoint references |
| [Deployment](deployment/README.md) | Production, database, public-site, Plausible, and log aggregation deployment docs |
| [Development](development/README.md) | Contributor setup, conventions, architecture, troubleshooting, release, and reference-pattern guidance |
| [Features](features/README.md) | Feature matrix, domain references, and feature archive entrypoint |
| [Performance](performance/README.md) | Active performance posture plus retained historical evidence |
| [Product](product/README.md) | Product spec summaries, persona summaries, benchmark summaries, and product archive |
| [Quick Reference](quick-reference/README.md) | Short command and workflow reference plus archived quick references |
| [Refactoring](refactoring/README.md) | Durable broad-refactor plans and handoff notes |
| [Security](security/SECURITY_MONITORING_GUIDE.md) | Security monitoring, incident response, auth-alias operations, and security archive |
| [Testing](testing/TESTING.md) | Current validation map, scoped testing guides, and testing archive |
| [UI](ui/README.md) | Theme, UI references, and archived UX snapshots |
| [Validation](validation/README.md) | Active proof notes, audit notes, and validation archive |

## Workspace Guides

- [Backend guide](../backend/README.md) - `/api/v2` backend, public-site runtime, and worker runtime details
- [Frontend guide](../frontend/README.md) - staff app route ownership, direct frontend runtime, and deleted-path guardrails
- [Playwright guide](../e2e/README.md) - host vs Docker wrapper contracts and browser-lane details
- [Database guide](../database/README.md) - schema, seeds, migration manifest, and DB verification contract
- [Contracts guide](../contracts/README.md) - shared type-only package orientation
- [Scripts guide](../scripts/README.md) - repo-local helper and policy script index

## Historical Material

- [phases/archive/README.md](phases/archive/README.md) is the phase closeout and earlier workboard archive.
- Section archives, such as [features/archive/README.md](features/archive/README.md), [testing/archive/README.md](testing/archive/README.md), [performance/archive/README.md](performance/archive/README.md), and [validation/archive/README.md](validation/archive/README.md), hold provenance rather than current status.
- Historical verification helpers live in [verification/VERIFICATION_SYSTEM.md](verification/VERIFICATION_SYSTEM.md); active validation uses [testing/TESTING.md](testing/TESTING.md), `make`, and `scripts/select-checks.sh`.

## Documentation Rules

- Keep active docs focused on current behavior.
- Keep status and row ownership in [phases/planning-and-progress.md](phases/planning-and-progress.md), not scattered across feature or setup docs.
- Use relative links.
- Use `/api/v2/*` in active API docs unless documenting health aliases or an explicit compatibility exception.
- Run `make check-links` for docs changes and add `make lint-doc-api-versioning` when API wording or examples change.
- Follow [DOCUMENTATION_STYLE_GUIDE.md](DOCUMENTATION_STYLE_GUIDE.md) for formatting and source-of-truth rules.
