# P5-T70 Local Campaign Failed-Recipient Retry Proof

Date: 2026-05-05

## Scope

Validated the already-landed local-email failed-recipient retry behavior. The
retry action stays operator-triggered: failed local recipients are requeued and
the campaign run is marked ready to send again, but no email is sent as part of
the retry request.

Out of scope: marketing automation, tracking pixels, Mailchimp retry support,
frontend changes, public APIs, database migrations, typed appeals, memberships,
donation batches, and generic workflow tooling.

## Validation

| Command | Result |
|---|---|
| `cd backend && npm test -- --runInBand src/modules/communications/__tests__` | Passed; 9 suites / 53 tests |
| `cd backend && npm run type-check` | Passed |
| `cd backend && npm run lint` | Passed |

## Notes

- `POST /api/v2/communications/campaign-runs/:runId/retry-failed` is covered by
  the communications route tests.
- Service coverage verifies local failed recipients are requeued without calling
  the send path.
- Mailchimp remains explicitly unsupported for failed-recipient retry.
