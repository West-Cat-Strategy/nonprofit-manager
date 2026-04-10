-- Migration 088: provider-agnostic donation payment columns
-- Created: 2026-04-10
-- Description: Adds the provider-agnostic payment columns required by donation creation and recurring donation flows.

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
