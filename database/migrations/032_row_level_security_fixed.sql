-- Migration 032: Row-Level Security (Fixed for Actual Schema)
-- Enables PostgreSQL RLS to enforce access control at the database level
-- 
-- This migration:
-- 1. Creates user_account_access table to establish user-account relationships
-- 2. Enables RLS on sensitive tables (contacts, donations, accounts, etc.)
-- 3. Creates helper functions for access checks
-- 4. Implements policies that match the actual database schema
--
-- NOTE: Schema analysis revealed no existing user_organization_access table
-- This migration creates the necessary relationship tracking instead.

-- ============================================================================
-- Step 1: Create table to track user's account access (Key Relationship)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_account_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    access_level VARCHAR(50) NOT NULL DEFAULT 'viewer', -- admin, editor, viewer
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, account_id)
);

CREATE INDEX idx_user_account_access_user_id ON user_account_access(user_id);
CREATE INDEX idx_user_account_access_account_id ON user_account_access(account_id);

-- ============================================================================
-- Step 2: Enable RLS on the new table itself
-- ============================================================================

ALTER TABLE user_account_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_account_access_select ON user_account_access
  FOR SELECT
  USING (
    -- Users can see their own access records
    user_id = current_setting('app.current_user_id', true)::UUID
    OR
    -- Admins (sys admins) can see all records
    EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true)::UUID AND role = 'admin')
  );

-- ============================================================================
-- Step 3: Create helper functions for access control
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_user_id() RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(
    current_setting('app.current_user_id', true)::UUID,
    NULL
  );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = get_current_user_id() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION can_access_account(account_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  -- Admins can access any account
  IF is_admin() THEN
    RETURN true;
  END IF;

  -- Check if user has access to the account
  RETURN EXISTS (
    SELECT 1 FROM user_account_access
    WHERE account_id = $1
    AND user_id = get_current_user_id()
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Step 4: Enable RLS on contacts table
-- ============================================================================

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Users can SELECT contacts for accounts they have access to
CREATE POLICY contacts_select_policy ON contacts
  FOR SELECT
  USING (
    is_admin()
    OR account_id IN (
      SELECT account_id FROM user_account_access
      WHERE user_id = get_current_user_id()
      AND is_active = true
    )
  );

-- Users can INSERT contacts into accounts they can edit
CREATE POLICY contacts_insert_policy ON contacts
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR account_id IN (
      SELECT account_id FROM user_account_access
      WHERE user_id = get_current_user_id()
      AND access_level IN ('admin', 'editor')
      AND is_active = true
    )
  );

-- Users can UPDATE/DELETE contacts in accounts they manage
CREATE POLICY contacts_update_policy ON contacts
  FOR UPDATE
  USING (
    is_admin()
    OR account_id IN (
      SELECT account_id FROM user_account_access
      WHERE user_id = get_current_user_id()
      AND access_level IN ('admin', 'editor')
      AND is_active = true
    )
  );

CREATE POLICY contacts_delete_policy ON contacts
  FOR DELETE
  USING (
    is_admin()
    OR account_id IN (
      SELECT account_id FROM user_account_access
      WHERE user_id = get_current_user_id()
      AND access_level = 'admin'
      AND is_active = true
    )
  );

-- ============================================================================
-- Step 5: Enable RLS on donations table
-- ============================================================================

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Users can view donations only for their accessible accounts
CREATE POLICY donations_select_policy ON donations
  FOR SELECT
  USING (
    is_admin()
    OR account_id IN (
      SELECT account_id FROM user_account_access
      WHERE user_id = get_current_user_id()
      AND is_active = true
    )
  );

-- Users can create donations for accounts they manage
CREATE POLICY donations_insert_policy ON donations
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR account_id IN (
      SELECT account_id FROM user_account_access
      WHERE user_id = get_current_user_id()
      AND access_level IN ('admin', 'editor')
      AND is_active = true
    )
  );

-- Users can update donations in their accounts (editors+ only)
CREATE POLICY donations_update_policy ON donations
  FOR UPDATE
  USING (
    is_admin()
    OR account_id IN (
      SELECT account_id FROM user_account_access
      WHERE user_id = get_current_user_id()
      AND access_level IN ('admin', 'editor')
      AND is_active = true
    )
  );

-- ============================================================================
-- Step 6: Enable RLS on accounts table
-- ============================================================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Users see only accounts they have access to
CREATE POLICY accounts_select_policy ON accounts
  FOR SELECT
  USING (
    is_admin()
    OR id IN (
      SELECT account_id FROM user_account_access
      WHERE user_id = get_current_user_id()
      AND is_active = true
    )
  );

-- Only admins can modify accounts
CREATE POLICY accounts_modify_policy ON accounts
  FOR UPDATE
  USING (is_admin());

-- ============================================================================
-- Step 7: Enable RLS on volunteers table
-- ============================================================================

ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;

-- Users see volunteers from their accessible contacts
CREATE POLICY volunteers_select_policy ON volunteers
  FOR SELECT
  USING (
    is_admin()
    OR contact_id IN (
      SELECT c.id FROM contacts c
      JOIN user_account_access uaa ON c.account_id = uaa.account_id
      WHERE uaa.user_id = get_current_user_id()
      AND uaa.is_active = true
    )
  );

-- ============================================================================
-- Step 8: Enable RLS on events table
-- ============================================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Events are typically account-scoped - admins can see all, others see their account's events
CREATE POLICY events_select_policy ON events
  FOR SELECT
  USING (
    is_admin()
    OR 
    -- Check if event is related to user's accounts (simple approach)
    -- In a more complex scenario, events would have account_id or similar
    true  -- For now, allow all (since no account_id in events table)
  );

-- ============================================================================
-- Step 9: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_contacts_account_id ON contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_donations_account_id ON donations(account_id);
CREATE INDEX IF NOT EXISTS idx_volunteers_contact_id ON volunteers(contact_id);
CREATE INDEX IF NOT EXISTS idx_accounts_id ON accounts(id);

-- ============================================================================
-- Step 10: Grant permissions to application user
-- ============================================================================

-- Note: These grants assume an "nonprofit_app_user" role exists
-- If using different role names, update accordingly

DO $$
BEGIN
  -- Check if role exists; if not, create a comment
  PERFORM 1 FROM pg_roles WHERE rolname = 'nonprofit_app_user_prod';
  IF FOUND THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON user_account_access TO nonprofit_app_user_prod;
    RAISE NOTICE 'Granted permissions to nonprofit_app_user_prod';
  ELSE
    RAISE WARNING 'nonprofit_app_user_prod role not found - please grant manually';
  END IF;
END
$$;

-- ============================================================================
-- Documentation & Testing Notes
-- ============================================================================

/*
IMPLEMENTATION NOTES:

1. SET app.current_user_id Context:
   The application MUST set the PostgreSQL context variable before executing queries:
   
   Example in Node.js:
   await pool.query('SET app.current_user_id = $1', [userId]);
   // Then run actual queries - RLS policies will use this context
   
   Or in a single transaction:
   await client.query('BEGIN');
   await client.query('SET app.current_user_id = $1', [userId]);
   await client.query('SELECT * FROM contacts');
   await client.query('COMMIT');

2. User-Account Relationship:
   The new user_account_access table must be populated with user-account relationships.
   This should be done via application logic when:
   - Assigning users to accounts
   - Changing user roles/permissions
   - Creating new accounts

3. Access Levels:
   - 'viewer': Can only read data
   - 'editor': Can read and create/modify
   - 'admin': Full control including deletion

4. Admin Bypass:
   Users with role='admin' in the users table bypass all RLS policies
   This is intentional for system administration

5. Testing RLS Policies:
   
   -- Test as non-admin user
   SET app.current_user_id = 'user-uuid-123';
   SELECT * FROM contacts;  -- Should only return contacts they have access to
   
   -- Test as admin
   SET app.current_user_id = 'admin-uuid-456';
   SELECT * FROM contacts;  -- Should return all contacts
   
   -- Clean up
   RESET app.current_user_id;

6. Troubleshooting:
   - "permission denied for schema public" → Grant USAGE on schema
   - "relation does not exist" → Check table names match your schema
   - Policies not working → Verify app.current_user_id is being SET
   - Performance issues → Ensure indexes are created on foreign keys
*/

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Record migration as applied (if using migration tracking)
INSERT INTO schema_migrations (filename) VALUES ('032_row_level_security_fixed.sql')
ON CONFLICT (filename) DO NOTHING;
