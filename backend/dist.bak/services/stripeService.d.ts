/**
 * Stripe Payment Service
 * Handles payment processing through Stripe
 */
import type { CreatePaymentIntentRequest, PaymentIntentResponse, RefundRequest, RefundResponse, CreateCustomerRequest, CustomerResponse, PaymentMethodInfo, WebhookEvent, CreateSubscriptionRequest, SubscriptionResponse } from '../types/payment';
/**
 * Check if Stripe is configured
 */
export declare function isStripeConfigured(): boolean;
/**
 * Create a payment intent for one-time payment
 */
export declare function createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntentResponse>;
/**
 * Retrieve payment intent status
 */
export declare function getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse>;
/**
 * Cancel a payment intent
 */
export declare function cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse>;
/**
 * Create a refund
 */
export declare function createRefund(request: RefundRequest): Promise<RefundResponse>;
/**
 * Create a Stripe customer
 */
export declare function createCustomer(request: CreateCustomerRequest): Promise<CustomerResponse>;
/**
 * Get customer by ID
 */
export declare function getCustomer(customerId: string): Promise<CustomerResponse>;
/**
 * List payment methods for a customer
 */
export declare function listPaymentMethods(customerId: string): Promise<PaymentMethodInfo[]>;
/**
 * Create a subscription for recurring donations
 */
export declare function createSubscription(request: CreateSubscriptionRequest): Promise<SubscriptionResponse>;
/**
 * Cancel a subscription
 */
export declare function cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<SubscriptionResponse>;
/**
 * Construct and verify webhook event
 */
export declare function constructWebhookEvent(payload: string | Buffer, signature: string): WebhookEvent;
declare const _default: {
    isStripeConfigured: typeof isStripeConfigured;
    createPaymentIntent: typeof createPaymentIntent;
    getPaymentIntent: typeof getPaymentIntent;
    cancelPaymentIntent: typeof cancelPaymentIntent;
    createRefund: typeof createRefund;
    createCustomer: typeof createCustomer;
    getCustomer: typeof getCustomer;
    listPaymentMethods: typeof listPaymentMethods;
    createSubscription: typeof createSubscription;
    cancelSubscription: typeof cancelSubscription;
    constructWebhookEvent: typeof constructWebhookEvent;
};
export default _default;
//# sourceMappingURL=stripeService.d.ts.map