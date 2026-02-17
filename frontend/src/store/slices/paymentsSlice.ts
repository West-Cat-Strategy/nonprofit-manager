/**
 * Payments Slice
 * Redux state management for payment processing
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { formatApiErrorMessageWith } from '../../utils/apiError';
import type {
  PaymentState,
  PaymentConfig,
  PaymentIntentResponse,
  CreatePaymentIntentRequest,
} from '../../types/payment';

const getErrorMessage = (error: unknown, fallbackMessage: string) => formatApiErrorMessageWith(fallbackMessage)(error);

const initialState: PaymentState = {
  config: null,
  currentIntent: null,
  isProcessing: false,
  error: null,
  paymentSuccess: false,
};

/**
 * Fetch payment configuration
 */
export const fetchPaymentConfig = createAsyncThunk<PaymentConfig>(
  'payments/fetchConfig',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/payments/config');
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error, 'Network error');
      return rejectWithValue(message);
    }
  }
);

/**
 * Create a payment intent
 */
export const createPaymentIntent = createAsyncThunk<
  PaymentIntentResponse,
  CreatePaymentIntentRequest
>(
  'payments/createIntent',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/payments/intents', data);
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error, 'Payment failed');
      return rejectWithValue(message);
    }
  }
);

/**
 * Get payment intent status
 */
export const getPaymentIntent = createAsyncThunk<PaymentIntentResponse, string>(
  'payments/getIntent',
  async (intentId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/payments/intents/${intentId}`);
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error, 'Payment failed');
      return rejectWithValue(message);
    }
  }
);

/**
 * Cancel a payment intent
 */
export const cancelPaymentIntent = createAsyncThunk<PaymentIntentResponse, string>(
  'payments/cancelIntent',
  async (intentId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/payments/intents/${intentId}/cancel`);
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error, 'Payment failed');
      return rejectWithValue(message);
    }
  }
);

const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    clearPaymentError: (state) => {
      state.error = null;
    },
    clearCurrentIntent: (state) => {
      state.currentIntent = null;
      state.paymentSuccess = false;
    },
    setPaymentSuccess: (state, action: PayloadAction<boolean>) => {
      state.paymentSuccess = action.payload;
    },
    setProcessing: (state, action: PayloadAction<boolean>) => {
      state.isProcessing = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch config
    builder
      .addCase(fetchPaymentConfig.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchPaymentConfig.fulfilled, (state, action) => {
        state.config = action.payload;
      })
      .addCase(fetchPaymentConfig.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Create intent
    builder
      .addCase(createPaymentIntent.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
        state.paymentSuccess = false;
      })
      .addCase(createPaymentIntent.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.currentIntent = action.payload;
      })
      .addCase(createPaymentIntent.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload as string;
      });

    // Get intent
    builder
      .addCase(getPaymentIntent.fulfilled, (state, action) => {
        state.currentIntent = action.payload;
        if (action.payload.status === 'succeeded') {
          state.paymentSuccess = true;
        }
      });

    // Cancel intent
    builder
      .addCase(cancelPaymentIntent.fulfilled, (state, action) => {
        state.currentIntent = action.payload;
      });
  },
});

export const {
  clearPaymentError,
  clearCurrentIntent,
  setPaymentSuccess,
  setProcessing,
} = paymentsSlice.actions;

export default paymentsSlice.reducer;
