import pool from '@config/database';
import { ContactCommunicationsRepository } from '../repositories/contactCommunicationsRepository';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.MockedFunction<typeof pool.query>;

describe('ContactCommunicationsRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps communications rows into typed items with actions', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'delivery-1',
          channel: 'email',
          source_type: 'appointment_reminder',
          delivery_status: 'sent',
          recipient: 'person@example.com',
          error_message: null,
          message_preview: 'Appointment reminder message',
          trigger_type: 'manual',
          sent_at: new Date('2026-03-15T16:00:00.000Z'),
          appointment_id: 'appointment-1',
          case_id: 'case-1',
          event_id: null,
          registration_id: null,
          source_label: 'Appointment reminder',
          source_subtitle: '2026-03-17 09:00 | CASE-100',
          can_send_appointment_reminder: true,
          total_count: 2,
        },
        {
          id: 'delivery-2',
          channel: 'sms',
          source_type: 'event_reminder',
          delivery_status: 'failed',
          recipient: '+15550201234',
          error_message: 'Carrier rejected message',
          message_preview: 'Event reminder message',
          trigger_type: 'automated',
          sent_at: new Date('2026-03-15T15:00:00.000Z'),
          appointment_id: null,
          case_id: null,
          event_id: 'event-1',
          registration_id: 'registration-1',
          source_label: 'Spring Fundraiser',
          source_subtitle: '2026-03-20 18:00 | Community Hall',
          can_send_appointment_reminder: false,
          total_count: 2,
        },
      ],
    } as any);

    const repository = new ContactCommunicationsRepository();
    const result = await repository.list('contact-1', { limit: 25 });

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(result.total).toBe(2);
    expect(result.filters).toEqual({
      channel: undefined,
      source_type: undefined,
      delivery_status: undefined,
      limit: 25,
    });
    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'delivery-1',
        source_type: 'appointment_reminder',
        action: expect.objectContaining({
          type: 'send_appointment_reminder',
          label: 'Send email reminder again',
          appointment_id: 'appointment-1',
        }),
      }),
      expect.objectContaining({
        id: 'delivery-2',
        source_type: 'event_reminder',
        action: expect.objectContaining({
          type: 'open_event',
          label: 'Open event',
          event_id: 'event-1',
        }),
      }),
    ]);
  });

  it('returns a no-action descriptor when the appointment can no longer be reminded', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'delivery-3',
          channel: 'sms',
          source_type: 'appointment_reminder',
          delivery_status: 'sent',
          recipient: '+15550202222',
          error_message: null,
          message_preview: 'Past appointment reminder',
          trigger_type: 'manual',
          sent_at: new Date('2026-03-15T10:00:00.000Z'),
          appointment_id: 'appointment-2',
          case_id: null,
          event_id: null,
          registration_id: null,
          source_label: 'Past appointment',
          source_subtitle: '2026-03-14 08:00',
          can_send_appointment_reminder: false,
          total_count: 1,
        },
      ],
    } as any);

    const repository = new ContactCommunicationsRepository();
    const result = await repository.list('contact-1', {
      channel: 'sms',
      source_type: 'appointment_reminder',
      delivery_status: 'sent',
      limit: 500,
    });

    expect(result.filters).toEqual({
      channel: 'sms',
      source_type: 'appointment_reminder',
      delivery_status: 'sent',
      limit: 200,
    });
    expect(result.items[0].action).toEqual(
      expect.objectContaining({
        type: 'none',
        disabled_reason: 'Appointment is not currently eligible for reminder sends.',
      })
    );
  });
});
