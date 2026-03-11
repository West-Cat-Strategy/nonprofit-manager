import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { accountsApiClient } from '../api/accountsApiClient';
import type {
  Account,
  AccountMutationInput,
  AccountsListPayload,
  AccountsListQuery,
} from '../types/contracts';

export type { Account };

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
    account_type: '' | Account['account_type'];
    category: '' | Account['category'];
    is_active: boolean;
  };
}

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

export const fetchAccounts = createAsyncThunk(
  'accounts/fetchAccounts',
  async (params: AccountsListQuery = {}): Promise<AccountsListPayload> => {
    return accountsApiClient.listAccounts(params);
  }
);

export const fetchAccountById = createAsyncThunk(
  'accounts/fetchAccountById',
  async (accountId: string): Promise<Account> => {
    return accountsApiClient.getAccountById(accountId);
  }
);

export const createAccount = createAsyncThunk(
  'accounts/createAccount',
  async (accountData: AccountMutationInput): Promise<Account> => {
    return accountsApiClient.createAccount(accountData);
  }
);

export const updateAccount = createAsyncThunk(
  'accounts/updateAccount',
  async ({ accountId, data }: { accountId: string; data: AccountMutationInput }): Promise<Account> => {
    return accountsApiClient.updateAccount(accountId, data);
  }
);

export const deleteAccount = createAsyncThunk(
  'accounts/deleteAccount',
  async (accountId: string): Promise<string> => {
    await accountsApiClient.deleteAccount(accountId);
    return accountId;
  }
);

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
      .addCase(updateAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAccount.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.accounts.findIndex((acc) => acc.account_id === action.payload.account_id);
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
