import api from '../../../services/api';
import { unwrapApiData } from '../../../services/apiEnvelope';
import type { ApiEnvelope } from '../../../services/apiEnvelope';
import type {
  TeamChatAddMemberDTO,
  TeamChatInboxItem,
  TeamChatMarkReadDTO,
  TeamChatMarkReadResult,
  TeamChatMember,
  TeamChatMessageCreateDTO,
  TeamChatMessageListResult,
  TeamChatMessagesQuery,
  TeamChatRoomDetail,
  TeamChatUnreadSummary,
} from '../types';

const toQueryString = (query: TeamChatMessagesQuery): string => {
  const params = new URLSearchParams();
  if (typeof query.limit === 'number') {
    params.set('limit', String(query.limit));
  }
  if (query.after_message_id) {
    params.set('after_message_id', query.after_message_id);
  }
  if (query.before_message_id) {
    params.set('before_message_id', query.before_message_id);
  }
  return params.toString();
};

export class TeamChatApiClient {
  async getInbox(): Promise<TeamChatInboxItem[]> {
    const response = await api.get<ApiEnvelope<{ rooms: TeamChatInboxItem[] }>>('/v2/team-chat/inbox');
    return unwrapApiData(response.data).rooms;
  }

  async getUnreadSummary(): Promise<TeamChatUnreadSummary> {
    const response = await api.get<ApiEnvelope<TeamChatUnreadSummary>>('/v2/team-chat/unread-summary');
    return unwrapApiData(response.data);
  }

  async getCaseRoom(caseId: string): Promise<TeamChatRoomDetail> {
    const response = await api.get<ApiEnvelope<TeamChatRoomDetail>>(`/v2/team-chat/cases/${caseId}`);
    return unwrapApiData(response.data);
  }

  async getCaseMessages(caseId: string, query: TeamChatMessagesQuery): Promise<TeamChatMessageListResult> {
    const queryString = toQueryString(query);
    const suffix = queryString ? `?${queryString}` : '';
    const response = await api.get<ApiEnvelope<TeamChatMessageListResult>>(
      `/v2/team-chat/cases/${caseId}/messages${suffix}`
    );
    return unwrapApiData(response.data);
  }

  async sendCaseMessage(caseId: string, payload: TeamChatMessageCreateDTO): Promise<{
    room_id: string;
    message: TeamChatRoomDetail['messages'][number];
  }> {
    const response = await api.post<
      ApiEnvelope<{
        room_id: string;
        message: TeamChatRoomDetail['messages'][number];
      }>
    >(`/v2/team-chat/cases/${caseId}/messages`, payload);
    return unwrapApiData(response.data);
  }

  async markCaseRead(caseId: string, payload: TeamChatMarkReadDTO = {}): Promise<TeamChatMarkReadResult> {
    const response = await api.post<ApiEnvelope<TeamChatMarkReadResult>>(
      `/v2/team-chat/cases/${caseId}/read`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async listCaseMembers(caseId: string): Promise<TeamChatMember[]> {
    const response = await api.get<ApiEnvelope<{ members: TeamChatMember[] }>>(
      `/v2/team-chat/cases/${caseId}/members`
    );
    return unwrapApiData(response.data).members;
  }

  async addCaseMember(caseId: string, payload: TeamChatAddMemberDTO): Promise<TeamChatMember[]> {
    const response = await api.post<ApiEnvelope<{ members: TeamChatMember[] }>>(
      `/v2/team-chat/cases/${caseId}/members`,
      payload
    );
    return unwrapApiData(response.data).members;
  }

  async removeCaseMember(caseId: string, userId: string): Promise<{ removed: boolean; members: TeamChatMember[] }> {
    const response = await api.delete<ApiEnvelope<{ removed: boolean; members: TeamChatMember[] }>>(
      `/v2/team-chat/cases/${caseId}/members/${userId}`
    );
    return unwrapApiData(response.data);
  }
}

export const teamChatApiClient = new TeamChatApiClient();
