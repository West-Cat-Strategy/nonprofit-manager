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

export interface EventListQuery {
  search?: string;
  eventType?: string;
  status?: string;
  isPublic?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EventCatalogPort {
  listEvents(query?: EventListQuery): Promise<PaginatedEvents>;
  getEventById(eventId: string): Promise<Event>;
}

export interface EventRegistrationPort {
  listEventRegistrations(eventId: string, filters?: RegistrationFilters): Promise<EventRegistration[]>;
  registerContact(eventId: string, contactId: string): Promise<void>;
  checkInRegistration(registrationId: string): Promise<EventRegistration>;
  cancelRegistration(registrationId: string): Promise<void>;
}

export interface EventMutationPort {
  createEvent(payload: CreateEventDTO): Promise<Event>;
  updateEvent(eventId: string, payload: UpdateEventDTO): Promise<Event>;
  deleteEvent(eventId: string): Promise<void>;
}

export interface EventReminderPort {
  sendManualReminders(
    eventId: string,
    payload: {
      sendEmail?: boolean;
      sendSms?: boolean;
      customMessage?: string;
    }
  ): Promise<EventReminderSummary>;
  listReminderAutomations(eventId: string): Promise<EventReminderAutomation[]>;
  createReminderAutomation(
    eventId: string,
    payload: CreateEventReminderAutomationDTO
  ): Promise<EventReminderAutomation>;
  cancelReminderAutomation(eventId: string, automationId: string): Promise<void>;
  syncReminderAutomations(eventId: string, payload: SyncEventReminderAutomationsDTO): Promise<void>;
}
