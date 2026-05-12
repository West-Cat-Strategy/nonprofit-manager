-- Migration 128: Encrypted site-scoped Mautic credentials

ALTER TABLE website_site_settings
  ADD COLUMN IF NOT EXISTS mautic_password_encrypted TEXT;

COMMENT ON COLUMN website_site_settings.mautic_password_encrypted IS
  'App-encrypted Mautic password for site-scoped newsletter provider settings.';
