# Backend Pattern Matrix

Date: 2026-03-01  
Task: P4-T1D  
Row schema: `Pattern ID | Problem | Source repo/path | Source commit | Transferability | Nonprofit target files | Adoption mode | Risk`

| Pattern ID | Problem | Source repo/path | Source commit | Transferability | Nonprofit target files | Adoption mode | Risk |
|---|---|---|---|---|---|---|---|
| PAT-001 | Non-deterministic non-2xx payload contracts across handlers | `wc-manage/src/lib/server/api-error.ts` | `ad4375fcbf7c7eadae86214505b211a92c2ea0a5` | High | `backend/src/modules/shared/http/envelope.ts`, `backend/src/utils/responseHelpers.ts`, `backend/src/middleware/errorHandler.ts` | adapt | Medium |
| PAT-002 | Mixed auth guard call sites need strict vs safe variants | `wc-manage/src/lib/server/guards.ts` | `ad4375fcbf7c7eadae86214505b211a92c2ea0a5` | High | `backend/src/services/authGuardService.ts`, `backend/src/controllers/**` | adapt | Medium |
| PAT-003 | Ad-hoc rate-limit key construction risks collisions | `wc-manage/src/lib/server/cache-keys.ts` | `ad4375fcbf7c7eadae86214505b211a92c2ea0a5` | High | `backend/src/utils/rateLimitKeys.ts`, `backend/src/middleware/rateLimiter.ts` | adopt | Low |
| PAT-004 | Policy drift: raw literal keys can bypass helper conventions | `wc-manage/scripts/check-cache-key-policy.ts` | `ad4375fcbf7c7eadae86214505b211a92c2ea0a5` | High | `scripts/check-rate-limit-key-policy.ts`, `scripts/ci.sh`, `Makefile` | adapt | Low |
| PAT-005 | Guardrail regressions require centralized matrix tests | `wc-manage/src/app/api/routes-guardrails.test.ts` | `ad4375fcbf7c7eadae86214505b211a92c2ea0a5` | High | `backend/src/__tests__/integration/routeGuardrails.test.ts` | adopt | Low |
| PAT-006 | Correlation metadata can diverge between success/error responses | `contactcentre/apps/api/src/common/middleware/correlation-id.middleware.ts`, `.../interceptors/api-envelope.interceptor.ts`, `.../filters/api-exception.filter.ts` | `9daadea145e231d28c44b96d2001278f03a1515f` | High | `backend/src/middleware/correlationId.ts`, `backend/src/modules/shared/http/envelope.ts`, `backend/src/middleware/errorHandler.ts` | adapt | Medium |
| PAT-007 | Zod validation errors need stable, field-addressable detail shape | `contactcentre/apps/api/src/common/validation/zod-validation.pipe.ts` | `9daadea145e231d28c44b96d2001278f03a1515f` | High | `backend/src/middleware/zodValidation.ts`, `backend/src/middleware/validateRequest.ts` | adapt | Low |
| PAT-008 | Tenant/workspace scoping should be injected early and consistently | `contactcentre/apps/api/src/modules/auth/guards/tenant.guard.ts` | `9daadea145e231d28c44b96d2001278f03a1515f` | Medium | `backend/src/middleware/auth.ts`, `backend/src/services/authGuardService.ts` | adapt | Medium |
| PAT-009 | Webhook ingest must combine auth, idempotency, and fail-safe acknowledgements | `contactcentre/apps/api/src/modules/webhooks/webhook-security.service.ts`, `.../webhooks.controller.ts` | `9daadea145e231d28c44b96d2001278f03a1515f` | High | `backend/src/services/webhookService.ts`, `backend/src/routes/webhooks.ts`, `backend/src/controllers/webhookController.ts` | adapt | High |
| PAT-010 | Event-to-webhook outbox pattern prevents synchronous coupling | `host-manage/apps/panel-api/src/events.ts` | `16d0ce6545443e9c96344b80b3aab4cac7a8a7bd` | High | `backend/src/services/webhookService.ts`, `backend/src/services/webhookRetrySchedulerService.ts` | adapt | High |
| PAT-011 | Retry worker should distinguish failed vs dead-letter terminal states | `host-manage/apps/panel-worker/src/index.ts` | `16d0ce6545443e9c96344b80b3aab4cac7a8a7bd` | High | `backend/src/services/webhookService.ts`, `backend/src/types/webhook.ts` | adapt | Medium |
| PAT-012 | Append-only audit helper reduces write-surface drift in mutating endpoints | `host-manage/apps/panel-api/src/audit.ts` | `16d0ce6545443e9c96344b80b3aab4cac7a8a7bd` | Medium | `backend/src/services/auditService.ts`, `backend/src/controllers/**` | adapt | Medium |
| PAT-013 | Boot-time global exception filter should preserve CORS/HTTP behavior under parser failures | `twenty/packages/twenty-server/src/main.ts`, `.../filters/unhandled-exception.filter.ts` | `1db2a409612d8e4de0148f7b6bdf8d62535002fd` | Medium | `backend/src/index.ts`, `backend/src/middleware/errorHandler.ts` | adapt | Medium |
| PAT-014 | Permission guards should include workspace activation-state awareness | `twenty/packages/twenty-server/src/engine/guards/settings-permission.guard.ts` | `1db2a409612d8e4de0148f7b6bdf8d62535002fd` | Medium | `backend/src/services/authGuardService.ts`, `backend/src/services/authorization.ts` | adapt | Medium |
| PAT-015 | Workspace-versioned cache key families prevent stale permission/metadata reads | `twenty/packages/twenty-server/src/engine/workspace-cache-storage/workspace-cache-storage.service.ts` | `1db2a409612d8e4de0148f7b6bdf8d62535002fd` | Medium | `backend/src/utils/rateLimitKeys.ts`, `backend/src/services/cacheService.ts` | observe | Low |
| PAT-016 | Event bus should support both immediate and persistent delivery paths | `open-mercato/packages/events/src/bus.ts` | `9fd63cd9b67722a706ae31d4875f333bcc1129c5` | Medium | `backend/src/services/webhookService.ts`, `backend/src/services/queue/intervalBatchRunner.ts` | adapt | Medium |
| PAT-017 | Queue worker strategy abstraction simplifies local vs redis execution parity | `open-mercato/packages/queue/src/worker/runner.ts`, `.../strategies/async.ts` | `9fd63cd9b67722a706ae31d4875f333bcc1129c5` | Medium | `backend/src/services/webhookRetrySchedulerService.ts`, `backend/src/services/queue/**` | observe | Medium |
| PAT-018 | Dynamic custom-field validation can produce deterministic per-field error maps | `open-mercato/packages/shared/src/modules/entities/validation.ts`, `.../core/src/modules/entities/lib/validation.ts` | `9fd63cd9b67722a706ae31d4875f333bcc1129c5` | Medium | `backend/src/middleware/zodValidation.ts`, `backend/src/validations/**` | adapt | Medium |
| PAT-019 | Scheduler runner guardrails: overlap prevention + bounded retries + timeout races | `ever-gauzy/packages/scheduler/src/lib/services/scheduler-job-runner.service.ts` | `8945d27627d58028b9528f6915abd87d46b5ec85` | High | `backend/src/services/webhookRetrySchedulerService.ts`, `backend/src/services/queue/intervalBatchRunner.ts` | adapt | Medium |
| PAT-020 | Queue registration errors should fail loudly with deterministic diagnostics | `ever-gauzy/packages/scheduler/src/lib/services/scheduler-queue.service.ts`, `.../hosts/queue-worker.host.ts` | `8945d27627d58028b9528f6915abd87d46b5ec85` | Medium | `backend/src/services/queue/**`, `backend/src/services/webhookRetrySchedulerService.ts` | adapt | Low |

## Extraction Coverage Check

- Total patterns: **20**
- Source coverage: **6/6 repos represented**
- Backend target coverage includes all requested first-pass files:
  - `backend/src/middleware/correlationId.ts`
  - `backend/src/modules/shared/http/envelope.ts`
  - `backend/src/middleware/errorHandler.ts`
  - `backend/src/middleware/rateLimiter.ts`
  - `backend/src/utils/rateLimitKeys.ts`
  - `backend/src/services/webhookService.ts`
  - `backend/src/services/webhookRetrySchedulerService.ts`
  - `backend/src/services/authGuardService.ts`
  - `backend/src/__tests__/integration/routeGuardrails.test.ts`

## P4-T2 Pattern Additions

| Pattern ID | Problem | Source repo/path | Source commit | Transferability | Nonprofit target files | Adoption mode | Risk |
|---|---|---|---|---|---|---|---|
| PAT-021 | Missing follow-up lifecycle backend for existing frontend contract | `openproject/app/services/reminders/*` | architecture-reference | High | `backend/src/services/followUpService.ts`, `backend/src/controllers/followUpController.ts`, `backend/src/routes/followUps.ts` | architecture-only | Medium |
| PAT-022 | Reminder delivery needs reliable claim/lock lifecycle | `openproject/app/models/reminder_notification*` | architecture-reference | High | `backend/src/services/followUpReminderSchedulerService.ts`, `backend/src/services/followUpService.ts` | architecture-only | Medium |
| PAT-023 | Scheduled reporting needs run logs and recurring execution loop | `superset/tasks/schedules.py`, `superset/models/reports/*` | architecture-reference | High | `backend/src/services/scheduledReportService.ts`, `backend/src/services/scheduledReportSchedulerService.ts`, `database/migrations/054_scheduled_reports.sql` | adapt | Medium |
| PAT-024 | Email report delivery requires multi-recipient + attachment support | `superset reporting delivery pipeline` | architecture-reference | Medium | `backend/src/services/emailService.ts` | adapt | Low |
| PAT-025 | Opportunities require dedicated stage and transition domain | `twenty/modules/opportunity/*`, `open-mercato modules` | architecture-reference | High | `backend/src/modules/opportunities/**`, `database/migrations/055_opportunities_pipeline.sql` | architecture-only+adapt | Medium |
