import type { EventFilters, PaginationParams, CreateEventDTO, UpdateEventDTO } from '@app-types/event';
import type { DataScopeFilter } from '@app-types/dataScope';
import { EventRepository } from '../repositories/eventRepository';

export class EventCatalogUseCase {
  constructor(private readonly repository: EventRepository) {}

  list(filters: EventFilters, pagination: PaginationParams, scope?: DataScopeFilter): Promise<unknown> {
    return this.repository.getEvents(filters, pagination, scope);
  }

  getById(eventId: string, scope?: DataScopeFilter): Promise<unknown | null> {
    return this.repository.getEventById(eventId, scope);
  }

  create(data: CreateEventDTO, userId: string): Promise<unknown> {
    return this.repository.createEvent(data, userId);
  }

  update(eventId: string, data: UpdateEventDTO, userId: string): Promise<unknown | null> {
    return this.repository.updateEvent(eventId, data, userId);
  }

  delete(eventId: string, userId: string): Promise<void> {
    return this.repository.deleteEvent(eventId, userId);
  }

  attendanceSummary(scope?: DataScopeFilter): Promise<unknown> {
    return this.repository.getEventAttendanceSummary(new Date(), scope);
  }
}
