import { Pool } from 'pg';
import { EventService } from '@modules/events/services/eventService';
import { EventType, EventStatus, RegistrationStatus } from '../../types/event';
import { sendMail } from '@services/emailService';
import { getEmailSettings } from '@services/emailSettingsService';
import { sendSms } from '@services/twilioSmsService';
import { getTwilioSettings } from '@services/twilioSettingsService';
import { cancelPendingAutomationsForEvent } from '@services/eventReminderAutomationService';

jest.mock('@services/emailService', () => ({
  sendMail: jest.fn(),
}));

jest.mock('@services/emailSettingsService', () => ({
  getEmailSettings: jest.fn(),
}));

jest.mock('@services/twilioSmsService', () => ({
  sendSms: jest.fn(),
}));

jest.mock('@services/twilioSettingsService', () => ({
  getTwilioSettings: jest.fn(),
}));

jest.mock('@services/eventReminderAutomationService', () => ({
  cancelPendingAutomationsForEvent: jest.fn(),
}));

// Create mock pool
const mockQuery = jest.fn();
const mockConnect = jest.fn();
const mockClientRelease = jest.fn();
const mockClientQuery = jest.fn((sql: string, params?: unknown[]) => {
  const normalized = sql.trim().toUpperCase();
  if (normalized === 'BEGIN' || normalized === 'COMMIT' || normalized === 'ROLLBACK') {
    return Promise.resolve({ rows: [], rowCount: 0 });
  }
  return mockQuery(sql, params);
});
const mockPool = {
  query: mockQuery,
  connect: mockConnect,
} as unknown as Pool;

const buildOccurrenceRow = (overrides: Record<string, unknown> = {}) => ({
  occurrence_id: 'occ-123',
  event_id: 'event-123',
  sequence_index: 0,
  occurrence_index: 0,
  series_id: 'event-123',
  scheduled_start_date: new Date('2026-06-15T18:00:00Z'),
  scheduled_end_date: new Date('2026-06-15T20:00:00Z'),
  start_date: new Date('2026-06-15T18:00:00Z'),
  end_date: new Date('2026-06-15T20:00:00Z'),
  status: EventStatus.PLANNED,
  event_name: 'Mock Event',
  occurrence_name: 'Mock Event',
  description: null,
  event_type: EventType.MEETING,
  is_public: false,
  location_name: null,
  address_line1: null,
  address_line2: null,
  city: null,
  state_province: null,
  postal_code: null,
  country: null,
  capacity: null,
  registered_count: 0,
  attended_count: 0,
  waitlist_enabled: true,
  public_checkin_enabled: false,
  public_checkin_pin_configured: false,
  public_checkin_pin_required: false,
  public_checkin_pin_rotated_at: null,
  is_exception: false,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
  created_by: 'user-123',
  modified_by: 'user-123',
  ...overrides,
});

const buildSeriesRow = (overrides: Record<string, unknown> = {}) => ({
  event_id: 'event-123',
  event_name: 'Mock Event',
  description: null,
  status: EventStatus.PLANNED,
  start_date: new Date('2026-06-15T18:00:00Z'),
  end_date: new Date('2026-06-15T20:00:00Z'),
  location_name: null,
  address_line1: null,
  address_line2: null,
  city: null,
  state_province: null,
  postal_code: null,
  country: null,
  capacity: null,
  waitlist_enabled: true,
  public_checkin_enabled: false,
  public_checkin_pin_hash: null,
  public_checkin_pin_rotated_at: null,
  recurrence_pattern: null,
  recurrence_interval: null,
  recurrence_end_date: null,
  is_recurring: false,
  created_by: 'user-123',
  modified_by: 'user-123',
  ...overrides,
});

const queueEventSyncAndFetch = (eventId: string, summaryRow: Record<string, unknown>) => {
  mockQuery
    .mockResolvedValueOnce({ rows: [buildSeriesRow({ event_id: eventId, event_name: summaryRow.event_name ?? 'Mock Event' })] })
    .mockResolvedValueOnce({ rows: [], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [summaryRow] })
    .mockResolvedValueOnce({ rows: [] });
};

describe('EventService', () => {
  let eventService: EventService;
  const mockSendMail = sendMail as jest.MockedFunction<typeof sendMail>;
  const mockGetEmailSettings = getEmailSettings as jest.MockedFunction<typeof getEmailSettings>;
  const mockSendSms = sendSms as jest.MockedFunction<typeof sendSms>;
  const mockGetTwilioSettings = getTwilioSettings as jest.MockedFunction<typeof getTwilioSettings>;
  const mockCancelPendingAutomationsForEvent =
    cancelPendingAutomationsForEvent as jest.MockedFunction<typeof cancelPendingAutomationsForEvent>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      const normalized = sql.replace(/\s+/g, ' ').trim();

      if (
        normalized.includes('FROM event_registrations er') &&
        normalized.includes('WHERE er.id = $1') &&
        normalized.includes('LIMIT 1')
      ) {
        return Promise.resolve({
          rows: [{ registration_id: String(params?.[0] ?? 'registration-1'), checked_in: true }],
          rowCount: 1,
        });
      }

      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    mockConnect.mockReset();
    mockClientRelease.mockReset();
    mockClientQuery.mockClear();
    eventService = new EventService(mockPool);
    mockConnect.mockResolvedValue({
      query: mockClientQuery,
      release: mockClientRelease,
    });
    mockCancelPendingAutomationsForEvent.mockResolvedValue(0);
  });

  describe('getEvents', () => {
    it('should return paginated events with default pagination', async () => {
      const mockEvents = [
        { event_id: '1', event_name: 'Summer Gala', event_type: 'fundraiser', status: 'planned' },
        { event_id: '2', event_name: 'Workshop', event_type: 'training', status: 'planned' },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: mockEvents });

      const result = await eventService.getEvents();

      expect(result.data).toEqual(mockEvents);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should apply search filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ event_id: '1', event_name: 'Summer Gala' }] });

      await eventService.getEvents({ search: 'Summer' });

      const countCall = mockQuery.mock.calls[0];
      expect(countCall[1]).toContain('%Summer%');
    });

    it('should apply event_type filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ event_id: '1', event_type: 'fundraiser' }] });

      await eventService.getEvents({ event_type: EventType.FUNDRAISER });

      const countCall = mockQuery.mock.calls[0];
      expect(countCall[1]).toContain('fundraiser');
    });

    it('should apply status filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ event_id: '1', status: 'completed' }] });

      await eventService.getEvents({ status: EventStatus.COMPLETED });

      const countCall = mockQuery.mock.calls[0];
      expect(countCall[1]).toContain('completed');
    });

    it('should apply is_public filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ event_id: '1', is_public: true }] });

      await eventService.getEvents({ is_public: true });

      const countCall = mockQuery.mock.calls[0];
      expect(countCall[1]).toContain(true);
    });

    it('should apply date range filters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [] });

      await eventService.getEvents({ start_date: startDate, end_date: endDate });

      const countCall = mockQuery.mock.calls[0];
      expect(countCall[1]).toContain(startDate);
      expect(countCall[1]).toContain(endDate);
    });

    it('should handle custom pagination', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await eventService.getEvents({}, { page: 3, limit: 10 });

      expect(result.pagination.page).toBe(3);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total_pages).toBe(5);
    });
  });

  describe('getEventById', () => {
    it('should return event when found', async () => {
      const mockEvent = {
        event_id: '123',
        event_name: 'Summer Gala',
        event_type: 'fundraiser',
        status: 'planned',
        capacity: 100,
        registered_count: 50,
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockEvent] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await eventService.getEventById('123');

      expect(result).toEqual({ ...mockEvent, occurrences: [] });
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['123']);
    });

    it('should return null when event not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await eventService.getEventById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('listEventOccurrences', () => {
    it('applies overlap range filtering and occurrence-level filters', async () => {
      const startDate = new Date('2026-05-01T00:00:00.000Z');
      const endDate = new Date('2026-05-31T23:59:59.000Z');

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await eventService.listEventOccurrences({
        start_date: startDate,
        end_date: endDate,
        search: 'clinic',
        event_type: EventType.COMMUNITY,
        status: EventStatus.ACTIVE,
        is_public: true,
      });

      const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('eo.end_date >= $');
      expect(sql).toContain('eo.start_date <= $');
      expect(sql).toContain('e.event_type = $');
      expect(sql).toContain('eo.status = $');
      expect(sql).toContain('e.is_public = $');
      expect(params).toContain(startDate);
      expect(params).toContain(endDate);
      expect(params).toContain('%clinic%');
      expect(params).toContain(EventType.COMMUNITY);
      expect(params).toContain(EventStatus.ACTIVE);
      expect(params).toContain(true);
    });

    it('returns enriched occurrence rows for calendar consumers', async () => {
      const occurrenceRow = {
        occurrence_id: 'occ-1',
        event_id: 'event-1',
        event_name: 'Spring Gala',
        description: 'Annual fundraiser',
        event_type: EventType.FUNDRAISER,
        is_public: true,
        status: EventStatus.PLANNED,
      };

      mockQuery.mockResolvedValueOnce({ rows: [occurrenceRow] });

      const result = await eventService.listEventOccurrences();

      expect(result).toEqual([occurrenceRow]);
    });
  });

  describe('createEvent', () => {
    it('should create event with required fields', async () => {
      const mockCreatedEvent = {
        event_id: 'new-uuid',
        event_name: 'New Event',
        event_type: 'meeting',
        status: 'planned',
        start_date: new Date('2024-06-15'),
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ event_id: 'new-uuid' }] });
      queueEventSyncAndFetch('new-uuid', mockCreatedEvent);

      const result = await eventService.createEvent(
        {
          event_name: 'New Event',
          event_type: EventType.MEETING,
          start_date: new Date('2024-06-15'),
          end_date: new Date('2024-06-15T18:00:00Z'),
        },
        'user-123'
      );

      expect(result).toEqual({ ...mockCreatedEvent, occurrences: [] });
    });

    it('should create event with all fields', async () => {
      const eventData = {
        event_name: 'Full Event',
        description: 'Event description',
        event_type: EventType.FUNDRAISER,
        status: EventStatus.PLANNED,
        start_date: new Date('2024-06-15T18:00:00Z'),
        end_date: new Date('2024-06-15T22:00:00Z'),
        location_name: 'Grand Hall',
        capacity: 200,
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ event_id: 'new-uuid' }] });
      queueEventSyncAndFetch('new-uuid', { event_id: 'new-uuid', ...eventData });

      const result = await eventService.createEvent(eventData, 'user-123');

      expect(result.event_name).toBe('Full Event');
      expect(result.capacity).toBe(200);
      expect(result.occurrences).toEqual([]);
    });

    it('should normalize recurring fields when event is not recurring', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ event_id: 'new-uuid' }] });
      queueEventSyncAndFetch('new-uuid', {
        event_id: 'new-uuid',
        event_name: 'One-time Event',
        event_type: EventType.WORKSHOP,
        is_recurring: false,
      });

      await eventService.createEvent(
        {
          event_name: 'One-time Event',
          event_type: EventType.WORKSHOP,
          is_recurring: false,
          recurrence_pattern: 'weekly' as any,
          recurrence_interval: 2,
          recurrence_end_date: new Date('2026-12-31T00:00:00Z'),
          start_date: new Date('2026-06-15T18:00:00Z'),
          end_date: new Date('2026-06-15T20:00:00Z'),
        },
        'user-123'
      );

      const args = mockQuery.mock.calls[0][1];
      expect(args[5]).toBe(false);
      expect(args[6]).toBeNull();
      expect(args[7]).toBeNull();
      expect(args[8]).toBeNull();
    });
  });

  describe('updateEvent', () => {
    it('should update event successfully', async () => {
      const mockUpdatedEvent = {
        event_id: '123',
        event_name: 'Updated Event',
        status: 'active',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedEvent] });
      queueEventSyncAndFetch('123', mockUpdatedEvent);

      const result = await eventService.updateEvent(
        '123',
        { event_name: 'Updated Event', status: EventStatus.ACTIVE },
        'user-123'
      );

      expect(result).toEqual({ ...mockUpdatedEvent, occurrences: [] });
    });

    it('should throw when event is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        eventService.updateEvent('nonexistent', { event_name: 'Test' }, 'user-123')
      ).rejects.toThrow('Event not found');
    });

    it('should throw error when no fields to update', async () => {
      await expect(eventService.updateEvent('123', {}, 'user-123')).rejects.toThrow('No fields to update');
    });

    it('should clear recurrence fields when is_recurring is set to false', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ event_id: '123', status: EventStatus.PLANNED }] });
      queueEventSyncAndFetch('123', {
        event_id: '123',
        event_name: 'Mock Event',
        is_recurring: false,
      });

      await eventService.updateEvent(
        '123',
        { is_recurring: false },
        'user-123'
      );

      const sql = mockQuery.mock.calls[0][0] as string;
      const values = mockQuery.mock.calls[0][1];

      expect(sql).toContain('recurrence_pattern =');
      expect(sql).toContain('recurrence_interval =');
      expect(sql).toContain('recurrence_end_date =');
      expect(values).toContain(null);
    });
  });

  describe('deleteEvent', () => {
    it('should soft delete event successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      await eventService.deleteEvent('123', 'user-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("status = 'cancelled'"),
        ['user-123', '123']
      );
    });

    it('should complete even when event not found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      await eventService.deleteEvent('nonexistent', 'user-123');

      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('getEventRegistrations', () => {
    it('should return registrations for an event', async () => {
      const mockRegistrations = [
        { registration_id: '1', contact_name: 'John Doe', registration_status: 'confirmed' },
        { registration_id: '2', contact_name: 'Jane Smith', registration_status: 'registered' },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockRegistrations });

      const result = await eventService.getEventRegistrations('event-123');

      expect(result).toEqual(mockRegistrations);
    });

    it('should filter by registration_status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ registration_id: '1', registration_status: 'confirmed' }] });

      await eventService.getEventRegistrations('event-123', { registration_status: RegistrationStatus.CONFIRMED });

      const call = mockQuery.mock.calls[0];
      expect(call[1]).toContain('confirmed');
    });

    it('should filter by checked_in status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ registration_id: '1', checked_in: true }] });

      await eventService.getEventRegistrations('event-123', { checked_in: true });

      const call = mockQuery.mock.calls[0];
      expect(call[1]).toContain(true);
    });
  });

  describe('registerContact', () => {
    it('should register contact for event', async () => {
      const mockEvent = { event_id: 'event-123', event_name: 'Community Clinic' };
      const mockRegistration = {
        registration_id: 'new-uuid',
        event_id: 'event-123',
        occurrence_id: 'occ-123',
        contact_id: 'contact-123',
        registration_status: 'registered',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockEvent] });
      mockQuery.mockResolvedValueOnce({ rows: [buildOccurrenceRow()] });
      mockQuery.mockResolvedValueOnce({ rows: [buildOccurrenceRow()] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ registration_id: 'new-uuid' }] });
      mockQuery.mockResolvedValueOnce({ rows: [mockRegistration] });

      const result = await eventService.registerContact({
        event_id: 'event-123',
        contact_id: 'contact-123',
        send_confirmation_email: false,
      });

      expect(result).toEqual(mockRegistration);
    });

    it('should register with notes', async () => {
      const mockEvent = { event_id: 'event-123', event_name: 'Community Clinic' };
      const mockRegistration = {
        registration_id: 'new-uuid',
        event_id: 'event-123',
        occurrence_id: 'occ-123',
        contact_id: 'contact-123',
        notes: 'VIP guest',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockEvent] });
      mockQuery.mockResolvedValueOnce({ rows: [buildOccurrenceRow()] });
      mockQuery.mockResolvedValueOnce({ rows: [buildOccurrenceRow()] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ registration_id: 'new-uuid' }] });
      mockQuery.mockResolvedValueOnce({ rows: [mockRegistration] });

      const result = await eventService.registerContact({
        event_id: 'event-123',
        contact_id: 'contact-123',
        notes: 'VIP guest',
        send_confirmation_email: false,
      });

      expect(result.notes).toBe('VIP guest');
    });
  });

  describe('checkInAttendee', () => {
    it('should check in attendee successfully', async () => {
      const mockRegistrationCheck = {
        registration_id: '123',
        event_id: 'event-123',
        occurrence_id: 'occ-123',
        contact_id: 'contact-123',
        case_id: null,
        registration_status: RegistrationStatus.REGISTERED,
        waitlist_position: null,
        checked_in: false,
        series_enrollment_id: null,
      };
      const now = Date.now();

      mockQuery.mockResolvedValueOnce({ rows: [mockRegistrationCheck] });
      mockQuery.mockResolvedValueOnce({ rows: [{ event_id: 'event-123', event_name: 'Community Clinic' }] });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            occurrence_id: 'occ-123',
            event_id: 'event-123',
            occurrence_name: 'Main session',
            start_date: new Date(now + 30 * 60 * 1000),
            end_date: new Date(now + 90 * 60 * 1000),
            status: 'planned',
            capacity: null,
            registered_count: 0,
            public_checkin_enabled: false,
            public_checkin_pin_hash: null,
            public_checkin_pin_rotated_at: null,
            waitlist_enabled: true,
          },
        ],
      });
      const result = await eventService.checkInAttendee('123');

      expect(result.success).toBe(true);
      expect(result.registration?.checked_in).toBe(true);
    });

    it('should return failure when registration not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await eventService.checkInAttendee('nonexistent');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Registration not found');
    });

    it('should reject check-in when event is outside configured window', async () => {
      const mockRegistrationCheck = {
        registration_id: 'registration-1',
        event_id: 'event-123',
        occurrence_id: 'occ-123',
        contact_id: 'contact-123',
        case_id: null,
        registration_status: RegistrationStatus.REGISTERED,
        waitlist_position: null,
        checked_in: false,
        series_enrollment_id: null,
      };
      const now = Date.now();

      mockQuery.mockResolvedValueOnce({ rows: [mockRegistrationCheck] });
      mockQuery.mockResolvedValueOnce({ rows: [{ event_id: 'event-123', event_name: 'Community Clinic' }] });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            occurrence_id: 'occ-123',
            event_id: 'event-123',
            occurrence_name: 'Main session',
            start_date: new Date(now + 8 * 60 * 60 * 1000),
            end_date: new Date(now + 9 * 60 * 60 * 1000),
            status: 'planned',
            capacity: null,
            registered_count: 0,
            public_checkin_enabled: false,
            public_checkin_pin_hash: null,
            public_checkin_pin_rotated_at: null,
            waitlist_enabled: true,
          },
        ],
      });

      const result = await eventService.checkInAttendee('registration-1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Check-in is available');
    });

    it('should reject check-in when event status is cancelled', async () => {
      const mockRegistrationCheck = {
        registration_id: 'registration-1',
        event_id: 'event-123',
        occurrence_id: 'occ-123',
        contact_id: 'contact-123',
        case_id: null,
        registration_status: RegistrationStatus.REGISTERED,
        waitlist_position: null,
        checked_in: false,
        series_enrollment_id: null,
      };
      const now = Date.now();

      mockQuery.mockResolvedValueOnce({ rows: [mockRegistrationCheck] });
      mockQuery.mockResolvedValueOnce({ rows: [{ event_id: 'event-123', event_name: 'Community Clinic' }] });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            occurrence_id: 'occ-123',
            event_id: 'event-123',
            occurrence_name: 'Main session',
            start_date: new Date(now - 60 * 60 * 1000),
            end_date: new Date(now + 60 * 60 * 1000),
            status: 'cancelled',
            capacity: null,
            registered_count: 0,
            public_checkin_enabled: false,
            public_checkin_pin_hash: null,
            public_checkin_pin_rotated_at: null,
            waitlist_enabled: true,
          },
        ],
      });

      const result = await eventService.checkInAttendee('registration-1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not accepting check-ins');
    });

    it('should reject check-in when event status is completed', async () => {
      const mockRegistrationCheck = {
        registration_id: 'registration-1',
        event_id: 'event-123',
        occurrence_id: 'occ-123',
        contact_id: 'contact-123',
        case_id: null,
        registration_status: RegistrationStatus.REGISTERED,
        waitlist_position: null,
        checked_in: false,
        series_enrollment_id: null,
      };
      const now = Date.now();

      mockQuery.mockResolvedValueOnce({ rows: [mockRegistrationCheck] });
      mockQuery.mockResolvedValueOnce({ rows: [{ event_id: 'event-123', event_name: 'Community Clinic' }] });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            occurrence_id: 'occ-123',
            event_id: 'event-123',
            occurrence_name: 'Main session',
            start_date: new Date(now - 60 * 60 * 1000),
            end_date: new Date(now + 60 * 60 * 1000),
            status: 'completed',
            capacity: null,
            registered_count: 0,
            public_checkin_enabled: false,
            public_checkin_pin_hash: null,
            public_checkin_pin_rotated_at: null,
            waitlist_enabled: true,
          },
        ],
      });

      const result = await eventService.checkInAttendee('registration-1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not accepting check-ins');
    });

    it('should reject check-in after the event grace window closes', async () => {
      const mockRegistrationCheck = {
        registration_id: 'registration-1',
        event_id: 'event-123',
        occurrence_id: 'occ-123',
        contact_id: 'contact-123',
        case_id: null,
        registration_status: RegistrationStatus.REGISTERED,
        waitlist_position: null,
        checked_in: false,
        series_enrollment_id: null,
      };
      const now = Date.now();

      mockQuery.mockResolvedValueOnce({ rows: [mockRegistrationCheck] });
      mockQuery.mockResolvedValueOnce({ rows: [{ event_id: 'event-123', event_name: 'Community Clinic' }] });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            occurrence_id: 'occ-123',
            event_id: 'event-123',
            occurrence_name: 'Main session',
            start_date: new Date(now - 10 * 60 * 60 * 1000),
            end_date: new Date(now - 8 * 60 * 60 * 1000),
            status: 'planned',
            capacity: null,
            registered_count: 0,
            public_checkin_enabled: false,
            public_checkin_pin_hash: null,
            public_checkin_pin_rotated_at: null,
            waitlist_enabled: true,
          },
        ],
      });

      const result = await eventService.checkInAttendee('registration-1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Check-in is available');
    });
  });

  describe('cancelRegistration', () => {
    it('should cancel registration successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            registration_id: '123',
            event_id: 'event-123',
            occurrence_id: 'occ-123',
            contact_id: 'contact-123',
            case_id: null,
            registration_status: RegistrationStatus.REGISTERED,
            waitlist_position: null,
            checked_in: false,
            series_enrollment_id: null,
          },
        ],
      });
      mockQuery.mockResolvedValueOnce({ rows: [{ event_id: 'event-123', event_name: 'Community Clinic' }] });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            occurrence_id: 'occ-123',
            event_id: 'event-123',
            occurrence_name: 'Main session',
            start_date: new Date('2026-06-15T18:00:00Z'),
            end_date: new Date('2026-06-15T20:00:00Z'),
            status: 'planned',
            capacity: null,
            registered_count: 0,
            public_checkin_enabled: false,
            public_checkin_pin_hash: null,
            public_checkin_pin_rotated_at: null,
            waitlist_enabled: true,
          },
        ],
      });

      await eventService.cancelRegistration('123');

      expect(mockQuery).toHaveBeenCalledWith('DELETE FROM event_registrations WHERE id = $1', ['123']);
    });

    it('should throw when registration not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(eventService.cancelRegistration('nonexistent')).rejects.toThrow('Registration not found');
    });
  });

  describe('getContactRegistrations', () => {
    it('should return registrations for a contact', async () => {
      const mockRegistrations = [
        { registration_id: '1', event_name: 'Summer Gala', registration_status: 'confirmed' },
        { registration_id: '2', event_name: 'Workshop', registration_status: 'registered' },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockRegistrations });

      const result = await eventService.getContactRegistrations('contact-123');

      expect(result).toEqual(mockRegistrations);
    });

    it('applies event creator scope filtering when provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await eventService.getContactRegistrations('contact-123', {
        createdByUserIds: ['user-1'],
      });

      const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('e.created_by = ANY');
      expect(params).toEqual(['contact-123', ['user-1']]);
    });
  });

  describe('listPublicEventsByOwner', () => {
    it('returns owner-scoped public events with pagination metadata', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({
          rows: [
            { event_id: 'event-1', event_name: 'Upcoming Event' },
            { event_id: 'event-2', event_name: 'Community Meetup' },
          ],
        });

      const result = await eventService.listPublicEventsByOwner('owner-1', {
        limit: 2,
        offset: 0,
      });

      expect(result.items).toHaveLength(2);
      expect(result.page).toEqual({
        limit: 2,
        offset: 0,
        total: 2,
        has_more: false,
      });

      const [countSql, countParams] = mockQuery.mock.calls[0] as [string, unknown[]];
      expect(countSql).toContain("is_public = true");
      expect(countSql).toContain("status IN ('planned', 'active', 'postponed')");
      expect(countSql).toContain('end_date >= NOW()');
      expect(countParams).toEqual(['owner-1']);
    });

    it('applies search/type/include_past filters and sorting controls', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({
          rows: [{ event_id: 'event-3', event_name: 'Past Fundraiser' }],
        });

      await eventService.listPublicEventsByOwner('owner-2', {
        search: 'Fundraiser',
        event_type: EventType.FUNDRAISER,
        include_past: true,
        limit: 5,
        offset: 10,
        sort_by: 'name',
        sort_order: 'desc',
      });

      const [countSql, countParams] = mockQuery.mock.calls[0] as [string, unknown[]];
      const [dataSql, dataParams] = mockQuery.mock.calls[1] as [string, unknown[]];

      expect(countSql).toContain('event_type = $2');
      expect(countSql).toContain('name ILIKE $3');
      expect(countSql).not.toContain('COALESCE(next_occurrence.end_date, e.end_date) >= NOW()');
      expect(dataSql).toContain('ORDER BY e.name DESC');
      expect(countParams).toEqual(['owner-2', EventType.FUNDRAISER, '%Fundraiser%']);
      expect(dataParams).toEqual(['owner-2', EventType.FUNDRAISER, '%Fundraiser%', 5, 10]);
    });
  });

  describe('sendEventReminders', () => {
    it('sends reminders over email and sms when both channels are configured', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'event-1',
              name: 'Community Dinner',
              start_date: new Date('2026-03-01T18:00:00Z'),
              end_date: new Date('2026-03-01T20:00:00Z'),
              location_name: 'Main Hall',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              registration_id: 'reg-1',
              contact_name: 'Jane Doe',
              contact_email: 'jane@example.org',
              mobile_phone: '+1 (555) 111-2222',
              phone: null,
              do_not_email: false,
              do_not_text: false,
            },
          ],
        })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 });

      mockGetEmailSettings.mockResolvedValue({
        id: 'email-1',
        smtpHost: 'smtp.example.org',
        smtpPort: 587,
        smtpSecure: true,
        smtpUser: 'user',
        smtpFromAddress: 'noreply@example.org',
        smtpFromName: 'NP Manager',
        imapHost: null,
        imapPort: 993,
        imapSecure: true,
        imapUser: null,
        isConfigured: true,
        lastTestedAt: null,
        lastTestSuccess: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockGetTwilioSettings.mockResolvedValue({
        id: 'twilio-1',
        accountSid: 'AC123',
        messagingServiceSid: 'MG123',
        fromPhoneNumber: null,
        isConfigured: true,
        lastTestedAt: null,
        lastTestSuccess: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockSendMail.mockResolvedValue(true);
      mockSendSms.mockResolvedValue({
        success: true,
        to: '+1 (555) 111-2222',
        normalizedTo: '+15551112222',
        sid: 'SM123',
      });

      const result = await eventService.sendEventReminders(
        'event-1',
        { sendEmail: true, sendSms: true },
        {
          triggerType: 'manual',
          sentBy: 'user-1',
        }
      );

      expect(result.email.sent).toBe(1);
      expect(result.sms.sent).toBe(1);
      expect(result.warnings).toEqual([]);
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendSms).toHaveBeenCalledTimes(1);
    });

    it('skips email deliveries when smtp is not configured', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'event-1',
              name: 'Community Dinner',
              start_date: new Date('2026-03-01T18:00:00Z'),
              end_date: new Date('2026-03-01T20:00:00Z'),
              location_name: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              registration_id: 'reg-1',
              contact_name: 'Jane Doe',
              contact_email: 'jane@example.org',
              mobile_phone: null,
              phone: null,
              do_not_email: false,
              do_not_text: false,
            },
          ],
        })
        .mockResolvedValueOnce({ rowCount: 1 });

      mockGetEmailSettings.mockResolvedValue({
        id: 'email-1',
        smtpHost: null,
        smtpPort: 587,
        smtpSecure: true,
        smtpUser: null,
        smtpFromAddress: null,
        smtpFromName: null,
        imapHost: null,
        imapPort: 993,
        imapSecure: true,
        imapUser: null,
        isConfigured: false,
        lastTestedAt: null,
        lastTestSuccess: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await eventService.sendEventReminders(
        'event-1',
        { sendEmail: true, sendSms: false },
        {
          triggerType: 'manual',
          sentBy: 'user-1',
        }
      );

      expect(result.email.skipped).toBe(1);
      expect(result.warnings).toContain('Email reminders were requested, but SMTP is not configured.');
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('rejects when both channels are disabled', async () => {
      await expect(
        eventService.sendEventReminders(
          'event-1',
          { sendEmail: false, sendSms: false },
          {
            triggerType: 'manual',
            sentBy: 'user-1',
          }
        )
      ).rejects.toThrow('At least one reminder channel must be enabled');
    });

    it('respects do-not-email and do-not-text preferences at send time for automated reminders', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'event-1',
              name: 'Community Dinner',
              start_date: new Date('2026-03-01T18:00:00Z'),
              end_date: new Date('2026-03-01T20:00:00Z'),
              location_name: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              registration_id: 'reg-1',
              contact_name: 'Jane Doe',
              contact_email: 'jane@example.org',
              mobile_phone: '+15551112222',
              phone: null,
              do_not_email: true,
              do_not_text: true,
            },
          ],
        })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 });

      mockGetEmailSettings.mockResolvedValue({
        id: 'email-1',
        smtpHost: 'smtp.example.org',
        smtpPort: 587,
        smtpSecure: true,
        smtpUser: 'user',
        smtpFromAddress: 'noreply@example.org',
        smtpFromName: 'NP Manager',
        imapHost: null,
        imapPort: 993,
        imapSecure: true,
        imapUser: null,
        isConfigured: true,
        lastTestedAt: null,
        lastTestSuccess: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockGetTwilioSettings.mockResolvedValue({
        id: 'twilio-1',
        accountSid: 'AC123',
        messagingServiceSid: 'MG123',
        fromPhoneNumber: null,
        isConfigured: true,
        lastTestedAt: null,
        lastTestSuccess: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await eventService.sendEventReminders(
        'event-1',
        { sendEmail: true, sendSms: true },
        {
          triggerType: 'automated',
          sentBy: null,
          automationId: 'auto-1',
        }
      );

      expect(mockSendMail).not.toHaveBeenCalled();
      expect(mockSendSms).not.toHaveBeenCalled();
      expect(result.email.skipped).toBe(1);
      expect(result.sms.skipped).toBe(1);

      const emailInsertValues = mockQuery.mock.calls[2][1];
      const smsInsertValues = mockQuery.mock.calls[3][1];
      expect(emailInsertValues).toContain('Contact opted out of email');
      expect(smsInsertValues).toContain('Contact opted out of text messaging');
      expect(emailInsertValues).toContain('automated');
      expect(smsInsertValues).toContain('auto-1');
    });
  });
});
