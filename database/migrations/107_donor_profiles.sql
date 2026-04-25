-- Migration 107: Donor stewardship profiles
-- Created: 2026-04-25
-- Description:
--   * adds contact-linked donor preference defaults for stewardship and receipting

CREATE TABLE IF NOT EXISTS donor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  receipt_frequency VARCHAR(30) NOT NULL DEFAULT 'per_gift',
  receipt_each_gift BOOLEAN NOT NULL DEFAULT true,
  email_gift_statement BOOLEAN NOT NULL DEFAULT false,
  anonymous_donor BOOLEAN NOT NULL DEFAULT false,
  no_solicitations BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT donor_profiles_contact_unique UNIQUE (contact_id),
  CONSTRAINT donor_profiles_receipt_frequency_check CHECK (
    receipt_frequency IN ('per_gift', 'annual', 'none')
  )
);

CREATE INDEX IF NOT EXISTS idx_donor_profiles_contact
  ON donor_profiles(contact_id);

CREATE INDEX IF NOT EXISTS idx_donor_profiles_account
  ON donor_profiles(account_id);

CREATE INDEX IF NOT EXISTS idx_donor_profiles_no_solicitations
  ON donor_profiles(no_solicitations)
  WHERE no_solicitations = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_donor_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_donor_profiles_updated_at
      BEFORE UPDATE ON donor_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE donor_profiles IS
  'Contact-linked donor stewardship and receipt default preferences';
