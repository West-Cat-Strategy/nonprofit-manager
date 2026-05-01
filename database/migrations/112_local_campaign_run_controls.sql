-- Migration 112: Local campaign run controls
-- Created: 2026-05-01
-- Description:
--   * allows local campaign recipient rows to be cancelled
--   * keeps recipient status vocabulary aligned with staff-triggered local queue controls

ALTER TABLE campaign_run_recipients
  DROP CONSTRAINT IF EXISTS campaign_run_recipients_status_check;

ALTER TABLE campaign_run_recipients
  ADD CONSTRAINT campaign_run_recipients_status_check CHECK (
    status IN ('queued', 'sending', 'sent', 'failed', 'suppressed', 'canceled')
  );

COMMENT ON COLUMN campaign_run_recipients.status IS
  'Local recipient delivery state: queued, sending, sent, failed, suppressed, or canceled';
