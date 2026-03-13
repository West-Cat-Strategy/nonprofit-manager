-- Migration: P4-T9H staff backend efficiency search indexes
-- Date: 2026-03-13
-- Purpose: Add trigram indexes for staff catalog search hot paths.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_cases_staff_search_trgm
  ON cases
  USING GIN (concat_ws(' ', case_number, title, description) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tasks_staff_search_trgm
  ON tasks
  USING GIN (concat_ws(' ', subject, description) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_contacts_staff_search_trgm
  ON contacts
  USING GIN (concat_ws(' ', first_name, preferred_name, last_name, email, phone, mobile_phone) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_accounts_staff_search_trgm
  ON accounts
  USING GIN (concat_ws(' ', account_name, email, account_number) gin_trgm_ops);
