-- Migration 102: restore volunteer write access under FORCE RLS
-- Volunteers were protected by FORCE RLS but only had a SELECT policy, which
-- caused app-role inserts to fail and updates/deletes to behave like not-found.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'volunteers'
      AND policyname = 'volunteers_insert_policy'
  ) THEN
    CREATE POLICY volunteers_insert_policy ON volunteers
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
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'volunteers'
      AND policyname = 'volunteers_update_policy'
  ) THEN
    CREATE POLICY volunteers_update_policy ON volunteers
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
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'volunteers'
      AND policyname = 'volunteers_delete_policy'
  ) THEN
    CREATE POLICY volunteers_delete_policy ON volunteers
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
