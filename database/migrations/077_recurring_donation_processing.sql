-- Migration 077: recurring monthly donation processing

CREATE TABLE IF NOT EXISTS recurring_donation_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  site_id UUID REFERENCES published_sites(id) ON DELETE SET NULL,
  form_key VARCHAR(255),
  donor_email VARCHAR(255) NOT NULL,
  donor_name VARCHAR(255),
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  interval VARCHAR(20) NOT NULL DEFAULT 'monthly',
  campaign_name VARCHAR(255),
  designation VARCHAR(255),
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'checkout_pending',
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  stripe_product_id VARCHAR(255),
  stripe_checkout_session_id VARCHAR(255),
  checkout_completed_at TIMESTAMP WITH TIME ZONE,
  last_paid_at TIMESTAMP WITH TIME ZONE,
  next_billing_at TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMP WITH TIME ZONE,
  public_management_token_hash VARCHAR(64),
  public_management_token_issued_at TIMESTAMP WITH TIME ZONE,
  source_page_path TEXT,
  source_visitor_id VARCHAR(255),
  source_session_id VARCHAR(255),
  source_referrer TEXT,
  source_user_agent TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'recurring_donation_plans_interval_check'
  ) THEN
    ALTER TABLE recurring_donation_plans
      ADD CONSTRAINT recurring_donation_plans_interval_check
      CHECK (interval = 'monthly');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_recurring_donation_plans_org_status
  ON recurring_donation_plans(organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recurring_donation_plans_contact
  ON recurring_donation_plans(contact_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recurring_donation_plans_site
  ON recurring_donation_plans(site_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_recurring_donation_plans_subscription
  ON recurring_donation_plans(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_recurring_donation_plans_checkout_session
  ON recurring_donation_plans(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_recurring_donation_plans_management_token
  ON recurring_donation_plans(public_management_token_hash)
  WHERE public_management_token_hash IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_recurring_donation_plans_updated_at'
  ) THEN
    CREATE TRIGGER update_recurring_donation_plans_updated_at
      BEFORE UPDATE ON recurring_donation_plans
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS recurring_plan_id UUID REFERENCES recurring_donation_plans(id) ON DELETE SET NULL;

ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS stripe_invoice_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_donations_recurring_plan
  ON donations(recurring_plan_id, donation_date DESC);

CREATE INDEX IF NOT EXISTS idx_donations_stripe_subscription
  ON donations(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_stripe_invoice
  ON donations(stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;
