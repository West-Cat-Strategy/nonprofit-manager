import api from '../../../services/api';
import { unwrapApiData } from '../../../services/apiEnvelope';
import type { ApiEnvelope } from '../../../services/apiEnvelope';
import type {
  CreateEventDTO,
  CreateEventReminderAutomationDTO,
  EventConfirmationEmailResult,
  Event,
  EventBatchScope,
  EventCheckInSettings,
  EventReminderAutomation,
  EventRegistration,
  EventOccurrence,
  EventReminderSummary,
  EventWalkInCheckInDTO,
  EventWalkInCheckInResult,
  PaginatedEvents,
  PublicEventCheckInDTO,
  PublicEventCheckInInfo,
  PublicEventCheckInResult,
  PublicEventsListResult,
  PublicEventsQuery,
  RegistrationFilters,
  RotateEventCheckInPinResult,
  SyncEventReminderAutomationsDTO,
  UpdateEventCheckInSettingsDTO,
  UpdateEventDTO,
  UpdateRegistrationDTO,
} from '../../../types/event';
import type {
  EventCatalogPort,
  EventListQuery,
  EventOccurrenceQuery,
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

  private buildPublicEventsParams(query: PublicEventsQuery, site?: string): URLSearchParams {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.event_type) params.set('event_type', query.event_type);
    if (typeof query.include_past === 'boolean') params.set('include_past', String(query.include_past));
    if (query.limit) params.set('limit', String(query.limit));
    if (typeof query.offset === 'number') params.set('offset', String(query.offset));
    if (query.sort_by) params.set('sort_by', query.sort_by);
    if (query.sort_order) params.set('sort_order', query.sort_order);
    if (site) params.set('site', site);
    return params;
  }

  private buildOccurrenceParams(query: EventOccurrenceQuery): URLSearchParams {
    const params = new URLSearchParams();
    const legacyQuery = query as EventOccurrenceQuery & { from?: string; to?: string };
    if (legacyQuery.from || legacyQuery.to) {
      throw new Error('Event occurrence queries must use startDate and endDate.');
    }

    if ((query.startDate && !query.endDate) || (!query.startDate && query.endDate)) {
      throw new Error('Event occurrence queries require both startDate and endDate.');
    }

    if (query.startDate && query.endDate) {
      params.set('start_date', query.startDate);
      params.set('end_date', query.endDate);
    }

    if (query.eventId) params.set('event_id', query.eventId);
    if (query.search) params.set('search', query.search);
    if (query.eventType) params.set('event_type', query.eventType);
    if (query.status) params.set('status', query.status);
    if (typeof query.isPublic === 'boolean') params.set('is_public', String(query.isPublic));
    if (typeof query.includeCancelled === 'boolean') {
      params.set('include_cancelled', String(query.includeCancelled));
    }
    return params;
  }

  async listEvents(query: EventListQuery = {}): Promise<PaginatedEvents> {
    const params = this.buildListParams(query);
    const response = await api.get<ApiEnvelope<PaginatedEvents>>(`/v2/events?${params.toString()}`);
    return unwrapApiData(response.data);
  }

  async listEventsAccumulated(query: EventListQuery = {}): Promise<PaginatedEvents> {
    const baseLimit = Math.max(1, Math.min(query.limit ?? 100, 100));
    const firstPage = await this.listEvents({
      ...query,
      page: 1,
      limit: baseLimit,
    });

    const firstRows = Array.isArray(firstPage.data) ? firstPage.data : [];
    const totalPages = Math.max(1, firstPage.pagination?.total_pages ?? 1);
    if (totalPages === 1) {
      return firstPage;
    }

    const accumulated = [...firstRows];
    const seen = new Set(firstRows.map((event) => event.event_id));

    for (let page = 2; page <= totalPages; page += 1) {
      const pageResponse = await this.listEvents({
        ...query,
        page,
        limit: baseLimit,
      });
      for (const row of pageResponse.data || []) {
        if (!seen.has(row.event_id)) {
          seen.add(row.event_id);
          accumulated.push(row);
        }
      }
    }

    return {
      data: accumulated,
      pagination: {
        ...(firstPage.pagination || {
          total: accumulated.length,
          page: 1,
          limit: baseLimit,
          total_pages: totalPages,
        }),
        page: 1,
        limit: baseLimit,
      },
    };
  }

  async getEventById(eventId: string): Promise<Event> {
    const response = await api.get<ApiEnvelope<Event>>(`/v2/events/${eventId}`);
    return unwrapApiData(response.data);
  }

  async listEventOccurrences(query: EventOccurrenceQuery = {}): Promise<EventOccurrence[]> {
    const params = this.buildOccurrenceParams(query);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get<ApiEnvelope<EventOccurrence[]>>(`/v2/events/occurrences${suffix}`);
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
    if (filters.occurrence_id) params.set('occurrence_id', filters.occurrence_id);

    const response = await api.get<ApiEnvelope<EventRegistration[]>>(
      `/v2/events/${eventId}/registrations?${params.toString()}`
    );
    return unwrapApiData(response.data);
  }

  async registerContact(eventId: string, contactId: string): Promise<void> {
    await api.post(`/v2/events/${eventId}/register`, { contact_id: contactId });
  }

  async updateRegistration(
    registrationId: string,
    payload: UpdateRegistrationDTO,
    scope: EventBatchScope = 'occurrence'
  ): Promise<EventRegistration> {
    const params = new URLSearchParams();
    params.set('scope', scope);
    const response = await api.put<ApiEnvelope<EventRegistration>>(
      `/v2/events/registrations/${registrationId}?${params.toString()}`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async checkInRegistration(registrationId: string): Promise<EventRegistration> {
    const response = await api.post<ApiEnvelope<EventRegistration>>(
      `/v2/events/registrations/${registrationId}/checkin`
    );
    return unwrapApiData(response.data);
  }

  async scanCheckIn(eventId: string, token: string): Promise<EventRegistration> {
    const response = await api.post<ApiEnvelope<EventRegistration>>(
      `/v2/events/${eventId}/check-in/scan`,
      { token }
    );
    return unwrapApiData(response.data);
  }

  async scanCheckInGlobal(token: string): Promise<EventRegistration> {
    const response = await api.post<ApiEnvelope<EventRegistration>>('/v2/events/check-in/scan', {
      token,
    });
    return unwrapApiData(response.data);
  }

  async getCheckInSettings(eventId: string, occurrenceId?: string): Promise<EventCheckInSettings> {
    const params = new URLSearchParams();
    if (occurrenceId) params.set('occurrence_id', occurrenceId);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get<ApiEnvelope<EventCheckInSettings>>(
      `/v2/events/${eventId}/check-in/settings${suffix}`
    );
    return unwrapApiData(response.data);
  }

  async updateCheckInSettings(
    eventId: string,
    payload: UpdateEventCheckInSettingsDTO
  ): Promise<EventCheckInSettings> {
    const response = await api.patch<ApiEnvelope<EventCheckInSettings>>(
      `/v2/events/${eventId}/check-in/settings`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async rotateCheckInPin(eventId: string, occurrenceId?: string): Promise<RotateEventCheckInPinResult> {
    const response = await api.post<ApiEnvelope<RotateEventCheckInPinResult>>(
      `/v2/events/${eventId}/check-in/pin/rotate`,
      occurrenceId ? { occurrence_id: occurrenceId } : undefined
    );
    return unwrapApiData(response.data);
  }

  async walkInCheckIn(eventId: string, payload: EventWalkInCheckInDTO): Promise<EventWalkInCheckInResult> {
    const response = await api.post<ApiEnvelope<EventWalkInCheckInResult>>(
      `/v2/events/${eventId}/walk-ins`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async getPublicCheckInInfo(eventId: string, occurrenceId?: string): Promise<PublicEventCheckInInfo> {
    const params = new URLSearchParams();
    if (occurrenceId) params.set('occurrence_id', occurrenceId);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get<ApiEnvelope<PublicEventCheckInInfo>>(
      `/v2/public/events/${eventId}/check-in${suffix}`
    );
    return unwrapApiData(response.data);
  }

  async submitPublicCheckIn(
    eventId: string,
    payload: PublicEventCheckInDTO
  ): Promise<PublicEventCheckInResult> {
    const response = await api.post<ApiEnvelope<PublicEventCheckInResult>>(
      `/v2/public/events/${eventId}/check-in`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async listPublicEventsBySite(
    site: string,
    query: PublicEventsQuery = {}
  ): Promise<PublicEventsListResult> {
    const params = this.buildPublicEventsParams(query);
    const queryString = params.toString();
    const suffix = queryString ? `?${queryString}` : '';
    const response = await api.get<ApiEnvelope<PublicEventsListResult>>(
      `/v2/public/events/sites/${encodeURIComponent(site)}${suffix}`
    );
    return unwrapApiData(response.data);
  }

  async listPublicEventsByHost(
    query: PublicEventsQuery = {},
    site?: string
  ): Promise<PublicEventsListResult> {
    const params = this.buildPublicEventsParams(query, site);
    const queryString = params.toString();
    const suffix = queryString ? `?${queryString}` : '';
    const response = await api.get<ApiEnvelope<PublicEventsListResult>>(`/v2/public/events${suffix}`);
    return unwrapApiData(response.data);
  }

  async cancelRegistration(registrationId: string): Promise<void> {
    await api.delete(`/v2/events/registrations/${registrationId}`);
  }

  async sendRegistrationConfirmationEmail(registrationId: string): Promise<EventConfirmationEmailResult> {
    const response = await api.post<ApiEnvelope<EventConfirmationEmailResult>>(
      `/v2/events/registrations/${registrationId}/confirmation-email/send`
    );
    return unwrapApiData(response.data);
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
