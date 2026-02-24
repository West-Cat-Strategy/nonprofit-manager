# wc-manage Pattern Adoption Audit for nonprofit-manager

**Date:** 2026-02-23  
**Scope:** API guardrails first, with modularity and CI/release policy as secondary tracks.

## 1. Source Pattern Catalog (wc-manage)

### 1.1 API Error Builder (`wc-manage/src/lib/server/api-error.ts`)
- Single helper (`buildApiErrorResponse`) returns deterministic non-2xx payloads.
- Includes inferred/stable error code, explicit status, and correlation id.
- Sets `x-correlation-id` header consistently.

### 1.2 Cache/Rate-Limit Key Policy (`wc-manage/src/lib/server/cache-keys.ts`)
- Shared key builders normalize and namespace keys (`workspace` vs `global`).
- Policy avoids ad-hoc key literals in route handlers.

### 1.3 Auth/Workspace Guards (`wc-manage/src/lib/server/guards.ts`)
- Guard helpers provide strict and soft-fail variants:
  - strict (`requireUser`, `requireUserWorkspace`)
  - safe (`requireUserOrError`, `requireUserWorkspaceOrError`)
- Encourages deterministic auth failure surfaces.

### 1.4 Route Guardrail Test Matrix (`wc-manage/src/app/api/routes-guardrails.test.ts`)
- Centralized matrix-style tests for auth, token boundaries, validation, webhook signatures, and rate limit behavior.
- Uses deterministic status and message assertions by route class.

### 1.5 Policy Lint Script (`wc-manage/scripts/check-cache-key-policy.ts`)
- Repository policy check blocks direct `checkRateLimit("literal", ...)` usage.
- Forces helper-generated keys.

## 2. Gap Matrix (nonprofit-manager)

### 2.1 Backend Gaps (`/backend/src`)

| Area | Current State | Gap | Priority | Target Files |
|---|---|---|---|---|
| API error envelope | Mixed shapes (`error` string/object, raw JSON, v2 envelope in modules) | No single canonical non-2xx contract across `/api/**` | P0 | `backend/src/modules/shared/http/envelope.ts`, `backend/src/utils/responseHelpers.ts`, `backend/src/middleware/errorHandler.ts`, `backend/src/middleware/validateRequest.ts`, `backend/src/middleware/zodValidation.ts`, `backend/src/controllers/**` |
| Validation strategy | Mixed Zod + express-validator + no validation on some legacy shims | Remaining express-validator chains and partial migration tracker drift | P0 | `backend/src/routes/*.ts`, `backend/src/modules/events/routes/index.ts`, `backend/src/validations/**` |
| Rate-limit key policy | Working hybrid Redis store in `rateLimiter.ts`, no key helper policy enforcement | No central key helper; no lint policy to block raw key literals | P0 | `backend/src/utils/rateLimitKeys.ts`, `backend/src/middleware/rateLimiter.ts`, `scripts/check-rate-limit-key-policy.ts` |
| Guardrail tests | Integration tests exist per domain, no global route-guardrail matrix | Missing deterministic cross-route guardrail suite | P0 | `backend/src/__tests__/integration/routeGuardrails.test.ts` |
| Duplicate limiter surface | `rateLimitAdvanced.ts` present, not referenced by runtime path | Dead/parallel implementation risks drift | P1 | `backend/src/middleware/rateLimitAdvanced.ts` |
| Module boundary conventions | v2 modules exist with legacy wrappers, conventions are implicit | Need explicit ownership rules documented | P1 | `docs/development/ARCHITECTURE.md` |

### 2.2 Frontend Gaps (`/frontend/src`)

| Area | Current State | Gap | Priority | Target Files |
|---|---|---|---|---|
| API envelope assumptions | `ApiEnvelope` + `unwrapApiData` exists, many feature clients still include legacy fallback extraction logic | Need canonical success envelope assumption for `/api/**` and reduced fallback branches | P0 | `frontend/src/services/apiEnvelope.ts`, `frontend/src/features/*/api/*.ts` |
| Unauthorized handling | Centralized event-driven redirect path already in place | Keep behavior, but align error code/message handling to canonical backend envelope | P1 | `frontend/src/services/httpClient.ts`, feature API clients |
| Modular cutover hygiene | v2 slices/modules exist with legacy compatibility | Need explicit conventions and migration order in docs | P1 | `docs/development/ARCHITECTURE.md`, route/store docs |

## 3. File-Level Migration Spec and Order

## Phase A: Canonical API Envelope and Error Surfaces
1. Expand `backend/src/modules/shared/http/envelope.ts` to be canonical for all `/api/**` non-2xx responses.
2. Refactor `backend/src/utils/responseHelpers.ts` to delegate to canonical envelope helpers.
3. Refactor `backend/src/middleware/errorHandler.ts` to return canonical envelope payloads with correlation id.
4. Refactor `backend/src/middleware/validateRequest.ts` and `backend/src/middleware/zodValidation.ts` to return canonical validation error envelope.
5. Update controllers to remove ad-hoc non-2xx payload shapes and route all failures through helpers.

## Phase B: Zod Migration Completion
1. Convert remaining route files from express-validator to Zod middleware:
- `backend/src/routes/accounts.ts`
- `backend/src/routes/alerts.ts`
- `backend/src/routes/analytics.ts`
- `backend/src/routes/backup.ts`
- `backend/src/routes/dashboard.ts`
- `backend/src/routes/export.ts`
- `backend/src/routes/ingest.ts`
- `backend/src/routes/invitations.ts`
- `backend/src/routes/mailchimp.ts`
- `backend/src/routes/meetings.ts`
- `backend/src/routes/payments.ts`
- `backend/src/routes/publishing.ts`
- `backend/src/routes/reports.ts`
- `backend/src/routes/savedReports.ts`
- `backend/src/routes/tasks.ts`
- `backend/src/routes/templates.ts`
- `backend/src/routes/users.ts`
- `backend/src/routes/webhooks.ts`
- `backend/src/modules/events/routes/index.ts`
2. Add/extend schemas in `backend/src/validations/**` for shared enums, route params, and query filters.
3. Remove express-validator route dependencies after parity.

## Phase C: Route Guardrails and Policy Enforcement
1. Add `backend/src/__tests__/integration/routeGuardrails.test.ts`:
- auth-required route matrix
- validation-required route matrix
- webhook signature/token matrix
- rate-limit response contract matrix
2. Add `backend/src/utils/rateLimitKeys.ts` and migrate `backend/src/middleware/rateLimiter.ts` to use helper-built keys.
3. Remove unused duplicate implementation `backend/src/middleware/rateLimitAdvanced.ts`.
4. Add `scripts/check-rate-limit-key-policy.ts` and wire into `scripts/ci.sh` and `Makefile`.

## Phase D: Secondary Tracks
1. Document module ownership + legacy wrapper conventions in `docs/development/ARCHITECTURE.md`.
2. Add deterministic check selector script `scripts/select-checks.sh`.
3. Update strict gate language in:
- `docs/development/RELEASE_CHECKLIST.md`
- `docs/testing/TESTING.md`

## 4. Workboard Mapping (Existing Tasks + Subtasks)

Primary anchors in `docs/phases/planning-and-progress.md`:
- `P2-T16` response standardization
- `P2-T11` to `P2-T15` Zod completion
- `P2-T17` guardrail integration tests and policy checks
- `P4-T1*` modularity conventions hardening

Proposed/added subtasks:
- `P2-T16A`, `P2-T16B`
- `P2-T11A`, `P2-T11B`
- `P2-T12A`, `P2-T13A`, `P2-T14A`, `P2-T14B`, `P2-T15A`
- `P2-T17A`, `P2-T17B`
- `P4-T1D`

Execution constraint:
- one active subtask per agent at a time for this program.

## 5. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| API breaking change fallout from response-shape unification | Client regressions on legacy parsing | Update frontend API clients in same change windows; stage route-by-route verification and integration tests |
| Migration drift across many route files | Partial validation and inconsistent runtime behavior | Migrate file-complete per route; avoid mixed validator styles inside one file |
| Hidden auth boundary regressions | Unauthorized access or false denials | Add route guardrail matrix tests for auth/token-required routes |
| Rate-limit behavior regressions | User lockouts or under-protection | Add deterministic rate-limit contract tests and helper key policy script |
| Test runtime expansion for full matrix requirement | Slower iteration and CI contention | Use deterministic check selector for local iteration; still run required full matrix gates before merge |

## 6. Rollback Points

1. **Envelope rollback point**
- Keep helper-level abstraction so payload shape rollback can be done centrally in `responseHelpers.ts` and `envelope.ts` without reverting all controllers.

2. **Route migration rollback point**
- Migrate route files in independent commits per domain, enabling targeted revert of one route/domain if needed.

3. **Rate-limit policy rollback point**
- Keep policy script and key helper wiring in isolated commit; temporary bypass can disable policy check while preserving runtime limiter behavior.

4. **Guardrail test rollback point**
- Keep new route guardrail suite isolated; failures can be triaged without blocking unrelated runtime fixes by temporarily narrowing the test matrix.

## 7. Acceptance Criteria for Program Completion

1. All `/api/**` failures emit canonical envelope:
- `{ success: false, error: { code, message, details? }, correlationId? }`
2. Remaining express-validator route files are migrated to Zod middleware.
3. Guardrail integration suite is present and green for auth/validation/webhook/rate-limit matrices.
4. Rate-limit key helper policy script runs in CI pipeline.
5. Frontend feature API clients consume canonical envelope with reduced legacy fallback extraction.
6. Workboard task/subtask mapping reflects completion status and references.

