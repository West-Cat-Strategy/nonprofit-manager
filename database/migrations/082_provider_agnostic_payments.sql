-- Migration 082: provider-agnostic donation payments

-- ---------------------------------------------------------------------------
-- Donations
-- ---------------------------------------------------------------------------

ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(20),
  ADD COLUMN IF NOT EXISTS provider_transaction_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS provider_checkout_session_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS provider_subscription_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS provider_customer_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_donations_payment_provider
  ON donations(payment_provider);

CREATE INDEX IF NOT EXISTS idx_donations_provider_transaction
  ON donations(provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_donations_provider_checkout_session
  ON donations(provider_checkout_session_id)
  WHERE provider_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_donations_provider_subscription
  ON donations(provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_donations_provider_customer
  ON donations(provider_customer_id)
  WHERE provider_customer_id IS NOT NULL;

UPDATE donations
SET
  payment_provider = COALESCE(payment_provider, CASE
    WHEN stripe_subscription_id IS NOT NULL
      OR stripe_invoice_id IS NOT NULL
      OR stripe_payment_intent_id IS NOT NULL
      OR stripe_charge_id IS NOT NULL
      THEN 'stripe'
    ELSE payment_provider
  END),
  provider_transaction_id = COALESCE(provider_transaction_id, transaction_id, stripe_payment_intent_id, stripe_charge_id, stripe_invoice_id),
  provider_checkout_session_id = COALESCE(provider_checkout_session_id, stripe_payment_intent_id, stripe_invoice_id),
  provider_subscription_id = COALESCE(provider_subscription_id, stripe_subscription_id),
  provider_customer_id = COALESCE(provider_customer_id, (
    SELECT c.stripe_customer_id
    FROM contacts c
    WHERE c.id = donations.contact_id
    LIMIT 1
  ))
WHERE
  payment_provider IS NULL
  OR provider_transaction_id IS NULL
  OR provider_checkout_session_id IS NULL
  OR provider_subscription_id IS NULL
  OR provider_customer_id IS NULL;

-- ---------------------------------------------------------------------------
-- Recurring donation plans
-- ---------------------------------------------------------------------------

ALTER TABLE recurring_donation_plans
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(20),
  ADD COLUMN IF NOT EXISTS provider_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS provider_subscription_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS provider_checkout_session_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS provider_checkout_url TEXT;

CREATE INDEX IF NOT EXISTS idx_recurring_donation_plans_payment_provider
  ON recurring_donation_plans(payment_provider);

CREATE UNIQUE INDEX IF NOT EXISTS idx_recurring_donation_plans_provider_subscription
  ON recurring_donation_plans(provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_recurring_donation_plans_provider_checkout_session
  ON recurring_donation_plans(provider_checkout_session_id)
  WHERE provider_checkout_session_id IS NOT NULL;

UPDATE recurring_donation_plans
SET
  payment_provider = COALESCE(payment_provider, CASE
    WHEN stripe_subscription_id IS NOT NULL
      OR stripe_checkout_session_id IS NOT NULL
      OR stripe_customer_id IS NOT NULL
      THEN 'stripe'
    ELSE payment_provider
  END),
  provider_customer_id = COALESCE(provider_customer_id, stripe_customer_id),
  provider_subscription_id = COALESCE(provider_subscription_id, stripe_subscription_id),
  provider_checkout_session_id = COALESCE(provider_checkout_session_id, stripe_checkout_session_id)
WHERE
  payment_provider IS NULL
  OR provider_customer_id IS NULL
  OR provider_subscription_id IS NULL
  OR provider_checkout_session_id IS NULL;

-- ---------------------------------------------------------------------------
-- Reconciliation surfaces
-- ---------------------------------------------------------------------------

ALTER TABLE reconciliation_items
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(20),
  ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS provider_charge_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS provider_balance_transaction_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS provider_created_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS provider_status VARCHAR(50);

ALTER TABLE payment_discrepancies
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(20),
  ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS provider_charge_id VARCHAR(255);

ALTER TABLE stripe_balance_transactions
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(20),
  ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(255);

UPDATE reconciliation_items
SET
  payment_provider = COALESCE(payment_provider, 'stripe'),
  provider_payment_id = COALESCE(provider_payment_id, stripe_payment_intent_id),
  provider_charge_id = COALESCE(provider_charge_id, stripe_charge_id),
  provider_balance_transaction_id = COALESCE(provider_balance_transaction_id, stripe_balance_transaction_id),
  provider_created_at = COALESCE(provider_created_at, stripe_created_at),
  provider_status = COALESCE(provider_status, stripe_status)
WHERE
  payment_provider IS NULL
  OR provider_payment_id IS NULL
  OR provider_charge_id IS NULL
  OR provider_balance_transaction_id IS NULL
  OR provider_created_at IS NULL
  OR provider_status IS NULL;

UPDATE payment_discrepancies
SET
  payment_provider = COALESCE(payment_provider, 'stripe'),
  provider_payment_id = COALESCE(provider_payment_id, stripe_payment_intent_id),
  provider_charge_id = COALESCE(provider_charge_id, stripe_charge_id)
WHERE
  payment_provider IS NULL
  OR provider_payment_id IS NULL
  OR provider_charge_id IS NULL;

UPDATE stripe_balance_transactions
SET
  payment_provider = COALESCE(payment_provider, 'stripe'),
  provider_payment_id = COALESCE(provider_payment_id, stripe_source_id)
WHERE
  payment_provider IS NULL
  OR provider_payment_id IS NULL;
