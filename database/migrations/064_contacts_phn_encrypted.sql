-- Migration 064: Add encrypted PHN storage for contacts

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS phn_encrypted VARCHAR(255);

COMMENT ON COLUMN contacts.phn_encrypted IS
  'AES-256-GCM encrypted Personal Health Number (PHN); plaintext PHN must never be stored.';
