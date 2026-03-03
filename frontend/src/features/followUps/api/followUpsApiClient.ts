import api from '../../../services/api';
import type {
  CompleteFollowUpDTO,
  CreateFollowUpDTO,
  FollowUp,
  FollowUpEntityType,
  FollowUpFilters,
  FollowUpSummary,
  FollowUpWithEntity,
  UpdateFollowUpDTO,
} from '../types/contracts';

export class FollowUpsApiClient {
  async fetchFollowUps(params: { filters?: FollowUpFilters; page?: number; limit?: number } = {}): Promise<{
    data: FollowUpWithEntity[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const queryParams = new URLSearchParams();

    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }

    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));

    const query = queryParams.toString();
    const endpoint = query.length > 0 ? `/v2/follow-ups?${query}` : '/v2/follow-ups';
    const response = await api.get(endpoint);
    return response.data;
  }

  async fetchEntityFollowUps(entityType: FollowUpEntityType, entityId: string): Promise<FollowUp[]> {
    const response = await api.get<FollowUp[]>(`/v2/${entityType}s/${entityId}/follow-ups`);
    return response.data;
  }

  async fetchFollowUpById(followUpId: string): Promise<FollowUp> {
    const response = await api.get<FollowUp>(`/v2/follow-ups/${followUpId}`);
    return response.data;
  }

  async createFollowUp(data: CreateFollowUpDTO): Promise<FollowUp> {
    const response = await api.post<FollowUp>('/v2/follow-ups', data);
    return response.data;
  }

  async updateFollowUp(followUpId: string, data: UpdateFollowUpDTO): Promise<FollowUp> {
    const response = await api.put<FollowUp>(`/v2/follow-ups/${followUpId}`, data);
    return response.data;
  }

  async completeFollowUp(followUpId: string, data?: CompleteFollowUpDTO): Promise<FollowUp> {
    const response = await api.post<FollowUp>(`/v2/follow-ups/${followUpId}/complete`, data || {});
    return response.data;
  }

  async cancelFollowUp(followUpId: string): Promise<FollowUp> {
    const response = await api.post<FollowUp>(`/v2/follow-ups/${followUpId}/cancel`);
    return response.data;
  }

  async rescheduleFollowUp(followUpId: string, newDate: string, newTime?: string): Promise<FollowUp> {
    const response = await api.post<FollowUp>(`/v2/follow-ups/${followUpId}/reschedule`, {
      scheduled_date: newDate,
      scheduled_time: newTime,
    });
    return response.data;
  }

  async deleteFollowUp(followUpId: string): Promise<void> {
    await api.delete(`/v2/follow-ups/${followUpId}`);
  }

  async fetchFollowUpSummary(filters?: FollowUpFilters): Promise<FollowUpSummary> {
    const queryParams = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString();
    const endpoint = query.length > 0 ? `/v2/follow-ups/summary?${query}` : '/v2/follow-ups/summary';
    const response = await api.get<FollowUpSummary>(endpoint);
    return response.data;
  }

  async fetchUpcomingFollowUps(limit = 10): Promise<FollowUpWithEntity[]> {
    const response = await api.get<FollowUpWithEntity[]>('/v2/follow-ups/upcoming', { params: { limit } });
    return response.data;
  }
}

export const followUpsApiClient = new FollowUpsApiClient();
