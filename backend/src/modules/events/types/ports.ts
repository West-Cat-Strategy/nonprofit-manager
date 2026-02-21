import type {
  CreateEventDTO,
  CreateRegistrationDTO,
  EventFilters,
  PaginationParams,
  RegistrationFilters,
  SendEventRemindersDTO,
  UpdateEventDTO,
  UpdateRegistrationDTO,
} from '@app-types/event';
import type { DataScopeFilter } from '@app-types/dataScope';

export interface EventCatalogPort {
  getEvents(filters: EventFilters, pagination: PaginationParams, scope?: DataScopeFilter): Promise<unknown>;
  getEventById(eventId: string, scope?: DataScopeFilter): Promise<unknown | null>;
  createEvent(data: CreateEventDTO, userId: string): Promise<unknown>;
  updateEvent(eventId: string, data: UpdateEventDTO, userId: string): Promise<unknown | null>;
  deleteEvent(eventId: string, userId: string): Promise<void>;
  getEventAttendanceSummary(referenceDate: Date, scope?: DataScopeFilter): Promise<unknown>;
}

export interface EventRegistrationPort {
  getEventRegistrations(eventId: string, filters?: RegistrationFilters): Promise<unknown[]>;
  getContactRegistrations(contactId: string): Promise<unknown[]>;
  registerContact(data: CreateRegistrationDTO): Promise<unknown>;
  updateRegistration(registrationId: string, data: UpdateRegistrationDTO): Promise<unknown | null>;
  checkInAttendee(registrationId: string): Promise<{ success: boolean; message: string; registration?: unknown }>;
  cancelRegistration(registrationId: string): Promise<void>;
}

export interface EventReminderPort {
  sendEventReminders(
    eventId: string,
    data: SendEventRemindersDTO,
    context: { triggerType: 'manual'; sentBy: string | null }
  ): Promise<unknown>;
}
