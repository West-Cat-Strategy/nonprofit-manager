-- Add MFA (TOTP) + WebAuthn (passkeys) support

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mfa_totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mfa_totp_secret_enc TEXT,
  ADD COLUMN IF NOT EXISTS mfa_totp_pending_secret_enc TEXT,
  ADD COLUMN IF NOT EXISTS mfa_totp_enabled_at TIMESTAMP WITH TIME ZONE;

-- Passkeys / WebAuthn credentials
CREATE TABLE IF NOT EXISTS user_webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT[],
  device_type VARCHAR(50),
  backed_up BOOLEAN,
  name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_user_webauthn_credentials_user_id
  ON user_webauthn_credentials(user_id);

-- Store short-lived WebAuthn challenges
CREATE TABLE IF NOT EXISTS user_webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge TEXT NOT NULL,
  type VARCHAR(20) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_webauthn_challenges_user_id
  ON user_webauthn_challenges(user_id);

CREATE INDEX IF NOT EXISTS idx_user_webauthn_challenges_expires_at
  ON user_webauthn_challenges(expires_at);
