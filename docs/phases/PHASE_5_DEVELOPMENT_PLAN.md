# Phase 5 Development Plan

**Last Updated:** 2026-04-20

Use this document for the Phase 5 roadmap and sequencing. Use [planning-and-progress.md](planning-and-progress.md) for row-level tracked status.

## Summary

Phase 5 shifts the project from Phase 4 modularization and hardening closeout into product execution on three primary surfaces:

- Blast email plus the email builder/formatter
- Website builder plus the public website runtime
- Client portal workflows

Phase 5 still starts with docs, benchmark, and validation groundwork so later product work lands on a cleaner planning surface and a stronger testing contract.

## Phase 5 Goals

### Primary Product Goals

- Ship a stronger outbound messaging surface with reusable email composition and formatting.
- Improve the website builder authoring experience and the reliability of the public website runtime.
- Expand and polish the client portal as a first-class product surface.

### Enabling Goals

- Keep `docs/phases/` focused on live planning only.
- Run the full Playwright/E2E and testing-strategy review early enough to shape the rest of the phase.
- Refresh contributor docs and repo-local skills so future work routes cleanly.
- Use OSS benchmarking to drive the backlog instead of rediscovering well-known nonprofit CRM patterns from scratch.

## Execution Order

### 1. Phase Transition And Planning Refresh

- Refresh the workboard and create this Phase 5 plan.
- Move Phase 4 proof/history behind the phase archive index.
- Update contributor docs, docs indexes, runtime guidance, and repo-local skills.
- Publish the OSS benchmark and tooling evaluation.

### 2. Early Validation And Testing Review

- Run the full host Playwright matrix and the full Docker-backed E2E slices.
- Review overall test coverage, CI/runtime split, and verification strategy.
- Publish concrete recommendations for which lanes should stay early-phase gates.

### 3. Product Wave: Email Platform

- Build out blast-email workflow requirements and supporting authoring/formatting.
- Reuse or tighten the current template, Mailchimp, scheduled-report, and notification surfaces where practical.
- Define preview, QA, and delivery-reliability expectations before deep implementation.

### 4. Product Wave: Website Surfaces

- Improve the builder editing surface, template/publish workflow, and runtime reliability for public pages and forms.
- Keep public-site runtime docs, contributor docs, and E2E coverage aligned with the implemented behavior.

### 5. Product Wave: Client Portal

- Focus on portal UX, messaging, documents, forms, appointments, and client-facing navigation.
- Use persona/workflow audit findings to prioritize the highest-value staff and client journeys.

### 6. Later-Wave Backlog

- Metadata-driven customization and workflow tooling
- Memberships, appeals, and fundraising depth
- Program-service and nonprofit finance operations
- Optional scaffolding or generator support for new modules and extensions

## Workstreams

| Row | Scope | Main Outputs | Dependencies | Exit Criteria |
|---|---|---|---|---|
| `P5-T1` | Docs, archive, benchmark, and skills refresh | Live Phase 5 workboard, benchmark doc, archive cleanup, contributor/runtime docs, refreshed skills | none | Top-level `docs/phases/` reads as live planning only; benchmark and touched skills validate cleanly |
| `P5-T2` | Full Playwright/E2E plus testing-strategy review | Runtime review note, coverage gap summary, recommended CI/runtime updates | `P5-T1` docs/runtime cleanup | Full host and Docker review lanes complete with written follow-through and workboard impact |
| `P5-T3` | Blast email and email builder/formatter | Feature plan, implementation slice, validation slice, follow-on backlog | `P5-T2` for reliable validation lanes | Authoring, preview, formatting, and delivery workflow are reviewable with explicit tests |
| `P5-T4` | Website builder and public website | Builder UX follow-through, publish/runtime reliability, public-site validation | `P5-T1`, `P5-T2` | Builder and public runtime docs/tests match the current surface |
| `P5-T5` | Client portal | Portal UX and workflow follow-through across messaging/documents/forms/appointments | `P5-T2` and Phase 5 product prioritization | Portal journeys are supported by current docs, routes, and targeted validation |
| `P5-T6` | Later-wave backlog from research and repo review | Prioritized backlog for customization, fundraising depth, and program/finance ops | benchmark + early product waves | Clear later-wave candidates exist without overloading active rows |

## Backlog Revealed By Repo Review

### Immediate Follow-through

- Contributor docs still needed a current archive/live split, public-site runtime guidance, worker runtime guidance, and explicit workspace documentation.
- Feature inventory needed to match actual routed surfaces instead of earlier Phase 4 framing.
- Skills needed better resumption guidance, cleaner runtime ownership, and clearer audit routing.

### Product Backlog From Benchmarking

- Memberships, appeals, and richer donor/member outreach depth
- Metadata-driven forms, workflow/approval builders, and configurable schema extensions
- Nonprofit finance operations such as stronger reconciliation and project-restricted donation handling
- Program-service patterns such as registry/program/payment separation, richer case templates, and workflow scaffolding

### Governance And Compliance Backlog

The archived executive-director remediation tracker surfaced a governance/compliance slice that should stay visible as later-wave backlog instead of living in a closed validation tracker:

- Dedicated governance-risk escalation workspace for executive and board follow-through
- Board conflict-of-interest disclosure and recusal workflow
- Delegation-authority matrix and committee charter traceability
- Annual board and 990 compliance command center, while keeping legal review and filing workflows explicitly external where needed
- Compliance-documentation vault and retention workflow for governance, audit, and records-management artifacts

## Tooling Evaluation

### High-Value Candidates

- `@hey-api/openapi-ts`: generate safer frontend clients and reduce hand-written API drift once the OpenAPI surface is trusted enough.
- `@tanstack/react-form`: improve complex authoring and settings flows with a stronger form-state model.
- `@tanstack/react-table`: standardize dense admin/data surfaces without imposing a visual system.
- OpenTelemetry JS: add standardized tracing and metrics across auth, payments, webhooks, and runtime-critical flows.
- Playwright harness cleanup patterns: keep the host-vs-Docker contract explicit and reduce long-run audit drift.
- Repo-local module or extension generator: reduce repetitive setup for new modules, docs, and validation wiring.

### Decision Rule

- Borrow platform patterns and tooling where they reduce drift or repetitive work.
- Do not rewrite the stack to match other projects; keep the current TypeScript/React/Express/Postgres architecture.

## External Benchmarks

The current benchmark and follow-on references live in [../product/OPEN_SOURCE_NONPROFIT_CRM_BENCHMARK_2026-04.md](../product/OPEN_SOURCE_NONPROFIT_CRM_BENCHMARK_2026-04.md).

Primary analogs:

- CiviCRM for nonprofit-native fundraising, memberships, and campaign workflows
- OpenSPP and Sahana Eden for service-program and case-management patterns
- OpenPetra for nonprofit finance operations
- ERPNext and SuiteCRM for metadata-driven customization and workflow tooling

## Exit Criteria

Phase 5 is on track when:

- The live workboard and Phase 5 plan stay current without leaking historical proof back into top-level `docs/phases/`.
- The early Playwright/E2E and testing-strategy review is complete and influences later lanes.
- Email, website, and portal work each have explicit tracked rows with current validation guidance.
- The benchmark doc and tooling evaluation remain visible inputs to later-wave backlog decisions.
