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

export type PaymentProvider = 'stripe' | 'paypal' | 'square';

export interface PaymentProviderConfig {
  configured: boolean;
  publicKey?: string | null;
  clientId?: string | null;
  applicationId?: string | null;
  locationId?: string | null;
  webhookConfigured?: boolean;
}

/**
 * Payment configuration from backend
 */
export interface PaymentConfig {
  defaultProvider: PaymentProvider;
  enabledProviders: PaymentProvider[];
  providers: Record<PaymentProvider, PaymentProviderConfig>;
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
  provider?: PaymentProvider;
}

/**
 * Payment intent response
 */
export interface PaymentIntentResponse {
  id: string;
  provider: PaymentProvider;
  clientSecret: string | null;
  checkoutUrl?: string | null;
  amount: number;
  currency: string;
  status: PaymentIntentStatus;
  created: string;
  providerTransactionId?: string | null;
  providerCheckoutSessionId?: string | null;
  providerSubscriptionId?: string | null;
}

/**
 * Customer creation request
 */
export interface CreateCustomerRequest {
  email: string;
  name?: string;
  phone?: string;
  contactId?: string;
  provider?: PaymentProvider;
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
  paymentProvider: PaymentProvider;
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
