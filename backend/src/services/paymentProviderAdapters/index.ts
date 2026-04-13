import type { PaymentProvider } from '@app-types/payment';
import { createPaypalPaymentProviderAdapter } from './paypalPaymentProviderAdapter';
import { createSquarePaymentProviderAdapter } from './squarePaymentProviderAdapter';
import { createStripePaymentProviderAdapter } from './stripePaymentProviderAdapter';
import type { PaymentProviderAdapter, PaymentProviderAdapters } from './types';

export { createPaypalPaymentProviderAdapter } from './paypalPaymentProviderAdapter';
export { createSquarePaymentProviderAdapter } from './squarePaymentProviderAdapter';
export { createStripePaymentProviderAdapter } from './stripePaymentProviderAdapter';
export { resolveSafePaymentProviderHostname } from './shared';
export type { PaymentProviderAdapter, PaymentProviderAdapters } from './types';

const PAYMENT_PROVIDERS: PaymentProvider[] = ['stripe', 'paypal', 'square'];

export const paymentProviderOrder = PAYMENT_PROVIDERS;

export const createPaymentProviderAdapters = (): PaymentProviderAdapters => ({
  stripe: createStripePaymentProviderAdapter(),
  paypal: createPaypalPaymentProviderAdapter(),
  square: createSquarePaymentProviderAdapter(),
});

export const getConfiguredPaymentProviders = (
  adapters: PaymentProviderAdapters
): Array<PaymentProviderAdapter> =>
  paymentProviderOrder.map((provider) => adapters[provider]);
