import type {
  EventFilters,
  PaginationParams,
  Event,
  EventAttendanceSummary,
  CreateEventDTO,
  PaginatedEvents,
  PublicEventsListData,
  PublicEventsQuery,
  PublicEventDetail,
  UpdateEventDTO,
} from '@app-types/event';
import type { DataScopeFilter } from '@app-types/dataScope';
import { EventRepository } from '../repositories/eventRepository';

export class EventCatalogUseCase {
  constructor(private readonly repository: EventRepository) {}

  list(filters: EventFilters, pagination: PaginationParams, scope?: DataScopeFilter): Promise<PaginatedEvents> {
    return this.repository.getEvents(filters, pagination, scope);
  }

  getById(eventId: string, scope?: DataScopeFilter): Promise<Event | null> {
    return this.repository.getEventById(eventId, scope);
  }

  listPublicByOwner(ownerUserId: string, query: PublicEventsQuery): Promise<PublicEventsListData> {
    return this.repository.listPublicEventsByOwner(ownerUserId, query);
  }

  getPublicBySlug(ownerUserId: string, slug: string): Promise<PublicEventDetail | null> {
    return this.repository.getPublicEventBySlug(ownerUserId, slug);
  }

  create(data: CreateEventDTO, userId: string): Promise<Event> {
    return this.repository.createEvent(data, userId);
  }

  update(eventId: string, data: UpdateEventDTO, userId: string): Promise<Event> {
    return this.repository.updateEvent(eventId, data, userId);
  }

  delete(eventId: string, userId: string): Promise<void> {
    return this.repository.deleteEvent(eventId, userId);
  }

  attendanceSummary(scope?: DataScopeFilter): Promise<EventAttendanceSummary> {
    return this.repository.getEventAttendanceSummary(new Date(), scope);
  }
}
