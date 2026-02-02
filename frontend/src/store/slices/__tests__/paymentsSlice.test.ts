import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import paymentsReducer, {
  fetchPaymentConfig,
  createPaymentIntent,
  getPaymentIntent,
  cancelPaymentIntent,
  clearPaymentError,
  clearCurrentIntent,
  setPaymentSuccess,
  setProcessing,
} from '../paymentsSlice';
import api from '../../../services/api';

// Mock the API
vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockApi = api as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };

describe('paymentsSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = configureStore({
      reducer: { payments: paymentsReducer },
    });
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const state = store.getState().payments;
      expect(state.config).toBeNull();
      expect(state.currentIntent).toBeNull();
      expect(state.isProcessing).toBe(false);
      expect(state.error).toBeNull();
      expect(state.paymentSuccess).toBe(false);
    });
  });

  describe('Synchronous Actions', () => {
    it('clearPaymentError clears the error state', () => {
      // First set an error state manually
      store = configureStore({
        reducer: { payments: paymentsReducer },
        preloadedState: {
          payments: {
            config: null,
            currentIntent: null,
            isProcessing: false,
            error: 'Some error',
            paymentSuccess: false,
          },
        },
      });

      store.dispatch(clearPaymentError());
      expect(store.getState().payments.error).toBeNull();
    });

    it('clearCurrentIntent clears intent and payment success', () => {
      store = configureStore({
        reducer: { payments: paymentsReducer },
        preloadedState: {
          payments: {
            config: null,
            currentIntent: { id: 'pi_123', clientSecret: 'secret', amount: 1000, status: 'succeeded' },
            isProcessing: false,
            error: null,
            paymentSuccess: true,
          },
        },
      });

      store.dispatch(clearCurrentIntent());
      expect(store.getState().payments.currentIntent).toBeNull();
      expect(store.getState().payments.paymentSuccess).toBe(false);
    });

    it('setPaymentSuccess sets payment success flag', () => {
      store.dispatch(setPaymentSuccess(true));
      expect(store.getState().payments.paymentSuccess).toBe(true);

      store.dispatch(setPaymentSuccess(false));
      expect(store.getState().payments.paymentSuccess).toBe(false);
    });

    it('setProcessing sets processing flag', () => {
      store.dispatch(setProcessing(true));
      expect(store.getState().payments.isProcessing).toBe(true);

      store.dispatch(setProcessing(false));
      expect(store.getState().payments.isProcessing).toBe(false);
    });
  });

  describe('fetchPaymentConfig', () => {
    it('fetches payment config successfully', async () => {
      const mockConfig = {
        stripe: {
          configured: true,
          publishableKey: 'pk_test_123',
        },
      };
      mockApi.get.mockResolvedValue({ data: mockConfig });

      await store.dispatch(fetchPaymentConfig());

      expect(mockApi.get).toHaveBeenCalledWith('/payments/config');
      expect(store.getState().payments.config).toEqual(mockConfig);
      expect(store.getState().payments.error).toBeNull();
    });

    it('handles fetch config error', async () => {
      mockApi.get.mockRejectedValue(new Error('Network error'));

      await store.dispatch(fetchPaymentConfig());

      expect(store.getState().payments.config).toBeNull();
      expect(store.getState().payments.error).toBe('Network error');
    });
  });

  describe('createPaymentIntent', () => {
    it('creates payment intent successfully', async () => {
      const mockIntent = {
        id: 'pi_123',
        clientSecret: 'pi_123_secret',
        amount: 5000,
        status: 'requires_payment_method',
      };
      mockApi.post.mockResolvedValue({ data: mockIntent });

      const requestData = {
        amount: 5000,
        currency: 'usd',
        description: 'Donation',
      };

      await store.dispatch(createPaymentIntent(requestData));

      expect(mockApi.post).toHaveBeenCalledWith('/payments/intents', requestData);
      expect(store.getState().payments.currentIntent).toEqual(mockIntent);
      expect(store.getState().payments.isProcessing).toBe(false);
      expect(store.getState().payments.error).toBeNull();
    });

    it('sets isProcessing during intent creation', async () => {
      mockApi.post.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: { id: 'pi_123' } }), 100)
          )
      );

      const promise = store.dispatch(createPaymentIntent({ amount: 5000 }));
      expect(store.getState().payments.isProcessing).toBe(true);

      await promise;
      expect(store.getState().payments.isProcessing).toBe(false);
    });

    it('handles create intent error', async () => {
      mockApi.post.mockRejectedValue(new Error('Payment failed'));

      await store.dispatch(createPaymentIntent({ amount: 5000 }));

      expect(store.getState().payments.currentIntent).toBeNull();
      expect(store.getState().payments.error).toBe('Payment failed');
      expect(store.getState().payments.isProcessing).toBe(false);
    });

    it('clears previous error on new intent creation', async () => {
      store = configureStore({
        reducer: { payments: paymentsReducer },
        preloadedState: {
          payments: {
            config: null,
            currentIntent: null,
            isProcessing: false,
            error: 'Previous error',
            paymentSuccess: true,
          },
        },
      });

      mockApi.post.mockResolvedValue({ data: { id: 'pi_123' } });

      await store.dispatch(createPaymentIntent({ amount: 5000 }));

      expect(store.getState().payments.error).toBeNull();
      expect(store.getState().payments.paymentSuccess).toBe(false);
    });
  });

  describe('getPaymentIntent', () => {
    it('fetches payment intent successfully', async () => {
      const mockIntent = {
        id: 'pi_123',
        clientSecret: 'pi_123_secret',
        amount: 5000,
        status: 'succeeded',
      };
      mockApi.get.mockResolvedValue({ data: mockIntent });

      await store.dispatch(getPaymentIntent('pi_123'));

      expect(mockApi.get).toHaveBeenCalledWith('/payments/intents/pi_123');
      expect(store.getState().payments.currentIntent).toEqual(mockIntent);
    });

    it('sets paymentSuccess when intent status is succeeded', async () => {
      const mockIntent = {
        id: 'pi_123',
        status: 'succeeded',
      };
      mockApi.get.mockResolvedValue({ data: mockIntent });

      await store.dispatch(getPaymentIntent('pi_123'));

      expect(store.getState().payments.paymentSuccess).toBe(true);
    });

    it('does not set paymentSuccess for non-succeeded status', async () => {
      const mockIntent = {
        id: 'pi_123',
        status: 'requires_payment_method',
      };
      mockApi.get.mockResolvedValue({ data: mockIntent });

      await store.dispatch(getPaymentIntent('pi_123'));

      expect(store.getState().payments.paymentSuccess).toBe(false);
    });
  });

  describe('cancelPaymentIntent', () => {
    it('cancels payment intent successfully', async () => {
      const mockIntent = {
        id: 'pi_123',
        status: 'canceled',
      };
      mockApi.post.mockResolvedValue({ data: mockIntent });

      await store.dispatch(cancelPaymentIntent('pi_123'));

      expect(mockApi.post).toHaveBeenCalledWith('/payments/intents/pi_123/cancel');
      expect(store.getState().payments.currentIntent).toEqual(mockIntent);
    });

    it('handles cancel intent error', async () => {
      mockApi.post.mockRejectedValue(new Error('Cancel failed'));

      await store.dispatch(cancelPaymentIntent('pi_123'));

      // Error should be handled gracefully
      expect(store.getState().payments.currentIntent).toBeNull();
    });
  });

  describe('State Transitions', () => {
    it('handles full payment flow', async () => {
      // 1. Fetch config
      const mockConfig = { stripe: { configured: true, publishableKey: 'pk_test' } };
      mockApi.get.mockResolvedValueOnce({ data: mockConfig });

      await store.dispatch(fetchPaymentConfig());
      expect(store.getState().payments.config).toEqual(mockConfig);

      // 2. Create intent
      const mockIntent = { id: 'pi_123', clientSecret: 'secret', status: 'requires_payment_method' };
      mockApi.post.mockResolvedValueOnce({ data: mockIntent });

      await store.dispatch(createPaymentIntent({ amount: 5000 }));
      expect(store.getState().payments.currentIntent).toEqual(mockIntent);
      expect(store.getState().payments.paymentSuccess).toBe(false);

      // 3. Check intent status (succeeded)
      const succeededIntent = { ...mockIntent, status: 'succeeded' };
      mockApi.get.mockResolvedValueOnce({ data: succeededIntent });

      await store.dispatch(getPaymentIntent('pi_123'));
      expect(store.getState().payments.paymentSuccess).toBe(true);

      // 4. Clear state
      store.dispatch(clearCurrentIntent());
      expect(store.getState().payments.currentIntent).toBeNull();
      expect(store.getState().payments.paymentSuccess).toBe(false);
    });
  });
});
