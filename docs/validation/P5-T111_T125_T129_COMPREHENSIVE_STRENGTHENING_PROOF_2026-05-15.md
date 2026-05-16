# P5-T111/P5-T125-P5-T129 Comprehensive Strengthening Proof

**Date:** 2026-05-15
**Status:** Row-local proof note
**Rows:** `P5-T111`, `P5-T125`, `P5-T126`, `P5-T127`, `P5-T128`, `P5-T129`

## Scope

This batch implemented the first tranche of the comprehensive strengthening plan without opening broad product expansion under `P5-T6`.

- `P5-T111`: recorded the current central reference corpus in [../development/reference-patterns/P5-T111-comprehensive-strengthening-reference-synthesis-2026-05-15.md](../development/reference-patterns/P5-T111-comprehensive-strengthening-reference-synthesis-2026-05-15.md), preserving metadata-first and no-source-copy guardrails.
- `P5-T125`: aligned publishing admin cache stats, clear, and profiles routes behind authentication, active organization context, and `admin:settings` permission checks.
- `P5-T126`: added shared public API policy constants for public-site CORS and CSRF posture, then added a v2 route auth-posture policy check for public mounts and module-local auth exceptions.
- `P5-T127`: added `/reports/board-packet` to the staff route catalog and route-catalog tests.
- `P5-T128`: associated dense case-form builder labels with stable control IDs and added label-based component coverage for core, mapping, and conditional controls.
- `P5-T129`: corrected `make check-changed ARGS=--run` docs/help, routed root package manifests through lint/typecheck selector proof, refreshed migration-range wording, and removed the duplicate backend-only dependency override while leaving `package-lock.json` unchanged.

Out of scope: source/schema/UI copying from reference repos, webhook producer wiring, WCS deployment changes, DB audit trigger propagation, broad dense-control/report-builder redesign, Volunteer/Event runtime work, memberships, finance breadth, workflow studio, offline sync, provider-primary campaign redesign, and generic form-runtime adoption.

## Validation

| Command | Result |
|---|---|
| `node scripts/check-v2-route-auth-posture.ts` | Passed: 10 public mounts and 8 public-site ingress mounts validated |
| `node scripts/check-auth-guard-policy.ts` | Passed |
| `node scripts/check-route-validation-policy.ts` | Passed |
| `node scripts/check-route-catalog-drift.ts` | Passed |
| `node scripts/check-route-integrity.ts` | Passed |
| `node scripts/check-openapi-contract.ts` | Passed |
| `node scripts/check-migration-manifest-policy.ts` | Passed |
| `make test-tooling` | Passed: 45 tooling contract tests |
| `npm run knip` | Passed |
| `make security-audit` | Passed: `npm audit --omit=dev --workspaces --include-workspace-root --audit-level=moderate` found 0 vulnerabilities |
| `make check-links` | Passed: 252 files, 1500 local links |
| `cd /Users/bryan/projects/reference-repos && node scripts/validate-reference-index.mjs --mode=metadata` | Passed: 129 repos |
| `jq empty /Users/bryan/projects/reference-repos/docs/index.json reference-repos/manifest.lock.json` | Passed |
| `cd backend && npx jest --runInBand src/modules/publishing/routes/__tests__/cacheAdminRoutes.security.test.ts` | Passed: 10 tests |
| `cd frontend && npm test -- --run src/routes/__tests__/routeCatalog.test.ts src/features/cases/caseForms/__tests__/CaseFormsBuilderCard.test.tsx` | Passed: 2 files, 21 tests |
| `cd backend && npx jest --forceExit --runTestsByPath src/modules/cases/queries/__tests__/handoffQueries.test.ts src/modules/cases/queries/__tests__/servicesQueries.test.ts` | Passed: 2 suites, 5 tests |
| `cd frontend && npm test -- --run src/features/cases/components/__tests__/CaseHandoffPacket.test.tsx src/features/cases/caseForms/__tests__/CaseFormsBuilderCard.test.tsx src/features/cases/caseForms/__tests__/caseFormsPanelUtils.test.ts` | Passed: 3 files, 10 tests |
| `cd backend && npm run type-check` | Passed |
| `cd frontend && npm run type-check` | Passed |
| `make typecheck` | Passed |
| Targeted backend/frontend ESLint for changed runtime/test files | Passed |
| `git diff --check` for the changed batch | Passed |

## Blocked Or Residual Checks

| Command | Result |
|---|---|
| `cd backend && npx jest --runInBand src/__tests__/integration/publishing.test.ts --testNamePattern="cache admin\|clear-all cache"` | Blocked before assertions because the test database at `127.0.0.1:8012` was unavailable. The route-level Supertest coverage above proves the new denial-path middleware order without DB access. |
| `make db-verify` | Blocked because Docker was not running and `/Users/bryan/.docker/run/docker.sock` was unavailable. This preserves the existing `P5-T115` DB verifier caveat. |
| `make lint` | Ran backend ESLint and shared policy checks through `check-implementation-size-policy.ts`, then stopped on current oversize-file policy issues: `backend/src/services/publishing/publicActionService.ts` at 921 lines, `frontend/src/features/cases/caseForms/CaseFormsBuilderCard.tsx` at 1111 lines, and `frontend/src/types/case.ts` at 908 lines. The first and third were already over the 900-line cap before this batch; the case-form builder remains a live extraction candidate under the new dense-control follow-up row. |

## Caveat Review

- `P5-T114`: focused backend query and frontend handoff packet checks passed again; DB-backed integration proof still waits on a live test DB/Docker environment.
- `P5-T115`: `make db-verify` still waits on Docker; migration manifest policy passed.
- `P5-T119`: frontend type-check now passes, clearing the inherited board-packet type-check caveat.

## Follow-Up Rows

The plan added these Ready rows for work intentionally not implemented in this tranche:

- `P5-T130` WCS production deploy contract tracking.
- `P5-T131` Webhook organization scoping.
- `P5-T132` DB audit request-context propagation.
- `P5-T133` Dense control and report-builder accessibility hardening, including extraction of the now over-cap case-form builder.
- `P5-T134` Volunteer and event-operations persona discovery.
