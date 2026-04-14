-- Migration 089: Align case topic definition constraint name
-- Created: 2026-04-13
-- Description: Renames the case topic taxonomy uniqueness constraint to the explicit
-- contract expected by schema checks and integration tests.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'case_topic_definitions'
      AND c.conname = 'case_topic_definitions_account_id_normalized_name_key'
  ) THEN
    EXECUTE 'ALTER TABLE case_topic_definitions RENAME CONSTRAINT case_topic_definitions_account_id_normalized_name_key TO uq_case_topic_definitions_account_normalized';
  ELSIF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'case_topic_definitions'
      AND c.conname = 'uq_case_topic_definitions_account_normalized'
  ) THEN
    EXECUTE 'ALTER TABLE case_topic_definitions ADD CONSTRAINT uq_case_topic_definitions_account_normalized UNIQUE (account_id, normalized_name)';
  END IF;
END $$;
