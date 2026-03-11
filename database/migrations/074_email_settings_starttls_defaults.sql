-- Migration 074: Correct fresh-install SMTP TLS defaults for seeded email settings.

ALTER TABLE email_settings
    ALTER COLUMN smtp_secure SET DEFAULT false;

UPDATE email_settings
SET smtp_secure = false,
    updated_at = NOW()
WHERE is_configured = false
  AND smtp_host IS NULL
  AND smtp_port = 587
  AND smtp_secure = true
  AND smtp_user IS NULL
  AND smtp_pass_encrypted IS NULL
  AND smtp_from_address IS NULL
  AND smtp_from_name IS NULL
  AND imap_host IS NULL
  AND imap_port = 993
  AND imap_secure = true
  AND imap_user IS NULL
  AND imap_pass_encrypted IS NULL
  AND last_tested_at IS NULL
  AND last_test_success IS NULL
  AND created_by IS NULL
  AND modified_by IS NULL;
