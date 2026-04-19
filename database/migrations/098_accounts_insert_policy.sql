-- Migration 098: Allow admin-scoped inserts into accounts under row-level security
-- Created: 2026-04-19
-- Description: The accounts table enabled RLS with SELECT and UPDATE policies
-- but never declared an INSERT policy, so admin-backed account creation failed
-- whenever the app connected with the non-superuser runtime role.

DROP POLICY IF EXISTS accounts_insert_policy ON accounts;

CREATE POLICY accounts_insert_policy ON accounts
  FOR INSERT
  WITH CHECK (is_admin());
