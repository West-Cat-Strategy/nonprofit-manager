-- Migration 027: Contact Alert Notes and No Fixed Address
-- Adds is_alert flag to contact notes and no_fixed_address flag to contacts

-- Add is_alert flag to contact notes
ALTER TABLE contact_notes ADD COLUMN IF NOT EXISTS is_alert BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_contact_notes_alert ON contact_notes(contact_id, is_alert) WHERE is_alert = true;
COMMENT ON COLUMN contact_notes.is_alert IS 'Alert notes pop up when viewing the contact';

-- Add no_fixed_address flag to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS no_fixed_address BOOLEAN DEFAULT false;
COMMENT ON COLUMN contacts.no_fixed_address IS 'Indicates the contact has no fixed address';
