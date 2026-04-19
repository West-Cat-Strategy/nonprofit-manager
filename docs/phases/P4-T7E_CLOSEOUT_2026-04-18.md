# P4-T7E Closeout

**Date:** 2026-04-18  
**Task:** `P4-T7E`  
**Row:** Accessibility + interaction hardening

## Summary

- Reproduced the remaining `P4-T7E` gap in the Chromium visibility audit: `44` checks passed while `/login`, `/accept-invitation/:token`, `/forgot-password`, and `/reset-password/:token` redirected into `/setup` during first-run environments.
- Kept the current first-run setup gating contract in place and fixed the audit harness instead of changing public-route behavior.
- Added a throwaway public-suite bootstrap step in `e2e/tests/visibility-link-audit.spec.ts` that calls `ensureEffectiveAdminLoginViaAPI(...)` before the anonymous public route checks run.

## Files Touched

- `e2e/tests/visibility-link-audit.spec.ts`
- `docs/phases/planning-and-progress.md`
- `docs/phases/P4-T7E_CLOSEOUT_2026-04-18.md`

## Validation

- `cd e2e && npx playwright test tests/visibility-link-audit.spec.ts --project=chromium`
  - Result: Passed. `48` tests, `0` failures.
- `make check-links`
  - Result: Passed. Checked `91` files and `686` local links with no broken active-doc links.

## Current-Tree Proof

- The public visibility audit now bootstraps first-run admin setup in an isolated temporary browser context before running the anonymous `base.describe('Public text visibility and link audit', ...)` suite.
- The actual audited public pages still run without a persisted authenticated session, so the canonical route assertions for `/login`, invitation, and password-recovery flows remain meaningful.
- `frontend/src/components/PublicShellRoute.tsx` remains unchanged, so this lane preserves the existing runtime setup-gating behavior and stays scoped to the E2E contract.

## Conclusion

- The reproducible `P4-T7E` failure was a missing audit bootstrap, not a public-route runtime regression.
- The row now has a review-ready proof package covering the targeted E2E fix plus docs/workboard validation.
