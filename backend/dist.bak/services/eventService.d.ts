/**
 * Event Service
 * Business logic for event management and registrations
 */
import { Pool } from 'pg';
import { Event, CreateEventDTO, UpdateEventDTO, EventFilters, PaginationParams, PaginatedEvents, EventRegistration, CreateRegistrationDTO, UpdateRegistrationDTO, RegistrationFilters, CheckInResult } from '../types/event';
import type { DataScopeFilter } from '../types/dataScope';
export declare class EventService {
    private pool;
    constructor(pool: Pool);
    /**
     * Get all events with filtering and pagination
     */
    getEvents(filters?: EventFilters, pagination?: PaginationParams, scope?: DataScopeFilter): Promise<PaginatedEvents>;
    /**
     * Get event by ID
     */
    getEventById(eventId: string, scope?: DataScopeFilter): Promise<Event | null>;
    /**
     * Get event attendance summary for dashboard widgets
     */
    getEventAttendanceSummary(referenceDate?: Date, scope?: DataScopeFilter): Promise<{
        upcoming_events: number;
        total_this_month: number;
        avg_attendance: number;
    }>;
    /**
     * Create new event
     */
    createEvent(eventData: CreateEventDTO, userId: string): Promise<Event>;
    /**
     * Update event
     */
    updateEvent(eventId: string, eventData: UpdateEventDTO, userId: string): Promise<Event>;
    /**
     * Delete event (soft delete by setting status to cancelled)
     */
    deleteEvent(eventId: string, userId: string): Promise<void>;
    /**
     * Get registrations for an event
     */
    getEventRegistrations(eventId: string, filters?: RegistrationFilters): Promise<EventRegistration[]>;
    /**
     * Get registrations for a contact
     */
    getContactRegistrations(contactId: string): Promise<EventRegistration[]>;
    /**
     * Register contact for event
     */
    registerContact(registrationData: CreateRegistrationDTO): Promise<EventRegistration>;
    /**
     * Update registration
     */
    updateRegistration(registrationId: string, updateData: UpdateRegistrationDTO): Promise<EventRegistration>;
    /**
     * Check in attendee
     */
    checkInAttendee(registrationId: string): Promise<CheckInResult>;
    /**
     * Cancel registration
     */
    cancelRegistration(registrationId: string): Promise<void>;
}
declare const _default: EventService;
export default _default;
//# sourceMappingURL=eventService.d.ts.map