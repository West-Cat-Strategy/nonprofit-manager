-- Migration: Contact Module Enhancements
-- Created: 2026-02-02
-- Description: Remove contact_role, add pronouns, create tables for multiple phones/emails,
--              contact relationships, and contact notes with case association

-- ============================================================================
-- SCHEMA CHANGES TO CONTACTS TABLE
-- ============================================================================

-- Remove contact_role column (contacts can have multiple roles elsewhere)
ALTER TABLE contacts DROP COLUMN IF EXISTS contact_role;
DROP INDEX IF EXISTS idx_contacts_contact_role;

-- Add pronouns column for personal information
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pronouns VARCHAR(50);

-- Add comment for pronouns
COMMENT ON COLUMN contacts.pronouns IS 'Preferred pronouns (he/him, she/her, they/them, etc.)';

-- ============================================================================
-- CONTACT_PHONE_NUMBERS TABLE - Multiple phone numbers per contact
-- ============================================================================

CREATE TABLE IF NOT EXISTS contact_phone_numbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

    phone_number VARCHAR(50) NOT NULL,
    label VARCHAR(50) DEFAULT 'mobile', -- 'home', 'work', 'mobile', 'fax', 'other'
    is_primary BOOLEAN DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    modified_by UUID REFERENCES users(id),

    -- Prevent duplicate phone numbers for the same contact
    CONSTRAINT contact_phone_unique UNIQUE(contact_id, phone_number)
);

-- Indexes for phone numbers
CREATE INDEX idx_contact_phones_contact ON contact_phone_numbers(contact_id);
CREATE INDEX idx_contact_phones_primary ON contact_phone_numbers(contact_id, is_primary) WHERE is_primary = true;

-- Trigger to ensure only one primary phone per contact
CREATE OR REPLACE FUNCTION ensure_single_primary_phone()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = true THEN
        UPDATE contact_phone_numbers
        SET is_primary = false
        WHERE contact_id = NEW.contact_id AND id != NEW.id AND is_primary = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_primary_phone
    BEFORE INSERT OR UPDATE ON contact_phone_numbers
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_primary_phone();

-- Update timestamp trigger
CREATE TRIGGER update_contact_phone_numbers_updated_at
    BEFORE UPDATE ON contact_phone_numbers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CONTACT_EMAIL_ADDRESSES TABLE - Multiple email addresses per contact
-- ============================================================================

CREATE TABLE IF NOT EXISTS contact_email_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

    email_address VARCHAR(255) NOT NULL,
    label VARCHAR(50) DEFAULT 'personal', -- 'personal', 'work', 'other'
    is_primary BOOLEAN DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    modified_by UUID REFERENCES users(id),

    -- Prevent duplicate email addresses for the same contact
    CONSTRAINT contact_email_unique UNIQUE(contact_id, email_address)
);

-- Indexes for email addresses
CREATE INDEX idx_contact_emails_contact ON contact_email_addresses(contact_id);
CREATE INDEX idx_contact_emails_primary ON contact_email_addresses(contact_id, is_primary) WHERE is_primary = true;
CREATE INDEX idx_contact_emails_address ON contact_email_addresses(email_address);

-- Trigger to ensure only one primary email per contact
CREATE OR REPLACE FUNCTION ensure_single_primary_email()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = true THEN
        UPDATE contact_email_addresses
        SET is_primary = false
        WHERE contact_id = NEW.contact_id AND id != NEW.id AND is_primary = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_primary_email
    BEFORE INSERT OR UPDATE ON contact_email_addresses
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_primary_email();

-- Update timestamp trigger
CREATE TRIGGER update_contact_email_addresses_updated_at
    BEFORE UPDATE ON contact_email_addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CONTACT_RELATIONSHIPS TABLE - Link contacts to each other
-- ============================================================================

CREATE TABLE IF NOT EXISTS contact_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    related_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

    -- Relationship type and label
    relationship_type VARCHAR(50) NOT NULL, -- 'emergency_contact', 'family_member', 'support_person', 'caregiver', 'spouse', 'parent', 'child', 'sibling', 'friend', 'colleague', 'other'
    relationship_label VARCHAR(100), -- Custom label for display (e.g., "Mother", "Case Worker")

    -- Bidirectional relationship support
    is_bidirectional BOOLEAN DEFAULT false,
    inverse_relationship_type VARCHAR(50), -- The type from the other contact's perspective

    notes TEXT,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    modified_by UUID REFERENCES users(id),

    -- Prevent self-relationships
    CONSTRAINT contact_not_self_related CHECK (contact_id != related_contact_id),
    -- Prevent duplicate relationships
    CONSTRAINT contact_relationship_unique UNIQUE(contact_id, related_contact_id, relationship_type)
);

-- Indexes for relationships
CREATE INDEX idx_contact_relationships_contact ON contact_relationships(contact_id);
CREATE INDEX idx_contact_relationships_related ON contact_relationships(related_contact_id);
CREATE INDEX idx_contact_relationships_type ON contact_relationships(relationship_type);
CREATE INDEX idx_contact_relationships_active ON contact_relationships(contact_id, is_active) WHERE is_active = true;

-- Update timestamp trigger
CREATE TRIGGER update_contact_relationships_updated_at
    BEFORE UPDATE ON contact_relationships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CONTACT_NOTES TABLE - Notes timeline with author, timestamp, case association
-- ============================================================================

CREATE TABLE IF NOT EXISTS contact_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

    -- Optional case association
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,

    -- Note details
    note_type VARCHAR(50) DEFAULT 'note', -- 'note', 'email', 'call', 'meeting', 'update', 'other'
    subject VARCHAR(255),
    content TEXT NOT NULL,

    -- Flags
    is_internal BOOLEAN DEFAULT false, -- Internal note vs client-facing
    is_important BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false, -- Pinned notes appear at top

    -- Attachments (file references)
    attachments JSONB, -- Array of file metadata {name, url, size, type}

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Indexes for notes
CREATE INDEX idx_contact_notes_contact ON contact_notes(contact_id);
CREATE INDEX idx_contact_notes_case ON contact_notes(case_id) WHERE case_id IS NOT NULL;
CREATE INDEX idx_contact_notes_type ON contact_notes(note_type);
CREATE INDEX idx_contact_notes_created ON contact_notes(created_at);
CREATE INDEX idx_contact_notes_important ON contact_notes(contact_id, is_important) WHERE is_important = true;
CREATE INDEX idx_contact_notes_pinned ON contact_notes(contact_id, is_pinned) WHERE is_pinned = true;

-- Update timestamp trigger
CREATE TRIGGER update_contact_notes_updated_at
    BEFORE UPDATE ON contact_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DATA MIGRATION - Migrate existing data to new tables
-- ============================================================================

-- Migrate existing notes field to contact_notes table
INSERT INTO contact_notes (contact_id, content, note_type, created_at, created_by)
SELECT id, notes, 'note', created_at, created_by
FROM contacts
WHERE notes IS NOT NULL AND notes != '';

-- Migrate existing phone field to contact_phone_numbers (as primary)
INSERT INTO contact_phone_numbers (contact_id, phone_number, label, is_primary, created_at, created_by)
SELECT id, phone, 'work', true, created_at, created_by
FROM contacts
WHERE phone IS NOT NULL AND phone != '';

-- Migrate existing mobile_phone field to contact_phone_numbers
INSERT INTO contact_phone_numbers (contact_id, phone_number, label, is_primary, created_at, created_by)
SELECT id, mobile_phone, 'mobile',
       -- Set as primary only if no work phone exists
       CASE WHEN phone IS NULL OR phone = '' THEN true ELSE false END,
       created_at, created_by
FROM contacts
WHERE mobile_phone IS NOT NULL AND mobile_phone != ''
-- Avoid inserting duplicates if mobile_phone equals phone
AND (phone IS NULL OR mobile_phone != phone);

-- Migrate existing email field to contact_email_addresses
INSERT INTO contact_email_addresses (contact_id, email_address, label, is_primary, created_at, created_by)
SELECT id, email, 'personal', true, created_at, created_by
FROM contacts
WHERE email IS NOT NULL AND email != '';

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE contact_phone_numbers IS 'Multiple phone numbers per contact with labels and primary indicator';
COMMENT ON TABLE contact_email_addresses IS 'Multiple email addresses per contact with labels and primary indicator';
COMMENT ON TABLE contact_relationships IS 'Links between contacts (family, emergency contacts, support persons, etc.)';
COMMENT ON TABLE contact_notes IS 'Contact notes timeline with author, timestamp, and optional case association';

COMMENT ON COLUMN contact_phone_numbers.label IS 'Phone type: home, work, mobile, fax, other';
COMMENT ON COLUMN contact_email_addresses.label IS 'Email type: personal, work, other';
COMMENT ON COLUMN contact_relationships.relationship_type IS 'Type: emergency_contact, family_member, support_person, caregiver, spouse, parent, child, sibling, friend, colleague, other';
COMMENT ON COLUMN contact_relationships.is_bidirectional IS 'Whether the relationship appears on both contacts';
COMMENT ON COLUMN contact_relationships.inverse_relationship_type IS 'The relationship type from the other contacts perspective';
COMMENT ON COLUMN contact_notes.case_id IS 'Optional association with a case';
COMMENT ON COLUMN contact_notes.note_type IS 'Type of note: note, email, call, meeting, update, other';
COMMENT ON COLUMN contact_notes.is_internal IS 'Internal notes not visible to clients';
COMMENT ON COLUMN contact_notes.is_pinned IS 'Pinned notes appear at the top of the timeline';
