# P5-T134 Volunteer And Event Operations Persona Discovery

**Date:** 2026-05-15
**Workboard Row:** `P5-T134`
**Type:** Discovery-only persona artifact

## Scope And Canon Boundary

This artifact explores two future persona candidates:

- Volunteer Coordinator
- Event Operations

The current canonical persona pack remains the six-persona v1 set: Executive Director, Fundraiser, Nonprofit Administrator, Board Member, Case Manager, and Rehab Worker. The detailed canon explicitly says future personas such as Volunteer Coordinator and Event Operations should remain follow-on candidates instead of being folded into the v1 cards.

This pass does not change runtime behavior. It does not make permission changes, route changes, `personaWorkflowMatrix` changes, event/payment redesign, public-site redesign, volunteer lifecycle redesign, or event registration/check-in redesign. It records repo evidence, inferences, and gaps for later planning only.

## Method

Evidence posture follows the persona-validation rubric:

- `Confirmed repo evidence`: current routes, permission constants, API references, migrations, implementation seams, and dated proof notes.
- `Inference`: role mapping and candidate-persona interpretation not explicit in the repo.
- `Gaps/drift`: places where current surfaces exist but do not yet prove a first-class persona workflow.

Static evidence was sufficient because this row is discovery-only. No browser, API, database, or runtime proof was attempted.

## Candidate Persona Cards

### Volunteer Coordinator

| Field | Discovery note |
|---|---|
| Candidate persona ID | `volunteer-coordinator` |
| Canon relationship | Follow-on candidate outside the six-persona canon |
| Likely role mapping | `staff` or `manager` depending on approval/export authority |
| Confidence | Medium |
| Operating context | Coordinates volunteer records, skills, availability, assignment matching, hours, background-check readiness, and volunteer follow-up around events and tasks. |
| Decision authority | Can likely create/edit volunteers and assignments as `staff`; approval/export authority points to `manager` because `volunteer:background-check:approve`, `volunteer:delete`, and `volunteer:export` are not granted to `staff`. |
| Collaboration map | Works with Event Operations for shift/event needs, Nonprofit Administrators for access and policy setup, Fundraisers for volunteer-supported campaigns, and Case/Rehab staff when volunteer tasks touch service delivery. |
| Primary repo surfaces | `/volunteers`, `/volunteers/new`, `/volunteers/:id`, `/volunteers/:id/edit`, `/volunteers/:volunteerId/assignments/new`, `/volunteers/:volunteerId/assignments/:assignmentId/edit`, `/events`, `/tasks`, reports/dashboard summaries. |
| Top jobs | Keep volunteer roster clean, screen readiness, assign volunteers to events/tasks, spot availability/skill fit, record hours, and hand off background-check approvals through the dedicated approval seam. |
| Sensitive boundaries | Background-check approval is dedicated and permissioned; generic volunteer edits should not imply direct approval authority. |
| Discovery status | `partial`: roster, assignments, skill search, hours, and approval seams exist, but there is no first-class coordinator persona, cockpit, queue, or persona workflow contract. |

### Event Operations

| Field | Discovery note |
|---|---|
| Candidate persona ID | `event-operations` |
| Canon relationship | Follow-on candidate outside the six-persona canon |
| Likely role mapping | `staff` for day-to-day event create/edit and check-in operations; `manager` or `admin` if delete/export/payment/governance authority is required |
| Confidence | Medium |
| Operating context | Owns event setup, occurrence readiness, public listings, registrations, waitlists, QR/manual/kiosk check-in, reminders, walk-ins, and day-of attendance follow-up. |
| Decision authority | Can likely create/edit events and operate check-in as `staff`; event deletion is not granted to `staff`, and payment/order workflows are not part of the current event operations evidence. |
| Collaboration map | Works with Volunteer Coordinators for staffing, Fundraisers for fundraising events, Website/communications owners for public listings and reminders, and Nonprofit Administrators for provider/settings dependencies. |
| Primary repo surfaces | `/events`, `/events/calendar`, `/events/check-in`, `/events/new`, `/events/:id`, `/events/:id/edit`, `/public/events/:site`, `/event-check-in/:id`, `/portal/events`, `/api/v2/events`, `/api/v2/public/events*`, `/api/v2/portal/events`. |
| Top jobs | Publish event availability, manage occurrences/registrations, monitor capacity and waitlist readiness, run check-in, create walk-ins, send confirmations/reminders, and review attendance readiness. |
| Sensitive boundaries | Public check-in PINs and kiosk settings are event-specific; portal event payloads expose QR/check-in metadata but not kiosk PIN material. |
| Discovery status | `partial`: event operations are rich and routed, but there is no dedicated Event Operations persona, `personaWorkflowMatrix` entry, payment/order state model, or end-to-end event-ops persona proof. |

## Workflow Discovery Matrix

| Candidate | Workflow | Status | Confirmed repo evidence | Inference / boundary |
|---|---|---|---|---|
| Volunteer Coordinator | Volunteer roster triage and record upkeep | `supported` for generic roster CRUD; `partial` as a persona workflow | `frontend/src/routes/peopleRouteDescriptors.tsx` mounts `/volunteers`, create, detail, and edit routes. `backend/src/modules/volunteers/routes/index.ts` mounts authenticated volunteer list/detail/create/update/delete, skill search, import/export, and assignment routes. | The repo proves staff volunteer surfaces, not a named coordinator persona. |
| Volunteer Coordinator | Assignment matching to events/tasks | `partial` | `database/migrations/072_volunteer_assignments.sql` links volunteer assignments to `volunteer_id`, optional `event_id`, optional `task_id`, role, times, hours, and status. `backend/src/modules/volunteers/routes/index.ts` mounts assignment create/update and volunteer assignment list endpoints. | Existing fit-cue/assignment surfaces suggest a coordinator workflow, but there is no coordinator cockpit or matrix workflow ID. |
| Volunteer Coordinator | Background-check readiness and approval handoff | `partial` | `backend/src/utils/permissions.ts` defines `volunteer:background-check:approve`; `backend/src/modules/volunteers/routes/index.ts` gates `/:id/background-check/approve`; `docs/validation/P5-T90_VOLUNTEER_APPROVAL_FLOW_PROOF_2026-05-06.md` records the dedicated approval route and generic-form boundary. | Coordinator may prepare review data, but approval authority maps to `manager`/`admin`, not plain `staff`. |
| Volunteer Coordinator | Hours review and approval | `partial` | `backend/src/utils/permissions.ts` defines hours view/create/edit/approve/delete permissions; `database/migrations/072_volunteer_assignments.sql` stores `hours_logged`. | No discovery evidence yet for a first-class hours approval queue or coordinator dashboard. |
| Event Operations | Event setup and occurrence planning | `supported` for event operations; `partial` as a persona workflow | `frontend/src/routes/routeCatalog/staffEngagementRoutes.ts` mounts `/events`, `/events/calendar`, `/events/new`, detail, and edit routes. `docs/api/API_REFERENCE_EVENTS.md` documents event CRUD, occurrences, summary, calendar ICS, and registration endpoints. | The route/API surface is strong, but the six-persona matrix has no Event Operations card. |
| Event Operations | Registration, capacity, waitlist, and attendance readiness | `partial` | `database/migrations/091_event_occurrences_series_overhaul.sql` adds occurrence registered/attended counts, waitlist fields, public check-in fields, and confirmation tracking. `docs/validation/P5-T73_PUBLIC_EVENT_SELF_REFERRAL_OPERATIONAL_SNAPSHOTS_PROOF_2026-05-05.md` records waitlist/check-in readiness snapshots in the staff events workspace. | Good operational evidence exists, but current proof is a row-local snapshot, not a persona workflow proof. |
| Event Operations | Day-of check-in desk, QR scan, public kiosk, and walk-ins | `supported` for event check-in primitives; `partial` as a persona workflow | `docs/api/API_REFERENCE_EVENTS.md` documents staff check-in endpoints, global QR scan, check-in settings, PIN rotation, walk-ins, public kiosk endpoints, and check-in guardrails. `frontend/src/routes/routeCatalog/staffEngagementRoutes.ts` mounts `/events/check-in`; `frontend/src/routes/routeCatalog/public.ts` mounts `/event-check-in/:id`. | Current support is event-feature centered. It does not yet prove an Event Operations user can complete the full day-of workflow end to end. |
| Event Operations | Portal/public event participant experience | `supported` for participant-facing event listing/check-in metadata; `partial` for event-ops persona | `frontend/src/routes/routeCatalog/portal.ts` mounts `/portal/events`; `frontend/src/routes/routeCatalog/public.ts` mounts `/public/events/:site`; `docs/api/API_REFERENCE_EVENTS.md` documents public catalog and portal event check-in metadata. | Participant-facing flows help Event Operations, but the operating persona remains staff-side and inferred. |
| Event Operations | Event payment/order operations | `missing` for this discovery scope | No current evidence path reviewed proves event order/payment state as part of events. | Explicitly out of scope for this artifact; any event/payment redesign needs a separate signed-out row. |

## Confirmed Repo Evidence

- The six-persona boundary is explicit in `.codex/skills/nonprofit-manager-persona-analysis/references/persona-schema.md` and `.codex/skills/nonprofit-manager-persona-analysis/references/workflow-models.md`.
- `frontend/src/test/ux/personaWorkflowMatrix.ts` currently enumerates only six `PersonaId` values and no Volunteer Coordinator or Event Operations entry.
- Staff volunteer routes are mounted through `frontend/src/routes/peopleRouteDescriptors.tsx`, including list, create, edit, detail, and assignment create/edit paths.
- Staff event routes are mounted through `frontend/src/routes/routeCatalog/staffEngagementRoutes.ts`, including event hub, calendar, check-in desk, create, detail, and edit paths.
- Portal and public event routes exist through `frontend/src/routes/routeCatalog/portal.ts` and `frontend/src/routes/routeCatalog/public.ts`.
- `backend/src/utils/permissions.ts` grants staff volunteer view/create/edit, hours view/create/edit, and event view/create/edit; manager/admin add volunteer export/delete, background-check approval, hours approval/delete, and event delete.
- `backend/src/modules/volunteers/routes/index.ts` mounts authenticated volunteer catalog, lifecycle, import/export, skill search, assignment, and dedicated background-check approval routes.
- `backend/src/modules/events/routes/index.ts` mounts authenticated event CRUD, occurrence, registration, check-in, walk-in, reminder, and automation routes.
- `docs/api/API_REFERENCE_EVENTS.md` is the current events API reference for event CRUD, occurrences, registration/check-in, public kiosk, public catalog, portal event metadata, and reminders.
- `database/migrations/072_volunteer_assignments.sql` proves event/task/general volunteer assignment storage with role, schedule, hours, and status fields.
- `database/migrations/091_event_occurrences_series_overhaul.sql` proves occurrence, waitlist, public check-in, series enrollment, confirmation, and occurrence-level reminder-delivery storage.
- `docs/features/FEATURE_MATRIX.md` lists current People/Accounts/Volunteers, Service and Engagement Operations, Public Site Runtime, and Portal Workspace surfaces.
- `docs/validation/P5-T73_PUBLIC_EVENT_SELF_REFERRAL_OPERATIONAL_SNAPSHOTS_PROOF_2026-05-05.md` records row-local public event waitlist/check-in readiness snapshots without broad event workspace redesign.
- `docs/validation/P5-T90_VOLUNTEER_APPROVAL_FLOW_PROOF_2026-05-06.md` records the dedicated volunteer background-check approval flow and explicitly excludes broad volunteer lifecycle or dispatch redesign.

## Inferences

- Volunteer Coordinator likely maps to `staff` for ordinary roster/assignment operations and to `manager` when approval/export/delete authority is required.
- Event Operations likely maps to `staff` for event setup, registration, reminders, and check-in operations, with `manager` or `admin` reserved for event deletion, governance, or broader policy authority.
- The current event and volunteer modules already contain enough primitives to justify follow-on persona discovery, but not enough to claim either candidate is part of the v1 canon.
- The strongest future workflow candidates are volunteer dispatch/fit cockpit, background-check readiness queue, event-day operations desk, waitlist/capacity readiness, and post-event attendance follow-up.

## Gaps And Drift

- `personaWorkflowMatrix.ts` has no candidate entries for Volunteer Coordinator or Event Operations. This is intentional for now and should not be changed by P5-T134.
- The six-persona canon does not yet define candidate card fields, workflow IDs, route expectations, or support-status rows for these two roles.
- Volunteer assignment support exists, but the repo does not yet prove a first-class coordinator cockpit or full volunteer dispatch workflow.
- Volunteer background-check approval is intentionally separated from generic volunteer editing; future coordinator UX must preserve that boundary.
- Event operations have strong event-feature support, but no end-to-end persona proof ties public listing, registration, reminders, waitlist readiness, check-in, walk-ins, and post-event follow-up into one staff workflow.
- Event payment/order operations are not proven in the current events evidence and must stay outside this discovery artifact.
- Public and portal event flows support participant access, but they do not replace a staff Event Operations persona.

## Commands Run Or Attempted

- `git status --short`
  - Result: Completed. The checkout already had many unrelated modified/untracked files owned by other lanes; P5-T134 only adds this artifact.
- `rg --files | rg 'volunteer|Volunteer|event|Event|permissions|personaWorkflowMatrix|P5-T73|P5-T90|API_REFERENCE.*EVENT|FEATURE_MATRIX|EVENT'`
  - Result: Completed. Identified volunteer, event, permissions, API, proof, migration, and route evidence paths.
- `rg -n "P5-T134|Volunteer Coordinator|Event Operations|six-persona|personaWorkflowMatrix|volunteer|event" /Users/bryan/.codex/memories/MEMORY.md`
  - Result: Completed. Used only as orientation to find likely historical volunteer/event evidence; live repo evidence above is the source for this artifact.
- `sed -n` / `nl -ba` reads of the evidence paths listed below
  - Result: Completed. Static evidence was sufficient for discovery.
- `make check-links`
  - Result: Passed. Checked 253 files and 1500 local links with no broken active-doc links.
- `git diff --check -- docs/validation/P5-T134_VOLUNTEER_EVENT_OPERATIONS_PERSONA_DISCOVERY_2026-05-15.md`
  - Result: Passed.

## High-Signal Evidence Paths

- `.codex/skills/nonprofit-manager-persona-analysis/references/persona-schema.md`
- `.codex/skills/nonprofit-manager-persona-analysis/references/workflow-models.md`
- `.codex/skills/nonprofit-manager-persona-validation/references/validation-rubric.md`
- `frontend/src/test/ux/personaWorkflowMatrix.ts`
- `frontend/src/routes/peopleRouteDescriptors.tsx`
- `frontend/src/routes/routeCatalog/staffEngagementRoutes.ts`
- `frontend/src/routes/routeCatalog/portal.ts`
- `frontend/src/routes/routeCatalog/public.ts`
- `backend/src/utils/permissions.ts`
- `backend/src/modules/volunteers/routes/index.ts`
- `backend/src/modules/events/routes/index.ts`
- `docs/api/API_REFERENCE_EVENTS.md`
- `database/migrations/072_volunteer_assignments.sql`
- `database/migrations/091_event_occurrences_series_overhaul.sql`
- `docs/features/FEATURE_MATRIX.md`
- `docs/validation/P5-T73_PUBLIC_EVENT_SELF_REFERRAL_OPERATIONAL_SNAPSHOTS_PROOF_2026-05-05.md`
- `docs/validation/P5-T90_VOLUNTEER_APPROVAL_FLOW_PROOF_2026-05-06.md`

## Explicit Non-Changes

- No runtime work.
- No permission changes.
- No route changes.
- No `personaWorkflowMatrix` changes.
- No frontend, backend, database, or route/persona runtime file edits.
- No event/payment redesign.
- No volunteer lifecycle redesign.
- No public-site or portal event redesign.
