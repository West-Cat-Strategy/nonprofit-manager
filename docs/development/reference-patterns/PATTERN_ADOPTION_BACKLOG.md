# Pattern Adoption Backlog (Backend-First)

Date: 2026-03-01  
Task: P4-T1D

This backlog converts extracted reference patterns into actionable nonprofit-manager work items.

## P4-T1D-A1 Canonical Error Envelope Hardening

- Risk: Medium
- Source patterns: `PAT-001`, `PAT-006`, `PAT-013`
- Target files:
  - `backend/src/modules/shared/http/envelope.ts`
  - `backend/src/utils/responseHelpers.ts`
  - `backend/src/middleware/errorHandler.ts`
- Acceptance criteria:
  - All non-2xx responses emit `{ success: false, error: { code, message, details? }, correlationId? }`.
  - No mixed top-level error payload variants remain in middleware/controller helpers.
  - Correlation header/body consistency is preserved under handled and unhandled errors.
- Verification commands:
  - `cd backend && npm run test:integration -- routeGuardrails.test.ts`
  - `node scripts/check-success-envelope-policy.ts`

## P4-T1D-A2 Correlation ID Normalization and Fallback Policy

- Risk: Medium
- Source patterns: `PAT-006`
- Target files:
  - `backend/src/middleware/correlationId.ts`
  - `backend/src/types/express.d.ts`
  - `backend/src/middleware/errorHandler.ts`
- Acceptance criteria:
  - Accept `x-correlation-id` only when format is valid; otherwise generate UUID.
  - Preserve user-provided correlation IDs that meet policy.
  - Always set response header and pass same value into error envelope field.
- Verification commands:
  - `cd backend && npm run test:integration -- routeGuardrails.test.ts`
  - `cd backend && npm test -- --runInBand -- testPathPattern=correlation`

## P4-T1D-A3 Auth Guard Contract Split (Strict vs Safe)

- Risk: Medium
- Source patterns: `PAT-002`, `PAT-008`, `PAT-014`
- Target files:
  - `backend/src/services/authGuardService.ts`
  - `backend/src/controllers/**`
- Acceptance criteria:
  - Guard service exposes strict and safe variants with deterministic return contracts.
  - Controllers use safe variants for structured 4xx responses and strict variants where hard guarantees are required.
  - Permission checks can evaluate activation/availability state before mutating operations.
- Verification commands:
  - `cd backend && npm test -- --runInBand -- testPathPattern=authGuardService`
  - `cd backend && npm run test:integration -- routeGuardrails.test.ts`

## P4-T1D-A4 Rate-Limit Key Namespace Expansion

- Risk: Low
- Source patterns: `PAT-003`, `PAT-004`, `PAT-015`
- Target files:
  - `backend/src/utils/rateLimitKeys.ts`
  - `backend/src/middleware/rateLimiter.ts`
  - `scripts/check-rate-limit-key-policy.ts`
- Acceptance criteria:
  - Key helpers enforce stable namespace semantics (`global` vs scoped).
  - `rateLimiter.ts` uses helper-only key generation for all limiter definitions.
  - Policy script blocks any raw literal key generator expressions.
- Verification commands:
  - `node scripts/check-rate-limit-key-policy.ts`
  - `cd backend && npm run test:integration -- routeGuardrails.test.ts`

## P4-T1D-A5 Route Guardrail Matrix Expansion

- Risk: Low
- Source patterns: `PAT-005`
- Target files:
  - `backend/src/__tests__/integration/routeGuardrails.test.ts`
- Acceptance criteria:
  - Matrix includes at minimum: auth-required, validation-required, webhook auth/idempotency, rate-limit contract, correlation determinism.
  - Assertions validate error `code` and response-envelope structure, not only status code.
- Verification commands:
  - `cd backend && npm run test:integration -- routeGuardrails.test.ts`

## P4-T1D-A6 Webhook Outbox + Dead-Letter Semantics

- Risk: High
- Source patterns: `PAT-010`, `PAT-011`, `PAT-016`
- Target files:
  - `backend/src/services/webhookService.ts`
  - `backend/src/services/webhookRetrySchedulerService.ts`
  - `backend/src/types/webhook.ts`
- Acceptance criteria:
  - Delivery lifecycle states are explicit: `pending -> running/retrying -> success|failed|dead_letter`.
  - Terminal dead-letter state is emitted after max attempts with retained last error metadata.
  - Event enqueue path is decoupled from synchronous request success path.
- Verification commands:
  - `cd backend && npm run test:integration -- webhooks`
  - `cd backend && npm run test:integration -- routeGuardrails.test.ts`

## P4-T1D-A7 Webhook Security Idempotency Layer

- Risk: High
- Source patterns: `PAT-009`
- Target files:
  - `backend/src/services/webhookService.ts`
  - `backend/src/routes/webhooks.ts`
  - `backend/src/controllers/webhookController.ts`
- Acceptance criteria:
  - Duplicate event detection is persisted and prevents double-processing.
  - Signature + timestamp validation failures return deterministic canonical errors.
  - Inbound handler maintains fail-safe acknowledgement behavior where provider retry storms are a risk.
- Verification commands:
  - `cd backend && npm run test:integration -- webhooks`
  - `cd backend && npm run test:integration -- routeGuardrails.test.ts`

## P4-T1D-A8 Append-Only Audit Write Helper

- Risk: Medium
- Source patterns: `PAT-012`
- Target files:
  - `backend/src/services/auditService.ts`
  - `backend/src/controllers/**`
- Acceptance criteria:
  - Mutating controller paths call shared audit helper rather than ad-hoc query snippets.
  - Audit payload includes actor, action, target, diff summary, and request/correlation id.
  - Audit writes are append-only.
- Verification commands:
  - `cd backend && npm test -- --runInBand -- testPathPattern=audit`
  - `cd backend && npm run test:integration`

## P4-T1D-A9 Scheduler Runtime Guardrails

- Risk: Medium
- Source patterns: `PAT-019`, `PAT-020`
- Target files:
  - `backend/src/services/webhookRetrySchedulerService.ts`
  - `backend/src/services/queue/intervalBatchRunner.ts`
- Acceptance criteria:
  - Scheduler supports overlap prevention semantics for long-running batches.
  - Retry policy supports bounded attempts and deterministic delay strategy.
  - Timeout and queue-registration failures produce explicit logs with actionable error text.
- Verification commands:
  - `cd backend && npm test -- --runInBand -- testPathPattern=webhookRetrySchedulerService`

## P4-T1D-A10 Validation Detail Schema Consistency

- Risk: Medium
- Source patterns: `PAT-007`, `PAT-018`
- Target files:
  - `backend/src/middleware/zodValidation.ts`
  - `backend/src/middleware/validateRequest.ts`
  - `backend/src/validations/**`
- Acceptance criteria:
  - Validation errors expose deterministic field paths and machine-usable detail arrays.
  - Legacy and Zod-based validation middleware converge on one details contract.
  - Route guardrail tests assert detail shape for at least two invalid payload classes.
- Verification commands:
  - `cd backend && npm run test:integration -- routeGuardrails.test.ts`
  - `cd backend && npm test -- --runInBand`

## Minimal Validation Runset for This Documentation Phase

- `bash scripts/reference/sync-reference-repos.sh`
- `bash scripts/reference/verify-reference-repos.sh`
- `node scripts/check-rate-limit-key-policy.ts`

## P4-T2 Adoption Backlog Additions

### P4-T2A Follow-up Lifecycle (OpenProject-inspired, architecture-only)

- Risk: Medium
- Source patterns: `PAT-021`, `PAT-022`
- Target files:
  - `backend/src/services/followUpService.ts`
  - `backend/src/controllers/followUpController.ts`
  - `backend/src/routes/followUps.ts`
  - `backend/src/services/followUpReminderSchedulerService.ts`
  - `frontend/src/pages/engagement/followUps/FollowUpsPage.tsx`
- Acceptance criteria:
  - Full follow-up API matrix available.
  - Case/task nested endpoints satisfy existing frontend thunks.
  - Reminder scheduler uses claim-and-process semantics behind env flag.

### P4-T2B Scheduled Reports (Superset-inspired, adapted)

- Risk: Medium
- Source patterns: `PAT-023`, `PAT-024`
- Target files:
  - `backend/src/services/scheduledReportService.ts`
  - `backend/src/services/scheduledReportSchedulerService.ts`
  - `backend/src/services/emailService.ts`
  - `frontend/src/pages/analytics/ScheduledReports.tsx`
  - `frontend/src/store/slices/scheduledReportsSlice.ts`
- Acceptance criteria:
  - CRUD/toggle/run-now/runs APIs implemented.
  - Run history persists success/failure metadata.
  - Saved reports page exposes schedule action dialog.

### P4-T2C Opportunities Pipeline (Twenty/Open-Mercato-inspired)

- Risk: Medium
- Source patterns: `PAT-025`
- Target files:
  - `backend/src/modules/opportunities/**`
  - `database/migrations/055_opportunities_pipeline.sql`
  - `frontend/src/pages/engagement/opportunities/OpportunitiesPage.tsx`
  - `frontend/src/store/slices/opportunitiesSlice.ts`
- Acceptance criteria:
  - Alias + canonical API route parity.
  - Stage reorder and move-stage history persistence.
  - Pipeline UI supports create/edit/move/reorder actions.
