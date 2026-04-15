-- Approval-gated registration passkey staging + policy groups

-- Preserve primary-role synchronization without clobbering direct role assignments.
ALTER TABLE user_roles
  ADD COLUMN IF NOT EXISTS assignment_source VARCHAR(20) NOT NULL DEFAULT 'direct';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_roles_assignment_source_check'
  ) THEN
    ALTER TABLE user_roles
      ADD CONSTRAINT user_roles_assignment_source_check
      CHECK (assignment_source IN ('primary', 'direct'));
  END IF;
END $$;

-- ============================================================================
-- Policy groups
-- ============================================================================

CREATE TABLE IF NOT EXISTS policy_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  modified_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS policy_group_roles (
  policy_group_id UUID NOT NULL REFERENCES policy_groups(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  PRIMARY KEY (policy_group_id, role_id)
);

CREATE TABLE IF NOT EXISTS user_policy_groups (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  policy_group_id UUID NOT NULL REFERENCES policy_groups(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  assigned_by UUID REFERENCES users(id),
  PRIMARY KEY (user_id, policy_group_id)
);

CREATE INDEX IF NOT EXISTS idx_policy_group_roles_role_id
  ON policy_group_roles(role_id);

CREATE INDEX IF NOT EXISTS idx_user_policy_groups_group_id
  ON user_policy_groups(policy_group_id);

-- ============================================================================
-- Pending-registration WebAuthn staging
-- ============================================================================

CREATE TABLE IF NOT EXISTS pending_registration_webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pending_registration_id UUID NOT NULL REFERENCES pending_registrations(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT[],
  device_type VARCHAR(50),
  backed_up BOOLEAN,
  name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pending_registration_webauthn_credentials_pending_registration_id
  ON pending_registration_webauthn_credentials(pending_registration_id);

CREATE TABLE IF NOT EXISTS pending_registration_webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pending_registration_id UUID NOT NULL REFERENCES pending_registrations(id) ON DELETE CASCADE,
  challenge TEXT NOT NULL,
  type VARCHAR(20) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pending_registration_webauthn_challenges_pending_registration_id
  ON pending_registration_webauthn_challenges(pending_registration_id);

CREATE INDEX IF NOT EXISTS idx_pending_registration_webauthn_challenges_expires_at
  ON pending_registration_webauthn_challenges(expires_at);
