/**
 * Payment Reconciliation Service
 * Handles reconciliation between Stripe transactions and internal donation records
 */
import Stripe from 'stripe';
import type { PaymentReconciliation, ReconciliationItem, PaymentDiscrepancy, ReconciliationSummary, CreateReconciliationRequest, MatchStatus } from '../types/reconciliation';
/**
 * Check if Stripe is configured
 */
export declare function isStripeConfigured(): boolean;
/**
 * Fetch Stripe balance transactions for a date range
 */
export declare function fetchStripeBalanceTransactions(startDate: Date, endDate: Date): Promise<Stripe.BalanceTransaction[]>;
/**
 * Create a new payment reconciliation
 */
export declare function createReconciliation(request: CreateReconciliationRequest, userId?: string): Promise<PaymentReconciliation>;
/**
 * Get reconciliation by ID with full details
 */
export declare function getReconciliationById(reconciliationId: string): Promise<any>;
/**
 * Get reconciliation items
 */
export declare function getReconciliationItems(reconciliationId: string, matchStatus?: MatchStatus): Promise<ReconciliationItem[]>;
/**
 * Get discrepancies for a reconciliation
 */
export declare function getDiscrepancies(reconciliationId: string): Promise<PaymentDiscrepancy[]>;
/**
 * Get reconciliation summary
 */
export declare function getReconciliationSummary(reconciliationId: string): Promise<ReconciliationSummary>;
/**
 * Manually match a Stripe transaction to a donation
 */
export declare function manualMatch(donationId: string, stripePaymentIntentId: string, userId?: string): Promise<void>;
/**
 * Resolve a discrepancy
 */
export declare function resolveDiscrepancy(discrepancyId: string, status: 'resolved' | 'closed' | 'ignored', resolutionNotes: string, userId?: string): Promise<void>;
//# sourceMappingURL=reconciliationService.d.ts.map