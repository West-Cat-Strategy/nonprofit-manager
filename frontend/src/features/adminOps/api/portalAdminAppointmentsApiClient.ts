import api from '../../../services/api';
import { unwrapApiData } from '../../../services/apiEnvelope';
import type { ApiEnvelope } from '../../../services/apiEnvelope';
import type {
  PortalAdminAppointmentInboxItem,
  PortalAppointmentSlot,
} from '../contracts';

interface PortalAdminAppointmentsPage {
  data: PortalAdminAppointmentInboxItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface PortalAdminAppointmentsQuery {
  status?: 'requested' | 'confirmed' | 'cancelled' | 'completed';
  request_type?: 'manual_request' | 'slot_booking';
  case_id?: string;
  pointperson_user_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

interface PortalAdminSlotQuery {
  status?: 'open' | 'closed' | 'cancelled';
  case_id?: string;
  pointperson_user_id?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export class PortalAdminAppointmentsApiClient {
  private static readonly PAGE_SIZE = 100;

  async listAppointments(
    query: PortalAdminAppointmentsQuery = {}
  ): Promise<PortalAdminAppointmentsPage> {
    const response = await api.get<ApiEnvelope<PortalAdminAppointmentsPage>>(
      '/v2/portal/admin/appointments',
      { params: query }
    );
    return unwrapApiData(response.data);
  }

  async listAppointmentsAll(
    query: PortalAdminAppointmentsQuery = {}
  ): Promise<PortalAdminAppointmentInboxItem[]> {
    const items: PortalAdminAppointmentInboxItem[] = [];
    let page = query.page ?? 1;
    const limit = Math.max(
      1,
      Math.min(query.limit ?? PortalAdminAppointmentsApiClient.PAGE_SIZE, PortalAdminAppointmentsApiClient.PAGE_SIZE)
    );

    while (true) {
      const result = await this.listAppointments({
        ...query,
        page,
        limit,
      });
      items.push(...result.data);
      if (page >= result.pagination.total_pages || result.data.length === 0) {
        break;
      }
      page += 1;
    }

    return items;
  }

  async listAppointmentSlots(query: PortalAdminSlotQuery = {}): Promise<PortalAppointmentSlot[]> {
    const response = await api.get<ApiEnvelope<{ slots: PortalAppointmentSlot[] }>>(
      '/v2/portal/admin/appointment-slots',
      { params: query }
    );
    return unwrapApiData(response.data).slots || [];
  }

  async listAppointmentSlotsAll(query: PortalAdminSlotQuery = {}): Promise<PortalAppointmentSlot[]> {
    const items: PortalAppointmentSlot[] = [];
    let offset = query.offset ?? 0;
    const limit = Math.max(
      1,
      Math.min(query.limit ?? PortalAdminAppointmentsApiClient.PAGE_SIZE, PortalAdminAppointmentsApiClient.PAGE_SIZE)
    );

    while (true) {
      const result = await this.listAppointmentSlots({
        ...query,
        limit,
        offset,
      });
      items.push(...result);
      if (result.length < limit) {
        break;
      }
      offset += limit;
    }

    return items;
  }

  async updateAppointmentStatus(
    appointmentId: string,
    payload: {
      status: 'requested' | 'confirmed' | 'cancelled' | 'completed';
      resolution_note?: string;
      outcome_definition_ids?: string[];
      outcome_visibility?: boolean;
    }
  ): Promise<PortalAdminAppointmentInboxItem> {
    const response = await api.patch<ApiEnvelope<{ appointment: PortalAdminAppointmentInboxItem }>>(
      `/v2/portal/admin/appointments/${appointmentId}/status`,
      payload
    );
    return unwrapApiData(response.data).appointment;
  }

  async checkInAppointment(
    appointmentId: string,
    payload: {
      resolution_note?: string;
      outcome_definition_ids?: string[];
      outcome_visibility?: boolean;
    } = {}
  ): Promise<PortalAdminAppointmentInboxItem> {
    const response = await api.post<ApiEnvelope<{ appointment: PortalAdminAppointmentInboxItem }>>(
      `/v2/portal/admin/appointments/${appointmentId}/check-in`,
      payload
    );
    return unwrapApiData(response.data).appointment;
  }

  async updateSlotStatus(
    slotId: string,
    status: 'open' | 'closed' | 'cancelled'
  ): Promise<PortalAppointmentSlot> {
    const response = await api.patch<ApiEnvelope<{ slot: PortalAppointmentSlot }>>(
      `/v2/portal/admin/appointment-slots/${slotId}`,
      { status }
    );
    return unwrapApiData(response.data).slot;
  }
}

export const portalAdminAppointmentsApiClient = new PortalAdminAppointmentsApiClient();
