# P5-T114 Field-Ready Case Packet Proof

**Date:** 2026-05-14
**Status:** Row-local proof note
**Workboard Row:** `P5-T114 Field-ready case packet`

## Scope

`P5-T114` extends the existing case handoff packet into a first field-ready staff packet without adding a new route, persisted packet entity, offline sync bundle, service-site router, referral transfer state, or generic workflow engine.

Implemented behavior:

- The existing `GET /api/v2/cases/:id/handoff-packet` response now includes additive `field_packet` data assembled from current case services, case-form assignments, appointments, portal visibility, assignment context, reassessment continuity, and existing next actions.
- The packet keeps the current `Generate Handoff` Case Detail modal and printable UI; staff still use the existing handoff surface.
- The printable packet now includes a compact Field Packet section for services, forms, appointments, assignment context, and explicit out-of-scope flags for offline sync, service-site routing, referral transfer, and persisted packet entities.
- Date-only service fields are normalized without local-time day shifts, so field packet service dates remain stable when PostgreSQL returns date objects.

Out of scope:

- Offline/device sync, conflict resolution, service-site routing records, referral transfer state, new persisted field-packet tables, route/catalog changes, portal/public runtime changes, workflow engines, assignment engines, and database migrations.

## Interface Summary

The handoff packet route remains:

```text
GET /api/v2/cases/:id/handoff-packet
```

Additive response fields:

- `field_packet.scope`
- `field_packet.assignment_context`
- `field_packet.services`
- `field_packet.forms`
- `field_packet.appointments`

Existing `case_details`, `risks`, `continuity`, `next_actions`, `visibility`, `artifacts_summary`, and `generated_at` fields are preserved.

## Validation

Passed:

```bash
cd frontend && npm test -- --run src/features/cases/components/__tests__/CaseHandoffPacket.test.tsx
cd frontend && npm run type-check
cd backend && npx jest --forceExit --runInBand src/modules/cases/queries/__tests__/handoffQueries.test.ts
cd backend && npm run type-check
```

Blocked by local environment:

```bash
cd backend && npm test -- src/__tests__/integration/cases.handoff.test.ts
```

Result: blocked before test execution because Docker is not running and the backend full-test wrapper could not connect to `unix:///Users/bryan/.docker/run/docker.sock`. A `SKIP_INTEGRATION_DB_PREP=1` attempt also failed before assertions because `127.0.0.1:8012/nonprofit_manager_test` was not already running.

## Notes

- The added backend query test proves the assembled packet contents at the handoff assembler seam without requiring a live integration database.
- The existing integration test was updated to assert the new field-packet contents when the full-test DB contract is available again.
