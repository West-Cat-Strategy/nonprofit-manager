-- Migration 052: Webhook delivery lifecycle expansion + payment webhook idempotency
-- Created: 2026-03-01
-- Description:
--   1) Expand webhook delivery status model to queued/running/retrying/success/failed/dead_letter.
--   2) Add Stripe payment webhook receipt table for idempotent event handling.

-- ---------------------------------------------------------------------------
-- webhook_deliveries status lifecycle hardening
-- ---------------------------------------------------------------------------
UPDATE webhook_deliveries
SET status = 'queued'
WHERE status = 'pending';

ALTER TABLE webhook_deliveries
  ALTER COLUMN status SET DEFAULT 'queued';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'webhook_deliveries_status_check'
  ) THEN
    ALTER TABLE webhook_deliveries
      DROP CONSTRAINT webhook_deliveries_status_check;
  END IF;
END $$;

ALTER TABLE webhook_deliveries
  ADD CONSTRAINT webhook_deliveries_status_check
  CHECK (status IN ('queued', 'running', 'retrying', 'success', 'failed', 'dead_letter'));

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_dispatch_queue
  ON webhook_deliveries(status, next_retry_at)
  WHERE status IN ('queued', 'retrying');

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_running
  ON webhook_deliveries(processing_started_at)
  WHERE status = 'running';

-- Keep legacy endpoint status readable while allowing dead-letter terminal state.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'webhook_endpoints_last_delivery_status_check'
  ) THEN
    ALTER TABLE webhook_endpoints
      DROP CONSTRAINT webhook_endpoints_last_delivery_status_check;
  END IF;
END $$;

ALTER TABLE webhook_endpoints
  ADD CONSTRAINT webhook_endpoints_last_delivery_status_check
  CHECK (
    last_delivery_status IS NULL
    OR last_delivery_status IN ('success', 'failed', 'dead_letter')
  );

-- ---------------------------------------------------------------------------
-- payment_webhook_receipts: idempotency registry for inbound provider events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_webhook_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider VARCHAR(50) NOT NULL,
  event_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP WITH TIME ZONE,
  processing_status VARCHAR(20) NOT NULL DEFAULT 'received',
  error_message TEXT,
  UNIQUE(provider, event_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payment_webhook_receipts_status_check'
  ) THEN
    ALTER TABLE payment_webhook_receipts
      ADD CONSTRAINT payment_webhook_receipts_status_check
      CHECK (processing_status IN ('received', 'processed', 'failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_webhook_receipts_provider_received
  ON payment_webhook_receipts(provider, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_receipts_status
  ON payment_webhook_receipts(processing_status, received_at DESC);
