/**
 * Event Service
 * Facade for event domain behavior.
 */

import { Pool } from 'pg';
import pool from '@config/database';
import type { DataScopeFilter } from '@app-types/dataScope';
import type {
  CheckInOptions,
  CheckInResult,
  CreateEventDTO,
  CreateRegistrationDTO,
  Event,
  EventCheckInSettings,
  EventFilters,
  EventRegistration,
  EventReminderSummary,
  EventWalkInCheckInDTO,
  EventWalkInCheckInResult,
  PaginationParams,
  PaginatedEvents,
  PublicEventCheckInDTO,
  PublicEventCheckInInfo,
  PublicEventCheckInResult,
  PublicEventDetail,
  PublicEventRegistrationDTO,
  PublicEventRegistrationResult,
  PublicEventsListData,
  PublicEventsQuery,
  RegistrationFilters,
  RotateEventCheckInPinResult,
  SendEventRemindersContext,
  SendEventRemindersDTO,
  UpdateEventCheckInSettingsDTO,
  UpdateEventDTO,
  UpdateRegistrationDTO,
} from '@app-types/event';
import { EventCatalogService } from './eventCatalogService';
import { EventRegistrationService } from './eventRegistrationService';
import { EventPublicService } from './eventPublicService';
import { EventReminderService } from './eventReminderService';
import { EventParticipantSupport } from './shared';

export class EventService {
  private readonly catalog: EventCatalogService;
  private readonly registration: EventRegistrationService;
  private readonly publicEvents: EventPublicService;
  private readonly reminders: EventReminderService;

  constructor(pool: Pool) {
    const participantSupport = new EventParticipantSupport(pool);

    this.catalog = new EventCatalogService(pool);
    this.registration = new EventRegistrationService(pool, participantSupport);
    this.publicEvents = new EventPublicService(pool, this.registration, participantSupport);
    this.reminders = new EventReminderService(pool);
  }

  async getEvents(
    filters: EventFilters = {},
    pagination: PaginationParams = {},
    scope?: DataScopeFilter
  ): Promise<PaginatedEvents> {
    return this.catalog.getEvents(filters, pagination, scope);
  }

  async getEventById(eventId: string, scope?: DataScopeFilter): Promise<Event | null> {
    return this.catalog.getEventById(eventId, scope);
  }

  async getEventAttendanceSummary(
    referenceDate: Date = new Date(),
    scope?: DataScopeFilter
  ): Promise<{
    upcoming_events: number;
    total_this_month: number;
    avg_attendance: number;
  }> {
    return this.catalog.getEventAttendanceSummary(referenceDate, scope);
  }

  async createEvent(eventData: CreateEventDTO, userId: string): Promise<Event> {
    return this.catalog.createEvent(eventData, userId);
  }

  async updateEvent(eventId: string, eventData: UpdateEventDTO, userId: string): Promise<Event> {
    return this.catalog.updateEvent(eventId, eventData, userId);
  }

  async deleteEvent(eventId: string, userId: string): Promise<void> {
    return this.catalog.deleteEvent(eventId, userId);
  }

  async getEventRegistrations(
    eventId: string,
    filters: RegistrationFilters = {}
  ): Promise<EventRegistration[]> {
    return this.registration.getEventRegistrations(eventId, filters);
  }

  async getContactRegistrations(contactId: string, scope?: DataScopeFilter): Promise<EventRegistration[]> {
    return this.registration.getContactRegistrations(contactId, scope);
  }

  async getRegistrationById(registrationId: string): Promise<EventRegistration | null> {
    return this.registration.getRegistrationById(registrationId);
  }

  async getRegistrationByToken(eventId: string, token: string): Promise<EventRegistration | null> {
    return this.registration.getRegistrationByToken(eventId, token);
  }

  async getRegistrationByTokenGlobal(token: string, scope?: DataScopeFilter): Promise<EventRegistration | null> {
    return this.registration.getRegistrationByTokenGlobal(token, scope);
  }

  async registerContact(registrationData: CreateRegistrationDTO): Promise<EventRegistration> {
    return this.registration.registerContact(registrationData);
  }

  async updateRegistration(
    registrationId: string,
    updateData: UpdateRegistrationDTO
  ): Promise<EventRegistration> {
    return this.registration.updateRegistration(registrationId, updateData);
  }

  async checkInAttendee(registrationId: string, options: CheckInOptions = {}): Promise<CheckInResult> {
    return this.registration.checkInAttendee(registrationId, options);
  }

  async cancelRegistration(registrationId: string): Promise<void> {
    return this.registration.cancelRegistration(registrationId);
  }

  async getEventCheckInSettings(eventId: string): Promise<EventCheckInSettings | null> {
    return this.registration.getEventCheckInSettings(eventId);
  }

  async updateEventCheckInSettings(
    eventId: string,
    data: UpdateEventCheckInSettingsDTO,
    userId: string
  ): Promise<EventCheckInSettings | null> {
    return this.registration.updateEventCheckInSettings(eventId, data, userId);
  }

  async rotateEventCheckInPin(eventId: string, userId: string): Promise<RotateEventCheckInPinResult> {
    return this.registration.rotateEventCheckInPin(eventId, userId);
  }

  async walkInCheckIn(
    eventId: string,
    data: EventWalkInCheckInDTO,
    checkedInBy: string
  ): Promise<EventWalkInCheckInResult> {
    return this.registration.walkInCheckIn(eventId, data, checkedInBy);
  }

  async getPublicCheckInInfo(eventId: string): Promise<PublicEventCheckInInfo | null> {
    return this.publicEvents.getPublicCheckInInfo(eventId);
  }

  async submitPublicCheckIn(
    eventId: string,
    data: PublicEventCheckInDTO
  ): Promise<PublicEventCheckInResult> {
    return this.publicEvents.submitPublicCheckIn(eventId, data);
  }

  async listPublicEventsByOwner(
    ownerUserId: string,
    query: PublicEventsQuery = {}
  ): Promise<PublicEventsListData> {
    return this.publicEvents.listPublicEventsByOwner(ownerUserId, query);
  }

  async getPublicEventBySlug(ownerUserId: string, slug: string): Promise<PublicEventDetail | null> {
    return this.publicEvents.getPublicEventBySlug(ownerUserId, slug);
  }

  async submitPublicRegistration(
    eventId: string,
    data: PublicEventRegistrationDTO
  ): Promise<PublicEventRegistrationResult> {
    return this.publicEvents.submitPublicRegistration(eventId, data);
  }

  async sendEventReminders(
    eventId: string,
    reminderOptions: SendEventRemindersDTO,
    context: SendEventRemindersContext = {}
  ): Promise<EventReminderSummary> {
    return this.reminders.sendEventReminders(eventId, reminderOptions, context);
  }
}

export default new EventService(pool);
