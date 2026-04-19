# Documentation Index

**Last Updated:** 2026-04-18

Use this file as the guided catalog for the repository. If you are new to the codebase, start with [../CONTRIBUTING.md](../CONTRIBUTING.md) and [development/GETTING_STARTED.md](development/GETTING_STARTED.md) before browsing the rest of this index.

## Contributor Path

Read these first when you are contributing:

1. [../CONTRIBUTING.md](../CONTRIBUTING.md) for workflow, validation, and handoff expectations
2. [development/GETTING_STARTED.md](development/GETTING_STARTED.md) for runtime choice, ports, and setup
3. [../README.md](../README.md) for product context
4. [development/CONVENTIONS.md](development/CONVENTIONS.md) for repo conventions
5. [development/ARCHITECTURE.md](development/ARCHITECTURE.md) for current system shape
6. [testing/TESTING.md](testing/TESTING.md) for the validation matrix
7. [phases/planning-and-progress.md](phases/planning-and-progress.md) before tracked work

## Source Of Truth Boundaries

| Need | Primary Doc | Notes |
|---|---|---|
| Product overview and contributor handoff | [../README.md](../README.md) | User-facing overview first, contributor handoff second |
| Contributor workflow and review expectations | [../CONTRIBUTING.md](../CONTRIBUTING.md) | Start here before editing |
| Runtime setup, ports, and local env choices | [development/GETTING_STARTED.md](development/GETTING_STARTED.md) | Keep runtime guidance here instead of spreading it across docs |
| Coding-agent guardrails | [development/AGENT_INSTRUCTIONS.md](development/AGENT_INSTRUCTIONS.md) | Repo-specific rules after the contributor path is clear |
| Testing command map | [testing/TESTING.md](testing/TESTING.md) | Use for change-driven validation selection |
| Current ownership and tracked status | [phases/planning-and-progress.md](phases/planning-and-progress.md) | Source of truth for tracked work |
| Docs landing page | [README.md](README.md) | Short navigation page for the docs directory |
| Full documentation catalog | This file | Guided category map for the broader doc set |

## Contributor Setup And Workflow

Use this section when you are getting oriented or deciding which repo guide owns a question.

| Document | Open This When |
|---|---|
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | You need the contributor workflow, handoff rules, or validation defaults |
| [development/GETTING_STARTED.md](development/GETTING_STARTED.md) | You need runtime selection, setup steps, ports, or env expectations |
| [development/CONVENTIONS.md](development/CONVENTIONS.md) | You need repo conventions for commands, paths, or active patterns |
| [development/ARCHITECTURE.md](development/ARCHITECTURE.md) | You need the current backend/frontend architecture shape |
| [development/AGENT_INSTRUCTIONS.md](development/AGENT_INSTRUCTIONS.md) | You are acting as a coding agent and need repo guardrails |
| [development/SUBAGENT_MODULARIZATION_GUIDE.md](development/SUBAGENT_MODULARIZATION_GUIDE.md) | A tracked modularization task needs coordinated parallel lanes |
| [development/TROUBLESHOOTING.md](development/TROUBLESHOOTING.md) | Setup or runtime behavior is not matching the expected contract |
| [development/RELEASE_CHECKLIST.md](development/RELEASE_CHECKLIST.md) | You are preparing release or handoff work |
| [../agents.md](../agents.md) | You need the repo’s terminology and orientation for developer agents, multi-agent coordination, or user-agent tracking |
| [../backend/README.md](../backend/README.md) | You need backend-specific runtime or architecture details |
| [../frontend/README.md](../frontend/README.md) | You need frontend-specific runtime or feature-ownership details |
| [../frontend/SETUP.md](../frontend/SETUP.md) | You need extra frontend-only setup details |
| [../scripts/README.md](../scripts/README.md) | You need the helper-script index |

## Testing And Quality

Start with [testing/TESTING.md](testing/TESTING.md) when choosing checks. Use the narrower guides only when the change or failure mode calls for them.

| Document | Open This When |
|---|---|
| [testing/TESTING.md](testing/TESTING.md) | You need the active test matrix or runtime-aware validation guidance |
| [testing/COMPONENT_TESTING.md](testing/COMPONENT_TESTING.md) | You are working on frontend component tests |
| [testing/INTEGRATION_TEST_GUIDE.md](testing/INTEGRATION_TEST_GUIDE.md) | You need backend integration-test workflow details |
| [testing/MANUAL_TESTING_GUIDE.md](testing/MANUAL_TESTING_GUIDE.md) | You need the narrower manual QA checklist |
| [../e2e/README.md](../e2e/README.md) | You are using Playwright or triaging browser-driven checks |

## API And Integrations

Use [api/README.md](api/README.md) as the entry point for API docs. Active application endpoints should be documented on `/api/v2/*` except the documented health aliases.

| Document | Open This When |
|---|---|
| [api/README.md](api/README.md) | You need the API doc entry point or host/runtime assumptions |
| [api/API_REFERENCE_DASHBOARD_ALERTS.md](api/API_REFERENCE_DASHBOARD_ALERTS.md) | You need dashboard or alerts endpoint details |
| [api/API_REFERENCE_EVENTS.md](api/API_REFERENCE_EVENTS.md) | You need event endpoint details |
| [api/API_REFERENCE_EXPORT.md](api/API_REFERENCE_EXPORT.md) | You need reporting or export endpoint details |
| [api/API_INTEGRATION_GUIDE.md](api/API_INTEGRATION_GUIDE.md) | You need Stripe, Mailchimp, or webhook integration guidance |
| [api/postman/README.md](api/postman/README.md) | You need Postman collection setup details |
| [api/openapi.yaml](api/openapi.yaml) | You need the OpenAPI contract source |

## Deployment And Operations

Use this section for environment, infrastructure, and operational guidance rather than contributor setup.

| Document | Open This When |
|---|---|
| [deployment/DEPLOYMENT.md](deployment/DEPLOYMENT.md) | You need the deployment workflow or hosting expectations |
| [deployment/DB_SETUP.md](deployment/DB_SETUP.md) | You need database setup or migration details |
| [deployment/PLAUSIBLE_SETUP.md](deployment/PLAUSIBLE_SETUP.md) | You are configuring Plausible analytics |
| [deployment/LOG_AGGREGATION_SETUP.md](deployment/LOG_AGGREGATION_SETUP.md) | You are setting up ELK or log aggregation |

## Product, Features, And Help Center

Use this section when you need product behavior, staff workflow context, or feature-level reference material.

| Document | Open This When |
|---|---|
| [help-center/staff/index.html](help-center/staff/index.html) | You need the staff help-center hub |
| [help-center/staff/quick-start.html](help-center/staff/quick-start.html) | You need first-day staff onboarding steps |
| [help-center/staff/workspace-basics.html](help-center/staff/workspace-basics.html) | You need shared workspace behavior |
| [help-center/staff/people-accounts.html](help-center/staff/people-accounts.html) | You need people or account workflow details |
| [help-center/staff/cases.html](help-center/staff/cases.html) | You need staff case workflow guidance |
| [help-center/staff/volunteers.html](help-center/staff/volunteers.html) | You need volunteer workflow details |
| [help-center/staff/events.html](help-center/staff/events.html) | You need event workflow details |
| [help-center/staff/donations.html](help-center/staff/donations.html) | You need donation workflow details |
| [help-center/staff/dashboard-analytics.html](help-center/staff/dashboard-analytics.html) | You need dashboard or analytics workflow details |
| [help-center/staff/reports.html](help-center/staff/reports.html) | You need report-builder or scheduled-report guidance |
| [help-center/staff/faq.html](help-center/staff/faq.html) | You need staff troubleshooting or FAQ guidance |
| [help-center/staff/beta-appendix.html](help-center/staff/beta-appendix.html) | You need deferred-area or beta boundary notes |
| [help-center/portal/cases.html](help-center/portal/cases.html) | You need portal case-sharing workflow guidance |
| [features/FEATURE_MATRIX.md](features/FEATURE_MATRIX.md) | You need the feature inventory and status map |
| [features/PEOPLE_MODULE_ENHANCEMENTS.md](features/PEOPLE_MODULE_ENHANCEMENTS.md) | You need people-module notes |
| [features/TASK_MANAGEMENT.md](features/TASK_MANAGEMENT.md) | You need task-management behavior notes |
| [features/CASE_CLIENT_VISIBILITY_AND_FILES.md](features/CASE_CLIENT_VISIBILITY_AND_FILES.md) | You need portal case visibility/file rules |
| [product/product-spec.md](product/product-spec.md) | You need the product specification |
| [product/user-personas.md](product/user-personas.md) | You need the production user persona pack for product and UX planning |
| [product/persona-workflows.md](product/persona-workflows.md) | You need the persona workflow planning pack that maps production roles to real-world app workflows and current coverage gaps |
| [product/STRIPE_TESTING_GUIDE.md](product/STRIPE_TESTING_GUIDE.md) | You need Stripe-related product testing workflows |

## Security, Validation, And Performance

Use these docs when the task touches operational safety, schema references, or performance analysis.

| Document | Open This When |
|---|---|
| [security/SECURITY_MONITORING_GUIDE.md](security/SECURITY_MONITORING_GUIDE.md) | You need the active security monitoring contract |
| [security/INCIDENT_RESPONSE_RUNBOOK.md](security/INCIDENT_RESPONSE_RUNBOOK.md) | You need incident response procedures |
| [validation/VALIDATION_SCHEMAS_REFERENCE.md](validation/VALIDATION_SCHEMAS_REFERENCE.md) | You need validation schema reference material |
| [validation/persona-workflow-audit-2026-04-18.md](validation/persona-workflow-audit-2026-04-18.md) | You need the evidence-first persona workflow audit comparing the current persona docs against runnable repo proof and drift |
| [validation/staff-app-ui-ux-strategic-audit-2026-04-18.md](validation/staff-app-ui-ux-strategic-audit-2026-04-18.md) | You need the staff-app-only UI/UX audit covering navigation, workflow ergonomics, visual cohesion, and the current live-runtime blockers |
| [performance/PERFORMANCE_OPTIMIZATION.md](performance/PERFORMANCE_OPTIMIZATION.md) | You need active performance guidance |
| [performance/PERFORMANCE_OPTIMIZATION_REPORT.md](performance/PERFORMANCE_OPTIMIZATION_REPORT.md) | You need the historical optimization report |

## Planning, History, And Governance

Use this section for tracked work, archived records, and documentation governance.

| Document | Open This When |
|---|---|
| [phases/planning-and-progress.md](phases/planning-and-progress.md) | You need current tracked work, owners, or blockers |
| [phases/archive/README.md](phases/archive/README.md) | You need archived phase documents |
| [DOCUMENTATION_STYLE_GUIDE.md](DOCUMENTATION_STYLE_GUIDE.md) | You need documentation formatting or wording rules |

## Quick Picks

- Need setup help fast? Open [development/GETTING_STARTED.md](development/GETTING_STARTED.md).
- Need contributor workflow rules? Open [../CONTRIBUTING.md](../CONTRIBUTING.md).
- Need agent-specific repo guardrails? Open [development/AGENT_INSTRUCTIONS.md](development/AGENT_INSTRUCTIONS.md).
- Need the current workboard? Open [phases/planning-and-progress.md](phases/planning-and-progress.md).
- Need the API doc entry? Open [api/README.md](api/README.md).
