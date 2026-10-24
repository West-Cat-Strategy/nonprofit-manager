-- Migration 142: Contact child tables Row-Level Security (RLS) hardening
-- Created: 2026-10-14
-- Description:
--   * Enables and forces RLS on contact_phone_numbers, contact_email_addresses,
--     contact_notes, and contact_documents
--   * Implements defense-in-depth SELECT and write policies linking child
--     records to the constituent's parent account access permissions

-- ============================================================================
-- Step 1: contact_phone_numbers
-- ============================================================================

ALTER TABLE contact_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_phone_numbers FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_phone_numbers'
      AND policyname = 'contact_phones_select_policy'
  ) THEN
    CREATE POLICY contact_phones_select_policy ON contact_phone_numbers
      FOR SELECT
      USING (
        is_admin()
        OR contact_id IN (
          SELECT c.id
          FROM contacts c
          JOIN user_account_access uaa
            ON c.account_id = uaa.account_id
          WHERE uaa.user_id = get_current_user_id()
            AND uaa.is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_phone_numbers'
      AND policyname = 'contact_phones_insert_policy'
  ) THEN
    CREATE POLICY contact_phones_insert_policy ON contact_phone_numbers
      FOR INSERT
      WITH CHECK (
        is_admin()
        OR contact_id IN (
          SELECT c.id
          FROM contacts c
          JOIN user_account_access uaa
            ON c.account_id = uaa.account_id
          WHERE uaa.user_id = get_current_user_id()
            AND uaa.access_level IN ('admin', 'editor')
            AND uaa.is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_phone_numbers'
      AND policyname = 'contact_phones_update_policy'
  ) THEN
    CREATE POLICY contact_phones_update_policy ON contact_phone_numbers
      FOR UPDATE
      USING (
        is_admin()
        OR contact_id IN (
          SELECT c.id
          FROM contacts c
          JOIN user_account_access uaa
            ON c.account_id = uaa.account_id
          WHERE uaa.user_id = get_current_user_id()
            AND uaa.access_level IN ('admin', 'editor')
            AND uaa.is_active = true
        )
      )
      WITH CHECK (
        is_admin()
        OR contact_id IN (
          SELECT c.id
          FROM contacts c
          JOIN user_account_access uaa
            ON c.account_id = uaa.account_id
          WHERE uaa.user_id = get_current_user_id()
            AND uaa.access_level IN ('admin', 'editor')
            AND uaa.is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_phone_numbers'
      AND policyname = 'contact_phones_delete_policy'
  ) THEN
    CREATE POLICY contact_phones_delete_policy ON contact_phone_numbers
      FOR DELETE
      USING (
        is_admin()
        OR contact_id IN (
          SELECT c.id
          FROM contacts c
          JOIN user_account_access uaa
            ON c.account_id = uaa.account_id
          WHERE uaa.user_id = get_current_user_id()
            AND uaa.access_level IN ('admin', 'editor')
            AND uaa.is_active = true
        )
      );
  END IF;
END $$;

-- ============================================================================
-- Step 2: contact_email_addresses
-- ============================================================================

ALTER TABLE contact_email_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_email_addresses FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_email_addresses'
      AND policyname = 'contact_emails_select_policy'
  ) THEN
    CREATE POLICY contact_emails_select_policy ON contact_email_addresses
      FOR SELECT
      USING (
        is_admin()
        OR contact_id IN (
          SELECT c.id
          FROM contacts c
          JOIN user_account_access uaa
            ON c.account_id = uaa.account_id
          WHERE uaa.user_id = get_current_user_id()
            AND uaa.is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_email_addresses'
      AND policyname = 'contact_emails_insert_policy'
  ) THEN
    CREATE POLICY contact_emails_insert_policy ON contact_email_addresses
      FOR INSERT
      WITH CHECK (
        is_admin()
        OR contact_id IN (
          SELECT c.id
          FROM contacts c
          JOIN user_account_access uaa
            ON c.account_id = uaa.account_id
          WHERE uaa.user_id = get_current_user_id()
            AND uaa.access_level IN ('admin', 'editor')
            AND uaa.is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_email_addresses'
      AND policyname = 'contact_emails_update_policy'
  ) THEN
    CREATE POLICY contact_emails_update_policy ON contact_email_addresses
      FOR UPDATE
      USING (
        is_admin()
        OR contact_id IN (
          SELECT c.id
          FROM contacts c
          JOIN user_account_access uaa
            ON c.account_id = uaa.account_id
          WHERE uaa.user_id = get_current_user_id()
            AND uaa.access_level IN ('admin', 'editor')
            AND uaa.is_active = true
        )
      )
      WITH CHECK (
        is_admin()
        OR contact_id IN (
          SELECT c.id
          FROM contacts c
          JOIN user_account_access uaa
            ON c.account_id = uaa.account_id
          WHERE uaa.user_id = get_current_user_id()
            AND uaa.access_level IN ('admin', 'editor')
            AND uaa.is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_email_addresses'
      AND policyname = 'contact_emails_delete_policy'
  ) THEN
    CREATE POLICY contact_emails_delete_policy ON contact_email_addresses
      FOR DELETE
      USING (
        is_admin()
        OR contact_id IN (
          SELECT c.id
          FROM contacts c
          JOIN user_account_access uaa
            ON c.account_id = uaa.account_id
          WHERE uaa.user_id = get_current_user_id()
            AND uaa.access_level IN ('admin', 'editor')
            AND uaa.is_active = true
        )
      );
  END IF;
END $$;

-- ============================================================================
-- Step 3: contact_notes
-- ============================================================================

ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_notes FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_notes'
      AND policyname = 'contact_notes_select_policy'
  ) THEN
    CREATE POLICY contact_notes_select_policy ON contact_notes
      FOR SELECT
      USING (
        is_admin()
        OR contact_id IN (
          SELECT c.id
          FROM contacts c
          JOIN user_account_access uaa
            ON c.account_id = uaa.account_id
          WHERE uaa.user_id = get_current_user_id()
            AND uaa.is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_notes'
      AND policyname = 'contact_notes_insert_policy'
  ) THEN
    CREATE POLICY contact_notes_insert_policy ON contact_notes
      FOR INSERT
      WITH CHECK (
        is_admin()
        OR contact_id IN (
          SELECT c.id
          FROM contacts c
          JOIN user_account_access uaa
            ON c.account_id = uaa.account_id
          WHERE uaa.user_id = get_current_user_id()
            AND uaa.access_level IN ('admin', 'editor')
            AND uaa.is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_notes'
      AND policyname = 'contact_notes_update_policy'
  ) THEN
    CREATE POLICY contact_notes_update_policy ON contact_notes
      FOR UPDATE
      USING (
        is_admin()
        OR contact_id IN (
          SELECT c.id
          FROM contacts c
          JOIN user_account_access uaa
            ON c.account_id = uaa.account_id
          WHERE uaa.user_id = get_current_user_id()
            AND uaa.access_level IN ('admin', 'editor')
            AND uaa.is_active = true
        )
      )
      WITH CHECK (
        is_admin()
        OR contact_id IN (
          SELECT c.id
          FROM contacts c
          JOIN user_account_access uaa
            ON c.account_id = uaa.account_id
          WHERE uaa.user_id = get_current_user_id()
            AND uaa.access_level IN ('admin', 'editor')
            AND uaa.is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_notes'
      AND policyname = 'contact_notes_delete_policy'
  ) THEN
    CREATE POLICY contact_notes_delete_policy ON contact_notes
      FOR DELETE
      USING (
        is_admin()
        OR contact_id IN (
          SELECT c.id
          FROM contacts c
          JOIN user_account_access uaa
            ON c.account_id = uaa.account_id
          WHERE uaa.user_id = get_current_user_id()
            AND uaa.access_level IN ('admin', 'editor')
            AND uaa.is_active = true
        )
      );
  END IF;
END $$;

-- ============================================================================
-- Step 4: contact_documents
-- ============================================================================

ALTER TABLE contact_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_documents FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_documents'
      AND policyname = 'contact_documents_select_policy'
  ) THEN
    CREATE POLICY contact_documents_select_policy ON contact_documents
      FOR SELECT
      USING (
        is_admin()
        OR contact_id IN (
          SELECT c.id
          FROM contacts c
          JOIN user_account_access uaa
            ON c.account_id = uaa.account_id
          WHERE uaa.user_id = get_current_user_id()
            AND uaa.is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_documents'
      AND policyname = 'contact_documents_insert_policy'
  ) THEN
    CREATE POLICY contact_documents_insert_policy ON contact_documents
      FOR INSERT
      WITH CHECK (
        is_admin()
        OR contact_id IN (
          SELECT c.id
          FROM contacts c
          JOIN user_account_access uaa
            ON c.account_id = uaa.account_id
          WHERE uaa.user_id = get_current_user_id()
            AND uaa.access_level IN ('admin', 'editor')
            AND uaa.is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_documents'
      AND policyname = 'contact_documents_update_policy'
  ) THEN
    CREATE POLICY contact_documents_update_policy ON contact_documents
      FOR UPDATE
      USING (
        is_admin()
        OR contact_id IN (
          SELECT c.id
          FROM contacts c
          JOIN user_account_access uaa
            ON c.account_id = uaa.account_id
          WHERE uaa.user_id = get_current_user_id()
            AND uaa.access_level IN ('admin', 'editor')
            AND uaa.is_active = true
        )
      )
      WITH CHECK (
        is_admin()
        OR contact_id IN (
          SELECT c.id
          FROM contacts c
          JOIN user_account_access uaa
            ON c.account_id = uaa.account_id
          WHERE uaa.user_id = get_current_user_id()
            AND uaa.access_level IN ('admin', 'editor')
            AND uaa.is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_documents'
      AND policyname = 'contact_documents_delete_policy'
  ) THEN
    CREATE POLICY contact_documents_delete_policy ON contact_documents
      FOR DELETE
      USING (
        is_admin()
        OR contact_id IN (
          SELECT c.id
          FROM contacts c
          JOIN user_account_access uaa
            ON c.account_id = uaa.account_id
          WHERE uaa.user_id = get_current_user_id()
            AND uaa.access_level IN ('admin', 'editor')
            AND uaa.is_active = true
        )
      );
  END IF;
END $$;
