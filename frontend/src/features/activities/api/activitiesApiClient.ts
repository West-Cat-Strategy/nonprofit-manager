/**
 * Activities API Client
 */

import api from '../../../services/api';
import { unwrapApiData } from '../../../services/apiEnvelope';
import type { ApiEnvelope } from '../../../services/apiEnvelope';
import type { ActivityFeedPayload, ActivityListFilters, EntityActivityFilters } from '../types';

export class ActivitiesApiClient {
  async getRecentActivities(filters?: ActivityListFilters): Promise<ActivityFeedPayload> {
    const params = new URLSearchParams();
    if (filters?.limit) {
      params.set('limit', String(filters.limit));
    }

    const query = params.toString();
    const url = query ? `/v2/activities/recent?${query}` : '/v2/activities/recent';
    const response = await api.get<ApiEnvelope<ActivityFeedPayload>>(url);
    return unwrapApiData(response.data);
  }

  async getEntityActivities(filters: EntityActivityFilters): Promise<ActivityFeedPayload> {
    const url = `/v2/activities/${filters.entityType}/${filters.entityId}`;
    const response = await api.get<ApiEnvelope<ActivityFeedPayload>>(url);
    return unwrapApiData(response.data);
  }
}

export const activitiesApiClient = new ActivitiesApiClient();
