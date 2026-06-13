# P5-T132 DB Audit Request Context Proof

**Date:** 2026-05-15
**Workboard Row:** `P5-T132`
**Scope:** Request metadata propagation into trigger-backed database audit rows

## Scope

This pass binds request id, IP, user-agent, user id, and environment into DB sessions whenever request context exists, then makes the trigger-backed audit function read those values defensively.

Changed surfaces:

- `backend/src/config/requestContext.ts`
- `backend/src/middleware/correlationId.ts`
- `backend/src/config/database.ts`
- `database/migrations/134_audit_request_context_metadata.sql`
- `database/migrations/manifest.tsv`
- `database/initdb/000_init.sql`
- `docs/security/SECURITY_MONITORING_GUIDE.md`
- Targeted request-context/database tests

## Contract Notes

- Request context now carries `ipAddress` and `userAgent`; the correlation id remains the source for `app.request_id`.
- Request-scoped `pool.query` and request-scoped transactions bind `app.current_user_id`, `app.request_id`, `app.client_ip`, `app.user_agent`, and `app.environment`.
- Context values are reset after request-scoped direct queries.
- `audit_trigger_func()` uses `NULLIF(current_setting(...), '')` and handles invalid IP text by recording a null client IP instead of failing the audited write.
- `audit_log` remains trigger-backed row-change evidence. The separate `audit_logs` table remains the explicit application-event surface for login, lockout, controller/service audit calls, and similar security events.

## Targeted Proof

Passed:

```bash
cd backend && npx jest --runInBand src/__tests__/config/requestContext.test.ts src/__tests__/config/database.test.ts src/__tests__/services/auditLogQueryService.test.ts
cd backend && npm run type-check
cd backend && npx eslint src/config/requestContext.ts src/middleware/correlationId.ts src/config/database.ts src/__tests__/config/requestContext.test.ts src/__tests__/config/database.test.ts
node scripts/check-migration-manifest-policy.ts
make typecheck
```

Blocked locally:

```bash
cd backend && npm test -- --runInBand src/__tests__/config/requestContext.test.ts src/__tests__/config/database.test.ts src/__tests__/services/auditLogQueryService.test.ts
```

Result: the npm wrapper depends on Docker/test DB setup, and the Docker socket was unavailable. The direct Jest slice passed.

## Boundaries

- No broad audit-table redesign.
- No replacement of explicit security-event audit writes.
- No production DB migration run.
