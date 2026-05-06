-- Migration 122: Pending-only email uniqueness
-- Created: 2026-05-05
-- Description:
--   * allows rejected pending registrations and portal signup requests to be resubmitted
--   * keeps active pending requests case-insensitively unique
--   * preserves fast history lookup by normalized email

DO $$
DECLARE
  duplicate_emails TEXT;
BEGIN
  SELECT string_agg(email_key, ', ' ORDER BY email_key)
  INTO duplicate_emails
  FROM (
    SELECT lower(email) AS email_key
    FROM pending_registrations
    WHERE status = 'pending'
    GROUP BY lower(email)
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_emails IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot add pending_registrations pending-email uniqueness; duplicate pending emails: %',
      duplicate_emails;
  END IF;
END
$$;

DO $$
DECLARE
  duplicate_emails TEXT;
BEGIN
  SELECT string_agg(email_key, ', ' ORDER BY email_key)
  INTO duplicate_emails
  FROM (
    SELECT lower(email) AS email_key
    FROM portal_signup_requests
    WHERE status = 'pending'
    GROUP BY lower(email)
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_emails IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot add portal_signup_requests pending-email uniqueness; duplicate pending emails: %',
      duplicate_emails;
  END IF;
END
$$;

ALTER TABLE pending_registrations
  DROP CONSTRAINT IF EXISTS pending_registrations_email_key;

ALTER TABLE portal_signup_requests
  DROP CONSTRAINT IF EXISTS portal_signup_requests_email_key;

DROP INDEX IF EXISTS idx_pending_registrations_email;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_registrations_pending_lower_email
  ON pending_registrations(lower(email))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_pending_registrations_lower_email_history
  ON pending_registrations(lower(email), created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_portal_signup_requests_pending_lower_email
  ON portal_signup_requests(lower(email))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_portal_signup_requests_lower_email_history
  ON portal_signup_requests(lower(email), requested_at DESC);
