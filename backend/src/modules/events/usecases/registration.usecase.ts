import type {
  CheckInOptions,
  CheckInResult,
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

  register(data: CreateRegistrationDTO): Promise<EventRegistration> {
    return this.repository.registerContact(data);
  }

  update(registrationId: string, data: UpdateRegistrationDTO): Promise<EventRegistration> {
    return this.repository.updateRegistration(registrationId, data);
  }

  checkIn(registrationId: string, options?: CheckInOptions): Promise<CheckInResult> {
    return this.repository.checkInAttendee(registrationId, options);
  }

  cancel(registrationId: string): Promise<void> {
    return this.repository.cancelRegistration(registrationId);
  }

  getCheckInSettings(eventId: string): Promise<EventCheckInSettings | null> {
    return this.repository.getEventCheckInSettings(eventId);
  }

  updateCheckInSettings(
    eventId: string,
    data: UpdateEventCheckInSettingsDTO,
    userId: string
  ): Promise<EventCheckInSettings | null> {
    return this.repository.updateEventCheckInSettings(eventId, data, userId);
  }

  rotateCheckInPin(eventId: string, userId: string): Promise<RotateEventCheckInPinResult> {
    return this.repository.rotateEventCheckInPin(eventId, userId);
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

  getPublicCheckInInfo(eventId: string): Promise<PublicEventCheckInInfo | null> {
    return this.repository.getPublicCheckInInfo(eventId);
  }

  submitPublicCheckIn(eventId: string, data: PublicEventCheckInDTO): Promise<PublicEventCheckInResult> {
    return this.repository.submitPublicCheckIn(eventId, data);
  }
}
