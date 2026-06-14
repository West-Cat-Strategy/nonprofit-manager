# P5-T143 Service-Site Routing Proof

**Date:** 2026-06-13
**Status:** Row-local implementation proof
**Workboard Row:** `P5-T143 Service-site routing from existing snapshots`

## Scope

`P5-T143` implements the smallest signed-out runtime slice for typed service-site routing on top of the existing optional `service_site_snapshot` support for case services and appointment slots.

The implementation derives routing entries in the existing case handoff packet from stored snapshots. It preserves the current free-text `service_provider` and `location` fallback behavior, keeps existing route paths and response envelopes, and does not add service-site CRUD, routing records, workflow engines, offline sync, referral transfer, production-data handling, deploy behavior, or direct source copying from reference repositories.

## Implemented Behavior

- `field_packet.service_site_routing[]` is now derived from existing service and appointment `service_site_snapshot` values.
- Each routing entry records `source_type`, `source_id`, `source_label`, `site_id`, `site_name`, `provider_name`, `address`, `contact_name`, `phone`, `email`, and `fallback_label`.
- `field_packet.scope.service_site_routing_included` is `true` only when at least one typed service-site snapshot can produce a routing entry.
- Case service and appointment packet entries continue to include their original `service_site_snapshot` values and free-text provider/location fallback labels.
- The printable case handoff packet now renders a compact Service Site Routing section when routing entries exist and keeps the existing `No Site Routing` badge when none exist.

## Boundary

`P5-T115` added the optional snapshot storage and read surfaces. `P5-T143` consumes that snapshot baseline only. It does not add new persistence, migrations, public/portal workflow expansion, service-point users, OAuth/API, contract lifecycle, provider-network administration, custom-field platforms, generic workflow studios, offline sync, or referral transfer.

## Final Owned Path Set

```text
backend/src/modules/cases/queries/handoffQueries.ts
backend/src/modules/cases/queries/__tests__/handoffQueries.test.ts
backend/src/modules/cases/types/handoff.ts
backend/src/types/caseHandoff.ts
frontend/src/types/caseHandoff.ts
frontend/src/features/cases/components/CaseHandoffPacket.tsx
frontend/src/features/cases/components/__tests__/CaseHandoffPacket.test.tsx
docs/phases/planning-and-progress.md
docs/validation/P5-T143_SERVICE_SITE_ROUTING_READY_PROOF_2026-06-13.md
docs/validation/README.md
```

Unrelated dirty worktree changes in the auth-alias/P5-T142/doc lanes and other backend case-module files were preserved and excluded from the P5-T143 selector path set.

## Validation

Focused P5-T143 checks passed:

```bash
cd backend && npm test -- --runInBand src/modules/cases/queries/__tests__/handoffQueries.test.ts
cd frontend && npm test -- --run src/features/cases/components/__tests__/CaseHandoffPacket.test.tsx
cd backend && npm run type-check
cd frontend && npm run type-check
```

Exact-path selector:

```bash
./scripts/select-checks.sh --mode fast --files "backend/src/modules/cases/queries/handoffQueries.ts backend/src/modules/cases/queries/__tests__/handoffQueries.test.ts backend/src/modules/cases/types/handoff.ts backend/src/types/caseHandoff.ts frontend/src/types/caseHandoff.ts frontend/src/features/cases/components/CaseHandoffPacket.tsx frontend/src/features/cases/components/__tests__/CaseHandoffPacket.test.tsx docs/phases/planning-and-progress.md docs/validation/P5-T143_SERVICE_SITE_ROUTING_READY_PROOF_2026-06-13.md docs/validation/README.md"
```

Result: selected:

```bash
make check-links
cd backend && npm run lint
cd backend && npm run type-check
cd backend && npm test -- src/__tests__/integration
cd frontend && npm run lint
cd frontend && npm run type-check
cd frontend && npm test -- --run
```

Selector follow-ons passed:

```bash
make check-links
cd backend && npm run lint
cd backend && npm run type-check
cd frontend && npm run lint
cd frontend && npm run type-check
git diff --check -- backend/src/modules/cases/queries/handoffQueries.ts backend/src/modules/cases/queries/__tests__/handoffQueries.test.ts backend/src/modules/cases/types/handoff.ts backend/src/types/caseHandoff.ts frontend/src/types/caseHandoff.ts frontend/src/features/cases/components/CaseHandoffPacket.tsx frontend/src/features/cases/components/__tests__/CaseHandoffPacket.test.tsx docs/phases/planning-and-progress.md docs/validation/P5-T143_SERVICE_SITE_ROUTING_READY_PROOF_2026-06-13.md docs/validation/README.md
```

Selector follow-ons not green:

```bash
cd backend && npm test -- src/__tests__/integration
```

Result: failed after the isolated test database connection terminated during the broad integration run. The run reached 29 passing integration suites before `adminRegistrationReview`, `volunteers`, `donations`, `socialMedia`, `backupExport`, `alerts`, `plausibleProxy`, and `adminBranding` failed with `Connection terminated unexpectedly` or `connect ECONNREFUSED 127.0.0.1:8012`. No failure pointed at the P5-T143 handoff query or packet UI.

```bash
cd frontend && npm test -- --run
```

Result: failed with two broad-suite timeout failures outside the P5-T143 surface:

```text
src/components/__tests__/CaseForm.test.tsx
  CaseForm > submits a new case through the v2 API and navigates after save

src/features/portal/pages/__tests__/PortalCalendarPage.test.tsx
  PortalCalendarPage > renders a unified calendar and books a slot from the detail panel
```

The same frontend run reported 259 passing test files and 1421 passing tests before those two timeout failures.
