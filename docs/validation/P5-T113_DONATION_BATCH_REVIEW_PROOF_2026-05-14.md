# P5-T113 Donation Batch Review Proof

**Date:** 2026-05-14  
**Status:** Review  
**Scope:** Smallest durable donation batch review flow on top of the typed appeal/campaign and fund-designation spine.

## Implemented

- Added `donation_batches`, `donation_batch_items`, and `donation_batch_audit_events` for organization-scoped batch review.
- Added expected count/amount controls, actual count/amount preview, amount/count variance, currency checks, non-completed payment checks, and missing-donor warnings.
- Added restricted-fund summaries grouped by typed fund designation and restriction type.
- Added review-state transitions: open, under review, approved, and posted.
- Added close/reopen policy: close snapshots batch membership for review, reopen is allowed only before posting and clears the review snapshot, approve requires no blocking exceptions, and post records finance approval state only.
- Added audit events for create, close-for-review, reopen, approve, and post transitions. Activity feed events are additive and use the existing donation activity type without adding a new autonomous finance process.
- Added a staff finance page at `/donations/batches` plus a Donations page link for creating batches, viewing control totals, checking exceptions, reviewing restricted funds, and running the close/reopen/approve/post actions.

## Explicit Non-Scope

- No GL posting, journal entries, ledger accounts, deposit reconciliation, bank feed matching, receipting changes, or broader finance-control surface was added.
- No automatic trust ledger posting or fund accounting release logic was added.
- No import, provider, campaign ROI, membership, or public donation workflow behavior was changed.

## Validation

- `cd backend && npm test -- donationBatchService.test.ts --runInBand`
- `cd frontend && npm test -- DonationBatchReviewPage.test.tsx DonationListPage.test.tsx --run`
- `cd backend && npm run type-check`
- `cd frontend && npm run type-check`
- `cd backend && npm run lint`
- `cd frontend && npm run lint`
- `make db-verify`
- `node scripts/check-route-validation-policy.ts`
- `node scripts/check-success-envelope-policy.ts`
- `node scripts/check-v2-module-ownership-policy.ts`
- `node scripts/check-module-boundary-policy.ts`
- `node scripts/check-route-catalog-drift.ts`

## Review Notes

- Posted status is intentionally a batch review endpoint state, not a GL action.
- Under-review and later states read from `donation_batch_items`, while open batches preview matching donations from the configured organization/date window.
- Blocking exceptions stop approval; reopening before posting returns the batch to open review and refreshes the future close snapshot.
