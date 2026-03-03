import type {
  CheckInOptions,
  CreateRegistrationDTO,
  EventRegistration,
  RegistrationFilters,
  UpdateRegistrationDTO,
} from '@app-types/event';
import { EventRepository } from '../repositories/eventRepository';

export class EventRegistrationUseCase {
  constructor(private readonly repository: EventRepository) {}

  listByEvent(eventId: string, filters?: RegistrationFilters): Promise<unknown[]> {
    return this.repository.getEventRegistrations(eventId, filters);
  }

  listByContact(contactId: string): Promise<unknown[]> {
    return this.repository.getContactRegistrations(contactId);
  }

  getById(registrationId: string): Promise<EventRegistration | null> {
    return this.repository.getRegistrationById(registrationId);
  }

  getByToken(eventId: string, token: string): Promise<EventRegistration | null> {
    return this.repository.getRegistrationByToken(eventId, token);
  }

  register(data: CreateRegistrationDTO): Promise<unknown> {
    return this.repository.registerContact(data);
  }

  update(registrationId: string, data: UpdateRegistrationDTO): Promise<unknown | null> {
    return this.repository.updateRegistration(registrationId, data);
  }

  checkIn(
    registrationId: string,
    options?: CheckInOptions
  ): Promise<{ success: boolean; message: string; registration?: unknown }> {
    return this.repository.checkInAttendee(registrationId, options);
  }

  cancel(registrationId: string): Promise<void> {
    return this.repository.cancelRegistration(registrationId);
  }
}
