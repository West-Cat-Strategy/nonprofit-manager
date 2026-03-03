import api from '../../../services/api';
import type {
  AccountAnalytics,
  AnalyticsFilters,
  AnalyticsSummary,
  ComparativeAnalytics,
  ContactAnalytics,
  DonationMetrics,
  DonationTrendPoint,
  EventMetrics,
  EventTrendPoint,
  VolunteerHoursTrendPoint,
  VolunteerMetrics,
} from '../types/contracts';

export class AnalyticsApiClient {
  async fetchSummary(filters?: AnalyticsFilters): Promise<AnalyticsSummary> {
    const response = await api.get<AnalyticsSummary>('/v2/analytics/summary', { params: filters });
    return response.data;
  }

  async fetchAccountAnalytics(accountId: string): Promise<AccountAnalytics> {
    const response = await api.get<AccountAnalytics>(`/v2/analytics/accounts/${accountId}`);
    return response.data;
  }

  async fetchContactAnalytics(contactId: string): Promise<ContactAnalytics> {
    const response = await api.get<ContactAnalytics>(`/v2/analytics/contacts/${contactId}`);
    return response.data;
  }

  async fetchAccountDonationMetrics(accountId: string): Promise<DonationMetrics> {
    const response = await api.get<DonationMetrics>(`/v2/analytics/accounts/${accountId}/donations`);
    return response.data;
  }

  async fetchContactDonationMetrics(contactId: string): Promise<DonationMetrics> {
    const response = await api.get<DonationMetrics>(`/v2/analytics/contacts/${contactId}/donations`);
    return response.data;
  }

  async fetchAccountEventMetrics(accountId: string): Promise<EventMetrics> {
    const response = await api.get<EventMetrics>(`/v2/analytics/accounts/${accountId}/events`);
    return response.data;
  }

  async fetchContactEventMetrics(contactId: string): Promise<EventMetrics> {
    const response = await api.get<EventMetrics>(`/v2/analytics/contacts/${contactId}/events`);
    return response.data;
  }

  async fetchContactVolunteerMetrics(contactId: string): Promise<VolunteerMetrics> {
    const response = await api.get<VolunteerMetrics>(`/v2/analytics/contacts/${contactId}/volunteer`);
    return response.data;
  }

  async fetchDonationTrends(months = 12): Promise<DonationTrendPoint[]> {
    const response = await api.get<DonationTrendPoint[]>('/v2/analytics/trends/donations', { params: { months } });
    return response.data;
  }

  async fetchVolunteerHoursTrends(months = 12): Promise<VolunteerHoursTrendPoint[]> {
    const response = await api.get<VolunteerHoursTrendPoint[]>('/v2/analytics/trends/volunteer-hours', { params: { months } });
    return response.data;
  }

  async fetchEventAttendanceTrends(months = 12): Promise<EventTrendPoint[]> {
    const response = await api.get<EventTrendPoint[]>('/v2/analytics/trends/event-attendance', { params: { months } });
    return response.data;
  }

  async fetchComparativeAnalytics(period: 'month' | 'quarter' | 'year' = 'month'): Promise<ComparativeAnalytics> {
    const response = await api.get<ComparativeAnalytics>('/v2/analytics/comparative', { params: { period } });
    return response.data;
  }
}

export const analyticsApiClient = new AnalyticsApiClient();
