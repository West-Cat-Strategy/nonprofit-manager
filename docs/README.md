# Documentation Home

**Last Updated:** 2026-04-19

Welcome to the Nonprofit Manager documentation hub. Use this guide to find setup instructions, architectural overviews, and feature specifications.

## Start Here

If you are contributing to the repository, follow this path in order:

1. [**Contributor Workflow**](../CONTRIBUTING.md) - Essential rules for code, docs, and validation.
2. [**Getting Started**](development/GETTING_STARTED.md) - Local setup, ports, and runtime choices.
3. [**Conventions**](development/CONVENTIONS.md) - Code style, directory structure, and active patterns.
4. [**Agent Instructions**](development/AGENT_INSTRUCTIONS.md) - Repo guardrails and architecture boundaries.
5. [**Testing Matrix**](testing/TESTING.md) - Choose the smallest honest validation set.
6. This file when you need the rest of the docs map.

If the task is tracked or resumed, open [**Planning and Progress**](phases/planning-and-progress.md) before editing and check `Recent Thread Follow-through` first when you are continuing recent interrupted work.

## Source Of Truth Map

| Topic | Primary Doc | Notes |
|---|---|---|
| Product & Strategy | [../README.md](../README.md) | User-facing overview and contributor handoff |
| Contributor Workflow | [../CONTRIBUTING.md](../CONTRIBUTING.md) | Start here before any edits |
| Environment & Setup | [development/GETTING_STARTED.md](development/GETTING_STARTED.md) | Runtime, ports, and local environment |
| AI Agent Guardrails | [development/AGENT_INSTRUCTIONS.md](development/AGENT_INSTRUCTIONS.md) | Repo-specific rules for coding assistants |
| Validation & Testing | [testing/TESTING.md](testing/TESTING.md) | Active test-command selection map |
| Validation & Audit Artifacts | [validation/README.md](validation/README.md) | Audit snapshots, remediation trackers, and validation reference docs |
| Live Project Status | [phases/planning-and-progress.md](phases/planning-and-progress.md) | Current tracked work and blockers; check `Recent Thread Follow-through` first when resuming recent work |
| Repository Index | This file | Guided category map for all documentation |

---

## Full Documentation Catalog

### Development & Onboarding
- [Architecture Overview](development/ARCHITECTURE.md)
- [Coding Conventions](development/CONVENTIONS.md)
- [Troubleshooting Guide](development/TROUBLESHOOTING.md)
- [Release Checklist](development/RELEASE_CHECKLIST.md)
- [Subagent Modularization Guide](development/SUBAGENT_MODULARIZATION_GUIDE.md)
- [Agent Terminology](../agents.md)
- [Quick Command Reference](quick-reference/QUICK_REFERENCE.md)

### Backend & API
- [Backend Architecture](../backend/README.md)
- [API Entry Point](api/README.md)
- [API Integration Guide (Stripe, Mailchimp, Webhooks)](api/API_INTEGRATION_GUIDE.md)
- [OpenAPI Specification](api/openapi.yaml)
- [Postman Setup](api/postman/README.md)

### Frontend & UI
- [Frontend Architecture](../frontend/README.md)
- [Frontend Setup](../frontend/SETUP.md)
- [Component Testing](testing/COMPONENT_TESTING.md)
- [Theme System](THEME_SYSTEM.md)
- [UI Style Template](ui/user_interface_template_information.md)

### Testing & Quality
- [Test Matrix (Main)](testing/TESTING.md)
- [Integration Test Guide](testing/INTEGRATION_TEST_GUIDE.md)
- [Testing Archive](testing/archive/README.md)
- [Playwright E2E Setup](../e2e/README.md)
- [Validation & Audit Index](validation/README.md)
- [Validation Schemas Reference](validation/VALIDATION_SCHEMAS_REFERENCE.md)

### Features & Product
- [Feature Matrix](features/FEATURE_MATRIX.md)
- [Product Specification](product/product-spec.md)
- [User Personas](product/user-personas.md)
- [Persona Workflows](product/persona-workflows.md)

### Deployment & Operations
- [Deployment Guide](deployment/DEPLOYMENT.md)
- [Database Setup & Migrations](deployment/DB_SETUP.md)
- [Security Monitoring Guide](security/SECURITY_MONITORING_GUIDE.md)
- [Incident Response Runbook](security/INCIDENT_RESPONSE_RUNBOOK.md)
- [Plausible Analytics Setup](deployment/PLAUSIBLE_SETUP.md)
- [Log Aggregation Setup](deployment/LOG_AGGREGATION_SETUP.md)

### Governance & History
- [Planning and Progress](phases/planning-and-progress.md)
- [Documentation Style Guide](DOCUMENTATION_STYLE_GUIDE.md)
- [Help Center Archive Note](archive/help-center/README.md)
- [Historical Archives](phases/archive/README.md)

---

## Quick Picks

- Need setup help fast? Open [development/GETTING_STARTED.md](development/GETTING_STARTED.md).
- Need contributor rules? Open [../CONTRIBUTING.md](../CONTRIBUTING.md).
- Need the current workboard? Open [phases/planning-and-progress.md](phases/planning-and-progress.md).
- Need audit artifacts or validation references? Open [validation/README.md](validation/README.md).
- Need the API doc entry? Open [api/README.md](api/README.md).
