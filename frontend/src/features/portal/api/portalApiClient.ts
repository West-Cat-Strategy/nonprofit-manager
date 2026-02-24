import portalApi from '../../../services/portalApi';
import { unwrapApiData } from '../../../services/apiEnvelope';
import type { ApiEnvelope } from '../../../services/apiEnvelope';
import type {
  PortalApiClient,
  PortalCaseDetail,
  PortalCaseDocument,
  PortalCaseSummary,
  PortalCaseTimelineEvent,
  PortalEvent,
} from '../types/contracts';

export class PortalV2ApiClient implements PortalApiClient {
  async listEvents(): Promise<PortalEvent[]> {
    const response = await portalApi.get<ApiEnvelope<PortalEvent[]>>('/v2/portal/events');
    return unwrapApiData(response.data);
  }

  async registerEvent(eventId: string): Promise<void> {
    await portalApi.post(`/v2/portal/events/${eventId}/register`);
  }

  async cancelEventRegistration(eventId: string): Promise<void> {
    await portalApi.delete(`/v2/portal/events/${eventId}/register`);
  }

  async listCases(): Promise<PortalCaseSummary[]> {
    const response = await portalApi.get<ApiEnvelope<PortalCaseSummary[]>>('/v2/portal/cases');
    return unwrapApiData(response.data);
  }

  async getCase(caseId: string): Promise<PortalCaseDetail> {
    const response = await portalApi.get<ApiEnvelope<PortalCaseDetail>>(`/v2/portal/cases/${caseId}`);
    return unwrapApiData(response.data);
  }

  async getCaseTimeline(caseId: string): Promise<PortalCaseTimelineEvent[]> {
    const response = await portalApi.get<ApiEnvelope<PortalCaseTimelineEvent[]>>(
      `/v2/portal/cases/${caseId}/timeline`
    );
    return unwrapApiData(response.data);
  }

  async listCaseDocuments(caseId: string): Promise<PortalCaseDocument[]> {
    const response = await portalApi.get<ApiEnvelope<PortalCaseDocument[]>>(
      `/v2/portal/cases/${caseId}/documents`
    );
    return unwrapApiData(response.data);
  }

  getCaseDocumentDownloadUrl(
    caseId: string,
    documentId: string,
    disposition: 'inline' | 'attachment' = 'attachment'
  ): string {
    const query = disposition === 'inline' ? '?disposition=inline' : '';
    return `/api/v2/portal/cases/${caseId}/documents/${documentId}/download${query}`;
  }
}

export const portalV2ApiClient = new PortalV2ApiClient();
