# P5-T75 Auth Alias Gate Handoff

**Date:** 2026-05-05
**Status:** Operationally resolved as intentionally blocked/deferred

## Summary

`P5-T75` remains blocked by the auth-alias telemetry calendar, not by missing implementation access. Legacy `snake_case` auth input aliases remain accepted intentionally while operators collect production-like alias-usage evidence.

No auth schemas, route behavior, public API contracts, CI policy guard, or release cutoff notice changed in this handoff.

## Current Evidence

- Alias telemetry middleware is already wired before validation transforms for `/api/v2/auth/register`, `/api/v2/auth/setup`, and `/api/v2/auth/password`.
- Guardrail coverage remains in `backend/src/__tests__/modules/auth/aliasUsageTelemetry.test.ts`.
- The current telemetry workflow is documented in [../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md](../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md).
- The current deprecation gate is documented in [../security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md](../security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md).
- The existing readiness snapshot remains [AUTH_ALIAS_USAGE_REPORT_2026-04-14.md](AUTH_ALIAS_USAGE_REPORT_2026-04-14.md).

## Gate State

- No production zero-usage streak is claimed in this handoff.
- A day counts as clean only when all three tracked auth routes have alias usage ratio `0` and non-zero route traffic.
- Alias retirement still requires 30 consecutive clean production-like days and no active integrator exceptions.
- Next checkpoint: June 17, 2026.
- Earliest enforcement date: July 1, 2026.

## Follow-Up

A thread follow-up is scheduled for June 17, 2026 at 09:00 America/Vancouver to review telemetry ratios and documented exceptions, then either publish an explicit deferral or prepare the July 1 retirement path.

## Validation

- Passed on 2026-05-05: `cd backend && npm test -- --runTestsByPath src/__tests__/modules/auth/aliasUsageTelemetry.test.ts`
  - Result: 1 suite passed, 3 tests passed.
  - Note: the existing `--localstorage-file` warning appeared during the backend wrapper run and did not affect the focused telemetry guard.
- Passed on 2026-05-05: `make check-links`
  - Result: checked 207 files and 1567 local links; no broken active-doc links found.
- Passed on 2026-05-05: `git diff --check`
