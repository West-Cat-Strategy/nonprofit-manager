export type ReconciliationType = 'manual' | 'automatic' | 'scheduled';
export type ReconciliationStatus = 'in_progress' | 'completed' | 'failed';
export type MatchStatus = 'matched' | 'unmatched_stripe' | 'unmatched_donation' | 'amount_mismatch' | 'date_mismatch';
export type MatchConfidence = 'high' | 'medium' | 'low';
export type DiscrepancyType = 'amount_mismatch' | 'missing_donation' | 'missing_stripe_transaction' | 'duplicate' | 'timing' | 'fee_mismatch';
export type DiscrepancySeverity = 'low' | 'medium' | 'high' | 'critical';
export type DiscrepancyStatus = 'open' | 'investigating' | 'resolved' | 'closed' | 'ignored';
export type ReconciliationDonationStatus = 'unreconciled' | 'matched' | 'discrepancy' | 'manual_review';
/**
 * Payment Reconciliation Record
 * Represents a reconciliation run between internal donations and Stripe transactions
 */
export interface PaymentReconciliation {
    id: string;
    reconciliation_number: string;
    reconciliation_type: ReconciliationType;
    status: ReconciliationStatus;
    start_date: Date | string;
    end_date: Date | string;
    stripe_balance_amount?: number | null;
    stripe_charge_count?: number | null;
    stripe_refund_count?: number | null;
    stripe_total_fees?: number | null;
    donations_total_amount?: number | null;
    donations_count?: number | null;
    matched_count: number;
    unmatched_stripe_count: number;
    unmatched_donations_count: number;
    discrepancy_count: number;
    started_at: Date | string;
    completed_at?: Date | string | null;
    initiated_by?: string | null;
    notes?: string | null;
    created_at: Date | string;
    updated_at: Date | string;
}
/**
 * Reconciliation Item
 * Represents a single transaction match or mismatch
 */
export interface ReconciliationItem {
    id: string;
    reconciliation_id: string;
    donation_id?: string | null;
    stripe_payment_intent_id?: string | null;
    stripe_charge_id?: string | null;
    stripe_balance_transaction_id?: string | null;
    stripe_amount?: number | null;
    stripe_fee?: number | null;
    stripe_net?: number | null;
    stripe_created_at?: Date | string | null;
    stripe_status?: string | null;
    donation_amount?: number | null;
    donation_date?: Date | string | null;
    donation_status?: string | null;
    match_status: MatchStatus;
    match_confidence?: MatchConfidence | null;
    has_discrepancy: boolean;
    discrepancy_type?: DiscrepancyType | null;
    discrepancy_amount?: number | null;
    notes?: string | null;
    resolved: boolean;
    resolved_at?: Date | string | null;
    resolved_by?: string | null;
    created_at: Date | string;
    updated_at: Date | string;
}
/**
 * Payment Discrepancy
 * Represents an identified issue requiring attention
 */
export interface PaymentDiscrepancy {
    id: string;
    reconciliation_id?: string | null;
    reconciliation_item_id?: string | null;
    discrepancy_type: DiscrepancyType;
    severity: DiscrepancySeverity;
    donation_id?: string | null;
    stripe_payment_intent_id?: string | null;
    stripe_charge_id?: string | null;
    expected_amount?: number | null;
    actual_amount?: number | null;
    difference_amount?: number | null;
    description: string;
    status: DiscrepancyStatus;
    resolution_notes?: string | null;
    resolved_at?: Date | string | null;
    resolved_by?: string | null;
    assigned_to?: string | null;
    due_date?: Date | string | null;
    created_at: Date | string;
    updated_at: Date | string;
}
/**
 * Stripe Balance Transaction
 * Cached Stripe balance transaction data
 */
export interface StripeBalanceTransaction {
    id: string;
    stripe_balance_transaction_id: string;
    stripe_source_id?: string | null;
    stripe_source_type?: string | null;
    amount: number;
    fee?: number | null;
    net: number;
    currency: string;
    status?: string | null;
    transaction_type?: string | null;
    stripe_description?: string | null;
    stripe_metadata?: Record<string, any> | null;
    stripe_created_at: Date | string;
    stripe_available_on?: Date | string | null;
    reconciled: boolean;
    reconciliation_id?: string | null;
    donation_id?: string | null;
    synced_at: Date | string;
    created_at: Date | string;
    updated_at: Date | string;
}
/**
 * Extended Donation type with reconciliation fields
 */
export interface DonationWithReconciliation {
    id: string;
    donation_number?: string;
    account_id?: string;
    contact_id?: string;
    amount: number;
    currency: string;
    donation_date: Date | string;
    payment_method?: string;
    payment_status: string;
    transaction_id?: string;
    campaign_name?: string;
    designation?: string;
    is_recurring: boolean;
    recurring_frequency?: string;
    notes?: string;
    receipt_sent: boolean;
    receipt_sent_date?: Date | string | null;
    stripe_payment_intent_id?: string | null;
    stripe_charge_id?: string | null;
    stripe_fee?: number | null;
    net_amount?: number | null;
    reconciliation_status: ReconciliationDonationStatus;
    reconciled_at?: Date | string | null;
    reconciled_by?: string | null;
    created_at: Date | string;
    updated_at: Date | string;
    created_by?: string;
    modified_by?: string;
}
/**
 * Reconciliation Summary
 * Aggregated statistics for a reconciliation period
 */
export interface ReconciliationSummary {
    total_donations: number;
    total_donation_amount: number;
    total_stripe_charges: number;
    total_stripe_amount: number;
    total_stripe_fees: number;
    total_net_amount: number;
    matched_transactions: number;
    unmatched_donations: number;
    unmatched_stripe: number;
    discrepancies: number;
    open_discrepancies: number;
    resolved_discrepancies: number;
}
/**
 * Reconciliation Request
 * Input for creating a new reconciliation
 */
export interface CreateReconciliationRequest {
    reconciliation_type: ReconciliationType;
    start_date: Date | string;
    end_date: Date | string;
    notes?: string;
}
/**
 * Reconciliation Filter
 * Query parameters for filtering reconciliations
 */
export interface ReconciliationFilter {
    status?: ReconciliationStatus;
    reconciliation_type?: ReconciliationType;
    start_date?: Date | string;
    end_date?: Date | string;
    initiated_by?: string;
    page?: number;
    limit?: number;
}
/**
 * Discrepancy Filter
 * Query parameters for filtering discrepancies
 */
export interface DiscrepancyFilter {
    status?: DiscrepancyStatus;
    severity?: DiscrepancySeverity;
    discrepancy_type?: DiscrepancyType;
    assigned_to?: string;
    reconciliation_id?: string;
    donation_id?: string;
    page?: number;
    limit?: number;
}
/**
 * Match Transaction Request
 * Manual matching of a Stripe transaction to a donation
 */
export interface MatchTransactionRequest {
    donation_id: string;
    stripe_payment_intent_id?: string;
    stripe_charge_id?: string;
    notes?: string;
}
/**
 * Resolve Discrepancy Request
 * Mark a discrepancy as resolved
 */
export interface ResolveDiscrepancyRequest {
    resolution_notes: string;
    status: 'resolved' | 'closed' | 'ignored';
}
/**
 * Reconciliation Report
 * Detailed report of a reconciliation run
 */
export interface ReconciliationReport {
    reconciliation: PaymentReconciliation;
    summary: ReconciliationSummary;
    matched_items: ReconciliationItem[];
    unmatched_donations: ReconciliationItem[];
    unmatched_stripe: ReconciliationItem[];
    discrepancies: PaymentDiscrepancy[];
}
//# sourceMappingURL=reconciliation.d.ts.map