import type {
  CheckInOptions,
  CreateEventDTO,
  EventRegistrationMutationContext,
  EventCheckInSettings,
  EventConfirmationEmailResult,
  CreateRegistrationDTO,
  EventWalkInCheckInDTO,
  EventWalkInCheckInResult,
  EventFilters,
  EventMutationScope,
  EventOccurrence,
  PaginationParams,
  PublicEventsListData,
  PublicEventsQuery,
  PublicEventDetail,
  PublicEventCheckInDTO,
  PublicEventCheckInInfo,
  PublicEventCheckInResult,
  PublicEventRegistrationDTO,
  PublicEventRegistrationResult,
  RegistrationFilters,
  RotateEventCheckInPinResult,
  SendEventRemindersDTO,
  UpdateEventCheckInSettingsDTO,
  UpdateEventOccurrenceDTO,
  UpdateEventDTO,
  UpdateRegistrationDTO,
} from '@app-types/event';
import type { DataScopeFilter } from '@app-types/dataScope';

export interface EventCatalogPort {
  getEvents(filters: EventFilters, pagination: PaginationParams, scope?: DataScopeFilter): Promise<unknown>;
  getEventById(eventId: string, scope?: DataScopeFilter): Promise<unknown | null>;
  listEventOccurrences(
    filters: {
      event_id?: string;
      start_date?: Date;
      end_date?: Date;
      include_cancelled?: boolean;
    },
    scope?: DataScopeFilter
  ): Promise<EventOccurrence[]>;
  getEventOccurrenceById(occurrenceId: string, scope?: DataScopeFilter): Promise<EventOccurrence | null>;
  updateEventOccurrence(
    occurrenceId: string,
    data: UpdateEventOccurrenceDTO,
    scope: EventMutationScope,
    userId: string
  ): Promise<EventOccurrence | null>;
  listPublicEventsByOwner(ownerUserId: string, query: PublicEventsQuery): Promise<PublicEventsListData>;
  getPublicEventBySlug(ownerUserId: string, slug: string): Promise<PublicEventDetail | null>;
  createEvent(data: CreateEventDTO, userId: string): Promise<unknown>;
  updateEvent(eventId: string, data: UpdateEventDTO, userId: string): Promise<unknown | null>;
  deleteEvent(eventId: string, userId: string): Promise<void>;
  getEventAttendanceSummary(referenceDate: Date, scope?: DataScopeFilter): Promise<unknown>;
}

export interface EventRegistrationPort {
  getEventRegistrations(eventId: string, filters?: RegistrationFilters): Promise<unknown[]>;
  getContactRegistrations(contactId: string, scope?: DataScopeFilter): Promise<unknown[]>;
  getRegistrationByTokenGlobal(token: string, scope?: DataScopeFilter): Promise<unknown | null>;
  registerContact(
    data: CreateRegistrationDTO,
    context?: EventRegistrationMutationContext
  ): Promise<unknown>;
  updateRegistration(
    registrationId: string,
    data: UpdateRegistrationDTO,
    context?: EventRegistrationMutationContext
  ): Promise<unknown | null>;
  checkInAttendee(
    registrationId: string,
    options?: CheckInOptions
  ): Promise<{ success: boolean; message: string; registration?: unknown }>;
  cancelRegistration(registrationId: string): Promise<void>;
  getEventCheckInSettings(eventId: string, occurrenceId?: string): Promise<EventCheckInSettings | null>;
  updateEventCheckInSettings(
    eventId: string,
    data: UpdateEventCheckInSettingsDTO,
    userId: string
  ): Promise<EventCheckInSettings | null>;
  rotateEventCheckInPin(
    eventId: string,
    userId: string,
    occurrenceId?: string
  ): Promise<RotateEventCheckInPinResult>;
  walkInCheckIn(
    eventId: string,
    data: EventWalkInCheckInDTO,
    checkedInBy: string
  ): Promise<EventWalkInCheckInResult>;
  submitPublicRegistration(
    eventId: string,
    data: PublicEventRegistrationDTO
  ): Promise<PublicEventRegistrationResult>;
  sendRegistrationConfirmationEmail(
    registrationId: string,
    sentBy: string | null
  ): Promise<EventConfirmationEmailResult>;
  getPublicCheckInInfo(eventId: string, occurrenceId?: string): Promise<PublicEventCheckInInfo | null>;
  submitPublicCheckIn(eventId: string, data: PublicEventCheckInDTO): Promise<PublicEventCheckInResult>;
}

export interface EventReminderPort {
  sendEventReminders(
    eventId: string,
    data: SendEventRemindersDTO,
    context: { triggerType: 'manual'; sentBy: string | null }
  ): Promise<unknown>;
}
