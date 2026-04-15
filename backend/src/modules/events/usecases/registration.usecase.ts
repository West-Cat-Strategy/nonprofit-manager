import type {
  CheckInOptions,
  CheckInResult,
  EventConfirmationEmailResult,
  EventRegistrationMutationContext,
  EventCheckInSettings,
  CreateRegistrationDTO,
  EventRegistration,
  EventWalkInCheckInDTO,
  EventWalkInCheckInResult,
  PublicEventCheckInDTO,
  PublicEventCheckInInfo,
  PublicEventCheckInResult,
  PublicEventRegistrationDTO,
  PublicEventRegistrationResult,
  RegistrationFilters,
  RotateEventCheckInPinResult,
  UpdateEventCheckInSettingsDTO,
  UpdateRegistrationDTO,
} from '@app-types/event';
import type { DataScopeFilter } from '@app-types/dataScope';
import { EventRepository } from '../repositories/eventRepository';

export class EventRegistrationUseCase {
  constructor(private readonly repository: EventRepository) {}

  listByEvent(eventId: string, filters?: RegistrationFilters): Promise<EventRegistration[]> {
    return this.repository.getEventRegistrations(eventId, filters);
  }

  listByContact(contactId: string, scope?: DataScopeFilter): Promise<EventRegistration[]> {
    return this.repository.getContactRegistrations(contactId, scope);
  }

  getById(registrationId: string): Promise<EventRegistration | null> {
    return this.repository.getRegistrationById(registrationId);
  }

  getByToken(eventId: string, token: string): Promise<EventRegistration | null> {
    return this.repository.getRegistrationByToken(eventId, token);
  }

  getByTokenGlobal(token: string, scope?: DataScopeFilter): Promise<EventRegistration | null> {
    return this.repository.getRegistrationByTokenGlobal(token, scope);
  }

  register(
    data: CreateRegistrationDTO,
    context?: EventRegistrationMutationContext
  ): Promise<EventRegistration> {
    return this.repository.registerContact(data, context);
  }

  update(
    registrationId: string,
    data: UpdateRegistrationDTO,
    context?: EventRegistrationMutationContext
  ): Promise<EventRegistration> {
    return this.repository.updateRegistration(registrationId, data, context);
  }

  checkIn(registrationId: string, options?: CheckInOptions): Promise<CheckInResult> {
    return this.repository.checkInAttendee(registrationId, options);
  }

  cancel(registrationId: string): Promise<void> {
    return this.repository.cancelRegistration(registrationId);
  }

  getCheckInSettings(eventId: string, occurrenceId?: string): Promise<EventCheckInSettings | null> {
    return this.repository.getEventCheckInSettings(eventId, occurrenceId);
  }

  updateCheckInSettings(
    eventId: string,
    data: UpdateEventCheckInSettingsDTO,
    userId: string
  ): Promise<EventCheckInSettings | null> {
    return this.repository.updateEventCheckInSettings(eventId, data, userId);
  }

  rotateCheckInPin(
    eventId: string,
    userId: string,
    occurrenceId?: string
  ): Promise<RotateEventCheckInPinResult> {
    return this.repository.rotateEventCheckInPin(eventId, userId, occurrenceId);
  }

  walkInCheckIn(
    eventId: string,
    data: EventWalkInCheckInDTO,
    checkedInBy: string
  ): Promise<EventWalkInCheckInResult> {
    return this.repository.walkInCheckIn(eventId, data, checkedInBy);
  }

  submitPublicRegistration(
    eventId: string,
    data: PublicEventRegistrationDTO
  ): Promise<PublicEventRegistrationResult> {
    return this.repository.submitPublicRegistration(eventId, data);
  }

  sendConfirmationEmail(
    registrationId: string,
    sentBy: string | null
  ): Promise<EventConfirmationEmailResult> {
    return this.repository.sendRegistrationConfirmationEmail(registrationId, sentBy);
  }

  getPublicCheckInInfo(
    eventId: string,
    occurrenceId?: string
  ): Promise<PublicEventCheckInInfo | null> {
    return this.repository.getPublicCheckInInfo(eventId, occurrenceId);
  }

  submitPublicCheckIn(eventId: string, data: PublicEventCheckInDTO): Promise<PublicEventCheckInResult> {
    return this.repository.submitPublicCheckIn(eventId, data);
  }
}
