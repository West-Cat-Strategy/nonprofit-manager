-- Migration 111: Local-first communications
-- Created: 2026-05-01
-- Description:
--   * broadens campaign runs from Mailchimp-only to local-email-first delivery
--   * stores local campaign content snapshots
--   * adds recipient-level delivery queue/evidence for SMTP-backed blast email

ALTER TABLE campaign_runs
  DROP CONSTRAINT IF EXISTS campaign_runs_provider_check;

ALTER TABLE campaign_runs
  DROP CONSTRAINT IF EXISTS campaign_runs_status_check;

ALTER TABLE campaign_runs
  ALTER COLUMN list_id DROP NOT NULL;

ALTER TABLE campaign_runs
  ADD COLUMN IF NOT EXISTS content_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE campaign_runs
  ADD CONSTRAINT campaign_runs_provider_check CHECK (provider IN ('mailchimp', 'local_email'));

ALTER TABLE campaign_runs
  ADD CONSTRAINT campaign_runs_status_check CHECK (
    status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'canceled')
  );

CREATE TABLE IF NOT EXISTS campaign_run_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_run_id UUID NOT NULL REFERENCES campaign_runs(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'queued',
  provider_message_id VARCHAR(255),
  failure_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT campaign_run_recipients_status_check CHECK (
    status IN ('queued', 'sending', 'sent', 'failed', 'suppressed')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_run_recipients_unique_target
  ON campaign_run_recipients(campaign_run_id, contact_id, email);

CREATE INDEX IF NOT EXISTS idx_campaign_run_recipients_run_status
  ON campaign_run_recipients(campaign_run_id, status, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_campaign_runs_provider_status_updated
  ON campaign_runs(provider, status, updated_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_campaign_run_recipients_updated_at'
  ) THEN
    CREATE TRIGGER update_campaign_run_recipients_updated_at
      BEFORE UPDATE ON campaign_run_recipients
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON COLUMN campaign_runs.content_snapshot IS
  'Rendered local campaign subject/body snapshot used for queued local email delivery';
COMMENT ON TABLE campaign_run_recipients IS
  'Recipient-level local campaign delivery queue and evidence';
