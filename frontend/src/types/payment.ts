/**
 * Payment Types for Frontend
 * Type definitions for payment processing UI
 */

export type PaymentIntentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'canceled'
  | 'succeeded';

/**
 * Payment configuration from backend
 */
export interface PaymentConfig {
  stripe: {
    configured: boolean;
    publishableKey: string | null;
  };
}

/**
 * Create payment intent request
 */
export interface CreatePaymentIntentRequest {
  amount: number; // Amount in cents
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
  donationId?: string;
  receiptEmail?: string;
}

/**
 * Payment intent response
 */
export interface PaymentIntentResponse {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: PaymentIntentStatus;
  created: string;
}

/**
 * Customer creation request
 */
export interface CreateCustomerRequest {
  email: string;
  name?: string;
  phone?: string;
  contactId?: string;
}

/**
 * Customer response
 */
export interface CustomerResponse {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  created: string;
}

/**
 * Payment method info
 */
export interface PaymentMethodInfo {
  id: string;
  type: 'card' | 'bank_account' | 'ach_debit';
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

/**
 * Donation payment form data
 */
export interface DonationPaymentData {
  amount: number;
  currency: string;
  donorEmail: string;
  donorName?: string;
  donorPhone?: string;
  isRecurring: boolean;
  recurringFrequency?: 'monthly' | 'quarterly' | 'yearly';
  campaignName?: string;
  designation?: string;
  isAnonymous: boolean;
  notes?: string;
}

/**
 * Payment state for Redux
 */
export interface PaymentState {
  config: PaymentConfig | null;
  currentIntent: PaymentIntentResponse | null;
  isProcessing: boolean;
  error: string | null;
  paymentSuccess: boolean;
}
