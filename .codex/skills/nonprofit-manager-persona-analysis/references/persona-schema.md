# Persona Schema

Use this file as the canonical field map for persona work in nonprofit-manager.

## Required Fields

| Field | Meaning |
|---|---|
| `canonical_role_boundary` | Role mapping block covering `maps_to_role_slug`, `mapping_source`, `confidence`, `confirmed_permissions`, `workflow_scope`, and `explicitly_inferred_scope` |
| `persona_id` | Stable planning slug for the persona |
| `operating_context` | The real-world environment, pressures, and constraints that shape how this role uses the app |
| `decision_authority` | The decisions this role can make directly and where it must escalate or collaborate |
| `collaboration_map` | The other roles, teams, or external stakeholders this persona hands work to or receives work from |
| `primary_modules` | Main product surfaces this role should reach without hunting |
| `usage_cadence` | Daily, weekly, monthly, or exception-driven rhythm in the app |
| `top_jobs` | Highest-value tasks this persona is trying to complete |
| `dashboard_report_needs` | Summary views, recurring reports, drill-downs, and packet needs |
| `core_artifacts` | Records, reports, notes, packets, exports, or approvals this role relies on |
| `sensitive_data_boundaries` | Data or control boundaries that should shape UX, defaults, and sharing |
| `adoption_constraints` | Onboarding, process, policy, or product gaps most likely to slow adoption |
| `success_signals` | What success looks like for this persona when the product is working well |
| `pain_points` | Product risks, confusion points, or workflow gaps most likely to block the role |
| `anchor_scenarios` | One primary scenario and one failure-mode scenario grounded in the current product |
| `external_analogs` | Comparable patterns from the external benchmark cohort that sharpen the persona |
| `evidence` | Local repo references and, when needed, stable external sources that justify the card |

## Evidence Rules

- Use current repo docs, route catalogs, permission sources, tests, and validation artifacts as the primary basis for persona claims.
- Label anything not explicit in the repo as `Inference`.
- Keep external analogs additive. They sharpen the persona but do not override current repo truth.
- When the repo changes, update the detailed skill references first, then adjust the summary docs under `docs/product`.

## Role Mapping Rules

- The canonical role slugs remain `admin`, `manager`, `staff`, `volunteer`, and `viewer`.
- Treat titles like `fundraiser`, `board-member`, and `rehab-worker` as planning personas, not guaranteed auth roles.
- When a persona spans multiple possible role slugs, state the default mapping and the condition that would move it.

## Update Discipline

- Keep persona cards role-based, not demographic.
- Preserve the six-persona v1 pack:
  - Executive Director
  - Fundraiser
  - Nonprofit Administrator
  - Board Member
  - Case Manager
  - Rehab Worker
- Track future candidates like Volunteer Coordinator or Event Operations as explicit follow-on personas instead of stretching the v1 cards.
