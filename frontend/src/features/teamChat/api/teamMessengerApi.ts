import api from '../../../services/api';
import { unwrapApiData } from '../../../services/apiEnvelope';
import type { ApiEnvelope } from '../../../services/apiEnvelope';
import type {
  TeamMessengerContact,
  TeamMessengerConversationDetail,
  TeamMessengerConversationMemberUpdateDTO,
  TeamMessengerConversationMessageCreateDTO,
  TeamMessengerConversationReadResult,
  TeamMessengerConversationReadDTO,
  TeamMessengerConversationSummary,
  TeamMessengerConversationUpdateDTO,
  TeamMessengerDirectConversationCreateDTO,
  TeamMessengerGroupConversationCreateDTO,
  TeamMessengerTypingDTO,
} from '../messenger/types';

export class TeamMessengerApiClient {
  async listContacts(): Promise<TeamMessengerContact[]> {
    const response = await api.get<ApiEnvelope<{ contacts: TeamMessengerContact[] }>>(
      '/v2/team-chat/messenger/contacts'
    );
    return unwrapApiData(response.data).contacts;
  }

  async listConversations(): Promise<TeamMessengerConversationSummary[]> {
    const response = await api.get<ApiEnvelope<{ conversations: TeamMessengerConversationSummary[] }>>(
      '/v2/team-chat/messenger/conversations'
    );
    return unwrapApiData(response.data).conversations;
  }

  async getConversation(roomId: string): Promise<TeamMessengerConversationDetail> {
    const response = await api.get<ApiEnvelope<TeamMessengerConversationDetail>>(
      `/v2/team-chat/messenger/conversations/${roomId}`
    );
    return unwrapApiData(response.data);
  }

  async startDirectConversation(
    payload: TeamMessengerDirectConversationCreateDTO
  ): Promise<TeamMessengerConversationDetail> {
    const response = await api.post<ApiEnvelope<TeamMessengerConversationDetail>>(
      '/v2/team-chat/messenger/conversations/direct',
      payload
    );
    return unwrapApiData(response.data);
  }

  async createGroupConversation(
    payload: TeamMessengerGroupConversationCreateDTO
  ): Promise<TeamMessengerConversationDetail> {
    const response = await api.post<ApiEnvelope<TeamMessengerConversationDetail>>(
      '/v2/team-chat/messenger/conversations/group',
      payload
    );
    return unwrapApiData(response.data);
  }

  async updateConversation(
    roomId: string,
    payload: TeamMessengerConversationUpdateDTO
  ): Promise<TeamMessengerConversationDetail> {
    const response = await api.patch<ApiEnvelope<TeamMessengerConversationDetail>>(
      `/v2/team-chat/messenger/conversations/${roomId}`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async sendMessage(
    roomId: string,
    payload: TeamMessengerConversationMessageCreateDTO
  ): Promise<{
    room_id: string;
    room?: TeamMessengerConversationDetail['room'];
    message: TeamMessengerConversationDetail['messages'][number];
  }> {
    const response = await api.post<
      ApiEnvelope<{
        room_id: string;
        room?: TeamMessengerConversationDetail['room'];
        message: TeamMessengerConversationDetail['messages'][number];
      }>
    >(`/v2/team-chat/messenger/conversations/${roomId}/messages`, payload);
    return unwrapApiData(response.data);
  }

  async markRead(
    roomId: string,
    payload: TeamMessengerConversationReadDTO = {}
  ): Promise<TeamMessengerConversationReadResult> {
    const response = await api.post<ApiEnvelope<TeamMessengerConversationReadResult>>(
      `/v2/team-chat/messenger/conversations/${roomId}/read`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async addMember(
    roomId: string,
    payload: TeamMessengerConversationMemberUpdateDTO
  ): Promise<TeamMessengerConversationDetail> {
    const response = await api.post<ApiEnvelope<TeamMessengerConversationDetail>>(
      `/v2/team-chat/messenger/conversations/${roomId}/members`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async removeMember(
    roomId: string,
    userId: string
  ): Promise<TeamMessengerConversationDetail & { removed: boolean }> {
    const response = await api.delete<ApiEnvelope<TeamMessengerConversationDetail & { removed: boolean }>>(
      `/v2/team-chat/messenger/conversations/${roomId}/members/${userId}`
    );
    return unwrapApiData(response.data);
  }

  async updateTyping(roomId: string, payload: TeamMessengerTypingDTO) {
    const response = await api.post<ApiEnvelope<Record<string, unknown>>>(
      `/v2/team-chat/messenger/conversations/${roomId}/typing`,
      payload
    );
    return unwrapApiData(response.data);
  }
}

export const teamMessengerApiClient = new TeamMessengerApiClient();
