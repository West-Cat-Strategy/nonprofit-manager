-- Migration: 016_contact_documents
-- Description: Add document upload support for contacts with optional case association

-- =============================================================================
-- CONTACT DOCUMENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS contact_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,

    -- File metadata
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,

    -- Document metadata
    document_type VARCHAR(50) DEFAULT 'other',
    title VARCHAR(255),
    description TEXT,

    -- Audit fields
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_contact_documents_contact_id ON contact_documents(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_documents_case_id ON contact_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_contact_documents_created_at ON contact_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_documents_document_type ON contact_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_contact_documents_is_active ON contact_documents(is_active) WHERE is_active = true;

-- Add document_count to contacts for quick access
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS document_count INTEGER DEFAULT 0;

-- Function to update document count on contacts
CREATE OR REPLACE FUNCTION update_contact_document_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE contacts SET document_count = document_count + 1 WHERE id = NEW.contact_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE contacts SET document_count = GREATEST(0, document_count - 1) WHERE id = OLD.contact_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' AND OLD.is_active != NEW.is_active THEN
        IF NEW.is_active THEN
            UPDATE contacts SET document_count = document_count + 1 WHERE id = NEW.contact_id;
        ELSE
            UPDATE contacts SET document_count = GREATEST(0, document_count - 1) WHERE id = NEW.contact_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_contact_document_count ON contact_documents;
CREATE TRIGGER trigger_update_contact_document_count
AFTER INSERT OR DELETE OR UPDATE OF is_active ON contact_documents
FOR EACH ROW EXECUTE FUNCTION update_contact_document_count();

-- Initialize document counts for existing contacts
UPDATE contacts c
SET document_count = (
    SELECT COUNT(*)
    FROM contact_documents cd
    WHERE cd.contact_id = c.id AND cd.is_active = true
);

-- Comments
COMMENT ON TABLE contact_documents IS 'Documents uploaded to contact profiles, optionally associated with cases';
COMMENT ON COLUMN contact_documents.document_type IS 'Type: identification, legal, medical, financial, correspondence, photo, consent_form, assessment, report, other';
COMMENT ON COLUMN contact_documents.file_name IS 'Unique generated filename stored on disk';
COMMENT ON COLUMN contact_documents.original_name IS 'Original filename as uploaded by user';
