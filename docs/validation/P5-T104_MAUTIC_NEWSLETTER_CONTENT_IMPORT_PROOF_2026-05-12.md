# P5-T104 Mautic Newsletter Content Import Proof

**Date:** 2026-05-12  
**Status:** Review  
**Workboard row:** [P5-T104](../phases/planning-and-progress.md)

## Scope

Add a provider-scoped Mautic newsletter-content import path into the existing website entry archive model while preserving native/local authoring and local-email defaults.

Included:

- `website_entries.source = 'mautic'` support through migration `127_website_entries_mautic_source.sql`.
- Mautic Emails API import using the existing site-scoped Mautic runtime configuration and env fallback behavior.
- Read-only Mautic archive entries beside the existing Mailchimp archive sync.
- Minimal website content console action/filter support for Mautic provider archives.

Excluded:

- Mautic campaign export/import workflows.
- Local-email default changes, signup sync rewrites, campaign sending, publishing redesign, or credential storage changes.
- Broad website builder layout redesign.

## Implementation Notes

- `mauticService.getEmails` fetches published emails from `/api/emails`, maps Mautic email content and metrics, applies optional segment filtering when list metadata is available, and reuses the existing fail-closed URL checks.
- `WebsiteEntryService.syncMauticEmails` mirrors Mautic emails into `website_entries` as published newsletter entries with `source = 'mautic'` and `ON CONFLICT (site_id, source, external_source_id)` upsert behavior.
- Provider-synced entries now share a generic read-only guard while native entries remain editable.
- Website content source filters, public content filters, newsletter archive component filters, and shared contracts now accept `mautic`.
- The website content console adds a narrow `Sync Mautic` action using the configured site Mautic segment when present.

## Validation Proof

- Pass: `cd backend && npx jest src/__tests__/services/mauticService.test.ts src/__tests__/services/publishing/websiteEntryService.test.ts --runInBand` (2 suites, 11 tests).
- Pass: `cd backend && npx jest src/__tests__/services/publishing/siteOperationsService.test.ts --runInBand` (1 suite, 5 tests).
- Pass: `cd backend && npm run type-check`.
- Pass: `cd backend && npm run lint`.
- Pass: `node scripts/check-route-validation-policy.ts`.
- Pass: `node scripts/check-success-envelope-policy.ts`.
- Pass: `cd frontend && npm test -- WebsiteContentPage --run` (1 file, 1 test).
- Pass: `cd frontend && npm run type-check`.
- Pass: `cd frontend && npm run lint`.
- Pass: `make db-verify`.

## Follow-Up Notes

- `P5-T109` owns encrypted-at-rest Mautic credential migration and remains separate from this content-import row.
- This row intentionally uses Mautic Emails API content, not the Mautic campaign export/import API.
