# P5-T99 Site-Scoped Mautic Provider Proof

**Date:** 2026-05-12  
**Status:** Review  
**Workboard row:** [P5-T99](../phases/planning-and-progress.md)

## Scope

Wire complete site-scoped Mautic newsletter settings into the runtime provider path without changing public route shapes, adding Mautic newsletter-content import, or expanding credential storage policy.

Included:

- Site-scoped Mautic configuration resolution with existing `MAUTIC_*` environment fallback preserved.
- Newsletter provider resolution, destination metadata, and confirmed-signup sync behavior for complete site-scoped Mautic settings.
- Site-console integration status and audience refresh using site-scoped Mautic settings.
- Fail-closed URL handling before external Mautic requests.

Excluded:

- Database migrations.
- Mautic newsletter/archive content import.
- Credential masking, encryption, or broader provider secret policy changes.
- Frontend settings redesign.

## Implementation Notes

- `mauticService` now accepts explicit site-scoped Mautic settings for status checks, audience/segment refresh, single-contact sync, and bulk sync while preserving the existing `MAUTIC_*` environment fallback path.
- Complete site-scoped Mautic settings take precedence over environment fallback. Complete but unsafe settings fail closed before network I/O instead of silently using a different provider.
- Disabled site settings continue to resolve to `local_email`; incomplete site-scoped Mautic settings do not activate the site provider and instead leave the existing environment fallback path available when `MAUTIC_*` is complete.
- `newsletterProviderService` now passes site-scoped Mautic settings into signup sync and destination metadata resolution.
- `siteOperationsService` now resolves active newsletter provider status/audience refresh from saved site settings and keeps response shapes stable.
- Publishing integration coverage now confirms that saved complete Mautic settings are usable runtime configuration instead of remaining inert.

## Validation Proof

- Pass: `cd backend && npx jest src/__tests__/services/mauticService.test.ts src/__tests__/services/newsletterProviderService.test.ts src/__tests__/services/publishing/siteOperationsService.test.ts --runInBand` (3 suites, 21 tests).
- Pass: `cd backend && npx jest src/__tests__/services/publishing/publicWebsiteFormService.test.ts --runInBand` (1 suite, 13 tests).
- Pass: `cd backend && npx jest src/__tests__/integration/publishing.test.ts --runInBand` (1 suite, 11 tests).
- Pass: `cd backend && npm run type-check`.
- Pass: `cd backend && npm run lint`.
- Pass: `node scripts/check-route-validation-policy.ts`.
- Pass: `node scripts/check-success-envelope-policy.ts`.
- Pass: `node scripts/check-module-boundary-policy.ts`.

## Follow-Up Notes

- Credential masking/encryption remains a separate future security row if opened.
- Mautic newsletter-content import remains a separate future product/API row if opened.
