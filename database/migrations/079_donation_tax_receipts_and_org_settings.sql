-- Migration 079: shared organization settings and CRA-style donation tax receipts

CREATE TABLE IF NOT EXISTS organization_settings (
  organization_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_organization_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_organization_settings_updated_at
      BEFORE UPDATE ON organization_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS tax_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  receipt_number VARCHAR(32) NOT NULL,
  sequence_year INTEGER NOT NULL,
  sequence_number INTEGER NOT NULL,
  kind VARCHAR(50) NOT NULL,
  payee_type VARCHAR(20) NOT NULL,
  payee_id UUID NOT NULL,
  payee_name VARCHAR(255) NOT NULL,
  payee_email VARCHAR(255),
  payee_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  delivery_mode VARCHAR(20) NOT NULL DEFAULT 'download',
  email_delivery_status VARCHAR(20) NOT NULL DEFAULT 'not_requested',
  email_sent_at TIMESTAMP WITH TIME ZONE,
  email_error TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_start DATE,
  period_end DATE,
  include_previously_receipted BOOLEAN NOT NULL DEFAULT false,
  is_official BOOLEAN NOT NULL DEFAULT true,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'CAD',
  snapshot JSONB NOT NULL,
  pdf_content BYTEA NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tax_receipts_kind_check CHECK (
    kind IN ('single_official', 'annual_official', 'annual_summary_reprint')
  ),
  CONSTRAINT tax_receipts_payee_type_check CHECK (
    payee_type IN ('contact', 'account')
  ),
  CONSTRAINT tax_receipts_delivery_mode_check CHECK (
    delivery_mode IN ('download', 'email', 'both')
  ),
  CONSTRAINT tax_receipts_email_delivery_status_check CHECK (
    email_delivery_status IN ('not_requested', 'pending', 'sent', 'failed')
  ),
  CONSTRAINT tax_receipts_period_range_check CHECK (
    period_start IS NULL OR period_end IS NULL OR period_start <= period_end
  ),
  CONSTRAINT tax_receipts_number_unique UNIQUE (organization_id, receipt_number),
  CONSTRAINT tax_receipts_sequence_unique UNIQUE (
    organization_id,
    sequence_year,
    sequence_number
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_tax_receipts_updated_at'
  ) THEN
    CREATE TRIGGER update_tax_receipts_updated_at
      BEFORE UPDATE ON tax_receipts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tax_receipts_org_created_at
  ON tax_receipts(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tax_receipts_payee_lookup
  ON tax_receipts(organization_id, payee_type, payee_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tax_receipt_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id UUID NOT NULL REFERENCES tax_receipts(id) ON DELETE CASCADE,
  donation_id UUID NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  donation_amount DECIMAL(15, 2) NOT NULL CHECK (donation_amount >= 0),
  donation_date DATE NOT NULL,
  official_coverage BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tax_receipt_items_unique UNIQUE (receipt_id, donation_id)
);

CREATE INDEX IF NOT EXISTS idx_tax_receipt_items_receipt
  ON tax_receipt_items(receipt_id, donation_id);

CREATE INDEX IF NOT EXISTS idx_tax_receipt_items_donation
  ON tax_receipt_items(donation_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_receipt_items_official_coverage
  ON tax_receipt_items(donation_id)
  WHERE official_coverage = true;
