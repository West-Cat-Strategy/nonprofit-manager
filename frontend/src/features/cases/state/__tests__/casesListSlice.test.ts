import { describe, expect, it } from 'vitest';
import reducer, {
  fetchCases,
  setFilters,
  clearFilters,
  toggleCaseSelection,
  selectAllCases,
  clearCaseSelection,
} from '../casesListSlice';
import type { CaseWithDetails } from '../../../../types/case';

const createCaseRecord = (overrides: Partial<CaseWithDetails> = {}): CaseWithDetails => ({
  id: 'case-1',
  case_number: 'CASE-001',
  contact_id: 'contact-1',
  case_type_id: 'type-1',
  status_id: 'status-1',
  priority: 'medium',
  title: 'Housing Support',
  intake_date: '2026-03-01',
  is_urgent: false,
  client_viewable: false,
  requires_followup: false,
  created_at: '2026-03-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z',
  ...overrides,
});

describe('casesListSlice', () => {
  it('keeps stale case list responses from replacing a newer pending filter result', () => {
    const olderPayload = {
      cases: [createCaseRecord({ id: 'case-older', title: 'Older Case' })],
      total: 1,
      page: 1,
      limit: 20,
    };
    const newerPayload = {
      cases: [createCaseRecord({ id: 'case-newer', title: 'Newer Case' })],
      total: 1,
      page: 1,
      limit: 20,
    };

    const stateAfterFirstRequest = reducer(undefined, fetchCases.pending('req-1', {}));
    const stateAfterSecondRequest = reducer(
      stateAfterFirstRequest,
      fetchCases.pending('req-2', { search: 'newer' })
    );

    // Stale response from req-1 arrives
    const stateAfterStaleResponse = reducer(
      stateAfterSecondRequest,
      fetchCases.fulfilled(olderPayload, 'req-1', {})
    );

    expect(stateAfterStaleResponse.loading).toBe(true);
    expect(stateAfterStaleResponse.currentRequestId).toBe('req-2');
    expect(stateAfterStaleResponse.cases).toEqual([]);

    // Stale error from req-1 arrives
    const stateAfterStaleError = reducer(
      stateAfterSecondRequest,
      fetchCases.rejected(new Error('Network error'), 'req-1', {})
    );
    expect(stateAfterStaleError.loading).toBe(true);
    expect(stateAfterStaleError.currentRequestId).toBe('req-2');
    expect(stateAfterStaleError.error).toBeNull();

    // Latest response from req-2 arrives
    const stateAfterLatestResponse = reducer(
      stateAfterStaleResponse,
      fetchCases.fulfilled(newerPayload, 'req-2', { search: 'newer' })
    );

    expect(stateAfterLatestResponse.loading).toBe(false);
    expect(stateAfterLatestResponse.currentRequestId).toBeNull();
    expect(stateAfterLatestResponse.cases).toEqual([
      expect.objectContaining({ id: 'case-newer' }),
    ]);
    expect(stateAfterLatestResponse.total).toBe(1);
  });

  it('handles selection reducers correctly', () => {
    const case1 = createCaseRecord({ id: 'case-1' });
    const case2 = createCaseRecord({ id: 'case-2' });

    let state = reducer(undefined, { type: '@@INIT' });
    state = {
      ...state,
      cases: [case1, case2],
    };

    // toggle select
    state = reducer(state, toggleCaseSelection('case-1'));
    expect(state.selectedCaseIds).toEqual(['case-1']);

    // toggle deselect
    state = reducer(state, toggleCaseSelection('case-1'));
    expect(state.selectedCaseIds).toEqual([]);

    // select all
    state = reducer(state, selectAllCases());
    expect(state.selectedCaseIds).toEqual(['case-1', 'case-2']);

    // clear selection
    state = reducer(state, clearCaseSelection());
    expect(state.selectedCaseIds).toEqual([]);
  });

  it('updates and clears filters', () => {
    let state = reducer(undefined, setFilters({ search: 'urgent', priority: 'high' }));
    expect(state.filters.search).toBe('urgent');
    expect(state.filters.priority).toBe('high');

    state = reducer(state, clearFilters());
    expect(state.filters.search).toBeUndefined();
    expect(state.filters.page).toBe(1);
  });
});
