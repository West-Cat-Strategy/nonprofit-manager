import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { accountsApiClient } from '../api/accountsApiClient';
import type {
  Account,
  AccountsListPayload,
  AccountsListQuery,
} from '../types/contracts';

export interface AccountsListState {
  accounts: Account[];
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

const initialState: AccountsListState = {
  accounts: [],
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
  'accountsList/fetchAccounts',
  async (params: AccountsListQuery = {}): Promise<AccountsListPayload> => {
    return accountsApiClient.listAccounts(params);
  }
);

const accountsListSlice = createSlice({
  name: 'accountsList',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<AccountsListState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
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
      });
  },
});

export const { setFilters, clearFilters } = accountsListSlice.actions;
export default accountsListSlice.reducer;
