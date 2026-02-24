-- Migration 051: Webhook delivery queue hardening
-- Created: 2026-02-24
-- Description: Adds/normalizes webhook endpoint + delivery tables for reliable retries.

-- ---------------------------------------------------------------------------
-- Webhook endpoints
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  description TEXT,
  secret TEXT NOT NULL,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_delivery_at TIMESTAMP WITH TIME ZONE,
  last_delivery_status VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE webhook_endpoints
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS secret TEXT,
  ADD COLUMN IF NOT EXISTS events JSONB,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_delivery_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_delivery_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

UPDATE webhook_endpoints
SET
  is_active = COALESCE(is_active, true),
  events = COALESCE(events, '[]'::jsonb),
  created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
  updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE
  is_active IS NULL
  OR events IS NULL
  OR created_at IS NULL
  OR updated_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'webhook_endpoints_last_delivery_status_check'
  ) THEN
    ALTER TABLE webhook_endpoints
      ADD CONSTRAINT webhook_endpoints_last_delivery_status_check
      CHECK (
        last_delivery_status IS NULL
        OR last_delivery_status IN ('success', 'failed')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_user_active
  ON webhook_endpoints(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_events_gin
  ON webhook_endpoints USING gin(events);

-- ---------------------------------------------------------------------------
-- Webhook deliveries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  response_status INTEGER,
  response_body TEXT,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  processing_started_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE webhook_deliveries
  ADD COLUMN IF NOT EXISTS webhook_endpoint_id UUID REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS event_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payload JSONB,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS response_status INTEGER,
  ADD COLUMN IF NOT EXISTS response_body TEXT,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

UPDATE webhook_deliveries
SET
  status = COALESCE(status, 'pending'),
  attempts = COALESCE(attempts, 0),
  created_at = COALESCE(created_at, CURRENT_TIMESTAMP)
WHERE
  status IS NULL
  OR attempts IS NULL
  OR created_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'webhook_deliveries_status_check'
  ) THEN
    ALTER TABLE webhook_deliveries
      ADD CONSTRAINT webhook_deliveries_status_check
      CHECK (status IN ('pending', 'success', 'failed', 'retrying'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'webhook_deliveries_attempts_non_negative'
  ) THEN
    ALTER TABLE webhook_deliveries
      ADD CONSTRAINT webhook_deliveries_attempts_non_negative
      CHECK (attempts >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint_created
  ON webhook_deliveries(webhook_endpoint_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry_queue
  ON webhook_deliveries(status, next_retry_at)
  WHERE status = 'retrying';
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_processing
  ON webhook_deliveries(processing_started_at)
  WHERE status = 'retrying';
