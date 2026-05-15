-- Migration 131: donation batch review controls
-- Adds a narrow donation batch object for control-total review, restricted-fund
-- summaries, exception preview snapshots, and audit events. Posting here marks
-- review state only; it does not create GL entries.

CREATE TABLE IF NOT EXISTS donation_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  expected_count INTEGER NOT NULL DEFAULT 0,
  expected_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'CAD',
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  notes TEXT,
  closed_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  posted_at TIMESTAMP WITH TIME ZONE,
  reopened_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT donation_batches_status_check CHECK (
    status IN ('open', 'under_review', 'approved', 'posted')
  ),
  CONSTRAINT donation_batches_date_window_check CHECK (date_from <= date_to),
  CONSTRAINT donation_batches_expected_count_check CHECK (expected_count >= 0),
  CONSTRAINT donation_batches_expected_amount_check CHECK (expected_amount >= 0),
  CONSTRAINT donation_batches_name_not_blank CHECK (btrim(name) <> '')
);

CREATE INDEX IF NOT EXISTS idx_donation_batches_org_status
  ON donation_batches(organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_donation_batches_org_dates
  ON donation_batches(organization_id, date_from, date_to);

CREATE TABLE IF NOT EXISTS donation_batch_items (
  batch_id UUID NOT NULL REFERENCES donation_batches(id) ON DELETE CASCADE,
  donation_id UUID NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  amount_snapshot DECIMAL(15, 2) NOT NULL,
  currency_snapshot VARCHAR(3) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (batch_id, donation_id)
);

CREATE INDEX IF NOT EXISTS idx_donation_batch_items_donation
  ON donation_batch_items(donation_id);

CREATE TABLE IF NOT EXISTS donation_batch_audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES donation_batches(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  event_type VARCHAR(40) NOT NULL,
  from_status VARCHAR(30),
  to_status VARCHAR(30) NOT NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT donation_batch_audit_event_type_check CHECK (
    event_type IN ('created', 'closed_for_review', 'reopened', 'approved', 'posted')
  ),
  CONSTRAINT donation_batch_audit_status_check CHECK (
    (from_status IS NULL OR from_status IN ('open', 'under_review', 'approved', 'posted'))
    AND to_status IN ('open', 'under_review', 'approved', 'posted')
  )
);

CREATE INDEX IF NOT EXISTS idx_donation_batch_audit_events_batch
  ON donation_batch_audit_events(batch_id, created_at ASC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_donation_batches_updated_at'
  ) THEN
    CREATE TRIGGER update_donation_batches_updated_at
      BEFORE UPDATE ON donation_batches
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE donation_batches IS
  'Donation control-total review batches. Posted status records approval only and does not write GL entries.';
COMMENT ON TABLE donation_batch_items IS
  'Snapshot membership for donation batches once closed for review.';
COMMENT ON TABLE donation_batch_audit_events IS
  'Audit trail for donation batch review, approval, reopen, and post-state transitions.';
