import { describe, expect, it } from 'vitest';
import reducer, { fetchAccounts, setFilters, clearFilters } from '../accountsListSlice';
import type { Account, AccountsListPayload } from '../../types/contracts';

const createAccountRecord = (overrides: Partial<Account> = {}): Account => ({
  account_id: 'acc-1',
  account_number: 'ACC-001',
  account_name: 'Hope Foundation',
  account_type: 'organization',
  category: 'donor',
  email: 'contact@hope.org',
  phone: '555-0100',
  website: 'https://hope.org',
  description: 'Major donor organization',
  address_line1: '123 Main St',
  address_line2: null,
  city: 'Metropolis',
  state_province: 'NY',
  postal_code: '10001',
  country: 'USA',
  tax_id: '12-3456789',
  is_active: true,
  created_at: '2026-03-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z',
  ...overrides,
});

describe('accountsListSlice', () => {
  it('keeps stale account list responses from replacing a newer pending filter result', () => {
    const olderPayload: AccountsListPayload = {
      data: [createAccountRecord({ account_id: 'acc-older', account_name: 'Older Org' })],
      pagination: {
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      },
    };
    const newerPayload: AccountsListPayload = {
      data: [createAccountRecord({ account_id: 'acc-newer', account_name: 'Newer Org' })],
      pagination: {
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      },
    };

    const stateAfterFirstRequest = reducer(undefined, fetchAccounts.pending('req-1', {}));
    const stateAfterSecondRequest = reducer(
      stateAfterFirstRequest,
      fetchAccounts.pending('req-2', { search: 'newer' })
    );

    // Stale response arrives from req-1
    const stateAfterStaleResponse = reducer(
      stateAfterSecondRequest,
      fetchAccounts.fulfilled(olderPayload, 'req-1', {})
    );

    expect(stateAfterStaleResponse.loading).toBe(true);
    expect(stateAfterStaleResponse.currentRequestId).toBe('req-2');
    expect(stateAfterStaleResponse.accounts).toEqual([]);

    // Stale error arrives from req-1
    const stateAfterStaleError = reducer(
      stateAfterSecondRequest,
      fetchAccounts.rejected(new Error('Network error'), 'req-1', {})
    );
    expect(stateAfterStaleError.loading).toBe(true);
    expect(stateAfterStaleError.currentRequestId).toBe('req-2');
    expect(stateAfterStaleError.error).toBeNull();

    // Latest response arrives from req-2
    const stateAfterLatestResponse = reducer(
      stateAfterStaleResponse,
      fetchAccounts.fulfilled(newerPayload, 'req-2', { search: 'newer' })
    );

    expect(stateAfterLatestResponse.loading).toBe(false);
    expect(stateAfterLatestResponse.currentRequestId).toBeNull();
    expect(stateAfterLatestResponse.accounts).toEqual([
      expect.objectContaining({ account_id: 'acc-newer' }),
    ]);
    expect(stateAfterLatestResponse.pagination.total).toBe(1);
  });

  it('updates and clears filters correctly', () => {
    let state = reducer(undefined, setFilters({ search: 'partner', category: 'partner' }));
    expect(state.filters.search).toBe('partner');
    expect(state.filters.category).toBe('partner');

    state = reducer(state, clearFilters());
    expect(state.filters.search).toBe('');
    expect(state.filters.category).toBe('');
    expect(state.filters.is_active).toBe(true);
  });
});
