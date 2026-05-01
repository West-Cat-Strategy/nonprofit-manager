-- Migration 110: Communication suppression governance
-- Created: 2026-05-01
-- Description:
--   * adds contact-level communication suppression evidence with channel/reason/source taxonomy
--   * adds account-scoped communication fatigue policy state for advisory governance

CREATE TABLE IF NOT EXISTS contact_suppression_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  channel VARCHAR(30) NOT NULL,
  reason VARCHAR(80) NOT NULL,
  source VARCHAR(80) NOT NULL,
  source_label VARCHAR(255),
  provider VARCHAR(80),
  provider_list_id VARCHAR(255),
  provider_event_id VARCHAR(255),
  provider_event_type VARCHAR(80),
  provider_reason VARCHAR(255),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_note TEXT,
  CONSTRAINT contact_suppression_channel_check CHECK (
    channel IN ('email', 'phone', 'sms', 'voicemail', 'mail', 'all')
  ),
  CONSTRAINT contact_suppression_reason_check CHECK (
    reason IN (
      'staff_dnc',
      'client_request',
      'caregiver_request',
      'legal_hold',
      'unsubscribed',
      'cleaned',
      'mailchimp_unsubscribe',
      'mailchimp_cleaned',
      'no_solicitations',
      'invalid_contact',
      'other'
    )
  ),
  CONSTRAINT contact_suppression_source_check CHECK (
    source IN ('staff', 'mailchimp_webhook', 'import', 'system')
  )
);

CREATE INDEX IF NOT EXISTS idx_contact_suppression_contact_active
  ON contact_suppression_evidence(contact_id, is_active, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_suppression_account_channel
  ON contact_suppression_evidence(account_id, channel, is_active, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_suppression_provider_event
  ON contact_suppression_evidence(provider, provider_event_id, contact_id, channel, reason)
  WHERE provider_event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS communication_fatigue_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  channel VARCHAR(30) NOT NULL DEFAULT 'email',
  max_messages INTEGER NOT NULL DEFAULT 4,
  window_days INTEGER NOT NULL DEFAULT 30,
  enforcement VARCHAR(20) NOT NULL DEFAULT 'advisory',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT communication_fatigue_policy_channel_check CHECK (
    channel IN ('email', 'phone', 'sms', 'voicemail', 'mail', 'all')
  ),
  CONSTRAINT communication_fatigue_policy_enforcement_check CHECK (
    enforcement IN ('advisory', 'block')
  ),
  CONSTRAINT communication_fatigue_policy_max_messages_check CHECK (max_messages > 0),
  CONSTRAINT communication_fatigue_policy_window_days_check CHECK (window_days > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_communication_fatigue_policy_account_channel_active
  ON communication_fatigue_policies(account_id, channel)
  WHERE is_active = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_contact_suppression_evidence_updated_at'
  ) THEN
    CREATE TRIGGER update_contact_suppression_evidence_updated_at
      BEFORE UPDATE ON contact_suppression_evidence
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_communication_fatigue_policies_updated_at'
  ) THEN
    CREATE TRIGGER update_communication_fatigue_policies_updated_at
      BEFORE UPDATE ON communication_fatigue_policies
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE contact_suppression_evidence IS
  'Channel/reason evidence for contact communication suppression decisions';
COMMENT ON TABLE communication_fatigue_policies IS
  'Account-scoped communication fatigue policy state; advisory by default';
