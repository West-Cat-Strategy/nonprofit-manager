import portalApi from '../../../services/portalApi';
import { unwrapApiData } from '../../../services/apiEnvelope';
import type { ApiEnvelope } from '../../../services/apiEnvelope';
import type {
  PortalApiClient,
  PortalCaseDetail,
  PortalCaseDocument,
  PortalCaseSummary,
  PortalCaseTimelinePage,
  PortalCaseTimelineQuery,
  PortalDashboardData,
  PortalDocument,
  PortalDocumentsQuery,
  PortalEvent,
  PortalEventsQuery,
  PortalFormsQuery,
  PortalNote,
  PortalNotesQuery,
  PortalPagedResult,
  PortalReminder,
  PortalRemindersQuery,
} from '../types/contracts';

export class PortalV2ApiClient implements PortalApiClient {
  async getDashboard(): Promise<PortalDashboardData> {
    const response = await portalApi.get<ApiEnvelope<PortalDashboardData>>('/v2/portal/dashboard');
    return unwrapApiData(response.data);
  }

  async listEvents(query: PortalEventsQuery = {}): Promise<PortalPagedResult<PortalEvent>> {
    const response = await portalApi.get<ApiEnvelope<PortalPagedResult<PortalEvent>>>('/v2/portal/events', {
      params: {
        search: query.search,
        sort: query.sort,
        order: query.order,
        limit: query.limit,
        offset: query.offset,
      },
    });
    return unwrapApiData(response.data);
  }

  async registerEvent(eventId: string): Promise<void> {
    await portalApi.post(`/v2/portal/events/${eventId}/register`);
  }

  async cancelEventRegistration(eventId: string): Promise<void> {
    await portalApi.delete(`/v2/portal/events/${eventId}/register`);
  }

  async listDocuments(query: PortalDocumentsQuery = {}): Promise<PortalPagedResult<PortalDocument>> {
    const response = await portalApi.get<ApiEnvelope<PortalPagedResult<PortalDocument>>>(
      '/v2/portal/documents',
      {
        params: {
          search: query.search,
          sort: query.sort,
          order: query.order,
          limit: query.limit,
          offset: query.offset,
        },
      }
    );
    return unwrapApiData(response.data);
  }

  async listForms(query: PortalFormsQuery = {}): Promise<PortalPagedResult<PortalDocument>> {
    const response = await portalApi.get<ApiEnvelope<PortalPagedResult<PortalDocument>>>('/v2/portal/forms', {
      params: {
        search: query.search,
        sort: query.sort,
        order: query.order,
        limit: query.limit,
        offset: query.offset,
      },
    });
    return unwrapApiData(response.data);
  }

  async listNotes(query: PortalNotesQuery = {}): Promise<PortalPagedResult<PortalNote>> {
    const response = await portalApi.get<ApiEnvelope<PortalPagedResult<PortalNote>>>('/v2/portal/notes', {
      params: {
        search: query.search,
        sort: query.sort,
        order: query.order,
        limit: query.limit,
        offset: query.offset,
      },
    });
    return unwrapApiData(response.data);
  }

  async listReminders(query: PortalRemindersQuery = {}): Promise<PortalPagedResult<PortalReminder>> {
    const response = await portalApi.get<ApiEnvelope<PortalPagedResult<PortalReminder>>>(
      '/v2/portal/reminders',
      {
        params: {
          search: query.search,
          sort: query.sort,
          order: query.order,
          limit: query.limit,
          offset: query.offset,
        },
      }
    );
    return unwrapApiData(response.data);
  }

  async listCases(): Promise<PortalCaseSummary[]> {
    const response = await portalApi.get<ApiEnvelope<PortalCaseSummary[]>>('/v2/portal/cases');
    return unwrapApiData(response.data);
  }

  async getCase(caseId: string): Promise<PortalCaseDetail> {
    const response = await portalApi.get<ApiEnvelope<PortalCaseDetail>>(`/v2/portal/cases/${caseId}`);
    return unwrapApiData(response.data);
  }

  async getCaseTimeline(caseId: string, query: PortalCaseTimelineQuery = {}): Promise<PortalCaseTimelinePage> {
    const response = await portalApi.get<ApiEnvelope<PortalCaseTimelinePage>>(`/v2/portal/cases/${caseId}/timeline`, {
      params: {
        limit: query.limit,
        cursor: query.cursor,
      },
    });
    return unwrapApiData(response.data);
  }

  async listCaseDocuments(caseId: string): Promise<PortalCaseDocument[]> {
    const response = await portalApi.get<ApiEnvelope<PortalCaseDocument[]>>(
      `/v2/portal/cases/${caseId}/documents`
    );
    return unwrapApiData(response.data);
  }

  async uploadCaseDocument(caseId: string, formData: FormData): Promise<PortalCaseDocument> {
    const response = await portalApi.post<ApiEnvelope<PortalCaseDocument>>(
      `/v2/portal/cases/${caseId}/documents`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
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

  getDocumentDownloadUrl(
    documentId: string,
    disposition: 'inline' | 'attachment' = 'attachment'
  ): string {
    const query = disposition === 'inline' ? '?disposition=inline' : '';
    return `/api/v2/portal/documents/${documentId}/download${query}`;
  }
}

export const portalV2ApiClient = new PortalV2ApiClient();
