# P5-T6C Service-Delivery Workflow Depth Brief (2026-04-24)

**Last Updated:** 2026-04-24

This brief scopes the smallest later-wave service-delivery workflow depth slice for `P5-T6C`. It is planning-only: it records repo evidence, inferred future scope, landing zones, sequencing, and handoff notes without authorizing runtime implementation.

## Inputs

- [planning-and-progress.md](planning-and-progress.md)
- [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md)
- [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md)
- [../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md](../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md)
- [../product/persona-workflows.md](../product/persona-workflows.md)
- [../features/CASE_MANAGEMENT_SYSTEM.md](../features/CASE_MANAGEMENT_SYSTEM.md)
- [../features/CASE_CLIENT_VISIBILITY_AND_FILES.md](../features/CASE_CLIENT_VISIBILITY_AND_FILES.md)
- [../api/API_REFERENCE_PORTAL_APPOINTMENTS.md](../api/API_REFERENCE_PORTAL_APPOINTMENTS.md)
- [../../.codex/skills/nonprofit-manager-persona-analysis/references/service-delivery-personas.md](../../.codex/skills/nonprofit-manager-persona-analysis/references/service-delivery-personas.md)
- [../../.codex/skills/nonprofit-manager-persona-analysis/references/workflow-models.md](../../.codex/skills/nonprofit-manager-persona-analysis/references/workflow-models.md)
- [../../.codex/skills/nonprofit-manager-persona-validation/references/validation-rubric.md](../../.codex/skills/nonprofit-manager-persona-validation/references/validation-rubric.md)

## Scope

`P5-T6C` should tighten five service-delivery gaps already visible in the persona audit:

| Capability | Current posture | Later-wave intent |
|---|---|---|
| Reassessment cadence | `partial`: cases, notes, services, follow-ups, and reports exist, but recurring reassessment is not one explicit cycle | Add a case-scoped reassessment cadence with due dates, owner, status, summary, and follow-up linkage |
| Structured handoff packets | `partial`: case detail, notes, outcomes, documents, follow-ups, portal forms, and appointments can supply context, but no packet owns transfer readiness | Add a lightweight handoff packet that assembles current status, risks, next actions, visibility boundaries, and linked artifacts |
| Closure continuity | `partial`: closure reason and case history exist, but continuity after closure is procedural | Add a closure-continuity checklist with final summary, open follow-ups, portal-visible materials, and reassignment or referral notes |
| Rehab planning artifacts | `missing` for individualized employment plan workflow and `partial` for rehab-specific templates | Add shared case/service planning artifacts that can carry rehab goals, service plan updates, and placement/outcome context before any rehab-only module |
| Authorization and referral depth | `partial`: referral source, services, appointments, forms, messages, and follow-ups exist, but authorization or referral transitions are not first-class | Add typed referral or authorization handoff metadata on top of case services, appointments, case forms, and follow-ups |

## Confirmed Repo Evidence

- Case Manager maps to inferred `staff` with high confidence and already has case lifecycle, follow-ups, notes, services, appointments, portal visibility controls, documents, outcomes, and selective client sharing. The repo does not prove a standardized reassessment cycle, structured handoff packet, or closure-continuity workflow.
- Rehab Worker maps to inferred `staff` with high confidence and reuses case, service, follow-up, appointment, form, and portal collaboration surfaces. The repo does not prove an individualized employment plan workflow, rehab-specific templates, placement benchmarking, or first-class authorization routing.
- The `P5-T5` portal forms inbox slice and case-aware appointments-continuity slice give later service-delivery work stable portal/case context to build on, but focused portal Playwright follow-through and broad Docker signoff still stay with `P5-T2B` and `P5-T5`.
- The `P5-T6` capability packet marks public-intake resolution, queue view definitions, typed portal review requests, volunteer dispatch ergonomics, workflow-program operations, service-site routing, and revision-capable case-form review as inputs. Only separately signed-out rows may turn those planning targets into runtime implementation.
- Current proof lives in route contracts, persona route smoke coverage, portal workflow tests, case/portal feature docs, and the persona workflow audit. The audit also records that browser proof was implemented but local host proof was blocked by a non-default admin credential precondition.

## Inferred Future Scope

These are future planning targets, not current product claims:

| Future target | Type intent | Concrete landing zones |
|---|---|---|
| `case_reassessment_cycle` | Case-scoped review cadence with owner, due date, status, summary, and linked follow-up outcomes | `backend/src/modules/cases/**`, `frontend/src/features/cases/**`, `frontend/src/features/followUps/**` |
| `case_handoff_packet` | A generated or saved transfer summary built from case detail, notes, documents, outcomes, services, appointments, forms, and portal visibility state | `frontend/src/features/cases/pages/CaseDetailPage.tsx`, `frontend/src/features/cases/caseForms/**`, `backend/src/modules/cases/**` |
| `closure_continuity_checklist` | A closure-support artifact that records unresolved actions, continuity owner, portal-facing materials, and referral or reassignment context | `backend/src/modules/cases/queries/lifecycleQueries.ts`, `frontend/src/features/cases/**`, `frontend/src/features/portal/**` |
| `service_plan_artifact` | Shared case/service planning records for rehab goals, service plan updates, and placement or outcome context before a rehab-only fork | `frontend/src/components/cases/CaseServices.tsx`, `backend/src/modules/cases/queries/servicesQueries.ts`, `backend/src/modules/cases/repositories/caseServicesRepository.ts` |
| `referral_authorization_handoff` | Typed authorization, referral, or partner-handoff metadata connected to services, appointments, case forms, and follow-ups | `backend/src/modules/cases/usecases/caseForms.usecase.staff.ts`, `backend/src/modules/portalAdmin/services/portalAppointmentStatusWorkflow.ts`, `frontend/src/features/followUps/**` |
| `service_site` | Optional typed site reference and snapshot label/status for services and appointment slots while preserving current free-text location fallback | `backend/src/modules/portalAdmin/services/portalAppointmentSlotService/**`, `backend/src/modules/portal/mappers/**`, `frontend/src/components/cases/CaseServices.tsx` |

## Sequencing

1. Start with `case_reassessment_cycle` because recurring review cadence is the smallest cross-role depth improvement and can reuse cases plus follow-ups without changing portal routing.
2. Add `case_handoff_packet` by assembling existing case detail, service, form, appointment, and portal-visibility data before creating new service-delivery entities.
3. Add `closure_continuity_checklist` after handoff packets so closure has the same next-action and visibility vocabulary.
4. Add `referral_authorization_handoff` inside case forms, follow-ups, appointments, and services before introducing a broader workflow registry.
5. Add `service_plan_artifact` and optional `service_site` references once services and appointments share stable snapshot language; keep free-text provider and location fallbacks during the first implementation.
6. Reconsider a reusable transition registry only after at least two concrete service-delivery seams prove the same status, owner, due-date, side-effect, and audit primitives.

## Non-Goals

- Do not build a generic workflow studio, metadata builder, custom-field platform, or no-code approval engine from this brief.
- Do not create a rehab-only module before shared case, service, appointment, form, and follow-up seams have been deepened.
- Do not claim full eligibility governance, authorization compliance, placement benchmarking, service-point operations, or grievance-management parity.
- Do not replace current free-text provider or location fields in the first slice; typed service-site routing should be additive and snapshot-based.
- Do not treat generic portal messages as typed escalations, authorization decisions, or referral approvals without a separately scoped model and tests.
- Do not move runtime implementation out of `P5-T2B`, `P5-T5`, or future scoped rows just because this planning artifact exists.

## Validation And Handoff Notes

- Docs-only validation for this brief is `make check-links`. Run `make lint-doc-api-versioning` if a later edit adds versioned API examples or endpoint wording.
- Future implementation rows should start from the persona validation ladder: `frontend/src/test/ux/personaWorkflowMatrix.ts`, `frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx`, and then `e2e/tests/persona-workflows.spec.ts` after seeded runtime credentials are confirmed.
- The next owner should keep evidence split into `Confirmed repo evidence`, `Inference`, and `External analog guidance`; authorization decisions, eligibility policy disputes, and specialized rehab compliance outcomes must stay explicit when they remain outside the product.
- Lead still owns index and workboard updates. This brief should not authorize runtime implementation by itself.
