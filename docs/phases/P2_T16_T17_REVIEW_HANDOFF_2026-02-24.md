# P2-T16 / P2-T17 Review Handoff Pack

Date: February 24, 2026  
Branch: `codex/p3-t5-case-priority-critical-ui`  
Workboard source: `docs/phases/planning-and-progress.md`

## Scope Summary

This handoff isolates the Phase 2 review package for:

- `P2-T16` Standardize error/success envelopes
- `P2-T17` Integration guardrail and compatibility verification

No additional feature work is included in this package.  
`P3-T5` remains `Blocked` during this review cycle.

## Compatibility Note (Public API Behavior)

Implemented compatibility behavior for successful API responses:

- Canonical envelope fields are present: `success: true` and `data: <payload>`.
- For object payloads, existing top-level fields are preserved to avoid breaking legacy callers.

Error behavior remains canonical (`success: false`, `error`, optional `correlationId`).

## P2-Only File Manifest

### T16C — Backend Success Envelope Sweep + Baseline Ratchet

| File | Why in P2 scope | Behavior change | Validation evidence |
|---|---|---|---|
| `backend/src/modules/shared/http/envelope.ts` | Core envelope helper used by controllers | `sendSuccess` enforces canonical envelope while preserving top-level object compatibility | `make lint`, `make typecheck`, `cd backend && npm run test:integration` |
| `backend/src/middleware/successEnvelope.ts` | Global `/api` success wrapping policy | Ensures successful non-enveloped responses are normalized with compatibility-safe object wrapping | `make lint`, `cd backend && npm run test:integration` |
| `backend/src/controllers/outcomeDefinitionController.ts` | Direct success responses in Phase 2 outcome admin paths | Migrated to `sendSuccess` helper usage | `cd backend && npm run test:integration` |
| `backend/src/controllers/outcomeImpactController.ts` | Direct success responses in outcome tagging paths | Migrated to `sendSuccess` helper usage | `cd backend && npm run test:integration` |
| `backend/src/controllers/outcomeReportController.ts` | Direct success response in outcomes reporting path | Migrated to `sendSuccess` helper usage | `cd backend && npm run test:integration` |
| `scripts/policies/success-envelope-baseline.json` | Policy ratchet artifact for direct success calls | Ratcheted targeted controller counts downward; no baseline increases | `make lint` (policy checks pass) |

### T16D — Frontend Client Envelope Alignment + Type Hardening

| File | Why in P2 scope | Behavior change | Validation evidence |
|---|---|---|---|
| `frontend/src/services/httpClient.ts` | Shared client interceptor + CSRF token handling | CSRF token retrieval now unwraps canonical envelopes safely | `make typecheck`, `make test-frontend` |
| `frontend/src/store/slices/outcomesAdminSlice.ts` | Duplicated local envelope types/extractors | Replaced local extractor with shared `apiEnvelope` utilities | `make typecheck`, `make test-frontend` |
| `frontend/src/store/slices/outcomesReportsSlice.ts` | Duplicated local envelope types/extractors | Replaced local extractor with shared `apiEnvelope` utilities | `make typecheck`, `make test-frontend` |
| `frontend/src/services/loop/campaign.ts` | Legacy `response.data.data` assumptions | Standardized unwrap via shared envelope utility | `make test-frontend` |
| `frontend/src/services/loop/organizations.ts` | Legacy nested data assumptions | Standardized unwrap via shared envelope utility | `make test-frontend` |
| `frontend/src/services/loop/people.ts` | Legacy nested data assumptions | Standardized unwrap via shared envelope utility | `make test-frontend` |
| `frontend/src/features/cases/state/casesLegacyCore.ts` | Local envelope typing/extractor duplication | Imported shared `ApiEnvelope` + `unwrapApiData` | `make typecheck`, `make test-frontend` |
| `frontend/src/features/contacts/state/contactsLegacyCore.ts` | Local envelope typing/extractor duplication | Imported shared `ApiEnvelope` + `unwrapApiData` | `make typecheck`, `make test-frontend` |
| `frontend/src/components/PaymentHistory.tsx` | Direct nested payload assumption | Uses shared envelope unwrapping for donations payload | `make test-frontend` |
| `frontend/src/pages/admin/AdminSettings.tsx` | Direct nested payload assumption | Portal contact search now unwraps canonical payload shape safely | `make test-frontend` |
| `frontend/src/pages/admin/adminSettings/sections/RegistrationSettingsSection.tsx` | Direct nested payload assumption | Pending registrations now support envelope/unwrapped forms | `make test-frontend` |
| `frontend/src/pages/neo-brutalist/PeopleDirectory.tsx` | Direct nested payload assumptions in list/count paths | Standardized envelope unwrapping across list + count requests | `make test-frontend` |

### T17A / T17C — Guardrail Matrix Expansion

| File | Why in P2 scope | Behavior change | Validation evidence |
|---|---|---|---|
| `backend/src/__tests__/integration/routeGuardrails.test.ts` | Core integration guardrail matrix | Added broader auth/validation/success cases plus correlation-id determinism check under rate limit | `cd backend && npm run test -- src/__tests__/integration/routeGuardrails.test.ts --runInBand`, `cd backend && npm run test:integration` |

### T17D — E2E Helper Compatibility

| File | Why in P2 scope | Behavior change | Validation evidence |
|---|---|---|---|
| `e2e/helpers/auth.ts` | E2E API payload parsing helper | Migrated to shared E2E envelope helper usage | `cd e2e && npm run test:smoke` |
| `e2e/helpers/database.ts` | E2E API payload parsing helper | Migrated to shared E2E envelope helper usage | `cd e2e && npm run test:smoke` |

### T17E — Coverage/Gating Synchronization and Workboard Proof

| File | Why in P2 scope | Behavior change | Validation evidence |
|---|---|---|---|
| `docs/phases/planning-and-progress.md` | Workboard status and ownership log source of truth | `P2-T16/T17` subtasks moved to `Review`; verification outcomes recorded | Manual review + command matrix below |

## Explicit Non-Scope (Excluded From P2 Handoff Package)

The following modified files are intentionally excluded from the P2 handoff:

- Auth-kernel / queue-runner / webhook-hardening tracks (e.g. authorization/queue service files)
- Case-priority follow-up UI/API files (`P3-T5`)
- Other unrelated branch changes already present in the mixed worktree

Representative excluded examples:

- `backend/src/controllers/authController.ts`
- `backend/src/services/webhookService.ts`
- `frontend/src/components/CaseForm.tsx`
- `frontend/src/features/cases/api/casesApiClient.ts`
- `scripts/verify-migrations.sh`

## Verification Evidence Matrix

| Command | Result |
|---|---|
| `make lint` | PASS |
| `make typecheck` | PASS |
| `cd backend && npm run test -- src/__tests__/integration/routeGuardrails.test.ts --runInBand` | PASS (`18/18`) |
| `cd backend && npm run test:integration` | PASS (`30/30` suites, `242` tests) |
| `make test-frontend` | PASS (`64/64` files, `830` tests) |
| `cd e2e && npm run test:smoke` | PASS (`2/2`) |
| `make test-backend` | PASS (`89/89` suites, `920` tests) |

## PR Narrative Artifacts

### PR Title

`[P2-T16/P2-T17] Canonical envelope completion + route guardrail matrix expansion`

### PR Body (Copy/Paste Ready)

```md
## Scope

Completes Phase 2 review items for:
- P2-T16C/T16D (success envelope standardization + frontend/e2e envelope alignment)
- P2-T17A/T17C/T17D/T17E (guardrail matrix expansion, helper compatibility, verification/cov-gate sync)

## Non-Scope

- No new feature work outside P2-T16/T17
- No reopening of P3-T5 (remains blocked for post-P2 review cycle)
- No coverage threshold decreases

## Behavioral Compatibility

Successful API responses now consistently expose canonical envelope fields:
- `success: true`
- `data: <payload>`

Compatibility is preserved for object payloads by retaining existing top-level fields.

## Verification

- make lint ✅
- make typecheck ✅
- cd backend && npm run test -- src/__tests__/integration/routeGuardrails.test.ts --runInBand ✅
- cd backend && npm run test:integration ✅
- make test-frontend ✅
- cd e2e && npm run test:smoke ✅
- make test-backend ✅

## Risks

- Medium: response-shape compatibility across legacy consumers.
- Mitigation: compatibility-safe object wrapping and full integration + frontend/e2e verification.

## Rollback

- Revert this PR commit set.
- Re-run `make lint`, `make typecheck`, `cd backend && npm run test:integration`.
```

### Reviewer Checklist

- [ ] Success envelopes are canonical on all touched API paths.
- [ ] Legacy object-response compatibility remains intact (top-level fields preserved).
- [ ] Guardrail matrix includes expanded auth/validation/success/correlation checks.
- [ ] E2E helper envelope parsing no longer depends on brittle nested data assumptions.
- [ ] Success-envelope baseline ratchet did not increase any counts.
- [ ] Verification matrix in PR body matches executed commands and passing outcomes.

## Workboard Consistency Note

Current status alignment in `docs/phases/planning-and-progress.md` is consistent with this handoff:

- `P2-T16`, `P2-T16C`, `P2-T16D` => `Review`
- `P2-T17`, `P2-T17A`, `P2-T17C`, `P2-T17D`, `P2-T17E` => `Review`
- `P3-T5` => `Blocked`

