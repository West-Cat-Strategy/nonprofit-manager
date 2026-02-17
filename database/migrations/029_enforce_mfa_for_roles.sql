-- Migration: Add MFA enforcement flag to roles
-- Description: Add mfa_required column to roles table to enforce MFA for specific roles

ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS mfa_required BOOLEAN NOT NULL DEFAULT FALSE;

-- Update system roles to require MFA for admin and manager
UPDATE roles
SET mfa_required = TRUE
WHERE name IN ('admin', 'manager');

-- Create index for MFA required queries
CREATE INDEX IF NOT EXISTS idx_roles_mfa_required ON roles(mfa_required)
WHERE mfa_required = TRUE;
