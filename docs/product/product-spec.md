# Product Specification

**Last Updated:** 2026-04-22

Use this file as the current-state product reference for Nonprofit Manager. For mounted route inventory, use [../features/FEATURE_MATRIX.md](../features/FEATURE_MATRIX.md). For active sequencing and tracked scope, use [../phases/PHASE_5_DEVELOPMENT_PLAN.md](../phases/PHASE_5_DEVELOPMENT_PLAN.md) and [../phases/planning-and-progress.md](../phases/planning-and-progress.md).

## Companion Docs

- [README.md](README.md)
- [user-personas.md](user-personas.md)
- [persona-workflows.md](persona-workflows.md)
- [OPEN_SOURCE_NONPROFIT_CRM_BENCHMARK_2026-04.md](OPEN_SOURCE_NONPROFIT_CRM_BENCHMARK_2026-04.md)
- [../api/README.md](../api/README.md)

## Product Position

Nonprofit Manager is a unified nonprofit operations platform that combines the staff workspace, reporting layer, grants, website publishing, public-site delivery, client portal workflows, and third-party integrations in one self-hostable product surface.

The current product is route-first rather than roadmap-first. This spec describes the surfaces that are mounted now and the near-term product focus that Phase 5 is prioritizing.

## Current Product Surfaces

| Surface | Current scope | Companion docs |
|---|---|---|
| Staff app | Workbench, people/accounts/volunteers, intake and interaction workflows, events, tasks, cases, follow-ups, opportunities, meetings, external service providers, donations, recurring giving, reconciliation, and admin/settings surfaces | [../features/FEATURE_MATRIX.md](../features/FEATURE_MATRIX.md), [user-personas.md](user-personas.md) |
| Reporting and analytics | Dashboard views, custom dashboards, alerts, report builder, saved reports, scheduled reports, outcomes reporting, workflow coverage, analytics exports, and executive/board-ready reporting surfaces | [../features/REPORTING_GUIDE.md](../features/REPORTING_GUIDE.md), [user-personas.md](user-personas.md) |
| Grants | Routed grants workspace for funders, programs, recipients, funded programs, applications, awards, disbursements, reports, documents, calendar, and activities | [../features/FEATURE_MATRIX.md](../features/FEATURE_MATRIX.md), [persona-workflows.md](persona-workflows.md) |
| Website builder | Template gallery, editor, and preview flows used to author publishing surfaces inside the staff workspace | [../features/TEMPLATE_SYSTEM.md](../features/TEMPLATE_SYSTEM.md), [OPEN_SOURCE_NONPROFIT_CRM_BENCHMARK_2026-04.md](OPEN_SOURCE_NONPROFIT_CRM_BENCHMARK_2026-04.md) |
| Website console | Site-level overview, content, newsletters, forms, integrations, publishing, and builder entrypoints for managed sites | [../features/FEATURE_MATRIX.md](../features/FEATURE_MATRIX.md), [../api/README.md](../api/README.md) |
| Public-site runtime | Dedicated public runtime for events, newsletters, forms, and event check-in, backed by public `/api/v2` contracts and distinct deployment/runtime expectations | [../features/FEATURE_MATRIX.md](../features/FEATURE_MATRIX.md), [../deployment/DEPLOYMENT.md](../deployment/DEPLOYMENT.md) |
| Portal | Public onboarding/auth flows plus the authenticated client portal for profile, people, calendar, events, messages, cases, appointments, documents, notes, forms, and reminders | [../features/CASE_CLIENT_VISIBILITY_AND_FILES.md](../features/CASE_CLIENT_VISIBILITY_AND_FILES.md), [persona-workflows.md](persona-workflows.md) |
| Messaging | Staff team chat, portal messaging, scheduled report delivery, and the admin communications workspace at `/settings/communications` for Mailchimp-backed blast-email authoring, preview, scheduling, and delivery | [user-personas.md](user-personas.md), [../features/FEATURE_MATRIX.md](../features/FEATURE_MATRIX.md) |
| Integrations | Payments, reconciliation, Mailchimp, webhooks, external service providers, public API contracts, and schema/tooling docs for system-to-system workflows | [../api/README.md](../api/README.md), [../api/API_INTEGRATION_GUIDE.md](../api/API_INTEGRATION_GUIDE.md) |

## Product Expectations

- Reporting is a first-class surface, not an admin afterthought. Leadership, fundraising, grants, and service-delivery workflows depend on reusable reports, exports, alerts, and scheduled delivery.
- Publishing and public-facing experiences are part of the product, not a separate marketing sidecar. The website builder, website console, and public-site runtime are all active product surfaces.
- The client portal is part of the core operating model. Portal authentication, appointments, documents, forms, messages, and case-facing workflows should be treated as primary user journeys.
- Integrations are expected to coexist with self-hosted deployment. The product supports `/api/v2` contracts, webhook delivery, public routes, and provider-backed operations without assuming a single hosted SaaS deployment model.

## Phase 5 Focus Areas

Phase 5 product execution centers on three explicit waves from the active plan:

1. Blast email plus the email builder/formatter.
2. Website builder plus the public website runtime.
3. Client portal workflows.

In current product terms, that means:

- Expanding outbound messaging beyond the existing Mailchimp and notification baseline into a stronger authoring, preview, formatting, and delivery surface, while keeping `/api/v2/mailchimp/*` as the campaign contract and `/settings/communications` as the canonical staff workspace.
- Improving builder authoring UX, site-console publishing flows, and public-site reliability for public pages, newsletters, and forms.
- Treating the portal as a first-class product area across messaging, documents, forms, appointments, and client-facing navigation.

## Follow-On Backlog

These are the short-form follow-on gaps that remain after the primary Phase 5 waves and align with the benchmark plus the current Phase 5 plan:

- Metadata-driven forms, workflow builders, approvals, and configurable schema extensions.
- Memberships, appeals, and richer fundraising or constituent-outreach depth.
- Nonprofit finance operations beyond the current donation and reconciliation baseline, including stronger restricted-funds, disbursement, and budgeting workflows.
- Program-service workflow depth such as richer case templates, grievance/escalation patterns, and more specialized service-outcome tooling.
