import { describe, it, expect, beforeEach } from 'vitest';
import reducer, {
  setFilters,
  clearFilters,
  clearCurrentAccount,
  clearError,
  fetchAccounts,
  fetchAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  type AccountsState,
} from '../accountsSlice';

const mockAccount = {
  account_id: 'acc-1',
  account_number: 'ACC-001',
  account_name: 'Test Organization',
  account_type: 'organization' as const,
  category: 'donor' as const,
  email: 'test@org.com',
  phone: '555-0100',
  website: null,
  description: null,
  address_line1: null,
  address_line2: null,
  city: null,
  state_province: null,
  postal_code: null,
  country: null,
  tax_id: null,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const initialState: AccountsState = {
  accounts: [],
  currentAccount: null,
  loading: false,
  error: null,
  pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
  filters: { search: '', account_type: '', category: '', is_active: true },
};

describe('accountsSlice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('reducers', () => {
    it('merges partial filter updates without clobbering other filters', () => {
      const state = reducer(initialState, setFilters({ search: 'acme', category: 'donor' }));
      expect(state.filters.search).toBe('acme');
      expect(state.filters.category).toBe('donor');
      expect(state.filters.account_type).toBe('');
      expect(state.filters.is_active).toBe(true);
    });

    it('clearFilters resets all filters to defaults', () => {
      const dirty = {
        ...initialState,
        filters: { search: 'q', account_type: 'individual', category: 'vendor', is_active: false },
      };
      const state = reducer(dirty, clearFilters());
      expect(state.filters).toEqual(initialState.filters);
    });

    it('clearCurrentAccount nulls the current account', () => {
      const state = reducer({ ...initialState, currentAccount: mockAccount }, clearCurrentAccount());
      expect(state.currentAccount).toBeNull();
    });

    it('clearError nulls the error field', () => {
      const state = reducer({ ...initialState, error: 'Oops' }, clearError());
      expect(state.error).toBeNull();
    });
  });

  describe('fetchAccounts thunk', () => {
    it('sets loading=true and clears error on pending', () => {
      const state = reducer({ ...initialState, error: 'old error' }, { type: fetchAccounts.pending.type });
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('populates accounts and pagination on fulfilled', () => {
      const payload = {
        data: [mockAccount],
        pagination: { total: 1, page: 1, limit: 20, total_pages: 1 },
      };
      const state = reducer(
        { ...initialState, loading: true },
        { type: fetchAccounts.fulfilled.type, payload }
      );
      expect(state.loading).toBe(false);
      expect(state.accounts).toHaveLength(1);
      expect(state.accounts[0].account_id).toBe('acc-1');
      expect(state.pagination.total).toBe(1);
    });

    it('sets error and stops loading on rejected', () => {
      const state = reducer(
        { ...initialState, loading: true },
        { type: fetchAccounts.rejected.type, error: { message: 'Network error' } }
      );
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });

    it('uses fallback message when error.message is absent', () => {
      const state = reducer(
        { ...initialState, loading: true },
        { type: fetchAccounts.rejected.type, error: {} }
      );
      expect(state.error).toBe('Failed to fetch accounts');
    });
  });

  describe('fetchAccountById thunk', () => {
    it('sets loading on pending', () => {
      const state = reducer(initialState, { type: fetchAccountById.pending.type });
      expect(state.loading).toBe(true);
    });

    it('sets currentAccount on fulfilled', () => {
      const state = reducer(
        { ...initialState, loading: true },
        { type: fetchAccountById.fulfilled.type, payload: mockAccount }
      );
      expect(state.loading).toBe(false);
      expect(state.currentAccount).toEqual(mockAccount);
    });

    it('sets error on rejected', () => {
      const state = reducer(
        { ...initialState, loading: true },
        { type: fetchAccountById.rejected.type, error: { message: 'Not found' } }
      );
      expect(state.error).toBe('Not found');
    });
  });

  describe('createAccount thunk', () => {
    it('prepends new account to list on fulfilled', () => {
      const existing = { ...mockAccount, account_id: 'acc-existing' };
      const created = { ...mockAccount, account_id: 'acc-new' };
      const state = reducer(
        { ...initialState, accounts: [existing] },
        { type: createAccount.fulfilled.type, payload: created }
      );
      expect(state.accounts).toHaveLength(2);
      expect(state.accounts[0].account_id).toBe('acc-new');
    });

    it('sets error on rejected', () => {
      const state = reducer(
        { ...initialState, loading: true },
        { type: createAccount.rejected.type, error: { message: 'Validation failed' } }
      );
      expect(state.error).toBe('Validation failed');
    });
  });

  describe('updateAccount thunk', () => {
    it('replaces the matching account in the list on fulfilled', () => {
      const updated = { ...mockAccount, account_name: 'Updated Org' };
      const state = reducer(
        { ...initialState, accounts: [mockAccount] },
        { type: updateAccount.fulfilled.type, payload: updated }
      );
      expect(state.accounts[0].account_name).toBe('Updated Org');
    });

    it('also updates currentAccount if it matches', () => {
      const updated = { ...mockAccount, account_name: 'Updated Org' };
      const state = reducer(
        { ...initialState, accounts: [mockAccount], currentAccount: mockAccount },
        { type: updateAccount.fulfilled.type, payload: updated }
      );
      expect(state.currentAccount?.account_name).toBe('Updated Org');
    });

    it('leaves currentAccount unchanged when IDs differ', () => {
      const other = { ...mockAccount, account_id: 'acc-other' };
      const updated = { ...mockAccount, account_name: 'Updated Org' };
      const state = reducer(
        { ...initialState, accounts: [mockAccount], currentAccount: other },
        { type: updateAccount.fulfilled.type, payload: updated }
      );
      expect(state.currentAccount?.account_id).toBe('acc-other');
    });
  });

  describe('deleteAccount thunk', () => {
    it('removes the deleted account from the list on fulfilled', () => {
      const second = { ...mockAccount, account_id: 'acc-2' };
      const state = reducer(
        { ...initialState, accounts: [mockAccount, second] },
        { type: deleteAccount.fulfilled.type, payload: 'acc-1' }
      );
      expect(state.accounts).toHaveLength(1);
      expect(state.accounts[0].account_id).toBe('acc-2');
    });

    it('sets error on rejected', () => {
      const state = reducer(
        { ...initialState, loading: true },
        { type: deleteAccount.rejected.type, error: { message: 'Forbidden' } }
      );
      expect(state.error).toBe('Forbidden');
    });
  });
});
