import { describe, expect, it } from 'vitest';
import { buildReminderSyncPayload, type ReminderRowFormState } from '../eventEditorFormModel';

describe('buildReminderSyncPayload', () => {
  it('converts absolute reminder times from the configured timezone to UTC', () => {
    const row: ReminderRowFormState = {
      id: 'reminder-1',
      timingType: 'absolute',
      relativeValue: 60,
      relativeUnit: 'minutes',
      absoluteLocalDateTime: '2026-06-15T10:00',
      sendEmail: true,
      sendSms: false,
      customMessage: 'Reminder for attendees',
      timezone: 'America/Vancouver',
    };

    expect(buildReminderSyncPayload([row])).toEqual({
      items: [
        {
          timingType: 'absolute',
          absoluteSendAt: '2026-06-15T17:00:00.000Z',
          sendEmail: true,
          sendSms: false,
          customMessage: 'Reminder for attendees',
          timezone: 'America/Vancouver',
        },
      ],
    });
  });
});
