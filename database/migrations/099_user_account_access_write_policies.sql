-- Migration 099: Restore runtime write access to user_account_access under RLS
-- Created: 2026-04-19
-- Description: First-time setup, registration, invitation acceptance, and admin
-- access management all need to insert or update user_account_access rows while
-- the application connects as the scoped runtime user. The table only had a
-- SELECT policy, which caused partial bootstrap writes and null organization
-- tokens whenever those flows ran outside a superuser session.

DROP POLICY IF EXISTS user_account_access_self_insert ON user_account_access;
DROP POLICY IF EXISTS user_account_access_admin_manage ON user_account_access;

CREATE POLICY user_account_access_self_insert ON user_account_access
  FOR INSERT
  WITH CHECK (user_id = get_current_user_id());

CREATE POLICY user_account_access_admin_manage ON user_account_access
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
