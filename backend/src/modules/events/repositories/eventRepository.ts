import { services } from '@container/services';
import * as eventReminderAutomationService from '@services/eventReminderAutomationService';
import type { EventService } from '../services/eventService';
import type {
  CheckInOptions,
  CheckInResult,
  CreateEventDTO,
  Event,
  EventRegistrationMutationContext,
  EventAttendanceSummary,
  CreateEventReminderAutomationDTO,
  CreateRegistrationDTO,
  EventCheckInSettings,
  EventConfirmationEmailResult,
  EventRegistration,
  EventFilters,
  EventMutationScope,
  EventOccurrence,
  EventWalkInCheckInDTO,
  EventWalkInCheckInResult,
  EventReminderSummary,
  PaginationParams,
  PaginatedEvents,
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
  SyncEventReminderAutomationsDTO,
  UpdateEventDTO,
  UpdateEventReminderAutomationDTO,
  UpdateRegistrationDTO,
} from '@app-types/event';
import type { DataScopeFilter } from '@app-types/dataScope';

type EventServicePort = Pick<
  EventService,
  | 'getEvents'
  | 'getEventById'
  | 'listEventOccurrences'
  | 'getEventOccurrenceById'
  | 'updateEventOccurrence'
  | 'createEvent'
  | 'updateEvent'
  | 'deleteEvent'
  | 'getEventAttendanceSummary'
  | 'getEventRegistrations'
  | 'getContactRegistrations'
  | 'getRegistrationByTokenGlobal'
  | 'getRegistrationById'
  | 'getRegistrationByToken'
  | 'registerContact'
  | 'updateRegistration'
  | 'checkInAttendee'
  | 'cancelRegistration'
  | 'getEventCheckInSettings'
  | 'updateEventCheckInSettings'
  | 'rotateEventCheckInPin'
  | 'walkInCheckIn'
  | 'listPublicEventsByOwner'
  | 'getPublicEventBySlug'
  | 'submitPublicRegistration'
  | 'sendRegistrationConfirmationEmail'
  | 'getPublicCheckInInfo'
  | 'submitPublicCheckIn'
  | 'sendEventReminders'
>;

export class EventRepository {
  constructor(private readonly eventService: EventServicePort = services.event) {}

  getEvents(filters: EventFilters, pagination: PaginationParams, scope?: DataScopeFilter): Promise<PaginatedEvents> {
    return this.eventService.getEvents(filters, pagination, scope);
  }

  getEventById(eventId: string, scope?: DataScopeFilter): Promise<Event | null> {
    return this.eventService.getEventById(eventId, scope);
  }

  listEventOccurrences(
    filters: {
      event_id?: string;
      start_date?: Date;
      end_date?: Date;
      search?: string;
      event_type?: EventFilters['event_type'];
      status?: EventFilters['status'];
      is_public?: boolean;
      include_cancelled?: boolean;
    },
    scope?: DataScopeFilter
  ): Promise<EventOccurrence[]> {
    return this.eventService.listEventOccurrences(filters, scope);
  }

  getEventOccurrenceById(occurrenceId: string, scope?: DataScopeFilter): Promise<EventOccurrence | null> {
    return this.eventService.getEventOccurrenceById(occurrenceId, scope);
  }

  updateEventOccurrence(
    occurrenceId: string,
    data: UpdateEventOccurrenceDTO,
    scope: EventMutationScope,
    userId: string
  ): Promise<EventOccurrence | null> {
    return this.eventService.updateEventOccurrence(occurrenceId, data, scope, userId);
  }

  createEvent(data: CreateEventDTO, userId: string): Promise<Event> {
    return this.eventService.createEvent(data, userId);
  }

  updateEvent(eventId: string, data: UpdateEventDTO, userId: string): Promise<Event> {
    return this.eventService.updateEvent(eventId, data, userId);
  }

  deleteEvent(eventId: string, userId: string): Promise<void> {
    return this.eventService.deleteEvent(eventId, userId);
  }

  getEventAttendanceSummary(referenceDate: Date, scope?: DataScopeFilter): Promise<EventAttendanceSummary> {
    return this.eventService.getEventAttendanceSummary(referenceDate, scope);
  }

  getEventRegistrations(eventId: string, filters?: RegistrationFilters): Promise<EventRegistration[]> {
    return this.eventService.getEventRegistrations(eventId, filters);
  }

  getContactRegistrations(contactId: string, scope?: DataScopeFilter): Promise<EventRegistration[]> {
    return this.eventService.getContactRegistrations(contactId, scope);
  }

  getRegistrationByTokenGlobal(token: string, scope?: DataScopeFilter): Promise<EventRegistration | null> {
    return this.eventService.getRegistrationByTokenGlobal(token, scope);
  }

  getRegistrationById(registrationId: string): Promise<EventRegistration | null> {
    return this.eventService.getRegistrationById(registrationId);
  }

  getRegistrationByToken(eventId: string, token: string): Promise<EventRegistration | null> {
    return this.eventService.getRegistrationByToken(eventId, token);
  }

  registerContact(
    data: CreateRegistrationDTO,
    context?: EventRegistrationMutationContext
  ): Promise<EventRegistration> {
    return this.eventService.registerContact(data, context);
  }

  updateRegistration(
    registrationId: string,
    data: UpdateRegistrationDTO,
    scope: EventMutationScope,
    context?: EventRegistrationMutationContext
  ): Promise<EventRegistration> {
    return this.eventService.updateRegistration(registrationId, data, scope, context);
  }

  checkInAttendee(registrationId: string, options?: CheckInOptions): Promise<CheckInResult> {
    return this.eventService.checkInAttendee(registrationId, options);
  }

  cancelRegistration(registrationId: string): Promise<void> {
    return this.eventService.cancelRegistration(registrationId);
  }

  getEventCheckInSettings(eventId: string, occurrenceId?: string): Promise<EventCheckInSettings | null> {
    return this.eventService.getEventCheckInSettings(eventId, occurrenceId);
  }

  updateEventCheckInSettings(
    eventId: string,
    data: UpdateEventCheckInSettingsDTO,
    userId: string
  ): Promise<EventCheckInSettings | null> {
    return this.eventService.updateEventCheckInSettings(eventId, data, userId);
  }

  rotateEventCheckInPin(
    eventId: string,
    userId: string,
    occurrenceId?: string
  ): Promise<RotateEventCheckInPinResult> {
    return this.eventService.rotateEventCheckInPin(eventId, userId, occurrenceId);
  }

  walkInCheckIn(
    eventId: string,
    data: EventWalkInCheckInDTO,
    checkedInBy: string
  ): Promise<EventWalkInCheckInResult> {
    return this.eventService.walkInCheckIn(eventId, data, checkedInBy);
  }

  listPublicEventsByOwner(ownerUserId: string, query: PublicEventsQuery): Promise<PublicEventsListData> {
    return this.eventService.listPublicEventsByOwner(ownerUserId, query);
  }

  getPublicEventBySlug(ownerUserId: string, slug: string): Promise<PublicEventDetail | null> {
    return this.eventService.getPublicEventBySlug(ownerUserId, slug);
  }

  submitPublicRegistration(
    eventId: string,
    data: PublicEventRegistrationDTO
  ): Promise<PublicEventRegistrationResult> {
    return this.eventService.submitPublicRegistration(eventId, data);
  }

  sendRegistrationConfirmationEmail(
    registrationId: string,
    sentBy: string | null
  ): Promise<EventConfirmationEmailResult> {
    return this.eventService.sendRegistrationConfirmationEmail(registrationId, sentBy);
  }

  getPublicCheckInInfo(eventId: string, occurrenceId?: string): Promise<PublicEventCheckInInfo | null> {
    return this.eventService.getPublicCheckInInfo(eventId, occurrenceId);
  }

  submitPublicCheckIn(eventId: string, data: PublicEventCheckInDTO): Promise<PublicEventCheckInResult> {
    return this.eventService.submitPublicCheckIn(eventId, data);
  }

  sendEventReminders(
    eventId: string,
    data: SendEventRemindersDTO,
    context: { triggerType: 'manual'; sentBy: string | null }
  ): Promise<EventReminderSummary> {
    return this.eventService.sendEventReminders(eventId, data, context);
  }

  listReminderAutomations(eventId: string): Promise<unknown[]> {
    return eventReminderAutomationService.listEventReminderAutomations(eventId);
  }

  createReminderAutomation(
    eventId: string,
    data: CreateEventReminderAutomationDTO,
    userId: string
  ): Promise<unknown> {
    return eventReminderAutomationService.createEventReminderAutomation(eventId, data, userId);
  }

  updateReminderAutomation(
    eventId: string,
    automationId: string,
    data: UpdateEventReminderAutomationDTO,
    userId: string
  ): Promise<unknown> {
    return eventReminderAutomationService.updateEventReminderAutomation(eventId, automationId, data, userId);
  }

  cancelReminderAutomation(eventId: string, automationId: string, userId: string): Promise<unknown> {
    return eventReminderAutomationService.cancelEventReminderAutomation(eventId, automationId, userId);
  }

  syncReminderAutomations(eventId: string, data: SyncEventReminderAutomationsDTO, userId: string): Promise<unknown[]> {
    return eventReminderAutomationService.syncPendingEventReminderAutomations(eventId, data, userId);
  }
}
