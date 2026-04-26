# P5-T6D Dispatch Radar Proof

**Last Updated:** 2026-04-25

**Task:** `P5-T6D`  
**Row:** Volunteer assignment dispatch radar  
**Disposition:** Row-local proof note for review closeout

## Scope

This note records durable proof for the landed volunteer assignment picker pickup only:

- Existing `AssignmentForm` creation and editing flow now uses searchable active event and task pickers instead of asking staff to paste raw IDs.
- The assignment payload contract remains the existing `event_id` / `task_id` shape.
- The pickup stays within the existing volunteer assignment form and supporting frontend API clients.

## Recorded Proof

The live workboard records `P5-T6D` as the only signed-out runtime pickup from the `P5-T6` capability packet and describes the landed event/task picker pickup as ready for a compact proof note. The Phase 5 plan records the row in review with the existing assignment contract preserved.

The lane-recorded proof commands are:

```bash
cd frontend && npm test -- --run src/components/__tests__/AssignmentForm.test.tsx
cd frontend && npm run type-check
```

This note does not add pass counts or command results beyond the workboard and Phase 5 plan evidence already recorded.

## Contract Preserved

- Event assignments still submit `event_id`; task assignments still submit `task_id`.
- Existing assignment creation and editing payloads remain compatible with the backend volunteer assignment contract.
- Picker data stays frontend-scoped through the existing events and tasks API clients; no shared route or backend assignment contract change is claimed here.

## Out Of Scope

New volunteer domain models, lifecycle systems, broad volunteer-program rewrites, shared route changes, credentialing, SMS or geospatial dispatch, service-site routing, approvals, generic workflow tooling, and richer availability or skill-fit claims beyond the recorded picker pickup remain outside this proof.

## Closeout Disposition

Treat `P5-T6D` as proof-note complete for the landed assignment event/task picker pickup. Final row movement stays lead-owned on the workboard.
