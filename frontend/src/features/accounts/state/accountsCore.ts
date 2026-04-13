import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { accountsApiClient } from '../api/accountsApiClient';
import type {
  Account,
  AccountMutationInput,
} from '../types/contracts';

export interface AccountsCoreState {
  currentAccount: Account | null;
  loading: boolean;
  error: string | null;
}

const initialState: AccountsCoreState = {
  currentAccount: null,
  loading: false,
  error: null,
};

export const fetchAccountById = createAsyncThunk(
  'accountsCore/fetchAccountById',
  async (accountId: string): Promise<Account> => {
    return accountsApiClient.getAccountById(accountId);
  }
);

export const createAccount = createAsyncThunk(
  'accountsCore/createAccount',
  async (accountData: AccountMutationInput): Promise<Account> => {
    return accountsApiClient.createAccount(accountData);
  }
);

export const updateAccount = createAsyncThunk(
  'accountsCore/updateAccount',
  async ({ accountId, data }: { accountId: string; data: AccountMutationInput }): Promise<Account> => {
    return accountsApiClient.updateAccount(accountId, data);
  }
);

export const deleteAccount = createAsyncThunk(
  'accountsCore/deleteAccount',
  async (accountId: string): Promise<string> => {
    await accountsApiClient.deleteAccount(accountId);
    return accountId;
  }
);

const accountsCoreSlice = createSlice({
  name: 'accountsCore',
  initialState,
  reducers: {
    clearCurrentAccount: (state) => {
      state.currentAccount = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
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
      .addCase(createAccount.fulfilled, (state) => {
        state.loading = false;
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
        if (state.currentAccount?.account_id === action.payload) {
          state.currentAccount = null;
        }
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete account';
      });
  },
});

export const { clearCurrentAccount, clearError } = accountsCoreSlice.actions;
export default accountsCoreSlice.reducer;
