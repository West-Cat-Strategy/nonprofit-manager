// Payment Reconciliation Types (Frontend)
// Defines types for payment reconciliation system

export type ReconciliationType = 'manual' | 'automatic' | 'scheduled';
export type ReconciliationStatus = 'in_progress' | 'completed' | 'failed';
export type MatchStatus =
  | 'matched'
  | 'unmatched_stripe'
  | 'unmatched_donation'
  | 'amount_mismatch'
  | 'date_mismatch';
export type MatchConfidence = 'high' | 'medium' | 'low';
export type DiscrepancyType =
  | 'amount_mismatch'
  | 'missing_donation'
  | 'missing_stripe_transaction'
  | 'duplicate'
  | 'timing'
  | 'fee_mismatch';
export type DiscrepancySeverity = 'low' | 'medium' | 'high' | 'critical';
export type DiscrepancyStatus = 'open' | 'investigating' | 'resolved' | 'closed' | 'ignored';
export type ReconciliationDonationStatus = 'unreconciled' | 'matched' | 'discrepancy' | 'manual_review';

/**
 * Payment Reconciliation Record
 */
export interface PaymentReconciliation {
  id: string;
  reconciliation_number: string;
  reconciliation_type: ReconciliationType;
  status: ReconciliationStatus;
  start_date: string;
  end_date: string;

  // Stripe data summary
  stripe_balance_amount?: number | null;
  stripe_charge_count?: number | null;
  stripe_refund_count?: number | null;
  stripe_total_fees?: number | null;

  // Internal data summary
  donations_total_amount?: number | null;
  donations_count?: number | null;

  // Reconciliation results
  matched_count: number;
  unmatched_stripe_count: number;
  unmatched_donations_count: number;
  discrepancy_count: number;

  // Timing
  started_at: string;
  completed_at?: string | null;

  // User tracking
  initiated_by?: string | null;
  notes?: string | null;

  created_at: string;
  updated_at: string;
}

/**
 * Reconciliation Item
 */
export interface ReconciliationItem {
  id: string;
  reconciliation_id: string;

  // Donation link
  donation_id?: string | null;

  // Stripe transaction details
  stripe_payment_intent_id?: string | null;
  stripe_charge_id?: string | null;
  stripe_balance_transaction_id?: string | null;
  stripe_amount?: number | null;
  stripe_fee?: number | null;
  stripe_net?: number | null;
  stripe_created_at?: string | null;
  stripe_status?: string | null;

  // Donation details
  donation_amount?: number | null;
  donation_date?: string | null;
  donation_status?: string | null;

  // Matching status
  match_status: MatchStatus;
  match_confidence?: MatchConfidence | null;

  // Discrepancy tracking
  has_discrepancy: boolean;
  discrepancy_type?: DiscrepancyType | null;
  discrepancy_amount?: number | null;

  notes?: string | null;
  resolved: boolean;
  resolved_at?: string | null;
  resolved_by?: string | null;

  created_at: string;
  updated_at: string;
}

/**
 * Payment Discrepancy
 */
export interface PaymentDiscrepancy {
  id: string;
  reconciliation_id?: string | null;
  reconciliation_item_id?: string | null;

  discrepancy_type: DiscrepancyType;
  severity: DiscrepancySeverity;

  // Related records
  donation_id?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_charge_id?: string | null;

  // Discrepancy details
  expected_amount?: number | null;
  actual_amount?: number | null;
  difference_amount?: number | null;

  description: string;

  // Resolution tracking
  status: DiscrepancyStatus;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;

  // Assignment
  assigned_to?: string | null;
  due_date?: string | null;

  created_at: string;
  updated_at: string;
}

/**
 * Reconciliation Summary
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
 * Reconciliation Dashboard Stats
 */
export interface ReconciliationDashboardStats {
  total_reconciliations: number;
  completed_reconciliations: number;
  in_progress_reconciliations: number;
  total_matched: number;
  total_discrepancies: number;
  total_open_discrepancies: number;
  critical_discrepancies: number;
  high_discrepancies: number;
  unreconciled_donations: number;
}

/**
 * Create Reconciliation Request
 */
export interface CreateReconciliationRequest {
  reconciliation_type: ReconciliationType;
  start_date: string;
  end_date: string;
  notes?: string;
}

/**
 * Match Transaction Request
 */
export interface MatchTransactionRequest {
  donation_id: string;
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  notes?: string;
}

/**
 * Resolve Discrepancy Request
 */
export interface ResolveDiscrepancyRequest {
  resolution_notes: string;
  status: 'resolved' | 'closed' | 'ignored';
}

/**
 * Assign Discrepancy Request
 */
export interface AssignDiscrepancyRequest {
  assigned_to: string;
  due_date?: string;
}

/**
 * Reconciliation Detail (with summary)
 */
export interface ReconciliationDetail {
  reconciliation: PaymentReconciliation;
  summary: ReconciliationSummary;
}

/**
 * Pagination response
 */
export interface PaginatedResponse<T> {
  items?: T[];
  reconciliations?: PaymentReconciliation[];
  discrepancies?: PaymentDiscrepancy[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}
