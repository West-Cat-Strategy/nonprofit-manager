-- Migration 039: Add SMS and voicemail communication preferences for contacts

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS do_not_text BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS do_not_voicemail BOOLEAN DEFAULT false;

COMMENT ON COLUMN contacts.do_not_text IS 'Flag to prevent SMS/text communications';
COMMENT ON COLUMN contacts.do_not_voicemail IS 'Flag to prevent leaving voicemail messages';
