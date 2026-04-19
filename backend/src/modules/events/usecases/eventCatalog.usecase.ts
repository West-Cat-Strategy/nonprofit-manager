import type {
  EventFilters,
  PaginationParams,
  Event,
  EventAttendanceSummary,
  CreateEventDTO,
  EventMutationScope,
  EventOccurrence,
  PaginatedEvents,
  UpdateEventOccurrenceDTO,
  PublicEventsListData,
  PublicEventsQuery,
  PublicEventDetail,
  UpdateEventDTO,
} from '@app-types/event';
import type { DataScopeFilter } from '@app-types/dataScope';
import { EventRepository } from '../repositories/eventRepository';

export class EventCatalogUseCase {
  constructor(private readonly repository: EventRepository) {}

  list(
    filters: EventFilters,
    pagination: PaginationParams,
    scope?: DataScopeFilter
  ): Promise<PaginatedEvents> {
    return this.repository.getEvents(filters, pagination, scope);
  }

  getById(eventId: string, scope?: DataScopeFilter): Promise<Event | null> {
    return this.repository.getEventById(eventId, scope);
  }

  listOccurrences(
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
    return this.repository.listEventOccurrences(filters, scope);
  }

  getOccurrenceById(
    occurrenceId: string,
    scope?: DataScopeFilter
  ): Promise<EventOccurrence | null> {
    return this.repository.getEventOccurrenceById(occurrenceId, scope);
  }

  updateOccurrence(
    occurrenceId: string,
    data: UpdateEventOccurrenceDTO,
    scope: EventMutationScope,
    userId: string
  ): Promise<EventOccurrence | null> {
    return this.repository.updateEventOccurrence(occurrenceId, data, scope, userId);
  }

  listPublicByOwner(ownerUserId: string, query: PublicEventsQuery): Promise<PublicEventsListData> {
    return this.repository.listPublicEventsByOwner(ownerUserId, query);
  }

  getPublicBySlug(ownerUserId: string, slug: string): Promise<PublicEventDetail | null> {
    return this.repository.getPublicEventBySlug(ownerUserId, slug);
  }

  create(data: CreateEventDTO, userId: string, organizationId: string): Promise<Event> {
    return this.repository.createEvent(data, userId, organizationId);
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
