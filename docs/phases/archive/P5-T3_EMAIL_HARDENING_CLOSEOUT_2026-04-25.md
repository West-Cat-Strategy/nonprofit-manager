# P5-T3 Email Hardening Closeout

**Last Updated:** 2026-04-25

**Date:** 2026-04-25

This artifact preserves the closeout for the narrowed `P5-T3` Mailchimp route-validation and webhook-hardening follow-through. The broader email platform wave stays available for future scoped product rows, but this workboard row no longer owns a concrete next step.

## Summary

- Added route-schema support and tests for `priorRunSuppressionIds` on Mailchimp campaign create and preview requests.
- Added optional `MAILCHIMP_WEBHOOK_SECRET` checking for the existing `/api/v2/mailchimp/webhook?secret=...` callback URL pattern while preserving current behavior when unset.
- Removed raw email values from Mailchimp webhook logs.
- Recorded targeted backend/frontend proof, database verification, type-check, link-check, and diff hygiene results in the row-local proof note.

## Removed Row

| Row | Disposition | Evidence |
|---|---|---|
| `P5-T3` | Removed from live board; row-local proof note complete. | [../../validation/P5-T3_EMAIL_HARDENING_PROOF_2026-04-25.md](../../validation/P5-T3_EMAIL_HARDENING_PROOF_2026-04-25.md) records the route validation, optional webhook secret, PII-safe logging scope, targeted proof, and remaining validation boundaries. |

## Notes

- This closeout does not claim typed appeals, restrictions, donation batches, memberships, campaign ROI, or generic automation.
- `make lint` still stops at the implementation-size policy for known oversized files; those are queued behind `P5-T11A` and do not reopen `P5-T3`.
- `P5-T12` remains the final full E2E/Playwright and all-green validation lane.
