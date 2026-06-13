# P5-T99 Mixed Clean Modularity Proof

**Date:** 2026-05-12
**Status:** Review
**Branch:** `p5-t99-mixed-modularity`

## Scope

`P5-T99` is a behavior-preserving modularity wave in a clean sibling worktree.

- Backend lane: split `backend/src/modules/communications/**` internals without changing `/api/v2/communications/*`, response envelopes, campaign-run statuses, public unsubscribe/browser-view behavior, local delivery semantics, or Mailchimp delegation.
- Frontend lane: split `frontend/src/features/grants/**` registry/page internals without changing `/grants/*` route aliases, filters, exports, read-only sections, or API payloads.
- Lead lane: keep workboard, validation proof, validation index, final check selection, and conflict resolution lead-owned.

Out of scope: portal files, shared route registrars, root store, database migrations, product behavior changes, auth/permission changes, public API changes, and browser route contract changes.

## Implementation Notes

- Backend communications service split:
  - Extracted shared row types, constants, mappers, validation helpers, UUID/string helpers, and Mailchimp request adaptation into `backend/src/modules/communications/services/communicationsServiceHelpers.ts`.
  - Extracted saved-audience loading, preview, local audience lookup, contact eligibility, and audience create/archive/list behavior into `backend/src/modules/communications/services/savedAudienceService.ts`.
  - Extracted campaign-run lookup, recipient listing, Mailchimp run-id lookup, and count updates into `backend/src/modules/communications/services/campaignRunStore.ts`.
  - Extracted local campaign creation, recipient insertion, local send/cancel/reschedule/refresh behavior into `backend/src/modules/communications/services/localCampaignDeliveryService.ts`.
  - Kept `communicationsService.ts` as the public facade with existing exports and local/Mailchimp delegation behavior.
- Frontend grants workspace split:
  - Extracted section table-column rendering into `frontend/src/features/grants/lib/grantsSectionColumns.tsx`.
  - Renamed the non-component registry shell to `frontend/src/features/grants/lib/grantsPageRegistry.ts` after the JSX renderers moved out, satisfying the React refresh lint rule.
  - Kept `getSectionColumns` re-exported from the registry so current imports and route/page behavior stay stable.

## Validation

Focused checks:

- Passed: `cd backend && npm test -- --runInBand src/modules/communications/__tests__/communicationsService.test.ts src/modules/communications/__tests__/localCampaignDrainService.test.ts src/modules/communications/__tests__/communications.routes.test.ts src/__tests__/services/newsletterProviderService.test.ts` (`4` suites, `30` tests).
- Passed: `cd backend && npm run type-check`.
- Passed: `cd frontend && npm test -- --run src/features/grants/pages/__tests__/GrantsPage.test.tsx src/features/grants/lib/__tests__/grantsSectionAdapters.test.ts` (`2` files, `4` tests).
- Passed: `cd frontend && npm run type-check`.
- Passed: `node scripts/check-implementation-size-policy.ts`.
- Passed: `make lint-module-boundary`.
- Passed: `make lint-module-route-proxy`.
- Passed: `make lint-v2-module-ownership`.
- Passed: `make lint-canonical-module-imports`.
- Passed: `make lint-frontend-feature-boundary`.
- Passed: `git diff --check`.
- Passed: `npm run knip`; it reported only the existing Node `module.register()` deprecation warning.
- Passed: `make check-links` (`222` files and `1417` local links).

Broad closeout checks:

- Passed: `make lint`.
- Passed: `make typecheck`.

No Docker, migration, or browser proof was run because this wave did not change Docker/runtime files, migrations, public API behavior, browser routes, or UI interaction contracts beyond preserving the grants page behavior covered by focused Vitest.
