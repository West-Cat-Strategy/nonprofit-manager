# Production User Personas

**Last Updated:** 2026-04-20

Use this document as the summary and navigation surface for nonprofit-manager personas. The detailed canonical persona layer now lives in tracked repo-local skill references so persona-heavy product, UX, and roadmap work can use one source of truth without duplicating long-form role cards across docs.

## Canonical Detailed References

- [Persona Schema](../../.codex/skills/nonprofit-manager-persona-analysis/references/persona-schema.md)
- [Governance And Revenue Personas](../../.codex/skills/nonprofit-manager-persona-analysis/references/governance-and-revenue-personas.md)
- [Service-Delivery Personas](../../.codex/skills/nonprofit-manager-persona-analysis/references/service-delivery-personas.md)

## Companion Docs

- [Persona Workflow Summary](persona-workflows.md)
- [Open-Source CRM Benchmark Summary](OPEN_SOURCE_NONPROFIT_CRM_BENCHMARK_2026-04.md)
- [Product Specification](product-spec.md)

## Summary Matrix

| Persona | Default role mapping | Primary posture | Key surfaces | Main risk boundary |
|---|---|---|---|---|
| Executive Director | `admin` | Strategic oversight and escalation | Workbench, dashboards, reports, scheduled reports | Governance or compliance steps that still live outside the app |
| Fundraiser | `Inference: manager` | Revenue and donor stewardship operator | Contacts, accounts, donations, opportunities, reports | Restricted gifts, donor preferences, and payment-state ambiguity |
| Nonprofit Administrator | `admin` | System steward and access operator | Admin settings, users, reports, scheduled reports | Access drift, settings drift, and incomplete audit trails |
| Board Member | `Inference: viewer` | Read-only governance oversight | Dashboards, saved reports, scheduled reports | Dropping into builder or admin-style flows |
| Case Manager | `Inference: staff` | Frontline continuity coordinator | Cases, follow-ups, appointments, portal sharing | Privacy leakage or weak reassessment and handoff gates |
| Rehab Worker | `Inference: staff` | Service delivery and referral continuity lead | Cases, services, follow-ups, appointments, portal workflows | Rehab-specific workflow gaps and fragmented referral context |

## Role Model Caveats

- The canonical auth-role slugs remain `admin`, `manager`, `staff`, `volunteer`, and `viewer`.
- `fundraiser`, `board-member`, and `rehab-worker` are planning personas, not guaranteed auth roles.
- The detailed persona cards label `Inference` explicitly and keep role-mapping confidence attached to each card.

## Use This Summary For

- Quick orientation to the six-persona pack
- Linking product or feature docs to the correct persona lens
- Routing work into the detailed persona canon without re-reading the full reference set

## Future Expansion

Future personas such as Volunteer Coordinator or Event Operations should be added as new cards in the detailed canonical references rather than stretched into the current six-role pack.
