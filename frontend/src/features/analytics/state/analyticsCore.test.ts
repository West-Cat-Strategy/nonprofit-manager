import { describe, expect, it } from 'vitest';
import reducer, {
  clearCurrentAccountAnalytics,
  clearCurrentContactAnalytics,
  clearError,
  clearFilters,
  fetchAccountAnalytics,
  fetchAccountDonationMetrics,
  fetchAccountEventMetrics,
  fetchAnalyticsSummary,
  fetchComparativeAnalytics,
  fetchContactAnalytics,
  fetchContactDonationMetrics,
  fetchContactEventMetrics,
  fetchContactVolunteerMetrics,
  fetchDonationTrends,
  fetchEventAttendanceTrends,
  fetchVolunteerHoursTrends,
  setFilters,
} from './analyticsCore';

describe('analyticsCore reducer', () => {
  it('handles local filter/clear reducers', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, setFilters({ start_date: '2026-01-01', end_date: '2026-12-31' }));
    expect(state.filters).toMatchObject({ start_date: '2026-01-01', end_date: '2026-12-31' });

    state = reducer(
      {
        ...state,
        currentAccountAnalytics: { id: 'acct-1' } as any,
        accountDonationMetrics: { total_donations: 10 } as any,
        accountEventMetrics: { total_events: 2 } as any,
        currentContactAnalytics: { id: 'contact-1' } as any,
        contactDonationMetrics: { total_donations: 5 } as any,
        contactEventMetrics: { total_events: 1 } as any,
        contactVolunteerMetrics: { total_hours: 12 } as any,
        error: 'boom',
      },
      clearCurrentAccountAnalytics()
    );

    expect(state.currentAccountAnalytics).toBeNull();
    expect(state.accountDonationMetrics).toBeNull();
    expect(state.accountEventMetrics).toBeNull();

    state = reducer(state, clearCurrentContactAnalytics());
    expect(state.currentContactAnalytics).toBeNull();
    expect(state.contactDonationMetrics).toBeNull();
    expect(state.contactEventMetrics).toBeNull();
    expect(state.contactVolunteerMetrics).toBeNull();

    state = reducer(state, clearFilters());
    expect(state.filters).toEqual({});

    state = reducer(state, clearError());
    expect(state.error).toBeNull();
  });

  it('covers summary, loading, and fallback error branches', () => {
    const summaryPayload = { total_accounts: 10 } as any;

    let state = reducer(undefined, fetchAnalyticsSummary.pending('req-1', undefined));
    expect(state.summaryLoading).toBe(true);
    expect(state.error).toBeNull();

    state = reducer(state, fetchAnalyticsSummary.fulfilled(summaryPayload, 'req-1', undefined));
    expect(state.summaryLoading).toBe(false);
    expect(state.summary).toEqual(summaryPayload);

    state = reducer(
      state,
      fetchAnalyticsSummary.rejected(new Error('summary fail') as any, 'req-2', undefined)
    );
    expect(state.error).toBe('summary fail');

    state = reducer(
      state,
      {
        type: fetchAnalyticsSummary.rejected.type,
        error: {},
      } as any
    );
    expect(state.error).toBe('Failed to fetch analytics summary');
  });

  it('covers account/contact entity analytics and metric async branches', () => {
    const accountPayload = { id: 'acct-1' } as any;
    const contactPayload = { id: 'contact-1' } as any;
    const metricPayload = { total: 1 } as any;

    let state = reducer(undefined, fetchAccountAnalytics.pending('r1', 'acct-1'));
    expect(state.loading).toBe(true);
    state = reducer(state, fetchAccountAnalytics.fulfilled(accountPayload, 'r1', 'acct-1'));
    expect(state.currentAccountAnalytics).toEqual(accountPayload);
    state = reducer(
      state,
      {
        type: fetchAccountAnalytics.rejected.type,
        error: {},
      } as any
    );
    expect(state.error).toBe('Failed to fetch account analytics');

    state = reducer(state, fetchContactAnalytics.pending('r2', 'contact-1'));
    state = reducer(state, fetchContactAnalytics.fulfilled(contactPayload, 'r2', 'contact-1'));
    expect(state.currentContactAnalytics).toEqual(contactPayload);
    state = reducer(
      state,
      {
        type: fetchContactAnalytics.rejected.type,
        error: {},
      } as any
    );
    expect(state.error).toBe('Failed to fetch contact analytics');

    state = reducer(state, fetchAccountDonationMetrics.pending('r3', 'acct-1'));
    state = reducer(state, fetchAccountDonationMetrics.fulfilled(metricPayload, 'r3', 'acct-1'));
    expect(state.accountDonationMetrics).toEqual(metricPayload);
    state = reducer(
      state,
      {
        type: fetchAccountDonationMetrics.rejected.type,
        error: {},
      } as any
    );
    expect(state.error).toBe('Failed to fetch account donation metrics');

    state = reducer(state, fetchContactDonationMetrics.pending('r4', 'contact-1'));
    state = reducer(state, fetchContactDonationMetrics.fulfilled(metricPayload, 'r4', 'contact-1'));
    expect(state.contactDonationMetrics).toEqual(metricPayload);
    state = reducer(
      state,
      {
        type: fetchContactDonationMetrics.rejected.type,
        error: {},
      } as any
    );
    expect(state.error).toBe('Failed to fetch contact donation metrics');

    state = reducer(state, fetchAccountEventMetrics.pending('r5', 'acct-1'));
    state = reducer(state, fetchAccountEventMetrics.fulfilled(metricPayload, 'r5', 'acct-1'));
    expect(state.accountEventMetrics).toEqual(metricPayload);
    state = reducer(
      state,
      {
        type: fetchAccountEventMetrics.rejected.type,
        error: {},
      } as any
    );
    expect(state.error).toBe('Failed to fetch account event metrics');

    state = reducer(state, fetchContactEventMetrics.pending('r6', 'contact-1'));
    state = reducer(state, fetchContactEventMetrics.fulfilled(metricPayload, 'r6', 'contact-1'));
    expect(state.contactEventMetrics).toEqual(metricPayload);
    state = reducer(
      state,
      {
        type: fetchContactEventMetrics.rejected.type,
        error: {},
      } as any
    );
    expect(state.error).toBe('Failed to fetch contact event metrics');

    state = reducer(state, fetchContactVolunteerMetrics.pending('r7', 'contact-1'));
    state = reducer(state, fetchContactVolunteerMetrics.fulfilled(metricPayload, 'r7', 'contact-1'));
    expect(state.contactVolunteerMetrics).toEqual(metricPayload);
    state = reducer(
      state,
      {
        type: fetchContactVolunteerMetrics.rejected.type,
        error: {},
      } as any
    );
    expect(state.error).toBe('Failed to fetch contact volunteer metrics');
  });

  it('covers trends/comparative async branches including fallback errors', () => {
    let state = reducer(undefined, fetchDonationTrends.pending('t1', 12));
    expect(state.trendsLoading).toBe(true);

    state = reducer(state, fetchDonationTrends.fulfilled([{ month: 'Jan', amount: 10, count: 1 }], 't1', 12));
    expect(state.donationTrends).toHaveLength(1);

    state = reducer(
      state,
      {
        type: fetchDonationTrends.rejected.type,
        error: {},
      } as any
    );
    expect(state.error).toBe('Failed to fetch donation trends');

    state = reducer(state, fetchVolunteerHoursTrends.pending('t2', 12));
    state = reducer(state, fetchVolunteerHoursTrends.fulfilled([{ month: 'Jan', hours: 8, assignments: 2 }], 't2', 12));
    expect(state.volunteerHoursTrends).toHaveLength(1);

    state = reducer(
      state,
      {
        type: fetchVolunteerHoursTrends.rejected.type,
        error: {},
      } as any
    );
    expect(state.error).toBe('Failed to fetch volunteer hours trends');

    state = reducer(state, fetchEventAttendanceTrends.pending('t3', 12));
    state = reducer(state, fetchEventAttendanceTrends.fulfilled([{ month: 'Jan', attendance: 20, events: 2 }], 't3', 12));
    expect(state.eventAttendanceTrends).toHaveLength(1);

    state = reducer(
      state,
      {
        type: fetchEventAttendanceTrends.rejected.type,
        error: {},
      } as any
    );
    expect(state.error).toBe('Failed to fetch event attendance trends');

    state = reducer(state, fetchComparativeAnalytics.pending('t4', 'month'));
    expect(state.comparativeLoading).toBe(true);

    state = reducer(state, fetchComparativeAnalytics.fulfilled({ totals: [] } as any, 't4', 'month'));
    expect(state.comparativeLoading).toBe(false);
    expect(state.comparativeAnalytics).toEqual({ totals: [] });

    state = reducer(
      state,
      {
        type: fetchComparativeAnalytics.rejected.type,
        error: {},
      } as any
    );
    expect(state.error).toBe('Failed to fetch comparative analytics');
  });
});
