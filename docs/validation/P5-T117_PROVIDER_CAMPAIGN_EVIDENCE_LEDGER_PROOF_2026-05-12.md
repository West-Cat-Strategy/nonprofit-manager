# P5-T117 Provider Campaign Evidence Ledger Proof

**Date:** 2026-05-12
**Workboard Row:** `P5-T117`
**Type:** Row-local proof note

## Scope

Implemented a compact provider-fed campaign evidence ledger on the existing Website Content provider archive surface. The slice stores normalized Mailchimp campaign summary facts and Mautic published-email summary facts in read-only provider-synced `website_entries.metadata.campaignEvidence`.

Out of scope: tracking pixels, Mautic automation-canvas APIs, provider-primary campaign ownership, campaign-send parity changes, new public endpoints, new migrations, and native entry editing changes.

## Implementation

- `WebsiteEntryService.syncMailchimpCampaigns` now stores compact `campaignEvidence` facts beside the existing Mailchimp archive metadata: provider id, list id, status, reported/activity timestamps, sent/open/click/unsubscribe/bounce facts when available.
- `WebsiteEntryService.syncMauticEmails` now stores compact `campaignEvidence` facts from the existing site-scoped Mautic Emails API path: provider id, segment/list id, published status, reported/activity timestamps, sent/read-derived open facts, and email type.
- `WebsiteContentPage` renders a short evidence summary on provider archive cards while preserving provider-synced entries as read-only and leaving native entries editable.

## Validation

| Command | Result | Notes |
|---|---|---|
| `cd backend && npm test -- --runInBand src/__tests__/services/publishing/websiteEntryService.test.ts` | Pass | 1 suite, 5 tests. Proved Mailchimp and Mautic sync metadata plus read-only provider-synced entry behavior. Docker was started after the first wrapper attempt found the daemon unavailable. |
| `cd frontend && npm test -- --run src/features/websites/pages/__tests__/WebsiteContentPage.test.tsx` | Pass | 1 file, 1 test. Proved staff-facing provider archive evidence summaries for Mailchimp and Mautic entries. |
| `cd backend && npm run type-check` | Pass | Backend type-check completed without errors. |
| `cd frontend && npm run type-check` | Pass | Frontend type-check completed without errors. |
| `make check-links` | Pass | Checked 237 files and 1490 local links. |
| `node scripts/ui-audit.ts --enforce-baseline` | Pass | UI baseline refreshed to `1530/10006/60` after the new provider evidence summary added one semantic token utility. |

## Notes

- Existing dirty CBIS import/database work was preserved and not included in this row.
- The ledger uses the existing provider archive upsert key `(site_id, source, external_source_id)` and does not add a database migration.
