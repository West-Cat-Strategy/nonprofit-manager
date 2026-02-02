-- Migration: Payment Reconciliation System
-- Created: 2026-02-01
-- Description: Add tables and columns for payment reconciliation with Stripe

-- ============================================================================
-- DONATIONS TABLE UPDATES - Add Stripe tracking columns
-- ============================================================================

-- Add Stripe-specific tracking columns if they don't exist
ALTER TABLE donations ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);
ALTER TABLE donations ADD COLUMN IF NOT EXISTS stripe_charge_id VARCHAR(255);
ALTER TABLE donations ADD COLUMN IF NOT EXISTS stripe_fee DECIMAL(10, 2);
ALTER TABLE donations ADD COLUMN IF NOT EXISTS net_amount DECIMAL(15, 2);
ALTER TABLE donations ADD COLUMN IF NOT EXISTS reconciliation_status VARCHAR(50) DEFAULT 'unreconciled';
ALTER TABLE donations ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES users(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_donations_stripe_payment_intent ON donations(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_donations_stripe_charge ON donations(stripe_charge_id);
CREATE INDEX IF NOT EXISTS idx_donations_reconciliation_status ON donations(reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_donations_payment_status ON donations(payment_status);

-- ============================================================================
-- CONTACTS TABLE UPDATES - Add Stripe customer tracking
-- ============================================================================

-- Add Stripe customer ID column if it doesn't exist
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Add index for Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_contacts_stripe_customer ON contacts(stripe_customer_id);

-- ============================================================================
-- PAYMENT_RECONCILIATIONS TABLE - Tracks reconciliation runs
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_reconciliations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reconciliation_number VARCHAR(50) UNIQUE NOT NULL,
    reconciliation_type VARCHAR(50) NOT NULL, -- 'manual', 'automatic', 'scheduled'
    status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed'
    start_date TIMESTAMP WITH TIME ZONE NOT NULL, -- Period being reconciled (start)
    end_date TIMESTAMP WITH TIME ZONE NOT NULL, -- Period being reconciled (end)

    -- Stripe data summary
    stripe_balance_amount DECIMAL(15, 2), -- Total from Stripe balance transactions
    stripe_charge_count INTEGER, -- Number of charges from Stripe
    stripe_refund_count INTEGER, -- Number of refunds from Stripe
    stripe_total_fees DECIMAL(15, 2), -- Total fees charged by Stripe

    -- Internal data summary
    donations_total_amount DECIMAL(15, 2), -- Total from donations table
    donations_count INTEGER, -- Number of donations in period

    -- Reconciliation results
    matched_count INTEGER DEFAULT 0, -- Number of successfully matched transactions
    unmatched_stripe_count INTEGER DEFAULT 0, -- Stripe transactions without donations
    unmatched_donations_count INTEGER DEFAULT 0, -- Donations without Stripe transactions
    discrepancy_count INTEGER DEFAULT 0, -- Number of discrepancies found

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- User tracking
    initiated_by UUID REFERENCES users(id),
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for filtering reconciliations
CREATE INDEX idx_reconciliations_status ON payment_reconciliations(status);
CREATE INDEX idx_reconciliations_dates ON payment_reconciliations(start_date, end_date);
CREATE INDEX idx_reconciliations_type ON payment_reconciliations(reconciliation_type);

-- ============================================================================
-- RECONCILIATION_ITEMS TABLE - Individual transaction matches
-- ============================================================================

CREATE TABLE IF NOT EXISTS reconciliation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reconciliation_id UUID NOT NULL REFERENCES payment_reconciliations(id) ON DELETE CASCADE,

    -- Donation link
    donation_id UUID REFERENCES donations(id) ON DELETE SET NULL,

    -- Stripe transaction details
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    stripe_balance_transaction_id VARCHAR(255),
    stripe_amount DECIMAL(15, 2), -- Amount in Stripe
    stripe_fee DECIMAL(10, 2), -- Fee charged by Stripe
    stripe_net DECIMAL(15, 2), -- Net amount after fees
    stripe_created_at TIMESTAMP WITH TIME ZONE,
    stripe_status VARCHAR(50), -- succeeded, failed, refunded, etc.

    -- Donation details
    donation_amount DECIMAL(15, 2),
    donation_date TIMESTAMP WITH TIME ZONE,
    donation_status VARCHAR(50),

    -- Matching status
    match_status VARCHAR(50) NOT NULL, -- 'matched', 'unmatched_stripe', 'unmatched_donation', 'amount_mismatch', 'date_mismatch'
    match_confidence VARCHAR(20), -- 'high', 'medium', 'low' (for fuzzy matching)

    -- Discrepancy tracking
    has_discrepancy BOOLEAN DEFAULT false,
    discrepancy_type VARCHAR(100), -- 'amount_mismatch', 'missing_donation', 'missing_stripe_transaction', 'duplicate', 'timing'
    discrepancy_amount DECIMAL(15, 2), -- Difference in amounts

    notes TEXT,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for reconciliation items
CREATE INDEX idx_reconciliation_items_reconciliation ON reconciliation_items(reconciliation_id);
CREATE INDEX idx_reconciliation_items_donation ON reconciliation_items(donation_id);
CREATE INDEX idx_reconciliation_items_stripe_payment_intent ON reconciliation_items(stripe_payment_intent_id);
CREATE INDEX idx_reconciliation_items_stripe_charge ON reconciliation_items(stripe_charge_id);
CREATE INDEX idx_reconciliation_items_match_status ON reconciliation_items(match_status);
CREATE INDEX idx_reconciliation_items_has_discrepancy ON reconciliation_items(has_discrepancy);

-- ============================================================================
-- PAYMENT_DISCREPANCIES TABLE - Identified issues requiring attention
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_discrepancies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reconciliation_id UUID REFERENCES payment_reconciliations(id) ON DELETE CASCADE,
    reconciliation_item_id UUID REFERENCES reconciliation_items(id) ON DELETE CASCADE,

    discrepancy_type VARCHAR(100) NOT NULL, -- 'amount_mismatch', 'missing_donation', 'missing_stripe_transaction', 'duplicate', 'timing', 'fee_mismatch'
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'

    -- Related records
    donation_id UUID REFERENCES donations(id) ON DELETE SET NULL,
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),

    -- Discrepancy details
    expected_amount DECIMAL(15, 2),
    actual_amount DECIMAL(15, 2),
    difference_amount DECIMAL(15, 2),

    description TEXT NOT NULL, -- Human-readable description of the issue

    -- Resolution tracking
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'closed', 'ignored'
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),

    -- Assignment
    assigned_to UUID REFERENCES users(id),
    due_date DATE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for discrepancies
CREATE INDEX idx_discrepancies_reconciliation ON payment_discrepancies(reconciliation_id);
CREATE INDEX idx_discrepancies_donation ON payment_discrepancies(donation_id);
CREATE INDEX idx_discrepancies_status ON payment_discrepancies(status);
CREATE INDEX idx_discrepancies_severity ON payment_discrepancies(severity);
CREATE INDEX idx_discrepancies_assigned_to ON payment_discrepancies(assigned_to);

-- ============================================================================
-- STRIPE_BALANCE_TRANSACTIONS TABLE - Cache Stripe balance transaction data
-- ============================================================================

CREATE TABLE IF NOT EXISTS stripe_balance_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_balance_transaction_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_source_id VARCHAR(255), -- payment_intent, charge, refund, etc.
    stripe_source_type VARCHAR(50), -- 'charge', 'refund', 'adjustment', 'payout'

    amount DECIMAL(15, 2) NOT NULL, -- Gross amount
    fee DECIMAL(10, 2), -- Stripe fee
    net DECIMAL(15, 2) NOT NULL, -- Net amount after fees
    currency VARCHAR(3) DEFAULT 'USD',

    status VARCHAR(50), -- 'available', 'pending'
    transaction_type VARCHAR(50), -- 'charge', 'refund', 'adjustment', 'payout'

    -- Metadata from Stripe
    stripe_description TEXT,
    stripe_metadata JSONB, -- Store full metadata as JSON

    -- Timing
    stripe_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    stripe_available_on DATE, -- When funds become available

    -- Reconciliation tracking
    reconciled BOOLEAN DEFAULT false,
    reconciliation_id UUID REFERENCES payment_reconciliations(id) ON DELETE SET NULL,
    donation_id UUID REFERENCES donations(id) ON DELETE SET NULL,

    -- Sync tracking
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Stripe balance transactions
CREATE INDEX idx_stripe_balance_tx_id ON stripe_balance_transactions(stripe_balance_transaction_id);
CREATE INDEX idx_stripe_balance_source ON stripe_balance_transactions(stripe_source_id);
CREATE INDEX idx_stripe_balance_created ON stripe_balance_transactions(stripe_created_at);
CREATE INDEX idx_stripe_balance_reconciled ON stripe_balance_transactions(reconciled);
CREATE INDEX idx_stripe_balance_type ON stripe_balance_transactions(transaction_type);

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE payment_reconciliations IS 'Tracks payment reconciliation runs between internal donations and Stripe transactions';
COMMENT ON TABLE reconciliation_items IS 'Individual transaction matching records for each reconciliation run';
COMMENT ON TABLE payment_discrepancies IS 'Issues and discrepancies identified during reconciliation that require investigation';
COMMENT ON TABLE stripe_balance_transactions IS 'Cached Stripe balance transaction data for reconciliation matching';

COMMENT ON COLUMN donations.stripe_payment_intent_id IS 'Stripe payment intent ID (pi_xxx)';
COMMENT ON COLUMN donations.stripe_charge_id IS 'Stripe charge ID (ch_xxx)';
COMMENT ON COLUMN donations.stripe_fee IS 'Fee charged by Stripe for this transaction';
COMMENT ON COLUMN donations.net_amount IS 'Net amount received after fees';
COMMENT ON COLUMN donations.reconciliation_status IS 'Reconciliation status: unreconciled, matched, discrepancy, manual_review';
COMMENT ON COLUMN donations.reconciled_at IS 'When this donation was reconciled';

COMMENT ON COLUMN reconciliation_items.match_confidence IS 'Confidence level for fuzzy matching: high (exact match), medium (likely match), low (possible match)';
COMMENT ON COLUMN payment_discrepancies.severity IS 'Severity level: low (informational), medium (requires review), high (urgent), critical (blocking)';
