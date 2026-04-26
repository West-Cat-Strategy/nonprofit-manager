# P5-T5 Portal Hardening Proof

**Last Updated:** 2026-04-25

**Task:** `P5-T5`  
**Row:** Client portal wave  
**Disposition:** Row-local proof note for review closeout

## Scope

This note records durable proof for the landed portal hardening pickup only:

- `PAT-04`: provenance-first public-intake resolution audit across website, portal signup, and public events.
- `PAT-05`: server-backed queue view definitions with row-action and empty-state metadata.
- `PAT-06`: case-scoped typed portal review requests with staff-facing triage in the Case Detail Portal tab.

This is not a full portal-wave or browser-matrix closeout.

## Recorded Proof

The live workboard records the current `P5-T5` portal pickup as green in targeted proof across public-intake resolution, queue view definitions, and case-scoped portal review requests. It also records latest targeted proof for `P5-T5`, `P5-T6C1`, and integration seams as green across backend service tests, backend follow-up/case integration tests, targeted frontend tests, backend/frontend package type-checks, `make db-verify`, `make check-links`, and `git diff --check`.

The testing guide records this narrower portal hardening proof slice:

```bash
cd backend && npm test -- --runInBand src/__tests__/services/portalAuthService.test.ts src/__tests__/services/queueViewDefinitionService.test.ts
cd frontend && npm test -- --run src/features/portal/pages/__tests__/PortalWorkflowPages.test.tsx
make db-verify
cd backend && npm run type-check
cd frontend && npm run type-check
```

`make db-verify` remains part of the proof path when the migration contracts for `104_public_intake_resolutions.sql`, `105_queue_view_definitions.sql`, or `106_portal_escalations.sql` change.

## Contract Preserved

- Public-intake audit inserts are best effort and must not block website, portal-signup, or public-event intake.
- Queue definitions remain owner, surface, and permission-scope bounded; updates cannot cross owner or surface boundaries.
- Portal escalation records remain case-scoped, retain portal-user and staff actor attribution, and expose staff triage without converting generic portal messages into typed escalation proof.

## Out Of Scope

MPI or dedupe consoles, generic saved-search builders, helpdesk or grievance scope, referral engines, broader service-delivery workflow depth, and full portal/browser matrix proof remain outside this row.

## Closeout Disposition

Treat `P5-T5` as proof-note complete for the landed public-intake, queue-definition, and portal-escalation pickup. Final row movement stays lead-owned on the workboard.
