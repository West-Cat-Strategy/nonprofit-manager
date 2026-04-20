# Service-Delivery Personas

This file is the canonical detailed layer for service-delivery and frontline continuity personas.

## Case Manager

- `canonical_role_boundary`: inferred `staff`; mapping source `backend/src/utils/permissions.ts`; confidence `High`; confirmed permissions include cases, follow-ups, notes, services, appointments, portal visibility controls, and people or accounts; workflow scope covers intake, case progression, handoffs, outcomes documentation, and closure continuity; explicitly inferred scope excludes full person-centered plan governance and richer compliance-specific service plan enforcement.
- `persona_id`: `case-manager`
- `operating_context`: Frontline continuity coordinator balancing intake, reassessment, follow-ups, privacy controls, and handoffs across high-context client records.
- `decision_authority`: Can open, progress, and close cases; can manage follow-ups and selective portal visibility; typically escalates supervision, eligibility-policy disputes, and cross-team continuity risks.
- `collaboration_map`: Collaborates with Rehab Workers and other frontline staff, Nonprofit Administrators for access or reporting issues, portal-facing users through selective sharing, and leadership through outcomes or risk reporting.
- `primary_modules`: Cases, People and Accounts, Follow-ups, appointments, portal-sharing workflows, notes, documents, and repeatable operational reporting.
- `usage_cadence`: Daily queue triage and note updates, weekly case review, and frequent exception-driven handoffs.
- `top_jobs`: Capture intake and eligibility context, keep plans moving, schedule and complete follow-ups, preserve secure client visibility, and close cases with continuity.
- `dashboard_report_needs`: Urgent and overdue queues, follow-up reminders, outcomes trend slices, and handoff-ready case summaries.
- `core_artifacts`: Case record, intake summary, follow-up queue, progress note, handoff packet, closure summary, and visibility-controlled portal materials.
- `sensitive_data_boundaries`: Internal notes, outcomes, and documents remain staff-only unless explicitly marked for client visibility. Privacy defaults should stay strict.
- `adoption_constraints`: Hidden saved views, partial reassessment gates, and handoff steps that still rely on convention can create continuity gaps.
- `success_signals`: Cases keep moving without losing context, handoffs are understandable to the next worker, and privacy boundaries remain intact.
- `pain_points`: Context breaks during handoff, unclear reassessment expectations, and manual continuity work outside a standardized packet.
- `anchor_scenarios`: Primary scenario: capture referral and consent context, open a plan, schedule follow-ups, log outcomes, and hand the case to the next owner cleanly. Failure-mode scenario: a case stalls because reassessment and closure continuity steps live outside explicit workflow checkpoints.
- `external_analogs`: OpenSPP sharpens explicit case-worker, supervisor, and manager roles, staged case workflows, approvals, and grievance escalation; CiviCRM sharpens activity-driven case follow-up; Sahana Eden sharpens task and field-work coordination.
- `evidence`: `docs/features/CASE_MANAGEMENT_SYSTEM.md`, `docs/features/FOLLOW_UP_LIFECYCLE.md`, `docs/features/CASE_CLIENT_VISIBILITY_AND_FILES.md`, `frontend/src/routes/workflowRoutes.tsx`, `frontend/src/routes/portalRoutes.tsx`, `backend/src/utils/permissions.ts`, and `docs/validation/archive/persona-workflow-audit-2026-04-18.md`.

## Rehab Worker

- `canonical_role_boundary`: inferred `staff`; mapping source `backend/src/utils/permissions.ts`; confidence `High`; confirmed permissions include cases, services, follow-ups, appointments, client forms, and portal collaboration; workflow scope covers eligibility review, service delivery documentation, referral transitions, outcomes tracking, and appointment continuity; explicitly inferred scope excludes rehab-specific IPE templates, vocational assessment scorecards, and dedicated placement benchmarking.
- `persona_id`: `rehab-worker`
- `operating_context`: Specialized frontline worker delivering program or rehabilitation services, documenting encounters, and moving clients across appointment, service, and referral transitions.
- `decision_authority`: Can manage encounters, service records, follow-ups, and appointment continuity; usually escalates authorization decisions, specialized compliance issues, and placement or program-policy conflicts.
- `collaboration_map`: Collaborates with Case Managers for shared continuity, external service partners for referrals, clients through portal-facing appointments or forms, and supervisors for program or compliance review.
- `primary_modules`: Cases, services and appointments inside casework, Follow-ups, client-facing forms, and portal collaboration surfaces.
- `usage_cadence`: Daily encounter preparation and service logging, weekly service outcome review, and frequent exception-driven referral work.
- `top_jobs`: Complete eligibility and session prep, document service outcomes and vocational goals, manage service continuity, coordinate referrals or authorizations, and preserve placement history.
- `dashboard_report_needs`: Assigned-case queues, appointment and action status, service summaries, and continuity-ready reports for workforce programs.
- `core_artifacts`: Service encounter record, appointment note, follow-up task, referral summary, authorization handoff, and placement or outcome note.
- `sensitive_data_boundaries`: Internal versus client-visible notes are as important as the case record. Portal collaboration should stay private by default.
- `adoption_constraints`: Generic staff vocabulary, absent rehab-specific templates, and partial referral or authorization workflow depth can force manual interpretation.
- `success_signals`: Service data stays complete, appointments and referrals close cleanly, and the next staff member can continue the work without reconstructing context.
- `pain_points`: Terminology mismatch, missing rehab-specific plan structures, and fragmented placement or authorization tracking.
- `anchor_scenarios`: Primary scenario: capture eligibility context, record a structured service encounter, update follow-ups and referrals, and transition the case with clear next actions. Failure-mode scenario: authorization or placement details drift outside the app and break continuity.
- `external_analogs`: OpenSPP sharpens explicit case and service-delivery roles, service points, approvals, and grievance paths; Sahana Eden sharpens field coordination, tasks, and location-aware work; CiviCRM sharpens case activities and follow-up automation.
- `evidence`: `docs/features/CASE_MANAGEMENT_SYSTEM.md`, `docs/features/FOLLOW_UP_LIFECYCLE.md`, `docs/api/API_REFERENCE_PORTAL_APPOINTMENTS.md`, `frontend/src/routes/workflowRoutes.tsx`, `frontend/src/routes/portalRoutes.tsx`, `frontend/src/features/portal/pages/__tests__/PortalWorkflowPages.test.tsx`, `backend/src/utils/permissions.ts`, and `docs/validation/archive/persona-workflow-audit-2026-04-18.md`.
