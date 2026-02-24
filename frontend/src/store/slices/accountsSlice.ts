/**
 * Accounts Redux Slice
 * State management for account operations
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { unwrapApiData } from '../../services/apiEnvelope';
import type { ApiEnvelope } from '../../services/apiEnvelope';

export interface Account {
  account_id: string;
  account_number: string;
  account_name: string;
  account_type: 'organization' | 'individual';
  category: 'donor' | 'volunteer' | 'partner' | 'vendor' | 'beneficiary' | 'other';
  email: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  tax_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountsState {
  accounts: Account[];
  currentAccount: Account | null;
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  filters: {
    search: string;
    account_type: string;
    category: string;
    is_active: boolean;
  };
}

type AccountInput = Partial<Account>;
type AccountsListPayload = {
  data: Account[];
  pagination: AccountsState['pagination'];
};

const initialState: AccountsState = {
  accounts: [],
  currentAccount: null,
  loading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    total_pages: 0,
  },
  filters: {
    search: '',
    account_type: '',
    category: '',
    is_active: true,
  },
};

// Async Thunks
export const fetchAccounts = createAsyncThunk(
  'accounts/fetchAccounts',
  async (params: {
    page?: number;
    limit?: number;
    search?: string;
    account_type?: string;
    category?: string;
    is_active?: boolean;
  }) => {
    const response = await api.get<ApiEnvelope<AccountsListPayload>>('/accounts', { params });
    return unwrapApiData(response.data);
  }
);

export const fetchAccountById = createAsyncThunk(
  'accounts/fetchAccountById',
  async (accountId: string) => {
    const response = await api.get<ApiEnvelope<Account>>(`/accounts/${accountId}`);
    return unwrapApiData(response.data);
  }
);

export const createAccount = createAsyncThunk(
  'accounts/createAccount',
  async (accountData: AccountInput) => {
    const response = await api.post<ApiEnvelope<Account>>('/accounts', accountData);
    return unwrapApiData(response.data);
  }
);

export const updateAccount = createAsyncThunk(
  'accounts/updateAccount',
  async ({ accountId, data }: { accountId: string; data: AccountInput }) => {
    const response = await api.put<ApiEnvelope<Account>>(`/accounts/${accountId}`, data);
    return unwrapApiData(response.data);
  }
);

export const deleteAccount = createAsyncThunk(
  'accounts/deleteAccount',
  async (accountId: string) => {
    await api.delete(`/accounts/${accountId}`);
    return accountId;
  }
);

// Slice
const accountsSlice = createSlice({
  name: 'accounts',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<AccountsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearCurrentAccount: (state) => {
      state.currentAccount = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Accounts
      .addCase(fetchAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccounts.fulfilled, (state, action) => {
        state.loading = false;
        state.accounts = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch accounts';
      })
      // Fetch Account by ID
      .addCase(fetchAccountById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccountById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentAccount = action.payload;
      })
      .addCase(fetchAccountById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch account';
      })
      // Create Account
      .addCase(createAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAccount.fulfilled, (state, action) => {
        state.loading = false;
        state.accounts.unshift(action.payload);
      })
      .addCase(createAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create account';
      })
      // Update Account
      .addCase(updateAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAccount.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.accounts.findIndex(
          (acc) => acc.account_id === action.payload.account_id
        );
        if (index !== -1) {
          state.accounts[index] = action.payload;
        }
        if (state.currentAccount?.account_id === action.payload.account_id) {
          state.currentAccount = action.payload;
        }
      })
      .addCase(updateAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update account';
      })
      // Delete Account
      .addCase(deleteAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAccount.fulfilled, (state, action) => {
        state.loading = false;
        state.accounts = state.accounts.filter((acc) => acc.account_id !== action.payload);
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete account';
      });
  },
});

export const { setFilters, clearFilters, clearCurrentAccount, clearError } = accountsSlice.actions;
export default accountsSlice.reducer;
