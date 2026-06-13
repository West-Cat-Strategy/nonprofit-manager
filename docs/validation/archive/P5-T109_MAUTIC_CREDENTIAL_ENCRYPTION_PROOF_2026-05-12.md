# P5-T109 Mautic Credential Encryption Proof - 2026-05-12

## Scope

`P5-T109` added encrypted-at-rest storage for saved site-scoped Mautic passwords while preserving the `P5-T103` masked read contract and `P5-T99` runtime provider behavior.

## Implementation

- Added `website_site_settings.mautic_password_encrypted` in `128_mautic_site_credentials_encrypted.sql`.
- Kept `mautic_config` for non-secret site-scoped Mautic settings only; saved passwords are encrypted with the existing `@utils/encryption` AES-GCM helper.
- Preserved legacy fallback for existing rows with `mautic_config.password` until the app-level backfill helper is run.
- Added `backend/scripts/backfill-mautic-site-credentials.ts` to encrypt legacy JSON passwords, populate `mautic_password_encrypted`, and remove the plaintext JSON key.
- Extended backup redaction for both legacy nested `mautic_config.password` and the new encrypted column.

## Contract Proof

- Staff-facing integration reads still return `mautic.password: "********"` after saving credentials.
- The integration DB assertion confirms `mautic_config` no longer contains `password` and `mautic_password_encrypted` contains a non-plaintext value.
- Unit coverage confirms encrypted-column decrypts for runtime settings, updated passwords persist outside JSON, omitted and masked-sentinel writes preserve the existing secret, `password: null` clears it, legacy JSON passwords remain readable before backfill, the backfill helper migrates candidates, and backups redact the encrypted column.

## Validation

- `cd backend && npx jest --forceExit src/__tests__/services/publishing/siteSettingsService.test.ts src/__tests__/services/backupService.test.ts src/__tests__/scripts/backfillMauticSiteCredentials.test.ts src/__tests__/integration/publishing.test.ts --runInBand` - passed, 4 suites / 28 tests.
- `cd backend && npm run type-check` - passed.
- `cd backend && npm run lint` - passed.
- `make db-verify` - passed.

## Notes

- The existing untracked `127_website_entries_mautic_source.sql` migration was preserved and indexed ahead of this row. `P5-T109` uses migration `128` to avoid renumbering or overwriting adjacent work.
