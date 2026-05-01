# Documentation Home

**Last Updated:** 2026-05-01

Welcome to the Nonprofit Manager documentation hub. Use this file to find the live contributor workflow, runtime docs, feature inventory, tracked persona canon, and historical archives without mixing current planning with older closeout material. Tracked `*.example` env files are templates; copied live `.env*` and deploy override files stay local-only and ignored. Inside `.codex`, only the three canonical persona and benchmark `references/**` trees are versioned.

## Start Here

If you are contributing to the repository, follow this path in order:

1. [**Contributor Workflow**](../CONTRIBUTING.md) - repo workflow, tracked-work rules, and validation expectations
2. [**Getting Started**](development/GETTING_STARTED.md) - runtime setup, ports, env notes, and direct public-site or worker flows
3. [**Conventions**](development/CONVENTIONS.md) - code and documentation conventions
4. [**Agent Instructions**](development/AGENT_INSTRUCTIONS.md) - repo guardrails and architecture boundaries
5. [**Testing Guide**](testing/TESTING.md) - active validation map and Playwright lane selection
6. This file when you need the broader docs map

If the task is tracked or resumed, open [**Planning and Progress**](phases/planning-and-progress.md) before editing and check `Recent Thread Follow-through` first.

## Live Planning vs Archive

- [**Live workboard**](phases/planning-and-progress.md) - current tracked rows, ownership, blockers, and follow-through
- [**Phase 5 roadmap**](phases/PHASE_5_DEVELOPMENT_PLAN.md) - current phase goals, sequencing, dependencies, and exit criteria
- [**Phase archive**](phases/archive/README.md) - Phase 4 closeouts, earlier workboard history, and older project artifacts

## Source Of Truth Map

| Topic | Primary Doc | Notes |
|---|---|---|
| Product overview | [../README.md](../README.md) | Organization-facing adoption overview and product entry point |
| Contributor workflow | [../CONTRIBUTING.md](../CONTRIBUTING.md) | Start here before any edits |
| Live tracked work | [phases/planning-and-progress.md](phases/planning-and-progress.md) | Current source of truth for row-level status |
| Current phase roadmap | [phases/PHASE_5_DEVELOPMENT_PLAN.md](phases/PHASE_5_DEVELOPMENT_PLAN.md) | Phase 5 goals, sequence, gaps, and exit criteria |
| Refactoring plans and handoffs | [refactoring/README.md](refactoring/README.md) | Durable broad-refactor planning and evidence notes |
| Backend refactoring history | [backend/BACKEND_SERVICE_REFACTORING_GUIDE.md](backend/BACKEND_SERVICE_REFACTORING_GUIDE.md) | Historical/planning reference; current backend ownership stays in backend and development docs |
| Historical phase material | [phases/archive/README.md](phases/archive/README.md) | Use for provenance, not current status |
| Runtime setup and ports | [development/GETTING_STARTED.md](development/GETTING_STARTED.md) | Docker, direct app, public-site, worker, and Playwright runtime contracts |
| Validation and testing | [testing/TESTING.md](testing/TESTING.md) | Active test-command selection map |
| Verification scripts | [verification/VERIFICATION_SYSTEM.md](verification/VERIFICATION_SYSTEM.md) | Legacy/broad verifier entrypoints that still exist under `scripts/` |
| Validation and audit artifacts | [validation/README.md](validation/README.md) | Audit snapshots, remediation trackers, and validation references |
| Persona and benchmark detail | [../.codex/skills/nonprofit-manager-persona-analysis/references/source-map.md](../.codex/skills/nonprofit-manager-persona-analysis/references/source-map.md) | Canonical detailed layer for persona analysis, persona validation, and benchmark synthesis |
| Retained reference patterns | [development/reference-patterns/README.md](development/reference-patterns/README.md) | Preserved adoption specs, pattern catalogs, and check matrices |
| Reference repo workspace | [reference-repos.md](reference-repos.md) | Central clone store, compatibility aliases, manifest ownership, and reuse guardrails |
| Helper scripts | [../scripts/README.md](../scripts/README.md) | Repo-local command and policy-script index |
| Database contract | [../database/README.md](../database/README.md) | Schema, seeds, manifest, and migration-contract orientation |
| Shared contracts | [../contracts/README.md](../contracts/README.md) | Shared type-only package used across app surfaces |

## Workspace Guides

- [Backend Guide](../backend/README.md) - `/api/v2` backend, direct public-site runtime, and worker runtime details
- [Frontend Guide](../frontend/README.md) - staff app route ownership, direct frontend runtime, and deleted-path guardrails
- [Playwright E2E Guide](../e2e/README.md) - host vs Docker wrapper contracts and browser-lane details
- [API Docs](api/README.md) - API summaries, OpenAPI spec, and Postman setup
- [Feature Docs](features/README.md) - active feature references, supporting docs, and feature archive entrypoint
- [Product Docs](product/README.md) - current product reference, summary persona docs, tracked persona canon links, benchmark summary, and product archive entrypoint
- [UI Docs](ui/README.md) - current UI references and archived UX snapshots
- [Quick Reference Docs](quick-reference/README.md) - active quick commands plus archived earlier quick references

## Full Documentation Catalog

### Development And Onboarding
- [Architecture Overview](development/ARCHITECTURE.md)
- [Coding Conventions](development/CONVENTIONS.md)
- [Troubleshooting Guide](development/TROUBLESHOOTING.md)
- [Release Checklist](development/RELEASE_CHECKLIST.md)
- [Subagent Modularization Guide](development/SUBAGENT_MODULARIZATION_GUIDE.md)
- [Backend Module Ownership Map](development/BACKEND_MODULE_OWNERSHIP_MAP.md)
- [Compatibility Shim Deprecation Ledger](development/COMPATIBILITY_SHIM_DEPRECATION_LEDGER.md)
- [Retained Reference Patterns](development/reference-patterns/README.md)
- [Reference Repo Workspace](reference-repos.md)
- [Refactoring Notes](refactoring/README.md)
- [Backend Service Refactoring Guide](backend/BACKEND_SERVICE_REFACTORING_GUIDE.md)
- [Agent Terminology](../agents.md)
- [Quick Command Reference](quick-reference/QUICK_REFERENCE.md)

### Product And Features
- [Feature Docs Section](features/README.md)
- [Feature Matrix](features/FEATURE_MATRIX.md)
- [Product Docs Section](product/README.md)
- [Product Specification](product/product-spec.md)
- [User Personas](product/user-personas.md)
- [Persona Workflows](product/persona-workflows.md)
- [Open-Source CRM Benchmark](product/OPEN_SOURCE_NONPROFIT_CRM_BENCHMARK_2026-04.md)
- [Persona Analysis Skill Canon](../.codex/skills/nonprofit-manager-persona-analysis/references/source-map.md)
- [Persona Validation Skill Canon](../.codex/skills/nonprofit-manager-persona-validation/references/validation-rubric.md)
- [Benchmark Analysis Skill Canon](../.codex/skills/nonprofit-manager-benchmark-analysis/references/cohort-and-sources.md)
- [UI Docs Section](ui/README.md)
- [Quick Reference Section](quick-reference/README.md)

### Backend, Frontend, And API
- [Backend Guide](../backend/README.md)
- [Frontend Guide](../frontend/README.md)
- [Frontend Setup](../frontend/SETUP.md)
- [API Entry Point](api/README.md)
- [API Integration Guide](api/API_INTEGRATION_GUIDE.md)
- [OpenAPI Specification](api/openapi.yaml)
- [Postman Setup](api/postman/README.md)

### Testing And Validation
- [Testing Guide](testing/TESTING.md)
- [Integration Test Guide](testing/INTEGRATION_TEST_GUIDE.md)
- [Component Testing](testing/COMPONENT_TESTING.md)
- [Verification System](verification/VERIFICATION_SYSTEM.md)
- [Playwright E2E Guide](../e2e/README.md)
- [Testing Archive](testing/archive/README.md)
- [Validation And Audit Index](validation/README.md)
- [Validation Schemas Reference](validation/VALIDATION_SCHEMAS_REFERENCE.md)

### Deployment, Security, And Operations
- [Deployment Guide](deployment/DEPLOYMENT.md)
- [Database Setup And Migrations](deployment/DB_SETUP.md)
- [Publishing Deployment Guide](deployment/publishing-deployment.md)
- [Security Monitoring Guide](security/SECURITY_MONITORING_GUIDE.md)
- [Auth Alias Telemetry Operations Guide](security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md)
- [Auth Alias Deprecation Checklist](security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md)
- [Incident Response Runbook](security/INCIDENT_RESPONSE_RUNBOOK.md)
- [Plausible Analytics Setup](deployment/PLAUSIBLE_SETUP.md)
- [Log Aggregation Setup](deployment/LOG_AGGREGATION_SETUP.md)

### Governance And History
- [Planning and Progress](phases/planning-and-progress.md)
- [Phase 5 Development Plan](phases/PHASE_5_DEVELOPMENT_PLAN.md)
- [Modularity, Simplicity, and Reuse Plan](refactoring/MODULARITY_SIMPLICITY_REUSE_PLAN_2026-04.md)
- [P5-T6 Backlog Synthesis](phases/P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md)
- [P5-T6 Capability Briefs](phases/P5-T6_CAPABILITY_BRIEFS_2026-04-23.md)
- [P5-T6A Governance and Compliance Oversight Brief](phases/P5-T6A_GOVERNANCE_COMPLIANCE_BRIEF_2026-04-24.md)
- [P5-T6B Fundraising Stewardship and Restrictions Brief](phases/P5-T6B_FUNDRAISING_STEWARDSHIP_RESTRICTIONS_BRIEF_2026-04-25.md)
- [P5-T6C Service-Delivery Workflow Depth Brief](phases/P5-T6C_SERVICE_DELIVERY_WORKFLOW_DEPTH_BRIEF_2026-04-24.md)
- [Phase Archive Index](phases/archive/README.md)
- [Development Archive Index](development/archive/README.md)
- [Feature Archive Index](features/archive/README.md)
- [Performance Archive Index](performance/archive/README.md)
- [Product Archive Index](product/archive/README.md)
- [Quick Reference Archive Index](quick-reference/archive/README.md)
- [Security Archive Index](security/archive/README.md)
- [Testing Archive Index](testing/archive/README.md)
- [UI Archive Index](ui/archive/README.md)
- [Validation Archive Index](validation/archive/README.md)
- [Documentation Style Guide](DOCUMENTATION_STYLE_GUIDE.md)
- [Help Center Archive Note](archive/help-center/README.md)

## Quick Picks

- Need setup help fast? Open [development/GETTING_STARTED.md](development/GETTING_STARTED.md).
- Need the current workboard? Open [phases/planning-and-progress.md](phases/planning-and-progress.md).
- Need the Phase 5 roadmap? Open [phases/PHASE_5_DEVELOPMENT_PLAN.md](phases/PHASE_5_DEVELOPMENT_PLAN.md).
- Need reference repo locations or reuse rules? Open [reference-repos.md](reference-repos.md).
- Need archive history? Open [phases/archive/README.md](phases/archive/README.md).
- Need helper-script or workspace-package orientation? Open [../scripts/README.md](../scripts/README.md), [../database/README.md](../database/README.md), or [../contracts/README.md](../contracts/README.md).
