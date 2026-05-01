# Phase 5 Newsletter Email Operability Closeout

**Last Updated:** 2026-05-01

**Date:** 2026-05-01

This artifact preserves the closeout for the newsletter and email-blast operability rows implemented after the `P5-T6` backlog review refreshed the reference set.

## Summary

- Kept `P5-T6` live as the Phase 5 backlog scope-control gate.
- Closed `P5-T26` through `P5-T32` after the reference refresh, communications audience selector, campaign preflight/test-send, run actions, Mailchimp webhook back-sync, website newsletter active-audience wiring, and API/UI reachability work landed.
- Promoted `P5-T33` and `P5-T34` from blocked follow-ups to ready rows because their campaign-run and webhook prerequisites now exist.

## Removed Rows

| Row | Disposition | Evidence |
|---|---|---|
| `P5-T26` | Removed from live board; newsletter reference refresh is proof-complete. | SendPortal, Dittofeed, listmonk, Keila, Mailtrain, phpList, and EmailBuilder.js are cloned under ignored reference paths and pinned in `reference-repos/manifest.lock.json` with license and reuse classifications. |
| `P5-T27` | Removed from live board; full CRM audience selector is proof-complete. | The communications workspace uses searchable/paginated CRM selection, keeps `do_not_email` contacts visibly excluded, and preserves selected contacts across pages. |
| `P5-T28` | Removed from live board; campaign preflight and real test-send are proof-complete. | Campaign drafts can send real Mailchimp test emails before staff save, schedule, or send; campaign creation also executes `testRecipients` through Mailchimp test-send. |
| `P5-T29` | Removed from live board; scope-aware campaign-run actions are proof-complete. | Local campaign-run send/status refresh routes accept run IDs and enforce requester account scope; cancel/reschedule return explicit unsupported states. |
| `P5-T30` | Removed from live board; Mailchimp webhook back-sync is proof-complete. | Unsubscribe, cleaned, profile, and email-change webhooks now update local contact preference or metadata fields with audit-safe logging. |
| `P5-T31` | Removed from live board; website newsletter active-audience wiring is proof-complete. | Public newsletter signup sync resolves selected active presets/audiences when component list IDs are absent, and Mautic contact lookup uses `contacts.id`. |
| `P5-T32` | Removed from live board; tag/segment reachability and API docs are proof-complete. | Provider tags are selectable in the staff sync flow when available; tag and segment management endpoints are documented as API-only otherwise, with current camelCase examples. |

## Rows Still Live

- `P5-T6` remains live as the Phase 5 backlog scope-control gate.
- `P5-T33` is ready for campaign reporting and typed appeal/ROI boundary follow-through.
- `P5-T34` is ready for communication suppression governance follow-through.

## Validation

Detailed evidence is preserved in [../../validation/P5-T26_T32_NEWSLETTER_EMAIL_OPERABILITY_PROOF_2026-05-01.md](../../validation/P5-T26_T32_NEWSLETTER_EMAIL_OPERABILITY_PROOF_2026-05-01.md).

The closeout pass used targeted proof:

- `cd backend && npm test -- --runTestsByPath src/__tests__/services/mailchimpService.test.ts src/__tests__/modules/mailchimp.routes.security.test.ts src/__tests__/services/newsletterProviderService.test.ts src/__tests__/services/publishing/publicWebsiteFormService.test.ts --runInBand`
- `cd backend && npm test -- --runTestsByPath src/__tests__/services/mailchimpService.test.ts src/__tests__/modules/mailchimp.routes.security.test.ts --runInBand`
- `cd backend && npm run type-check`
- `cd frontend && npm test -- --run src/features/adminOps/pages/__tests__/EmailMarketingPage.test.tsx`
- `cd frontend && npm run type-check`
- `make lint-doc-api-versioning`
- `make check-links`
- `git diff --check`
