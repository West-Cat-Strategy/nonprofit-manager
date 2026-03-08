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
import type {
  AccountAnalytics,
  AnalyticsSummary,
  ComparativeAnalytics,
  ContactAnalytics,
  DonationMetrics,
  EventMetrics,
  VolunteerMetrics,
} from '../types/contracts';

type ReducerAction = Parameters<typeof reducer>[1];

const rejectedAction = (type: string, message?: string): ReducerAction =>
  ({
    type,
    error: message ? { message } : {},
  }) as ReducerAction;

const createDonationMetrics = (overrides: Partial<DonationMetrics> = {}): DonationMetrics => ({
  total_amount: 10,
  total_count: 1,
  average_amount: 10,
  first_donation_date: null,
  last_donation_date: null,
  recurring_donations: 0,
  recurring_amount: 0,
  largest_donation: 10,
  by_payment_method: {},
  by_year: {},
  ...overrides,
});

const createEventMetrics = (overrides: Partial<EventMetrics> = {}): EventMetrics => ({
  total_registrations: 1,
  events_attended: 1,
  no_shows: 0,
  attendance_rate: 100,
  by_event_type: {},
  recent_events: [],
  ...overrides,
});

const createVolunteerMetrics = (
  overrides: Partial<VolunteerMetrics> = {}
): VolunteerMetrics => ({
  total_hours: 12,
  total_assignments: 1,
  completed_assignments: 1,
  active_assignments: 0,
  skills: [],
  availability_status: 'available',
  volunteer_since: null,
  hours_by_month: {},
  recent_assignments: [],
  ...overrides,
});

const createAccountAnalytics = (
  overrides: Partial<AccountAnalytics> = {}
): AccountAnalytics => ({
  account_id: 'acct-1',
  account_name: 'Account 1',
  account_type: 'partner',
  category: 'general',
  created_at: '2026-01-01T00:00:00.000Z',
  contact_count: 1,
  donation_metrics: createDonationMetrics(),
  event_metrics: createEventMetrics(),
  task_metrics: {
    total_tasks: 0,
    completed_tasks: 0,
    pending_tasks: 0,
    overdue_tasks: 0,
    by_priority: {},
    by_status: {},
  },
  engagement_score: 10,
  engagement_level: 'medium',
  ...overrides,
});

const createContactAnalytics = (
  overrides: Partial<ContactAnalytics> = {}
): ContactAnalytics => ({
  contact_id: 'contact-1',
  contact_name: 'Contact 1',
  email: 'contact@example.com',
  account_id: null,
  account_name: null,
  contact_roles: [],
  created_at: '2026-01-01T00:00:00.000Z',
  donation_metrics: createDonationMetrics(),
  event_metrics: createEventMetrics(),
  volunteer_metrics: createVolunteerMetrics(),
  task_metrics: {
    total_tasks: 0,
    completed_tasks: 0,
    pending_tasks: 0,
    overdue_tasks: 0,
    by_priority: {},
    by_status: {},
  },
  engagement_score: 12,
  engagement_level: 'medium',
  ...overrides,
});

const createAnalyticsSummary = (
  overrides: Partial<AnalyticsSummary> = {}
): AnalyticsSummary => ({
  total_accounts: 0,
  active_accounts: 0,
  total_contacts: 0,
  active_contacts: 0,
  total_donations_ytd: 0,
  donation_count_ytd: 0,
  average_donation_ytd: 0,
  total_events_ytd: 0,
  total_volunteers: 0,
  total_volunteer_hours_ytd: 0,
  engagement_distribution: {
    high: 0,
    medium: 0,
    low: 0,
    inactive: 0,
  },
  ...overrides,
});

const createComparativeAnalytics = (
  overrides: Partial<ComparativeAnalytics> = {}
): ComparativeAnalytics => ({
  period_type: 'month',
  current_period: '2026-03',
  previous_period: '2026-02',
  metrics: {
    total_donations: { current: 0, previous: 0, change: 0, change_percent: 0, trend: 'stable' },
    donation_count: { current: 0, previous: 0, change: 0, change_percent: 0, trend: 'stable' },
    average_donation: { current: 0, previous: 0, change: 0, change_percent: 0, trend: 'stable' },
    new_contacts: { current: 0, previous: 0, change: 0, change_percent: 0, trend: 'stable' },
    total_events: { current: 0, previous: 0, change: 0, change_percent: 0, trend: 'stable' },
    volunteer_hours: { current: 0, previous: 0, change: 0, change_percent: 0, trend: 'stable' },
    engagement_score: { current: 0, previous: 0, change: 0, change_percent: 0, trend: 'stable' },
  },
  ...overrides,
});

describe('analyticsCore reducer', () => {
  it('handles local filter/clear reducers', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, setFilters({ start_date: '2026-01-01', end_date: '2026-12-31' }));
    expect(state.filters).toMatchObject({ start_date: '2026-01-01', end_date: '2026-12-31' });

    state = reducer(
      {
        ...state,
        currentAccountAnalytics: createAccountAnalytics(),
        accountDonationMetrics: createDonationMetrics(),
        accountEventMetrics: createEventMetrics(),
        currentContactAnalytics: createContactAnalytics(),
        contactDonationMetrics: createDonationMetrics({ total_amount: 5 }),
        contactEventMetrics: createEventMetrics({ total_registrations: 2 }),
        contactVolunteerMetrics: createVolunteerMetrics(),
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
    const summaryPayload = createAnalyticsSummary({ total_accounts: 10 });

    let state = reducer(undefined, fetchAnalyticsSummary.pending('req-1', undefined));
    expect(state.summaryLoading).toBe(true);
    expect(state.error).toBeNull();

    state = reducer(state, fetchAnalyticsSummary.fulfilled(summaryPayload, 'req-1', undefined));
    expect(state.summaryLoading).toBe(false);
    expect(state.summary).toEqual(summaryPayload);

    state = reducer(state, rejectedAction(fetchAnalyticsSummary.rejected.type, 'summary fail'));
    expect(state.error).toBe('summary fail');

    state = reducer(state, rejectedAction(fetchAnalyticsSummary.rejected.type));
    expect(state.error).toBe('Failed to fetch analytics summary');
  });

  it('covers account/contact entity analytics and metric async branches', () => {
    const accountPayload = createAccountAnalytics();
    const contactPayload = createContactAnalytics();
    const donationMetricPayload = createDonationMetrics();
    const eventMetricPayload = createEventMetrics();
    const volunteerMetricPayload = createVolunteerMetrics();

    let state = reducer(undefined, fetchAccountAnalytics.pending('r1', 'acct-1'));
    expect(state.loading).toBe(true);
    state = reducer(state, fetchAccountAnalytics.fulfilled(accountPayload, 'r1', 'acct-1'));
    expect(state.currentAccountAnalytics).toEqual(accountPayload);
    state = reducer(state, rejectedAction(fetchAccountAnalytics.rejected.type));
    expect(state.error).toBe('Failed to fetch account analytics');

    state = reducer(state, fetchContactAnalytics.pending('r2', 'contact-1'));
    state = reducer(state, fetchContactAnalytics.fulfilled(contactPayload, 'r2', 'contact-1'));
    expect(state.currentContactAnalytics).toEqual(contactPayload);
    state = reducer(state, rejectedAction(fetchContactAnalytics.rejected.type));
    expect(state.error).toBe('Failed to fetch contact analytics');

    state = reducer(state, fetchAccountDonationMetrics.pending('r3', 'acct-1'));
    state = reducer(
      state,
      fetchAccountDonationMetrics.fulfilled(donationMetricPayload, 'r3', 'acct-1')
    );
    expect(state.accountDonationMetrics).toEqual(donationMetricPayload);
    state = reducer(state, rejectedAction(fetchAccountDonationMetrics.rejected.type));
    expect(state.error).toBe('Failed to fetch account donation metrics');

    state = reducer(state, fetchContactDonationMetrics.pending('r4', 'contact-1'));
    state = reducer(
      state,
      fetchContactDonationMetrics.fulfilled(donationMetricPayload, 'r4', 'contact-1')
    );
    expect(state.contactDonationMetrics).toEqual(donationMetricPayload);
    state = reducer(state, rejectedAction(fetchContactDonationMetrics.rejected.type));
    expect(state.error).toBe('Failed to fetch contact donation metrics');

    state = reducer(state, fetchAccountEventMetrics.pending('r5', 'acct-1'));
    state = reducer(state, fetchAccountEventMetrics.fulfilled(eventMetricPayload, 'r5', 'acct-1'));
    expect(state.accountEventMetrics).toEqual(eventMetricPayload);
    state = reducer(state, rejectedAction(fetchAccountEventMetrics.rejected.type));
    expect(state.error).toBe('Failed to fetch account event metrics');

    state = reducer(state, fetchContactEventMetrics.pending('r6', 'contact-1'));
    state = reducer(state, fetchContactEventMetrics.fulfilled(eventMetricPayload, 'r6', 'contact-1'));
    expect(state.contactEventMetrics).toEqual(eventMetricPayload);
    state = reducer(state, rejectedAction(fetchContactEventMetrics.rejected.type));
    expect(state.error).toBe('Failed to fetch contact event metrics');

    state = reducer(state, fetchContactVolunteerMetrics.pending('r7', 'contact-1'));
    state = reducer(
      state,
      fetchContactVolunteerMetrics.fulfilled(volunteerMetricPayload, 'r7', 'contact-1')
    );
    expect(state.contactVolunteerMetrics).toEqual(volunteerMetricPayload);
    state = reducer(state, rejectedAction(fetchContactVolunteerMetrics.rejected.type));
    expect(state.error).toBe('Failed to fetch contact volunteer metrics');
  });

  it('covers trends/comparative async branches including fallback errors', () => {
    let state = reducer(undefined, fetchDonationTrends.pending('t1', 12));
    expect(state.trendsLoading).toBe(true);

    state = reducer(state, fetchDonationTrends.fulfilled([{ month: 'Jan', amount: 10, count: 1 }], 't1', 12));
    expect(state.donationTrends).toHaveLength(1);

    state = reducer(state, rejectedAction(fetchDonationTrends.rejected.type));
    expect(state.error).toBe('Failed to fetch donation trends');

    state = reducer(state, fetchVolunteerHoursTrends.pending('t2', 12));
    state = reducer(state, fetchVolunteerHoursTrends.fulfilled([{ month: 'Jan', hours: 8, assignments: 2 }], 't2', 12));
    expect(state.volunteerHoursTrends).toHaveLength(1);

    state = reducer(state, rejectedAction(fetchVolunteerHoursTrends.rejected.type));
    expect(state.error).toBe('Failed to fetch volunteer hours trends');

    state = reducer(state, fetchEventAttendanceTrends.pending('t3', 12));
    state = reducer(
      state,
      fetchEventAttendanceTrends.fulfilled(
        [
          {
            month: 'Jan',
            total_events: 2,
            total_registrations: 24,
            total_attendance: 20,
            capacity_utilization: 80,
            attendance_rate: 83,
          },
        ],
        't3',
        12
      )
    );
    expect(state.eventAttendanceTrends).toHaveLength(1);

    state = reducer(state, rejectedAction(fetchEventAttendanceTrends.rejected.type));
    expect(state.error).toBe('Failed to fetch event attendance trends');

    state = reducer(state, fetchComparativeAnalytics.pending('t4', 'month'));
    expect(state.comparativeLoading).toBe(true);

    const comparativePayload = createComparativeAnalytics();
    state = reducer(state, fetchComparativeAnalytics.fulfilled(comparativePayload, 't4', 'month'));
    expect(state.comparativeLoading).toBe(false);
    expect(state.comparativeAnalytics).toEqual(comparativePayload);

    state = reducer(state, rejectedAction(fetchComparativeAnalytics.rejected.type));
    expect(state.error).toBe('Failed to fetch comparative analytics');
  });
});
