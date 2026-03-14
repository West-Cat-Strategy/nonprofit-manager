-- Migration: P4-T9H staff backend efficiency search indexes
-- Date: 2026-03-13
-- Purpose: Add trigram indexes for staff catalog search hot paths.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_cases_staff_search_trgm
  ON cases
  USING GIN ((
    coalesce(nullif(case_number, ''), '')
    || CASE WHEN nullif(title, '') IS NOT NULL THEN ' ' || title ELSE '' END
    || CASE WHEN nullif(description, '') IS NOT NULL THEN ' ' || description ELSE '' END
  ) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tasks_staff_search_trgm
  ON tasks
  USING GIN ((
    coalesce(nullif(subject, ''), '')
    || CASE WHEN nullif(description, '') IS NOT NULL THEN ' ' || description ELSE '' END
  ) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_contacts_staff_search_trgm
  ON contacts
  USING GIN ((
    coalesce(nullif(first_name, ''), '')
    || CASE WHEN nullif(preferred_name, '') IS NOT NULL THEN ' ' || preferred_name ELSE '' END
    || CASE WHEN nullif(last_name, '') IS NOT NULL THEN ' ' || last_name ELSE '' END
    || CASE WHEN nullif(email, '') IS NOT NULL THEN ' ' || email ELSE '' END
    || CASE WHEN nullif(phone, '') IS NOT NULL THEN ' ' || phone ELSE '' END
    || CASE WHEN nullif(mobile_phone, '') IS NOT NULL THEN ' ' || mobile_phone ELSE '' END
  ) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_accounts_staff_search_trgm
  ON accounts
  USING GIN ((
    coalesce(nullif(account_name, ''), '')
    || CASE WHEN nullif(email, '') IS NOT NULL THEN ' ' || email ELSE '' END
    || CASE WHEN nullif(account_number, '') IS NOT NULL THEN ' ' || account_number ELSE '' END
  ) gin_trgm_ops);
