/**
 * Payment Types
 * Type definitions for payment processing
 */

export type PaymentProvider = 'stripe' | 'paypal';
export type PaymentIntentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'canceled'
  | 'succeeded';

export type WebhookEventType =
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'payment_intent.canceled'
  | 'charge.refunded'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'invoice.payment_failed';

/**
 * Create payment intent request
 */
export interface CreatePaymentIntentRequest {
  amount: number; // Amount in cents
  currency?: string; // Default: 'usd'
  description?: string;
  metadata?: Record<string, string>;
  donationId?: string; // Link to donation record
  customerId?: string; // Stripe customer ID
  receiptEmail?: string;
  statementDescriptor?: string;
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
  created: Date;
}

/**
 * Confirm payment request
 */
export interface ConfirmPaymentRequest {
  paymentIntentId: string;
  paymentMethodId?: string;
}

/**
 * Refund request
 */
export interface RefundRequest {
  paymentIntentId: string;
  amount?: number; // Partial refund amount in cents, omit for full refund
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}

/**
 * Refund response
 */
export interface RefundResponse {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  paymentIntentId: string;
  reason?: string;
  created: Date;
}

/**
 * Customer creation request
 */
export interface CreateCustomerRequest {
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
  contactId?: string; // Link to contact record
}

/**
 * Customer response
 */
export interface CustomerResponse {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  created: Date;
}

/**
 * Payment method
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
  bankAccount?: {
    bankName: string;
    last4: string;
    accountType: 'checking' | 'savings';
  };
}

/**
 * Webhook event
 */
export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  data: {
    object: Record<string, unknown>;
  };
  created: Date;
  livemode: boolean;
}

/**
 * Payment record for database
 */
export interface PaymentRecord {
  id: string;
  provider: PaymentProvider;
  providerPaymentId: string;
  amount: number;
  currency: string;
  status: PaymentIntentStatus;
  donationId?: string;
  contactId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subscription status
 */
export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'paused';

/**
 * Create subscription request
 */
export interface CreateSubscriptionRequest {
  customerId: string;
  priceId: string;
  paymentMethodId?: string;
  metadata?: Record<string, string>;
}

/**
 * Subscription response
 */
export interface SubscriptionResponse {
  id: string;
  customerId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  created: Date;
}
