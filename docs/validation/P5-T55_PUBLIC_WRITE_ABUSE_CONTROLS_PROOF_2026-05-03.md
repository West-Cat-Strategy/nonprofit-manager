# P5-T55 Public Write Abuse Controls Proof - 2026-05-03

## Scope

`P5-T55` added focused public-write rate limits beyond the general API limiter.

## Implementation

- Added public website form, public action submission, newsletter confirmation, and public-site analytics limiter strategies.
- Kept limiter key generation centralized in `rateLimitKeys`.
- Scoped public form/action/analytics keys by public site surface and client IP.
- Scoped newsletter confirmation keys by a short SHA-256 token bucket and client IP so raw confirmation tokens are not stored in limiter keys.
- Wired limiters before validation/controllers on public write routes while preserving request/response payloads.
- May 4 closeout wired the standalone `backend/src/public-site.ts` analytics route through `publicSiteAnalyticsLimiterMiddleware`, matching the main router's public-site analytics write protection.
- Preserved test-environment no-op limiter middleware behavior.

## Validation

- `cd backend && npx jest --runInBand src/__tests__/utils/rateLimitKeys.test.ts src/__tests__/middleware/rateLimiter.test.ts src/modules/publishing/routes/__tests__/publicRateLimits.test.ts` - passed, 3 suites / 19 tests.
- `cd backend && node ../scripts/check-rate-limit-key-policy.ts` - passed.
- `cd backend && npm run type-check` - passed.
- `cd backend && npx eslint backend/src/middleware/rateLimiter.ts backend/src/utils/rateLimitKeys.ts backend/src/modules/publishing/routes/public.ts backend/src/modules/publishing/routes/index.ts backend/src/__tests__/middleware/rateLimiter.test.ts backend/src/__tests__/utils/rateLimitKeys.test.ts backend/src/modules/publishing/routes/__tests__/publicRateLimits.test.ts` - passed.
- `git diff --check -- backend/src/middleware/rateLimiter.ts backend/src/utils/rateLimitKeys.ts backend/src/modules/publishing/routes/public.ts backend/src/modules/publishing/routes/index.ts backend/src/__tests__/middleware/rateLimiter.test.ts backend/src/__tests__/utils/rateLimitKeys.test.ts backend/src/modules/publishing/routes/__tests__/publicRateLimits.test.ts` - passed.
- May 4 closeout: `cd backend && npx jest --runInBand src/__tests__/services/backupService.test.ts src/__tests__/services/portalAuthService.test.ts src/modules/portalAuth/controllers/__tests__/portalAuthController.test.ts src/modules/portalAdmin/controllers/__tests__/portalAdminController.test.ts src/modules/dashboard/services/__tests__/workqueueSummaryService.test.ts src/__tests__/scripts/checkRouteValidationPolicy.test.ts` - passed, 6 suites / 58 tests, including route-policy coverage that requires the standalone analytics write to use the focused public limiter before params validation.
- May 4 closeout: `make lint`, `make typecheck`, `npm run knip`, and `git diff --check` - passed.

## Notes

- `cd backend && npm test -- --runInBand ...` did not reach Jest because the wrapper could not connect to Docker at `/Users/bryan/.docker/run/docker.sock`. Direct Jest was used for focused behavior proof.
