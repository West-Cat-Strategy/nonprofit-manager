# P5-T48 Portal and Intake Queue Cues Proof

**Date:** 2026-05-03

## Scope

`P5-T48` improves staff-facing portal-admin queue cues while keeping `P5-T6` as the Phase 5 scope-control gate.

Implemented scope:

- Added portal signup request summary counts for pending requests, contact-match-needed requests, and pending invitations.
- Added per-request intake cues for contact matching, linked-contact state, and approval/rejection readiness.
- Review-batch follow-up: requests marked `needs_contact_resolution` no longer present a misleading one-click approval action; staff must select a matching contact before the existing approval payload sends `contact_id`.
- May 4 closeout: the portal-admin page wrapper and settings hook now preserve the selected `contact_id` approval payload instead of dropping it before the API call.
- Added appointment inbox summary counts for matching appointments, visible rows, requested appointments, case-linked appointments, and pending reminder jobs.
- Added per-appointment cues for case-linked resolution, direct inbox action, confirmation needs, and pending reminders.
- Added portal conversation summary counts for visible, open, unread, and case-linked threads.
- Added per-conversation cues for case linkage, reply availability, and unread selected-thread state.

Out of scope:

- Backend APIs, database migrations, public portal runtime changes, portal authentication changes, route/catalog changes, case-form review semantics, service-site routing, closure-continuity packets, generic workflow tooling, dashboards, saved-queue builders, and broader portal redesign.

## Interface Summary

No public API routes, backend contracts, database migrations, initdb changes, manifest changes, route catalog entries, or portal runtime contracts were added.

The change is limited to existing portal-admin panels and their focused component tests. The frontend request type now accepts the existing optional `resolution_status` field returned by portal signup request APIs.

## Validation

Passed:

```bash
cd frontend && npm test -- --run src/features/adminOps/pages/portalAdmin/panels/__tests__/PortalPanels.test.tsx
cd frontend && npm run type-check
cd frontend && npm run lint
node scripts/check-frontend-feature-boundary-policy.ts
```

Review-batch follow-up:

```bash
cd frontend && npm test -- --run src/features/adminOps/pages/portalAdmin/panels/__tests__/PortalPanels.test.tsx src/features/adminOps/pages/portalAdmin/PortalAdminPage.test.tsx src/features/adminOps/pages/adminSettings/sections/AuditLogsSection.test.tsx
cd frontend && npm run type-check
git diff --check
```

The focused frontend follow-up passed 3 files / 30 tests.

May 4 closeout:

```bash
cd frontend && npm run test -- --run src/features/adminOps/pages/portalAdmin/PortalAdminPage.test.tsx src/features/adminOps/pages/portalAdmin/panels/__tests__/PortalPanels.test.tsx
cd frontend && npm run type-check
make lint
git diff --check
```

The focused frontend closeout passed 2 files / 26 tests, and the broad lint gate passed.

Known validation notes:

- `make db-verify` was not run because this row does not change migrations, `database/initdb/000_init.sql`, or `database/migrations/manifest.tsv`.
- Route catalog drift checks were not required because no routes or route manifests changed.
