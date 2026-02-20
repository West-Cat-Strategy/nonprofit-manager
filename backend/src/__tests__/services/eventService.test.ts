import { Pool } from 'pg';
import { EventService } from '@services';
import { EventType, EventStatus, RegistrationStatus } from '../../types/event';
import { sendMail } from '@services/emailService';
import { getEmailSettings } from '@services/emailSettingsService';
import { sendSms } from '@services/twilioSmsService';
import { getTwilioSettings } from '@services/twilioSettingsService';

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

// Create mock pool
const mockQuery = jest.fn();
const mockPool = {
  query: mockQuery,
} as unknown as Pool;

describe('EventService', () => {
  let eventService: EventService;
  const mockSendMail = sendMail as jest.MockedFunction<typeof sendMail>;
  const mockGetEmailSettings = getEmailSettings as jest.MockedFunction<typeof getEmailSettings>;
  const mockSendSms = sendSms as jest.MockedFunction<typeof sendSms>;
  const mockGetTwilioSettings = getTwilioSettings as jest.MockedFunction<typeof getTwilioSettings>;

  beforeEach(() => {
    eventService = new EventService(mockPool);
    jest.clearAllMocks();
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

      mockQuery.mockResolvedValueOnce({ rows: [mockEvent] });

      const result = await eventService.getEventById('123');

      expect(result).toEqual(mockEvent);
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['123']);
    });

    it('should return null when event not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await eventService.getEventById('nonexistent');

      expect(result).toBeNull();
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

      mockQuery.mockResolvedValueOnce({ rows: [mockCreatedEvent] });

      const result = await eventService.createEvent(
        {
          event_name: 'New Event',
          event_type: EventType.MEETING,
          start_date: new Date('2024-06-15'),
          end_date: new Date('2024-06-15T18:00:00Z'),
        },
        'user-123'
      );

      expect(result).toEqual(mockCreatedEvent);
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

      mockQuery.mockResolvedValueOnce({ rows: [{ event_id: 'new-uuid', ...eventData }] });

      const result = await eventService.createEvent(eventData, 'user-123');

      expect(result.event_name).toBe('Full Event');
      expect(result.capacity).toBe(200);
    });

    it('should normalize recurring fields when event is not recurring', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ event_id: 'new-uuid', is_recurring: false }] });

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

      const result = await eventService.updateEvent(
        '123',
        { event_name: 'Updated Event', status: EventStatus.ACTIVE },
        'user-123'
      );

      expect(result).toEqual(mockUpdatedEvent);
    });

    it('should return updated event even when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await eventService.updateEvent('nonexistent', { event_name: 'Test' }, 'user-123');

      expect(result).toBeUndefined();
    });

    it('should throw error when no fields to update', async () => {
      await expect(eventService.updateEvent('123', {}, 'user-123')).rejects.toThrow('No fields to update');
    });

    it('should clear recurrence fields when is_recurring is set to false', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ event_id: '123', is_recurring: false }] });

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
      const mockEvent = { id: 'event-123', capacity: 100, registered_count: 10 };
      const mockRegistration = {
        registration_id: 'new-uuid',
        event_id: 'event-123',
        contact_id: 'contact-123',
        registration_status: 'registered',
      };

      // Mock getEventById
      mockQuery.mockResolvedValueOnce({ rows: [mockEvent] });
      // Mock existing registration check
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Mock INSERT
      mockQuery.mockResolvedValueOnce({ rows: [mockRegistration] });
      // Mock update registration count
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await eventService.registerContact({
        event_id: 'event-123',
        contact_id: 'contact-123',
      });

      expect(result).toEqual(mockRegistration);
    });

    it('should register with notes', async () => {
      const mockEvent = { id: 'event-123', capacity: 100, registered_count: 10 };
      const mockRegistration = {
        registration_id: 'new-uuid',
        event_id: 'event-123',
        contact_id: 'contact-123',
        notes: 'VIP guest',
      };

      // Mock getEventById
      mockQuery.mockResolvedValueOnce({ rows: [mockEvent] });
      // Mock existing registration check
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Mock INSERT
      mockQuery.mockResolvedValueOnce({ rows: [mockRegistration] });
      // Mock update registration count
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await eventService.registerContact({
        event_id: 'event-123',
        contact_id: 'contact-123',
        notes: 'VIP guest',
      });

      expect(result.notes).toBe('VIP guest');
    });
  });

  describe('checkInAttendee', () => {
    it('should check in attendee successfully', async () => {
      const mockRegistrationCheck = { event_id: 'event-123', checked_in: false };
      const mockUpdatedRegistration = {
        id: '123',
        checked_in: true,
        check_in_time: new Date(),
      };

      // Mock get registration query
      mockQuery.mockResolvedValueOnce({ rows: [mockRegistrationCheck] });
      // Mock update registration
      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedRegistration] });
      // Mock update event attendance count
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

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
  });

  describe('cancelRegistration', () => {
    it('should cancel registration successfully', async () => {
      // Mock get registration query to get event_id
      mockQuery.mockResolvedValueOnce({ rows: [{ event_id: 'event-123' }] });
      // Mock DELETE query
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });
      // Mock update registered_count
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      await eventService.cancelRegistration('123');

      expect(mockQuery).toHaveBeenCalledTimes(3);
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
