# P5-T64 Mailchimp Campaign-Run Contract Proof

Date: 2026-05-05

## Scope

Resolved the Mailchimp campaign-run cancel/reschedule contract cleanup by keeping
the registered routes stable while making unsupported behavior explicit.

- `/api/v2/mailchimp/campaign-runs/:runId/cancel` returns `405 Method Not Allowed`.
- `/api/v2/mailchimp/campaign-runs/:runId/reschedule` returns `405 Method Not Allowed`.
- The Mailchimp service facade no longer exports unused cancel/reschedule methods
  that returned success-shaped `unsupported` action payloads.
- The provider-neutral communications facade gates Mailchimp cancel/reschedule
  locally with explicit `unsupported` action results instead of calling removed
  Mailchimp service methods.

No Mailchimp provider-backed lifecycle behavior, marketing automation, tracking,
typed appeals, or broader local-first communications redesign was opened.

## Validation

| Command | Result |
|---|---|
| `cd backend && npm test -- --runInBand src/modules/communications/__tests__/communicationsService.test.ts src/modules/mailchimp/controllers/__tests__/mailchimpController.test.ts src/__tests__/modules/mailchimp.routes.security.test.ts src/__tests__/services/mailchimpService.test.ts` | Passed; 4 suites, 76 tests |
| `cd backend && npm run type-check` | Passed |
| `cd backend && npx eslint src/modules/mailchimp/controllers/mailchimpController.ts src/modules/mailchimp/services/mailchimpService.ts src/modules/mailchimp/controllers/__tests__/mailchimpController.test.ts src/__tests__/modules/mailchimp.routes.security.test.ts src/__tests__/services/mailchimpService.test.ts src/modules/communications/services/communicationsService.ts src/modules/communications/__tests__/communicationsService.test.ts` | Passed |
| `node scripts/check-route-validation-policy.ts` | Passed |
| `make check-links` | Passed; checked 198 files and 1518 local links after final proof/index reconciliation |
| `git diff --check` | Passed |

## Notes

The focused Jest run emitted the existing `--localstorage-file` warning and the
expected local Mailchimp webhook-secret warning; neither affected the focused
contract proof.
