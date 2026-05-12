# P5-T103 Mautic Credential Masking Proof

**Date:** 2026-05-12  
**Status:** Review  
**Workboard row:** [P5-T103](../phases/planning-and-progress.md)

## Scope

Mask saved site-scoped Mautic credentials on read while preserving the `P5-T99` runtime provider behavior.

Included:

- Mask saved Mautic passwords in integration status and overview settings responses.
- Preserve the existing saved password when updates omit `password`.
- Treat the masked sentinel as display-only so it is not persisted as a real password.
- Redact nested `website_site_settings.mautic_config.password` from default backup exports.
- Keep current plaintext-at-rest storage unchanged for this row; encrypted-at-rest migration is tracked separately as `P5-T109`.

Excluded:

- Mautic newsletter or campaign content import.
- New encrypted credential storage or migration; tracked separately as `P5-T109`.
- Frontend settings redesign beyond unchanged-password handling.

## Implementation Notes

- `WebsiteSiteSettingsService` now defines the `********` Mautic password sentinel, masks read-facing settings, and ignores the sentinel during Mautic settings updates.
- `SiteOperationsService` masks Mautic settings returned through integration status and website overview settings.
- `BackupService` redacts the nested Mautic password from default backups while preserving `includeSecrets` behavior.
- `WebsiteIntegrationsPage` clears the password field when the API returns the sentinel and omits password from saves unless the user enters a new value.
- Storage policy decision: existing saved site-scoped Mautic settings remain in the current JSONB shape for compatibility; this row closes read-response masking and backup redaction, while `P5-T109` owns the separate encrypted-at-rest migration.

## Validation Proof

- Initial blocker: the first focused backend proof attempt could not start because the stale `nonprofit-manager-test-postgres` isolated test DB container already occupied the required name. Removed only that test container and reran the same command.
- Pass: `npm test -- --runTestsByPath src/__tests__/services/publishing/siteSettingsService.test.ts src/__tests__/services/publishing/siteOperationsService.test.ts src/__tests__/services/backupService.test.ts src/__tests__/integration/publishing.test.ts --runInBand` from `backend` (4 suites, 27 tests).
