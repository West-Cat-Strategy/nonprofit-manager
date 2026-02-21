import { services } from '@container/services';
import * as eventReminderAutomationService from '@services/eventReminderAutomationService';
import type { EventService } from '@services/eventService';
import type {
  CreateEventDTO,
  CreateEventReminderAutomationDTO,
  CreateRegistrationDTO,
  EventFilters,
  PaginationParams,
  RegistrationFilters,
  SendEventRemindersDTO,
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
  | 'registerContact'
  | 'updateRegistration'
  | 'checkInAttendee'
  | 'cancelRegistration'
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

  getContactRegistrations(contactId: string): Promise<unknown[]> {
    return this.eventService.getContactRegistrations(contactId);
  }

  registerContact(data: CreateRegistrationDTO): Promise<unknown> {
    return this.eventService.registerContact(data);
  }

  updateRegistration(registrationId: string, data: UpdateRegistrationDTO): Promise<unknown | null> {
    return this.eventService.updateRegistration(registrationId, data);
  }

  checkInAttendee(registrationId: string): Promise<{ success: boolean; message: string; registration?: unknown }> {
    return this.eventService.checkInAttendee(registrationId);
  }

  cancelRegistration(registrationId: string): Promise<void> {
    return this.eventService.cancelRegistration(registrationId);
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
