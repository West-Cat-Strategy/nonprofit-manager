# P4-T9A Startup Request Map (`/login` -> `/dashboard` -> `/events/:id`)

Date: 2026-03-04
Sources: frontend route/hook code paths, existing frontend/E2E tests, and CI run logs.

## Before (baseline)

| Route | Startup requests observed/required |
|---|---|
| `/login` | `GET /api/v2/auth/setup-status` (global setup check), plus auth flow calls (`POST /api/v2/auth/login`) on submit |
| `/dashboard` | `GET /api/analytics/summary` + `GET /api/tasks/summary` via dashboard startup stats call path (data unused in render) |
| `/events/:id` | `GET /api/v2/events/:id` on detail load (and follow-up registrations/check-in requests when operator actions are taken) |

## After (this continuation)

| Route | Startup requests observed/required |
|---|---|
| `/login` | `GET /api/v2/auth/setup-status` only when setup-gate routes are active (`enabled: true`); remains required for setup redirect semantics |
| `/dashboard` | No mandatory startup dependency on `/api/analytics/summary` or `/api/tasks/summary` (explicitly asserted in unit+E2E auth tests) |
| `/events/:id` | Unchanged core detail dependency: `GET /api/v2/events/:id` on route load |

## Evidence pointers

- Setup-check gating implementation: `frontend/src/hooks/useSetupCheck.ts`, `frontend/src/routes/index.tsx`
- Dashboard startup fetch removal: `frontend/src/pages/neo-brutalist/NeoBrutalistDashboard.tsx`, `frontend/src/services/LoopApiService.ts`
- Assertions:
  - `frontend/src/pages/__tests__/NeoBrutalistDashboard.test.tsx`
  - `e2e/tests/auth.spec.ts` (`dashboard startup does not request analytics/task summary endpoints`)
