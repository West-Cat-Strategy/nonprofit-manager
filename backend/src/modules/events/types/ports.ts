import type {
  CheckInOptions,
  CreateEventDTO,
  EventCheckInSettings,
  CreateRegistrationDTO,
  EventWalkInCheckInDTO,
  EventWalkInCheckInResult,
  EventFilters,
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
  UpdateEventDTO,
  UpdateRegistrationDTO,
} from '@app-types/event';
import type { DataScopeFilter } from '@app-types/dataScope';

export interface EventCatalogPort {
  getEvents(filters: EventFilters, pagination: PaginationParams, scope?: DataScopeFilter): Promise<unknown>;
  getEventById(eventId: string, scope?: DataScopeFilter): Promise<unknown | null>;
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
  registerContact(data: CreateRegistrationDTO): Promise<unknown>;
  updateRegistration(registrationId: string, data: UpdateRegistrationDTO): Promise<unknown | null>;
  checkInAttendee(
    registrationId: string,
    options?: CheckInOptions
  ): Promise<{ success: boolean; message: string; registration?: unknown }>;
  cancelRegistration(registrationId: string): Promise<void>;
  getEventCheckInSettings(eventId: string): Promise<EventCheckInSettings | null>;
  updateEventCheckInSettings(
    eventId: string,
    data: UpdateEventCheckInSettingsDTO,
    userId: string
  ): Promise<EventCheckInSettings | null>;
  rotateEventCheckInPin(eventId: string, userId: string): Promise<RotateEventCheckInPinResult>;
  walkInCheckIn(
    eventId: string,
    data: EventWalkInCheckInDTO,
    checkedInBy: string
  ): Promise<EventWalkInCheckInResult>;
  submitPublicRegistration(
    eventId: string,
    data: PublicEventRegistrationDTO
  ): Promise<PublicEventRegistrationResult>;
  getPublicCheckInInfo(eventId: string): Promise<PublicEventCheckInInfo | null>;
  submitPublicCheckIn(eventId: string, data: PublicEventCheckInDTO): Promise<PublicEventCheckInResult>;
}

export interface EventReminderPort {
  sendEventReminders(
    eventId: string,
    data: SendEventRemindersDTO,
    context: { triggerType: 'manual'; sentBy: string | null }
  ): Promise<unknown>;
}
