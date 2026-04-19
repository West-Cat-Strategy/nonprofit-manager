import api from '../../../services/api';
import { unwrapApiData } from '../../../services/apiEnvelope';
import type { ApiEnvelope } from '../../../services/apiEnvelope';
import type {
  Meeting,
  MeetingDetail,
  MeetingAgendaItem,
  MeetingMotion,
  MeetingActionItem,
  Committee,
} from '../types/meeting';

export class MeetingsApiClient {
  async listCommittees(): Promise<Committee[]> {
    const response = await api.get<ApiEnvelope<Committee[]>>('/v2/meetings/committees');
    return unwrapApiData(response.data);
  }

  async listMeetings(filters: {
    committee_id?: string;
    status?: string;
    from?: string;
    to?: string;
    limit?: number;
  } = {}): Promise<Meeting[]> {
    const params = new URLSearchParams();
    if (filters.committee_id) params.set('committee_id', filters.committee_id);
    if (filters.status) params.set('status', filters.status);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.limit) params.set('limit', String(filters.limit));

    const response = await api.get<ApiEnvelope<Meeting[]>>(`/v2/meetings?${params.toString()}`);
    return unwrapApiData(response.data);
  }

  async getMeetingDetail(meetingId: string): Promise<MeetingDetail> {
    const response = await api.get<ApiEnvelope<MeetingDetail>>(`/v2/meetings/${meetingId}`);
    return unwrapApiData(response.data);
  }

  async createMeeting(payload: Partial<Meeting>): Promise<Meeting> {
    const response = await api.post<ApiEnvelope<Meeting>>('/v2/meetings', payload);
    return unwrapApiData(response.data);
  }

  async updateMeeting(meetingId: string, payload: Partial<Meeting>): Promise<Meeting> {
    const response = await api.patch<ApiEnvelope<Meeting>>(`/v2/meetings/${meetingId}`, payload);
    return unwrapApiData(response.data);
  }

  async addAgendaItem(meetingId: string, payload: Partial<MeetingAgendaItem>): Promise<MeetingAgendaItem> {
    const response = await api.post<ApiEnvelope<MeetingAgendaItem>>(`/v2/meetings/${meetingId}/agenda-items`, payload);
    return unwrapApiData(response.data);
  }

  async addMotion(meetingId: string, payload: Partial<MeetingMotion>): Promise<MeetingMotion> {
    const response = await api.post<ApiEnvelope<MeetingMotion>>(`/v2/meetings/${meetingId}/motions`, payload);
    return unwrapApiData(response.data);
  }

  async addActionItem(meetingId: string, payload: Partial<MeetingActionItem>): Promise<MeetingActionItem> {
    const response = await api.post<ApiEnvelope<MeetingActionItem>>(`/v2/meetings/${meetingId}/action-items`, payload);
    return unwrapApiData(response.data);
  }

  async generateMinutesDraft(meetingId: string): Promise<{ markdown: string }> {
    const response = await api.get<ApiEnvelope<{ markdown: string }>>(`/v2/meetings/${meetingId}/minutes/draft`);
    return unwrapApiData(response.data);
  }
}

export const meetingsApiClient = new MeetingsApiClient();
