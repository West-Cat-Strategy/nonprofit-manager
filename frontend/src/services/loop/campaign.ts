import type { CampaignEvent, CampaignStats } from '../../types/schema';
import api from '../api';

interface AnalyticsSummary {
  total_contacts: number;
  active_contacts: number;
  donation_count_ytd: number;
  total_events_ytd: number;
  total_volunteers: number;
}

interface EventApiResponse {
  id: string;
  event_name: string;
  start_date: string;
  end_date?: string;
  capacity?: number;
  registered_count?: number;
  status: string;
}

interface EventsListResponse {
  data: EventApiResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export const getCampaignStats = async (): Promise<CampaignStats> => {
  const [analyticsRes, eventsRes] = await Promise.all([
    api.get<AnalyticsSummary>('/analytics/summary').catch(() => ({ data: null })),
    api.get<EventsListResponse>('/events', {
      params: { status: 'upcoming', limit: '100' },
    }).catch(() => ({ data: null })),
  ]);

  const analytics = analyticsRes.data as AnalyticsSummary | null;
  const events = (eventsRes.data as EventsListResponse | null);

  const upcomingCount = events?.pagination?.total || 0;

  return {
    peopleEngaged: analytics?.active_contacts || 0,
    newsletterSubs: `${analytics?.total_contacts || 0}`,
    upcomingEvents: `${upcomingCount}`,
    activeDonors: `${analytics?.donation_count_ytd || 0}`,
    socialHandle: '',
  };
};

export const getCampaignEvents = async (): Promise<CampaignEvent[]> => {
  const response = await api.get<EventsListResponse>('/events', {
    params: { limit: '20', sort_by: 'start_date', sort_order: 'asc' },
  });

  const events = response.data.data || [];

  return events.map((event) => {
    const startDate = new Date(event.start_date);
    return {
      id: event.id,
      title: event.event_name,
      date: startDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      time: startDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
      rsvpCount: event.registered_count || 0,
    };
  });
};
