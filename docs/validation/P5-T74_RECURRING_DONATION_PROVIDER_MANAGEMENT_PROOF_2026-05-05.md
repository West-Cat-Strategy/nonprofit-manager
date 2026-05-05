# P5-T74 Recurring Donation Provider Management Proof

Date: 2026-05-05

## Scope

Implemented the provider-management parity cleanup for recurring donation
update, cancel, and reactivate flows without opening broader finance redesign.

- Stripe-managed plans continue to support amount updates, cancellation, and
  reactivation through the existing payment-provider service.
- Stripe management now accepts `provider_subscription_id` as a fallback when
  older rows do not have `stripe_subscription_id` populated.
- PayPal and Square plans can still receive local metadata-only updates.
- PayPal, Square, and unknown-provider plans now return explicit gated client
  errors for amount changes, cancellation, and reactivation before provider or
  database mutation.
- Recurring-donation handlers map unsupported provider-management errors to
  `400` responses instead of leaking a generic server error.

No migrations, donation batch flows, membership work, public finance dashboards,
or generic workflow tooling were opened.

## Validation

| Command | Result |
|---|---|
| `cd backend && npx jest src/modules/recurringDonations/services/__tests__/recurringDonationService.test.ts src/modules/recurringDonations/controllers/__tests__/recurringDonation.handlers.test.ts --runInBand` | Passed; 2 suites, 13 tests in the worker worktree and lead checkout |
| `cd backend && npm run type-check` | Passed in the worker worktree and lead checkout |
| `cd backend && npx eslint src/modules/recurringDonations/services/recurringDonationService.ts src/modules/recurringDonations/controllers/recurringDonation.handlers.ts src/modules/recurringDonations/services/__tests__/recurringDonationService.test.ts src/modules/recurringDonations/controllers/__tests__/recurringDonation.handlers.test.ts` | Passed in the worker worktree and lead checkout |
| `make check-links` | Passed in the lead checkout after proof/index reconciliation; checked 198 files and 1518 local links |
| `git diff --check` | Passed in the worker worktree before integration and in the lead checkout after proof/index reconciliation |

## Notes

The focused Jest run emitted the existing `--localstorage-file` warning. The
new gating tests cover PayPal metadata-only edits, PayPal amount-change denial,
PayPal cancel denial, PayPal reactivate denial, and controller `400` mapping for
unsupported provider-management actions.
