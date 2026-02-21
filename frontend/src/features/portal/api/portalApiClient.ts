import portalApi from '../../../services/portalApi';
import type { PortalApiClient, PortalEvent } from '../types/contracts';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

const extractData = <T>(response: ApiEnvelope<T> | T): T => {
  if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
    return (response as ApiEnvelope<T>).data;
  }
  return response as T;
};

export class PortalV2ApiClient implements PortalApiClient {
  async listEvents(): Promise<PortalEvent[]> {
    const response = await portalApi.get<ApiEnvelope<PortalEvent[]> | PortalEvent[]>('/v2/portal/events');
    return extractData(response.data);
  }

  async registerEvent(eventId: string): Promise<void> {
    await portalApi.post(`/v2/portal/events/${eventId}/register`);
  }

  async cancelEventRegistration(eventId: string): Promise<void> {
    await portalApi.delete(`/v2/portal/events/${eventId}/register`);
  }
}

export const portalV2ApiClient = new PortalV2ApiClient();
