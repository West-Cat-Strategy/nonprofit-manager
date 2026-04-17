import type {
  CreateEventDTO,
  CreateEventReminderAutomationDTO,
  Event,
  EventConfirmationEmailResult,
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
  RegistrationFilters,
  RotateEventCheckInPinResult,
  SyncEventReminderAutomationsDTO,
  UpdateEventCheckInSettingsDTO,
  UpdateEventDTO,
  UpdateRegistrationDTO,
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
  accumulateAllPages?: boolean;
}

export interface EventOccurrenceQuery {
  startDate?: string;
  endDate?: string;
  eventId?: string;
  search?: string;
  eventType?: string;
  status?: string;
  isPublic?: boolean;
  includeCancelled?: boolean;
}

export interface EventCatalogPort {
  listEvents(query?: EventListQuery): Promise<PaginatedEvents>;
  getEventById(eventId: string): Promise<Event>;
  listEventOccurrences(query?: EventOccurrenceQuery): Promise<EventOccurrence[]>;
}

export interface EventRegistrationPort {
  listEventRegistrations(eventId: string, filters?: RegistrationFilters): Promise<EventRegistration[]>;
  registerContact(eventId: string, contactId: string): Promise<void>;
  updateRegistration(registrationId: string, payload: UpdateRegistrationDTO): Promise<EventRegistration>;
  checkInRegistration(registrationId: string): Promise<EventRegistration>;
  scanCheckIn(eventId: string, token: string): Promise<EventRegistration>;
  scanCheckInGlobal(token: string): Promise<EventRegistration>;
  getCheckInSettings(eventId: string, occurrenceId?: string): Promise<EventCheckInSettings>;
  updateCheckInSettings(
    eventId: string,
    payload: UpdateEventCheckInSettingsDTO
  ): Promise<EventCheckInSettings>;
  rotateCheckInPin(eventId: string, occurrenceId?: string): Promise<RotateEventCheckInPinResult>;
  walkInCheckIn(eventId: string, payload: EventWalkInCheckInDTO): Promise<EventWalkInCheckInResult>;
  getPublicCheckInInfo(eventId: string, occurrenceId?: string): Promise<PublicEventCheckInInfo>;
  submitPublicCheckIn(eventId: string, payload: PublicEventCheckInDTO): Promise<PublicEventCheckInResult>;
  cancelRegistration(registrationId: string): Promise<void>;
  sendRegistrationConfirmationEmail(registrationId: string): Promise<EventConfirmationEmailResult>;
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
