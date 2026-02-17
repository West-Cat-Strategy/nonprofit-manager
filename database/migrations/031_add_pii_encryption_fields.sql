-- Migration: Add encrypted PII fields to sensitive tables
-- Phase 2b: Operational Security - PII Encryption
-- 
-- This migration adds encrypted versions of sensitive fields to allow for
-- gradual migration from plaintext to encrypted storage. Old plaintext fields
-- will be deprecated after migration period (3 months).
--
-- Fields encrypted (AES-256-GCM):
-- - contacts: phone, mobile_phone, birth_date
-- - accounts: phone
-- - volunteers: emergency_contact_phone
-- - donations: sensitive payment metadata

-- Add encrypted PII fields to contacts table
ALTER TABLE contacts
ADD COLUMN phone_encrypted VARCHAR(255),
ADD COLUMN mobile_phone_encrypted VARCHAR(255),
ADD COLUMN birth_date_encrypted VARCHAR(255),
ADD COLUMN pii_encryption_status VARCHAR(50) DEFAULT 'pending'; -- pending, in_progress, completed

-- Create indexes for common lookups (on plaintext, will deprecate)
CREATE INDEX idx_contacts_phone ON contacts(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_contacts_mobile ON contacts(mobile_phone) WHERE mobile_phone IS NOT NULL;

-- Add encrypted PII fields to accounts table
ALTER TABLE accounts
ADD COLUMN phone_encrypted VARCHAR(255),
ADD COLUMN pii_encryption_status VARCHAR(50) DEFAULT 'pending';

CREATE INDEX idx_accounts_phone ON accounts(phone) WHERE phone IS NOT NULL;

-- Add encrypted PII fields to volunteers table
ALTER TABLE volunteers
ADD COLUMN emergency_contact_phone_encrypted VARCHAR(255),
ADD COLUMN pii_encryption_status VARCHAR(50) DEFAULT 'pending';

-- Add audit table for PII access (compliance tracking)
CREATE TABLE pii_access_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    accessed_by UUID REFERENCES users(id),
    access_type VARCHAR(50) NOT NULL, -- 'read', 'write', 'decrypt'
    reason VARCHAR(255), -- Compliance reason for access
    ip_address VARCHAR(50),
    user_agent TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for audit lookups
CREATE INDEX idx_pii_audit_record ON pii_access_audit(table_name, record_id);
CREATE INDEX idx_pii_audit_user ON pii_access_audit(accessed_by, accessed_at);
CREATE INDEX idx_pii_audit_timestamp ON pii_access_audit(accessed_at);

-- Create field access rules table for role-based access control
CREATE TABLE pii_field_access_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    access_level VARCHAR(50) NOT NULL DEFAULT 'masked', -- 'full', 'masked', 'none'
    masking_pattern VARCHAR(100), -- e.g., 'email', 'phone', 'ssn', 'partial'
    -- If NULL, use default masking based on field type
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    modified_by UUID REFERENCES users(id),
    UNIQUE(role_id, table_name, field_name)
);

CREATE INDEX idx_field_access_role ON pii_field_access_rules(role_id);
CREATE INDEX idx_field_access_field ON pii_field_access_rules(table_name, field_name);

-- Seed default access rules
-- Admin and Manager can see full PII
INSERT INTO pii_field_access_rules (role_id, table_name, field_name, access_level, masking_pattern, created_by)
SELECT r.id, 'contacts', 'phone', 'full', NULL, u.id
FROM roles r, users u
WHERE r.name IN ('admin', 'manager') AND u.email = 'system@nonprofit.local'
ON CONFLICT DO NOTHING;

INSERT INTO pii_field_access_rules (role_id, table_name, field_name, access_level, masking_pattern, created_by)
SELECT r.id, 'contacts', 'mobile_phone', 'full', NULL, u.id
FROM roles r, users u
WHERE r.name IN ('admin', 'manager') AND u.email = 'system@nonprofit.local'
ON CONFLICT DO NOTHING;

INSERT INTO pii_field_access_rules (role_id, table_name, field_name, access_level, masking_pattern, created_by)
SELECT r.id, 'contacts', 'birth_date', 'full', NULL, u.id
FROM roles r, users u
WHERE r.name IN ('admin', 'manager') AND u.email = 'system@nonprofit.local'
ON CONFLICT DO NOTHING;

-- Standard users can only see masked phone (last 4 digits)
INSERT INTO pii_field_access_rules (role_id, table_name, field_name, access_level, masking_pattern, created_by)
SELECT r.id, 'contacts', 'phone', 'masked', 'phone', u.id
FROM roles r, users u
WHERE r.name IN ('volunteer', 'user') AND u.email = 'system@nonprofit.local'
ON CONFLICT DO NOTHING;

-- Volunteers cannot see birth_date
INSERT INTO pii_field_access_rules (role_id, table_name, field_name, access_level, masking_pattern, created_by)
SELECT r.id, 'contacts', 'birth_date', 'none', NULL, u.id
FROM roles r, users u
WHERE r.name = 'volunteer' AND u.email = 'system@nonprofit.local'
ON CONFLICT DO NOTHING;
