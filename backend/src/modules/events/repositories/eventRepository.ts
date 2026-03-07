import { services } from '@container/services';
import * as eventReminderAutomationService from '@services/eventReminderAutomationService';
import type { EventService } from '../services/eventService';
import type {
  CheckInOptions,
  CreateEventDTO,
  CreateEventReminderAutomationDTO,
  CreateRegistrationDTO,
  EventCheckInSettings,
  EventRegistration,
  EventFilters,
  EventWalkInCheckInDTO,
  EventWalkInCheckInResult,
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
  | 'getPublicCheckInInfo'
  | 'submitPublicCheckIn'
  | 'sendEventReminders'
>;

export class EventRepository {
  constructor(private readonly eventService: EventServicePort = services.event) {}

  getEvents(filters: EventFilters, pagination: PaginationParams, scope?: DataScopeFilter): Promise<unknown> {
    return this.eventService.getEvents(filters, pagination, scope);
  }

  getEventById(eventId: string, scope?: DataScopeFilter): Promise<unknown | null> {
    return this.eventService.getEventById(eventId, scope);
  }

  createEvent(data: CreateEventDTO, userId: string): Promise<unknown> {
    return this.eventService.createEvent(data, userId);
  }

  updateEvent(eventId: string, data: UpdateEventDTO, userId: string): Promise<unknown | null> {
    return this.eventService.updateEvent(eventId, data, userId);
  }

  deleteEvent(eventId: string, userId: string): Promise<void> {
    return this.eventService.deleteEvent(eventId, userId);
  }

  getEventAttendanceSummary(referenceDate: Date, scope?: DataScopeFilter): Promise<unknown> {
    return this.eventService.getEventAttendanceSummary(referenceDate, scope);
  }

  getEventRegistrations(eventId: string, filters?: RegistrationFilters): Promise<unknown[]> {
    return this.eventService.getEventRegistrations(eventId, filters);
  }

  getContactRegistrations(contactId: string, scope?: DataScopeFilter): Promise<unknown[]> {
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

  registerContact(data: CreateRegistrationDTO): Promise<unknown> {
    return this.eventService.registerContact(data);
  }

  updateRegistration(registrationId: string, data: UpdateRegistrationDTO): Promise<unknown | null> {
    return this.eventService.updateRegistration(registrationId, data);
  }

  checkInAttendee(
    registrationId: string,
    options?: CheckInOptions
  ): Promise<{ success: boolean; message: string; registration?: unknown }> {
    return this.eventService.checkInAttendee(registrationId, options);
  }

  cancelRegistration(registrationId: string): Promise<void> {
    return this.eventService.cancelRegistration(registrationId);
  }

  getEventCheckInSettings(eventId: string): Promise<EventCheckInSettings | null> {
    return this.eventService.getEventCheckInSettings(eventId);
  }

  updateEventCheckInSettings(
    eventId: string,
    data: UpdateEventCheckInSettingsDTO,
    userId: string
  ): Promise<EventCheckInSettings | null> {
    return this.eventService.updateEventCheckInSettings(eventId, data, userId);
  }

  rotateEventCheckInPin(eventId: string, userId: string): Promise<RotateEventCheckInPinResult> {
    return this.eventService.rotateEventCheckInPin(eventId, userId);
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

  getPublicCheckInInfo(eventId: string): Promise<PublicEventCheckInInfo | null> {
    return this.eventService.getPublicCheckInInfo(eventId);
  }

  submitPublicCheckIn(eventId: string, data: PublicEventCheckInDTO): Promise<PublicEventCheckInResult> {
    return this.eventService.submitPublicCheckIn(eventId, data);
  }

  sendEventReminders(
    eventId: string,
    data: SendEventRemindersDTO,
    context: { triggerType: 'manual'; sentBy: string | null }
  ): Promise<unknown> {
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
