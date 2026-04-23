# Persona Workflow Summary

**Last Updated:** 2026-04-20

Use this document as the summary and navigation surface for persona workflows. The canonical detailed workflow set now lives in tracked persona-analysis references so status labels, workflow IDs, and role-specific patterns stay aligned with the skill suite and validation lanes.

## Canonical Detailed References

- [Workflow Models](../../.codex/skills/nonprofit-manager-persona-analysis/references/workflow-models.md)
- [Persona Validation Rubric](../../.codex/skills/nonprofit-manager-persona-validation/references/validation-rubric.md)
- [Persona Validation Findings Template](../../.codex/skills/nonprofit-manager-persona-validation/references/findings-template.md)

## Status Legend

- `supported`: product-native and stable enough for recurring use
- `partial`: core pieces exist, but key steps still rely on workaround or outside process
- `external only`: the app provides inputs or visibility, but the main outcome stays outside the product
- `missing`: no practical in-product realization today

## Workflow Summary Matrix

| Persona | High-signal supported or partial workflows | Main external or missing boundary | Primary surfaces |
|---|---|---|---|
| Executive Director | Monthly strategic board pack, restricted-funds stewardship gate, governance-risk escalation | Annual board and IRS 990 command-center flow remains external | Workbench, dashboards, reports, scheduled reports |
| Fundraiser | Prospect-to-pipeline, stewardship cadence, campaign and gift-entry review | Full donor-preference governance and richer grant or campaign deadline tooling remain partial | Contacts, accounts, donations, opportunities, reports |
| Nonprofit Administrator | User onboarding or offboarding access lifecycle is strongest; reporting and audit-risk review are partial | Compliance-documentation vault and retention workflow is still missing | Admin settings, users, reports, scheduled reports |
| Board Member | Governance meeting and packet review is partial but real | Delegation matrix, committee charter traceability, and recusal workflows remain missing | Saved reports, scheduled reports, dashboard |
| Case Manager | Intake, progress notes, handoffs, and closure continuity are partially supported | Person-centered reassessment rigor and standardized handoff packets remain incomplete | Cases, follow-ups, notes, portal-sharing surfaces |
| Rehab Worker | Assessment, follow-up cadence, referral transitions, and outcome tracking are partial | Individualized employment plan workflow remains missing | Cases, services, appointments, forms, portal workflows |

## Validation Crosswalk

| Persona | Best proof path | Outside-the-app boundary | When to use |
|---|---|---|---|
| Executive Director | `frontend/src/test/ux/personaWorkflowMatrix.ts` -> `frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx` -> `e2e/tests/persona-workflows.spec.ts` | board packets and 990/compliance follow-through | use when checking oversight, dashboard, or saved-report claims |
| Fundraiser | `frontend/src/test/ux/personaWorkflowMatrix.ts` -> `frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx` -> `e2e/tests/persona-workflows.spec.ts` | donor outreach and stewardship cadence | use when checking contacts, donations, and opportunity flow claims |
| Nonprofit Administrator | `frontend/src/test/ux/personaWorkflowMatrix.ts` -> `frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx` -> `e2e/tests/persona-workflows.spec.ts` | audit vault, retention, and corrective actions | use when checking admin settings, users, or scheduled-report claims |
| Board Member | `frontend/src/test/ux/personaWorkflowMatrix.ts` -> `frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx` -> `e2e/tests/persona-workflows.spec.ts` | committee governance and packet assembly | use when checking read-only report and dashboard claims |
| Case Manager | `frontend/src/test/ux/personaWorkflowMatrix.ts` -> `frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx` -> `e2e/tests/persona-workflows.spec.ts` | reassessment rigor and handoff packets | use when checking case, follow-up, or portal-sharing claims |
| Rehab Worker | `frontend/src/test/ux/personaWorkflowMatrix.ts` -> `frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx` -> `e2e/tests/persona-workflows.spec.ts` | individualized plan and placement tooling | use when checking service, appointment, or referral claims |

## Validation Context

- Use [docs/validation/archive/persona-workflow-audit-2026-04-18.md](../validation/archive/persona-workflow-audit-2026-04-18.md) for the last broad persona workflow audit snapshot.
- Use the tracked persona-validation references above for current methodology and new findings write-ups.
- Treat archive artifacts as historical evidence, not as live workboards.
