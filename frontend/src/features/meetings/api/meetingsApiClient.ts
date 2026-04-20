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

const unwrapMeetingsPayload = <T>(payload: ApiEnvelope<T> | T): T =>
  unwrapApiData(payload);

const unwrapMeetingsCollection = <T>(
  payload: ApiEnvelope<T[]> | T[] | Record<string, unknown>,
  key: string
): T[] => {
  const unwrapped = unwrapApiData(payload as ApiEnvelope<unknown> | unknown);
  if (Array.isArray(unwrapped)) {
    return unwrapped as T[];
  }

  const collection = (unwrapped as Record<string, unknown> | null)?.[key];
  return Array.isArray(collection) ? (collection as T[]) : [];
};

const unwrapMeetingsEntity = <T>(
  payload: ApiEnvelope<T> | T | Record<string, unknown>,
  key: string
): T => {
  const unwrapped = unwrapApiData(payload as ApiEnvelope<unknown> | unknown);
  if (unwrapped && typeof unwrapped === 'object' && key in (unwrapped as Record<string, unknown>)) {
    return (unwrapped as Record<string, unknown>)[key] as T;
  }

  return unwrapped as T;
};

export class MeetingsApiClient {
  async listCommittees(): Promise<Committee[]> {
    const response = await api.get<ApiEnvelope<Committee[]> | { committees: Committee[] }>(
      '/v2/meetings/committees'
    );
    return unwrapMeetingsCollection<Committee>(response.data, 'committees');
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

    const suffix = params.toString();
    const response = await api.get<ApiEnvelope<Meeting[]> | { meetings: Meeting[] }>(
      `/v2/meetings${suffix ? `?${suffix}` : ''}`
    );
    return unwrapMeetingsCollection<Meeting>(response.data, 'meetings');
  }

  async getMeetingDetail(meetingId: string): Promise<MeetingDetail> {
    const response = await api.get<ApiEnvelope<MeetingDetail> | MeetingDetail>(`/v2/meetings/${meetingId}`);
    return unwrapMeetingsPayload<MeetingDetail>(response.data);
  }

  async createMeeting(payload: Partial<Meeting>): Promise<Meeting> {
    const response = await api.post<ApiEnvelope<Meeting> | { meeting: Meeting }>('/v2/meetings', payload);
    return unwrapMeetingsEntity<Meeting>(response.data, 'meeting');
  }

  async updateMeeting(meetingId: string, payload: Partial<Meeting>): Promise<Meeting> {
    const response = await api.patch<ApiEnvelope<Meeting> | { meeting: Meeting }>(
      `/v2/meetings/${meetingId}`,
      payload
    );
    return unwrapMeetingsEntity<Meeting>(response.data, 'meeting');
  }

  async addAgendaItem(meetingId: string, payload: Partial<MeetingAgendaItem>): Promise<MeetingAgendaItem> {
    const response = await api.post<ApiEnvelope<MeetingAgendaItem> | { agendaItem: MeetingAgendaItem }>(
      `/v2/meetings/${meetingId}/agenda-items`,
      payload
    );
    return unwrapMeetingsEntity<MeetingAgendaItem>(response.data, 'agendaItem');
  }

  async addMotion(meetingId: string, payload: Partial<MeetingMotion>): Promise<MeetingMotion> {
    const response = await api.post<ApiEnvelope<MeetingMotion> | { motion: MeetingMotion }>(
      `/v2/meetings/${meetingId}/motions`,
      payload
    );
    return unwrapMeetingsEntity<MeetingMotion>(response.data, 'motion');
  }

  async addActionItem(meetingId: string, payload: Partial<MeetingActionItem>): Promise<MeetingActionItem> {
    const response = await api.post<ApiEnvelope<MeetingActionItem> | { actionItem: MeetingActionItem }>(
      `/v2/meetings/${meetingId}/action-items`,
      payload
    );
    return unwrapMeetingsEntity<MeetingActionItem>(response.data, 'actionItem');
  }

  async generateMinutesDraft(meetingId: string): Promise<{ markdown: string }> {
    const response = await api.get<ApiEnvelope<{ markdown: string }> | { markdown: string }>(
      `/v2/meetings/${meetingId}/minutes/draft`
    );
    return unwrapMeetingsPayload<{ markdown: string }>(response.data);
  }
}

export const meetingsApiClient = new MeetingsApiClient();
