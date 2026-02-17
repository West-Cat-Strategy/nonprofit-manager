-- Migration: Add missing columns to accounts and contacts tables
-- Created: 2026-02-01
-- Description: Align database schema with TypeScript types

-- ============================================================================
-- ACCOUNTS TABLE UPDATES
-- ============================================================================

-- Rename 'name' column to 'account_name' for consistency with TypeScript types
ALTER TABLE accounts RENAME COLUMN name TO account_name;

-- Add category column for account categorization
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Add tax_id column for tax information
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);

-- Add index for category lookups
CREATE INDEX IF NOT EXISTS idx_accounts_category ON accounts(category);

-- ============================================================================
-- CONTACTS TABLE UPDATES
-- ============================================================================

-- Add contact_role column
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_role VARCHAR(50) DEFAULT 'general';

-- Add additional name fields
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS salutation VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS suffix VARCHAR(50);

-- Add department column
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Add communication preference flags
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS do_not_email BOOLEAN DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS do_not_phone BOOLEAN DEFAULT false;

-- Add index for contact_role lookups
CREATE INDEX IF NOT EXISTS idx_contacts_contact_role ON contacts(contact_role);

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================

COMMENT ON COLUMN accounts.category IS 'Account category: donor, volunteer, partner, vendor, beneficiary, other';
COMMENT ON COLUMN accounts.tax_id IS 'Tax identification number (EIN, SSN, etc.)';
COMMENT ON COLUMN contacts.contact_role IS 'Contact role: primary, billing, technical, general';
COMMENT ON COLUMN contacts.middle_name IS 'Contact middle name';
COMMENT ON COLUMN contacts.salutation IS 'Salutation (Mr., Ms., Dr., etc.)';
COMMENT ON COLUMN contacts.suffix IS 'Name suffix (Jr., Sr., III, etc.)';
COMMENT ON COLUMN contacts.department IS 'Department within organization';
COMMENT ON COLUMN contacts.do_not_email IS 'Flag to prevent email communications';
COMMENT ON COLUMN contacts.do_not_phone IS 'Flag to prevent phone communications';
