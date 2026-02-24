import api from '../../../services/api';
import { unwrapApiData } from '../../../services/apiEnvelope';
import type { ApiEnvelope } from '../../../services/apiEnvelope';
import type {
  CreateEventDTO,
  CreateEventReminderAutomationDTO,
  Event,
  EventReminderAutomation,
  EventRegistration,
  EventReminderSummary,
  PaginatedEvents,
  RegistrationFilters,
  SyncEventReminderAutomationsDTO,
  UpdateEventDTO,
} from '../../../types/event';
import type {
  EventCatalogPort,
  EventListQuery,
  EventMutationPort,
  EventRegistrationPort,
  EventReminderPort,
} from '../types/contracts';

export class EventsApiClient
  implements EventCatalogPort, EventMutationPort, EventRegistrationPort, EventReminderPort
{
  private buildListParams(query: EventListQuery): URLSearchParams {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.eventType) params.set('event_type', query.eventType);
    if (query.status) params.set('status', query.status);
    if (typeof query.isPublic === 'boolean') params.set('is_public', String(query.isPublic));
    if (query.startDate) params.set('start_date', query.startDate);
    if (query.endDate) params.set('end_date', query.endDate);
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.sortBy) params.set('sort_by', query.sortBy);
    if (query.sortOrder) params.set('sort_order', query.sortOrder);
    return params;
  }

  async listEvents(query: EventListQuery = {}): Promise<PaginatedEvents> {
    const params = this.buildListParams(query);
    const response = await api.get<ApiEnvelope<PaginatedEvents>>(`/v2/events?${params.toString()}`);
    return unwrapApiData(response.data);
  }

  async getEventById(eventId: string): Promise<Event> {
    const response = await api.get<ApiEnvelope<Event>>(`/v2/events/${eventId}`);
    return unwrapApiData(response.data);
  }

  async createEvent(payload: CreateEventDTO): Promise<Event> {
    const response = await api.post<ApiEnvelope<Event>>('/v2/events', payload);
    return unwrapApiData(response.data);
  }

  async updateEvent(eventId: string, payload: UpdateEventDTO): Promise<Event> {
    const response = await api.put<ApiEnvelope<Event>>(`/v2/events/${eventId}`, payload);
    return unwrapApiData(response.data);
  }

  async deleteEvent(eventId: string): Promise<void> {
    await api.delete(`/v2/events/${eventId}`);
  }

  async listEventRegistrations(
    eventId: string,
    filters: RegistrationFilters = {}
  ): Promise<EventRegistration[]> {
    const params = new URLSearchParams();
    if (filters.registration_status) params.set('registration_status', filters.registration_status);
    if (typeof filters.checked_in === 'boolean') params.set('checked_in', String(filters.checked_in));

    const response = await api.get<ApiEnvelope<EventRegistration[]>>(
      `/v2/events/${eventId}/registrations?${params.toString()}`
    );
    return unwrapApiData(response.data);
  }

  async registerContact(eventId: string, contactId: string): Promise<void> {
    await api.post(`/v2/events/${eventId}/register`, { contact_id: contactId });
  }

  async checkInRegistration(registrationId: string): Promise<EventRegistration> {
    const response = await api.post<ApiEnvelope<EventRegistration>>(
      `/v2/events/registrations/${registrationId}/checkin`
    );
    return unwrapApiData(response.data);
  }

  async cancelRegistration(registrationId: string): Promise<void> {
    await api.delete(`/v2/events/registrations/${registrationId}`);
  }

  async sendManualReminders(
    eventId: string,
    payload: {
      sendEmail?: boolean;
      sendSms?: boolean;
      customMessage?: string;
    }
  ): Promise<EventReminderSummary> {
    const response = await api.post<ApiEnvelope<EventReminderSummary>>(
      `/v2/events/${eventId}/reminders/send`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async listReminderAutomations(eventId: string): Promise<EventReminderAutomation[]> {
    const response = await api.get<ApiEnvelope<EventReminderAutomation[]>>(
      `/v2/events/${eventId}/reminder-automations`
    );
    return unwrapApiData(response.data);
  }

  async createReminderAutomation(
    eventId: string,
    payload: CreateEventReminderAutomationDTO
  ): Promise<EventReminderAutomation> {
    const response = await api.post<ApiEnvelope<EventReminderAutomation>>(
      `/v2/events/${eventId}/reminder-automations`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async cancelReminderAutomation(eventId: string, automationId: string): Promise<void> {
    await api.post(`/v2/events/${eventId}/reminder-automations/${automationId}/cancel`);
  }

  async syncReminderAutomations(
    eventId: string,
    payload: SyncEventReminderAutomationsDTO
  ): Promise<void> {
    await api.put(`/v2/events/${eventId}/reminder-automations/sync`, payload);
  }
}

export const eventsApiClient = new EventsApiClient();
