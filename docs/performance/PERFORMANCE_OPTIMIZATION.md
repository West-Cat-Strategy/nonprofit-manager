# Performance Optimization

**Last Updated:** 2026-05-07

This page summarizes the current performance posture. Older detailed measurement waves are retained through [README.md](README.md) and [archive/README.md](archive/README.md); rerun measurements before treating old numbers as current.

## Current Principles

- Prefer targeted query paths and explicit column projection on hot backend reads.
- Keep analytics/cache behavior service-owned and scoped to all query inputs.
- Use Redis-backed cache helpers from `backend/src/config/redis.ts` where a service already owns caching.
- Keep frontend route and heavy-widget loading lazy where the user flow allows it.
- Use memoized selectors/components for expensive derived data and chart rendering.
- Paginate large result sets and prefer cursor-style approaches where offset pagination becomes expensive.
- Validate performance-sensitive refactors with focused tests plus the smallest build/runtime proof that exercises the changed path.

## Active Code Anchors

| Area | Primary Anchors |
|---|---|
| Redis helpers | `backend/src/config/redis.ts` |
| Analytics services | `backend/src/services/analytics/**` |
| Frontend bundle splitting | `frontend/vite.config.ts` |
| Route lazy loading | `frontend/src/App.tsx` and feature route modules |
| Performance proof selection | [../testing/TESTING.md](../testing/TESTING.md) |

## Retained Evidence

- [PERFORMANCE_OPTIMIZATION_REPORT.md](PERFORMANCE_OPTIMIZATION_REPORT.md) preserves the older optimization wave summary.
- [p4-t9d-final-report.md](p4-t9d-final-report.md), [p4-t9d-baseline-notes.md](p4-t9d-baseline-notes.md), and [p4-t9a-startup-request-map.md](p4-t9a-startup-request-map.md) preserve P4 startup/runtime measurements.
- [p4-t9h-final-report.md](p4-t9h-final-report.md) and [artifacts/p4-t9h/summary.md](artifacts/p4-t9h/summary.md) preserve the retained P4-T9H evidence set.

## Validation

Use focused proof for the changed path:

- Backend hot-path changes: focused backend tests plus `cd backend && npm run type-check`
- Frontend loading/rendering changes: focused Vitest slices plus `cd frontend && npm run type-check`
- Bundle/build changes: `cd frontend && npm run build`
- Broad confidence: `make ci-full` when the change spans runtime or shared behavior

Record new performance measurements in a dated evidence note and link it from [README.md](README.md) if it remains useful after the row closes.
