/**
 * Analytics Redux Slice
 * State management for analytics operations
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import type {
  AnalyticsSummary,
  AccountAnalytics,
  ContactAnalytics,
  DonationMetrics,
  EventMetrics,
  VolunteerMetrics,
  AnalyticsFilters,
  DonationTrendPoint,
  VolunteerHoursTrendPoint,
  EventTrendPoint,
  ComparativeAnalytics,
} from '../../types/analytics';

export interface AnalyticsState {
  summary: AnalyticsSummary | null;
  currentAccountAnalytics: AccountAnalytics | null;
  currentContactAnalytics: ContactAnalytics | null;
  accountDonationMetrics: DonationMetrics | null;
  accountEventMetrics: EventMetrics | null;
  contactDonationMetrics: DonationMetrics | null;
  contactEventMetrics: EventMetrics | null;
  contactVolunteerMetrics: VolunteerMetrics | null;
  donationTrends: DonationTrendPoint[];
  volunteerHoursTrends: VolunteerHoursTrendPoint[];
  eventAttendanceTrends: EventTrendPoint[];
  comparativeAnalytics: ComparativeAnalytics | null;
  loading: boolean;
  summaryLoading: boolean;
  trendsLoading: boolean;
  comparativeLoading: boolean;
  error: string | null;
  filters: AnalyticsFilters;
}

const initialState: AnalyticsState = {
  summary: null,
  currentAccountAnalytics: null,
  currentContactAnalytics: null,
  accountDonationMetrics: null,
  accountEventMetrics: null,
  contactDonationMetrics: null,
  contactEventMetrics: null,
  contactVolunteerMetrics: null,
  donationTrends: [],
  volunteerHoursTrends: [],
  eventAttendanceTrends: [],
  comparativeAnalytics: null,
  loading: false,
  summaryLoading: false,
  trendsLoading: false,
  comparativeLoading: false,
  error: null,
  filters: {},
};

// Async Thunks

/**
 * Fetch organization-wide analytics summary
 */
export const fetchAnalyticsSummary = createAsyncThunk(
  'analytics/fetchSummary',
  async (filters?: AnalyticsFilters) => {
    const response = await api.get('/analytics/summary', { params: filters });
    return response.data;
  }
);

/**
 * Fetch analytics for a specific account
 */
export const fetchAccountAnalytics = createAsyncThunk(
  'analytics/fetchAccountAnalytics',
  async (accountId: string) => {
    const response = await api.get(`/analytics/accounts/${accountId}`);
    return response.data;
  }
);

/**
 * Fetch analytics for a specific contact
 */
export const fetchContactAnalytics = createAsyncThunk(
  'analytics/fetchContactAnalytics',
  async (contactId: string) => {
    const response = await api.get(`/analytics/contacts/${contactId}`);
    return response.data;
  }
);

/**
 * Fetch donation metrics for an account
 */
export const fetchAccountDonationMetrics = createAsyncThunk(
  'analytics/fetchAccountDonationMetrics',
  async (accountId: string) => {
    const response = await api.get(`/analytics/accounts/${accountId}/donations`);
    return response.data;
  }
);

/**
 * Fetch donation metrics for a contact
 */
export const fetchContactDonationMetrics = createAsyncThunk(
  'analytics/fetchContactDonationMetrics',
  async (contactId: string) => {
    const response = await api.get(`/analytics/contacts/${contactId}/donations`);
    return response.data;
  }
);

/**
 * Fetch event metrics for an account
 */
export const fetchAccountEventMetrics = createAsyncThunk(
  'analytics/fetchAccountEventMetrics',
  async (accountId: string) => {
    const response = await api.get(`/analytics/accounts/${accountId}/events`);
    return response.data;
  }
);

/**
 * Fetch event metrics for a contact
 */
export const fetchContactEventMetrics = createAsyncThunk(
  'analytics/fetchContactEventMetrics',
  async (contactId: string) => {
    const response = await api.get(`/analytics/contacts/${contactId}/events`);
    return response.data;
  }
);

/**
 * Fetch volunteer metrics for a contact
 */
export const fetchContactVolunteerMetrics = createAsyncThunk(
  'analytics/fetchContactVolunteerMetrics',
  async (contactId: string) => {
    const response = await api.get(`/analytics/contacts/${contactId}/volunteer`);
    return response.data;
  }
);

/**
 * Fetch donation trends over time
 */
export const fetchDonationTrends = createAsyncThunk(
  'analytics/fetchDonationTrends',
  async (months: number = 12) => {
    const response = await api.get('/analytics/trends/donations', { params: { months } });
    return response.data;
  }
);

/**
 * Fetch volunteer hours trends over time
 */
export const fetchVolunteerHoursTrends = createAsyncThunk(
  'analytics/fetchVolunteerHoursTrends',
  async (months: number = 12) => {
    const response = await api.get('/analytics/trends/volunteer-hours', { params: { months } });
    return response.data;
  }
);

/**
 * Fetch event attendance trends over time
 */
export const fetchEventAttendanceTrends = createAsyncThunk(
  'analytics/fetchEventAttendanceTrends',
  async (months: number = 12) => {
    const response = await api.get('/analytics/trends/event-attendance', { params: { months } });
    return response.data;
  }
);

/**
 * Fetch comparative analytics (YoY, MoM, QoQ)
 */
export const fetchComparativeAnalytics = createAsyncThunk(
  'analytics/fetchComparativeAnalytics',
  async (period: 'month' | 'quarter' | 'year' = 'month') => {
    const response = await api.get('/analytics/comparative', { params: { period } });
    return response.data;
  }
);

// Slice
const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearCurrentAccountAnalytics: (state) => {
      state.currentAccountAnalytics = null;
      state.accountDonationMetrics = null;
      state.accountEventMetrics = null;
    },
    clearCurrentContactAnalytics: (state) => {
      state.currentContactAnalytics = null;
      state.contactDonationMetrics = null;
      state.contactEventMetrics = null;
      state.contactVolunteerMetrics = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Analytics Summary
      .addCase(fetchAnalyticsSummary.pending, (state) => {
        state.summaryLoading = true;
        state.error = null;
      })
      .addCase(fetchAnalyticsSummary.fulfilled, (state, action) => {
        state.summaryLoading = false;
        state.summary = action.payload;
      })
      .addCase(fetchAnalyticsSummary.rejected, (state, action) => {
        state.summaryLoading = false;
        state.error = action.error.message || 'Failed to fetch analytics summary';
      })
      // Fetch Account Analytics
      .addCase(fetchAccountAnalytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccountAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.currentAccountAnalytics = action.payload;
      })
      .addCase(fetchAccountAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch account analytics';
      })
      // Fetch Contact Analytics
      .addCase(fetchContactAnalytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContactAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.currentContactAnalytics = action.payload;
      })
      .addCase(fetchContactAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch contact analytics';
      })
      // Fetch Account Donation Metrics
      .addCase(fetchAccountDonationMetrics.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAccountDonationMetrics.fulfilled, (state, action) => {
        state.loading = false;
        state.accountDonationMetrics = action.payload;
      })
      .addCase(fetchAccountDonationMetrics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch account donation metrics';
      })
      // Fetch Contact Donation Metrics
      .addCase(fetchContactDonationMetrics.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchContactDonationMetrics.fulfilled, (state, action) => {
        state.loading = false;
        state.contactDonationMetrics = action.payload;
      })
      .addCase(fetchContactDonationMetrics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch contact donation metrics';
      })
      // Fetch Account Event Metrics
      .addCase(fetchAccountEventMetrics.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAccountEventMetrics.fulfilled, (state, action) => {
        state.loading = false;
        state.accountEventMetrics = action.payload;
      })
      .addCase(fetchAccountEventMetrics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch account event metrics';
      })
      // Fetch Contact Event Metrics
      .addCase(fetchContactEventMetrics.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchContactEventMetrics.fulfilled, (state, action) => {
        state.loading = false;
        state.contactEventMetrics = action.payload;
      })
      .addCase(fetchContactEventMetrics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch contact event metrics';
      })
      // Fetch Contact Volunteer Metrics
      .addCase(fetchContactVolunteerMetrics.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchContactVolunteerMetrics.fulfilled, (state, action) => {
        state.loading = false;
        state.contactVolunteerMetrics = action.payload;
      })
      .addCase(fetchContactVolunteerMetrics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch contact volunteer metrics';
      })
      // Fetch Donation Trends
      .addCase(fetchDonationTrends.pending, (state) => {
        state.trendsLoading = true;
      })
      .addCase(fetchDonationTrends.fulfilled, (state, action) => {
        state.trendsLoading = false;
        state.donationTrends = action.payload;
      })
      .addCase(fetchDonationTrends.rejected, (state, action) => {
        state.trendsLoading = false;
        state.error = action.error.message || 'Failed to fetch donation trends';
      })
      // Fetch Volunteer Hours Trends
      .addCase(fetchVolunteerHoursTrends.pending, (state) => {
        state.trendsLoading = true;
      })
      .addCase(fetchVolunteerHoursTrends.fulfilled, (state, action) => {
        state.trendsLoading = false;
        state.volunteerHoursTrends = action.payload;
      })
      .addCase(fetchVolunteerHoursTrends.rejected, (state, action) => {
        state.trendsLoading = false;
        state.error = action.error.message || 'Failed to fetch volunteer hours trends';
      })
      // Fetch Event Attendance Trends
      .addCase(fetchEventAttendanceTrends.pending, (state) => {
        state.trendsLoading = true;
      })
      .addCase(fetchEventAttendanceTrends.fulfilled, (state, action) => {
        state.trendsLoading = false;
        state.eventAttendanceTrends = action.payload;
      })
      .addCase(fetchEventAttendanceTrends.rejected, (state, action) => {
        state.trendsLoading = false;
        state.error = action.error.message || 'Failed to fetch event attendance trends';
      })
      // Fetch Comparative Analytics
      .addCase(fetchComparativeAnalytics.pending, (state) => {
        state.comparativeLoading = true;
      })
      .addCase(fetchComparativeAnalytics.fulfilled, (state, action) => {
        state.comparativeLoading = false;
        state.comparativeAnalytics = action.payload;
      })
      .addCase(fetchComparativeAnalytics.rejected, (state, action) => {
        state.comparativeLoading = false;
        state.error = action.error.message || 'Failed to fetch comparative analytics';
      });
  },
});

export const {
  setFilters,
  clearFilters,
  clearCurrentAccountAnalytics,
  clearCurrentContactAnalytics,
  clearError,
} = analyticsSlice.actions;

export default analyticsSlice.reducer;
