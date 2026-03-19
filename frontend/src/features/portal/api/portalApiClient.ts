import portalApi from '../../../services/portalApi';
import { unwrapApiData } from '../../../services/apiEnvelope';
import type { ApiEnvelope } from '../../../services/apiEnvelope';
import type {
  PortalApiClient,
  PortalAppointmentQuery,
  PortalAppointmentRequestInput,
  PortalAppointmentSlotsPayload,
  PortalAppointmentSlotBookingInput,
  PortalAppointmentSummary,
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
  private static readonly PAGE_SIZE = 100;

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
        from: query.from,
        to: query.to,
        limit: query.limit,
        offset: query.offset,
      },
    });
    return unwrapApiData(response.data);
  }

  async listEventsAll(query: PortalEventsQuery = {}): Promise<PortalEvent[]> {
    const items: PortalEvent[] = [];
    let offset = query.offset ?? 0;
    const limit = Math.max(1, Math.min(query.limit ?? PortalV2ApiClient.PAGE_SIZE, PortalV2ApiClient.PAGE_SIZE));

    while (true) {
      const page = await this.listEvents({
        ...query,
        limit,
        offset,
      });
      items.push(...page.items);
      if (!page.page.has_more) {
        break;
      }
      offset += limit;
    }

    return items;
  }

  async registerEvent(eventId: string): Promise<void> {
    await portalApi.post(`/v2/portal/events/${eventId}/register`);
  }

  async cancelEventRegistration(eventId: string): Promise<void> {
    await portalApi.delete(`/v2/portal/events/${eventId}/register`);
  }

  async listAppointments(query: PortalAppointmentQuery = {}): Promise<PortalAppointmentSummary[]> {
    const response = await portalApi.get<ApiEnvelope<PortalAppointmentSummary[]>>('/v2/portal/appointments', {
      params: {
        status: query.status,
        case_id: query.case_id,
        search: query.search,
        from: query.from,
        to: query.to,
        limit: query.limit,
        offset: query.offset,
      },
    });
    return unwrapApiData(response.data);
  }

  async listAppointmentsAll(query: PortalAppointmentQuery = {}): Promise<PortalAppointmentSummary[]> {
    const items: PortalAppointmentSummary[] = [];
    let offset = query.offset ?? 0;
    const limit = Math.max(1, Math.min(query.limit ?? PortalV2ApiClient.PAGE_SIZE, PortalV2ApiClient.PAGE_SIZE));

    while (true) {
      const page = await this.listAppointments({
        ...query,
        limit,
        offset,
      });
      items.push(...page);
      if (page.length < limit) {
        break;
      }
      offset += limit;
    }

    return items;
  }

  async listAppointmentSlots(query: {
    case_id?: string;
    from?: string;
    to?: string;
  } = {}): Promise<PortalAppointmentSlotsPayload> {
    const response = await portalApi.get<ApiEnvelope<PortalAppointmentSlotsPayload>>(
      '/v2/portal/appointments/slots',
      {
        params: {
          case_id: query.case_id,
          from: query.from,
          to: query.to,
        },
      }
    );
    return unwrapApiData(response.data);
  }

  async requestAppointment(payload: PortalAppointmentRequestInput): Promise<void> {
    await portalApi.post('/v2/portal/appointments/requests', payload);
  }

  async bookAppointmentSlot(slotId: string, payload: PortalAppointmentSlotBookingInput): Promise<void> {
    await portalApi.post(`/v2/portal/appointments/slots/${slotId}/book`, payload);
  }

  async cancelAppointment(appointmentId: string): Promise<void> {
    await portalApi.patch(`/v2/portal/appointments/${appointmentId}/cancel`);
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
