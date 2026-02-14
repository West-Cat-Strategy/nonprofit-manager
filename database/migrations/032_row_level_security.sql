-- Migration: Row-Level Security (RLS) Implementation
-- Phase 3: Advanced Access Controls
-- 
-- Implements PostgreSQL RLS to ensure users can only access records
-- they have permission to view, enforced at the database level.
-- This provides defense-in-depth beyond API-level access control.

-- Enable RLS on sensitive tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Helper function: Get current user ID from JWT
-- Note: Replace with your actual JWT parsing logic if different
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  -- In production, extract from JWT or pg_stat_statements
  -- For now, we use the authenticated user from connection
  RETURN (current_setting('app.current_user_id', true)::UUID);
END;
$$ LANGUAGE plpgsql;

-- Helper function: Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = get_current_user_id()
    AND r.name = 'admin'
  );
END;
$$ LANGUAGE plpgsql;

-- Helper function: Check if user can access organization
CREATE OR REPLACE FUNCTION can_access_organization(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Admins can access all organizations
  IF is_admin() THEN
    RETURN true;
  END IF;
  
  -- Check if user has explicit access to this organization
  RETURN EXISTS (
    SELECT 1 FROM user_organization_access uoa
    WHERE uoa.user_id = get_current_user_id()
    AND uoa.organization_id = org_id
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- CONTACTS TABLE - RLS POLICIES
-- ============================================================

-- Policy: Users can select contacts only from accessible organizations
CREATE POLICY contacts_select_policy ON contacts
  FOR SELECT
  USING (
    is_admin()
    OR account_id IN (
      SELECT a.id FROM accounts a
      WHERE a.organization_id IN (
        SELECT organization_id FROM user_organization_access
        WHERE user_id = get_current_user_id()
      )
    )
  );

-- Policy: Users can insert contacts only in accessible organizations
CREATE POLICY contacts_insert_policy ON contacts
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR account_id IN (
      SELECT a.id FROM accounts a
      WHERE a.organization_id IN (
        SELECT organization_id FROM user_organization_access
        WHERE user_id = get_current_user_id()
      )
    )
  );

-- Policy: Users can update contacts only in accessible organizations
CREATE POLICY contacts_update_policy ON contacts
  FOR UPDATE
  USING (
    is_admin()
    OR account_id IN (
      SELECT a.id FROM accounts a
      WHERE a.organization_id IN (
        SELECT organization_id FROM user_organization_access
        WHERE user_id = get_current_user_id()
      )
    )
  )
  WITH CHECK (
    is_admin()
    OR account_id IN (
      SELECT a.id FROM accounts a
      WHERE a.organization_id IN (
        SELECT organization_id FROM user_organization_access
        WHERE user_id = get_current_user_id()
      )
    )
  );

-- Policy: Managers+ can delete, only admins can delete from other orgs
CREATE POLICY contacts_delete_policy ON contacts
  FOR DELETE
  USING (
    is_admin()
    OR (
      account_id IN (
        SELECT a.id FROM accounts a
        WHERE a.organization_id IN (
          SELECT organization_id FROM user_organization_access uoa
          WHERE uoa.user_id = get_current_user_id()
          AND uoa.role IN ('admin', 'manager')
        )
      )
    )
  );

-- ============================================================
-- DONATIONS TABLE - RLS POLICIES
-- ============================================================

-- Policy: Users can select donations from their organizations
CREATE POLICY donations_select_policy ON donations
  FOR SELECT
  USING (
    is_admin()
    OR account_id IN (
      SELECT a.id FROM accounts a
      WHERE a.organization_id IN (
        SELECT organization_id FROM user_organization_access
        WHERE user_id = get_current_user_id()
      )
    )
  );

-- Policy: Users can insert donations
CREATE POLICY donations_insert_policy ON donations
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR account_id IN (
      SELECT a.id FROM accounts a
      WHERE a.organization_id IN (
        SELECT organization_id FROM user_organization_access
        WHERE user_id = get_current_user_id()
      )
    )
  );

-- Policy: Users can update their org's donations
CREATE POLICY donations_update_policy ON donations
  FOR UPDATE
  USING (
    is_admin()
    OR account_id IN (
      SELECT a.id FROM accounts a
      WHERE a.organization_id IN (
        SELECT organization_id FROM user_organization_access
        WHERE user_id = get_current_user_id()
      )
    )
  )
  WITH CHECK (
    is_admin()
    OR account_id IN (
      SELECT a.id FROM accounts a
      WHERE a.organization_id IN (
        SELECT organization_id FROM user_organization_access
        WHERE user_id = get_current_user_id()
      )
    )
  );

-- ============================================================
-- ACCOUNTS TABLE - RLS POLICIES
-- ============================================================

-- Policy: Users can select accounts from their organizations
CREATE POLICY accounts_select_policy ON accounts
  FOR SELECT
  USING (
    is_admin()
    OR organization_id IN (
      SELECT organization_id FROM user_organization_access
      WHERE user_id = get_current_user_id()
    )
  );

-- Policy: Users can insert accounts
CREATE POLICY accounts_insert_policy ON accounts
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR organization_id IN (
      SELECT organization_id FROM user_organization_access
      WHERE user_id = get_current_user_id()
    )
  );

-- Policy: Users can update accounts in their organization
CREATE POLICY accounts_update_policy ON accounts
  FOR UPDATE
  USING (
    is_admin()
    OR organization_id IN (
      SELECT organization_id FROM user_organization_access
      WHERE user_id = get_current_user_id()
    )
  )
  WITH CHECK (
    is_admin()
    OR organization_id IN (
      SELECT organization_id FROM user_organization_access
      WHERE user_id = get_current_user_id()
    )
  );

-- ============================================================
-- VOLUNTEERS TABLE - RLS POLICIES
-- ============================================================

-- Policy: Users can view volunteers in their organizations
CREATE POLICY volunteers_select_policy ON volunteers
  FOR SELECT
  USING (
    is_admin()
    OR contact_id IN (
      SELECT c.id FROM contacts c
      JOIN accounts a ON c.account_id = a.id
      WHERE a.organization_id IN (
        SELECT organization_id FROM user_organization_access
        WHERE user_id = get_current_user_id()
      )
    )
  );

-- Policy: Users can update volunteers in their organizations
CREATE POLICY volunteers_update_policy ON volunteers
  FOR UPDATE
  USING (
    is_admin()
    OR contact_id IN (
      SELECT c.id FROM contacts c
      JOIN accounts a ON c.account_id = a.id
      WHERE a.organization_id IN (
        SELECT organization_id FROM user_organization_access
        WHERE user_id = get_current_user_id()
      )
    )
  )
  WITH CHECK (
    is_admin()
    OR contact_id IN (
      SELECT c.id FROM contacts c
      JOIN accounts a ON c.account_id = a.id
      WHERE a.organization_id IN (
        SELECT organization_id FROM user_organization_access
        WHERE user_id = get_current_user_id()
      )
    )
  );

-- ============================================================
-- EVENTS TABLE - RLS POLICIES
-- ============================================================

-- Policy: Users can view events in their organizations
CREATE POLICY events_select_policy ON events
  FOR SELECT
  USING (
    is_admin()
    OR organization_id IN (
      SELECT organization_id FROM user_organization_access
      WHERE user_id = get_current_user_id()
    )
  );

-- ============================================================
-- EVENT REGISTRATIONS TABLE - RLS POLICIES
-- ============================================================

-- Policy: Users can view registrations for events in their organization
CREATE POLICY event_registrations_select_policy ON event_registrations
  FOR SELECT
  USING (
    is_admin()
    OR event_id IN (
      SELECT e.id FROM events e
      WHERE e.organization_id IN (
        SELECT organization_id FROM user_organization_access
        WHERE user_id = get_current_user_id()
      )
    )
  );

-- ============================================================
-- AUDIT LOG TABLE - RLS POLICIES
-- ============================================================

-- Policy: Users can only view audit logs for their organizations
-- Admins can view all
CREATE POLICY audit_log_select_policy ON audit_log
  FOR SELECT
  USING (
    is_admin()
    OR (
      record_type = 'contact' AND record_id IN (
        SELECT c.id FROM contacts c
        JOIN accounts a ON c.account_id = a.id
        WHERE a.organization_id IN (
          SELECT organization_id FROM user_organization_access
          WHERE user_id = get_current_user_id()
        )
      )
    )
    OR (
      record_type = 'account' AND record_id IN (
        SELECT a.id FROM accounts a
        WHERE a.organization_id IN (
          SELECT organization_id FROM user_organization_access
          WHERE user_id = get_current_user_id()
        )
      )
    )
  );

-- ============================================================
-- INDEXES for RLS PERFORMANCE
-- ============================================================

-- Index for user_organization_access lookups (used in all RLS checks)
CREATE INDEX IF NOT EXISTS idx_user_org_access_user_id 
  ON user_organization_access(user_id);

-- Index for contact->account lookups
CREATE INDEX IF NOT EXISTS idx_contacts_account_id 
  ON contacts(account_id);

-- Index for donations->account lookups
CREATE INDEX IF NOT EXISTS idx_donations_account_id 
  ON donations(account_id);

-- Index for accounts->organization lookups
CREATE INDEX IF NOT EXISTS idx_accounts_organization_id 
  ON accounts(organization_id);

-- Index for volunteers->contact lookups
CREATE INDEX IF NOT EXISTS idx_volunteers_contact_id 
  ON volunteers(contact_id);

-- Index for event registrations->event lookups
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id 
  ON event_registrations(event_id);

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

-- Application user should have SELECT on helper functions
GRANT EXECUTE ON FUNCTION get_current_user_id() TO nonprofit_app_user_prod;
GRANT EXECUTE ON FUNCTION is_admin() TO nonprofit_app_user_prod;
GRANT EXECUTE ON FUNCTION can_access_organization(UUID) TO nonprofit_app_user_prod;

-- ============================================================
-- TESTING AND VALIDATION
-- ============================================================

-- Test: Set user context and verify policies work
-- In your application code, set the current user before queries:
-- 
--   SET app.current_user_id = '550e8400-e29b-41d4-a716-446655440000';
--   SELECT * FROM contacts; -- Will return only contacts user can access
--
-- To disable RLS temporarily for system operations:
--   ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
