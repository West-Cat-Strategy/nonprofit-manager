# P5-T115 Service-Site Snapshot Proof

**Date:** 2026-05-14
**Status:** Row-local proof note
**Workboard Row:** `P5-T115 Service-site snapshot`

## Scope

`P5-T115` adds optional typed service-site snapshot references after the field-ready case packet. The slice preserves existing free-text provider and location behavior and does not add service-site routing, offline sync, referral transfer, persisted packet entities, or broader workflow automation.

Implemented behavior:

- `case_services`, `appointment_availability_slots`, and `appointments` now have optional `service_site_snapshot` JSON object columns with migration/initdb/manifest coverage.
- Case service create/update validation accepts the optional typed snapshot while preserving `service_provider` and `external_service_provider_id` fallback behavior.
- Appointment slot create/update validation accepts the optional typed snapshot; booked appointments copy the slot snapshot, and appointment reads fall back from appointment snapshot to slot snapshot.
- The existing case handoff packet response now includes `service_site_snapshot` on `field_packet.services[]` and `field_packet.appointments[]`.
- The printable case packet, Case Services panel, Case Appointments panel, and case timeline appointment metadata surface typed site names/addresses when present while keeping provider/location text as the fallback display.

Out of scope:

- Offline/device sync, service-site routing records, referral transfer, persisted field packets, public/portal workflow expansion beyond preserving appointment slot contracts, new service-site CRUD, and broader workflow engines.

## Interface Summary

Additive database fields:

```text
case_services.service_site_snapshot
appointment_availability_slots.service_site_snapshot
appointments.service_site_snapshot
```

Additive response/request fields:

- `field_packet.services[].service_site_snapshot`
- `field_packet.appointments[].service_site_snapshot`
- Optional `service_site_snapshot` on case-service and appointment-slot create/update payloads.

Fallback behavior remains:

- Case services still display and store `service_provider` when no typed site snapshot is present.
- Appointments still display and store `location` when no typed site snapshot is present.

## Validation

Passed:

```bash
cd backend && npx jest --forceExit --runTestsByPath src/modules/cases/queries/__tests__/handoffQueries.test.ts src/modules/cases/queries/__tests__/servicesQueries.test.ts
cd frontend && npm test -- --run src/features/cases/components/__tests__/CaseHandoffPacket.test.tsx
cd backend && npm run type-check
cd frontend && npm run type-check
make lint-migration-manifest
node scripts/check-route-validation-policy.ts
```

Blocked by local environment:

```bash
make db-verify
```

Result: blocked before database checks because Docker is not running and the verifier could not connect to `unix:///Users/bryan/.docker/run/docker.sock`.

Additional note:

```bash
cd backend && npm test -- --runInBand backend/src/modules/cases/queries/__tests__/handoffQueries.test.ts backend/src/modules/cases/queries/__tests__/servicesQueries.test.ts
cd backend && npm run test:unit -- src/modules/cases/queries/__tests__/handoffQueries.test.ts src/modules/cases/queries/__tests__/servicesQueries.test.ts
```

The first command invoked the Docker-backed wrapper and hit the same Docker socket blocker. The second command ignored the intended path filter and ran the wider backend unit suite; unrelated existing Mailchimp and contact-note tests failed outside the P5-T115 surface. The exact `--runTestsByPath` command above passed for the changed case-query seams.
