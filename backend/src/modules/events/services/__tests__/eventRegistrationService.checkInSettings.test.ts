import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import type { Pool } from 'pg';
import {
  getEventCheckInSettingsQuery,
  rotateEventCheckInPinMutation,
  updateEventCheckInSettingsMutation,
} from '../eventRegistrationService.checkInSettings';
import * as helpers from '../eventRegistrationService.helpers';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomInt: jest.fn(),
}));

jest.mock('../eventRegistrationService.helpers', () => {
  const actual = jest.requireActual('../eventRegistrationService.helpers');
  return {
    ...actual,
    rotateCheckInPinRecord: jest.fn(),
    updateCheckInSettingsRecord: jest.fn(),
  };
});

describe('eventRegistrationService.checkInSettings', () => {
  const mockResolveOccurrence = jest.fn();
  const ctx = {
    pool: {
      query: jest.fn(),
    } as unknown as Pool,
    support: {
      resolveContactIdByIdentity: jest.fn(),
      createWalkInContact: jest.fn(),
      assertCheckInAllowed: jest.fn(),
    },
    occurrences: {
      resolveOccurrence: mockResolveOccurrence,
    },
    confirmations: {
      sendRegistrationConfirmationEmail: jest.fn(),
    },
  } as never;

  const mockRotateCheckInPinRecord = jest.mocked(helpers.rotateCheckInPinRecord);
  const mockUpdateCheckInSettingsRecord = jest.mocked(helpers.updateCheckInSettingsRecord);
  const mockRandomInt = jest.mocked(randomInt);
  const mockBcryptHash = jest.mocked(bcrypt.hash);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when the requested check-in occurrence cannot be resolved', async () => {
    mockResolveOccurrence.mockResolvedValueOnce(null);

    await expect(getEventCheckInSettingsQuery(ctx, 'event-1', 'occ-1')).resolves.toBeNull();
    expect(mockResolveOccurrence).toHaveBeenCalledWith('event-1', 'occ-1');
  });

  it('returns the check-in settings for the resolved occurrence', async () => {
    mockResolveOccurrence.mockResolvedValueOnce({
      occurrence_id: 'occ-1',
      public_checkin_enabled: true,
      public_checkin_pin_configured: false,
      public_checkin_pin_rotated_at: null,
    });

    await expect(getEventCheckInSettingsQuery(ctx, 'event-1', 'occ-1')).resolves.toEqual({
      event_id: 'event-1',
      occurrence_id: 'occ-1',
      public_checkin_enabled: true,
      public_checkin_pin_configured: false,
      public_checkin_pin_rotated_at: null,
    });
  });

  it('updates the public check-in flag for the resolved occurrence', async () => {
    mockResolveOccurrence.mockResolvedValueOnce({
      occurrence_id: 'occ-1',
    });
    mockUpdateCheckInSettingsRecord.mockResolvedValueOnce({
      event_id: 'event-1',
      occurrence_id: 'occ-1',
      public_checkin_enabled: false,
      public_checkin_pin_configured: true,
      public_checkin_pin_rotated_at: new Date('2026-04-16T18:00:00.000Z'),
    } as never);

    await expect(
      updateEventCheckInSettingsMutation(
        ctx,
        'event-1',
        { occurrence_id: 'occ-1', public_checkin_enabled: false },
        'user-1'
      )
    ).resolves.toEqual(
      expect.objectContaining({
        event_id: 'event-1',
        occurrence_id: 'occ-1',
        public_checkin_enabled: false,
      })
    );
    expect(mockUpdateCheckInSettingsRecord).toHaveBeenCalledWith(
      ctx.pool,
      'occ-1',
      false,
      'user-1'
    );
  });

  it('returns null when updating settings for an unknown occurrence', async () => {
    mockResolveOccurrence.mockResolvedValueOnce(null);

    await expect(
      updateEventCheckInSettingsMutation(
        ctx,
        'event-1',
        { occurrence_id: 'occ-1', public_checkin_enabled: true },
        'user-1'
      )
    ).resolves.toBeNull();
    expect(mockUpdateCheckInSettingsRecord).not.toHaveBeenCalled();
  });

  it('rotates the pin for the resolved occurrence', async () => {
    mockResolveOccurrence.mockResolvedValueOnce({
      occurrence_id: 'occ-1',
    });
    mockRandomInt.mockReturnValueOnce(123456);
    mockBcryptHash.mockResolvedValueOnce('hashed-pin' as never);
    mockRotateCheckInPinRecord.mockResolvedValueOnce({
      event_id: 'event-1',
      occurrence_id: 'occ-1',
      public_checkin_enabled: true,
      public_checkin_pin_configured: true,
      public_checkin_pin_rotated_at: new Date('2026-04-16T18:00:00.000Z'),
    } as never);

    await expect(rotateEventCheckInPinMutation(ctx, 'event-1', 'user-1', 'occ-1')).resolves.toEqual({
      event_id: 'event-1',
      occurrence_id: 'occ-1',
      public_checkin_enabled: true,
      public_checkin_pin_configured: true,
      public_checkin_pin_rotated_at: new Date('2026-04-16T18:00:00.000Z'),
      pin: '123456',
    });
    expect(mockRandomInt).toHaveBeenCalledWith(100000, 1000000);
    expect(mockBcryptHash).toHaveBeenCalledWith('123456', expect.any(Number));
    expect(mockRotateCheckInPinRecord).toHaveBeenCalledWith(
      ctx.pool,
      'occ-1',
      'hashed-pin',
      'user-1'
    );
  });

  it('returns event not found when rotating a pin for an unknown occurrence', async () => {
    mockResolveOccurrence.mockResolvedValueOnce(null);

    await expect(rotateEventCheckInPinMutation(ctx, 'event-1', 'user-1', 'occ-1')).rejects.toMatchObject(
      {
        message: 'Event not found',
        code: 'EVENT_NOT_FOUND',
        statusCode: 404,
      }
    );
  });
});
