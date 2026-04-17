import type { Pool } from 'pg';
import { RegistrationStatus } from '@app-types/event';
import * as shared from '../shared';
import * as helpers from '../eventRegistrationService.helpers';
import { registerContactMutation } from '../eventRegistrationService.registrationMutations';

jest.mock('../shared', () => {
  const actual = jest.requireActual('../shared');
  return {
    ...actual,
    recordActivityEventSafely: jest.fn(),
  };
});

jest.mock('../eventRegistrationService.helpers', () => {
  const actual = jest.requireActual('../eventRegistrationService.helpers');
  return {
    ...actual,
    createRegistrationRecord: jest.fn(),
    determineRegistrationStatus: jest.fn(),
    getEventRow: jest.fn(),
    getExistingOccurrenceRegistration: jest.fn(),
    getLockedOccurrence: jest.fn(),
    maybeSendConfirmationEmail: jest.fn(),
    recalculateCounts: jest.fn(),
    resolveCaseLink: jest.fn(),
  };
});

describe('registerContactMutation', () => {
  const mockQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
  const mockRelease = jest.fn();
  const mockConnect = jest.fn().mockResolvedValue({
    query: mockQuery,
    release: mockRelease,
  });
  const pool = { connect: mockConnect } as unknown as Pool;

  const ctx = {
    pool,
    support: {
      resolveContactIdByIdentity: jest.fn(),
      createWalkInContact: jest.fn(),
      assertCheckInAllowed: jest.fn(),
    },
    occurrences: {
      resolveOccurrence: jest.fn(),
    },
    confirmations: {
      sendRegistrationConfirmationEmail: jest.fn(),
    },
  } as never;

  const mockRecordActivityEventSafely = jest.mocked(shared.recordActivityEventSafely);
  const mockCreateRegistrationRecord = jest.mocked(helpers.createRegistrationRecord);
  const mockDetermineRegistrationStatus = jest.mocked(helpers.determineRegistrationStatus);
  const mockGetEventRow = jest.mocked(helpers.getEventRow);
  const mockGetExistingOccurrenceRegistration = jest.mocked(helpers.getExistingOccurrenceRegistration);
  const mockGetLockedOccurrence = jest.mocked(helpers.getLockedOccurrence);
  const mockMaybeSendConfirmationEmail = jest.mocked(helpers.maybeSendConfirmationEmail);
  const mockRecalculateCounts = jest.mocked(helpers.recalculateCounts);
  const mockResolveCaseLink = jest.mocked(helpers.resolveCaseLink);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the committed registration when confirmation delivery fails after commit', async () => {
    const eventRow = { event_id: 'event-1', event_name: 'Community Clinic' };
    const occurrenceRow = {
      occurrence_id: 'occ-1',
      event_id: 'event-1',
      start_date: new Date('2026-06-15T18:00:00.000Z'),
      end_date: new Date('2026-06-15T20:00:00.000Z'),
    };
    const createdRegistration = {
      registration_id: 'reg-1',
      event_id: 'event-1',
      occurrence_id: 'occ-1',
      contact_id: 'contact-1',
      registration_status: RegistrationStatus.REGISTERED,
    };

    mockGetEventRow.mockResolvedValueOnce(eventRow as never);
    (ctx.occurrences.resolveOccurrence as jest.Mock).mockResolvedValueOnce(occurrenceRow as never);
    mockGetLockedOccurrence.mockResolvedValueOnce(occurrenceRow as never);
    mockGetExistingOccurrenceRegistration.mockResolvedValueOnce(null as never);
    mockResolveCaseLink.mockResolvedValueOnce({ caseId: null, caseNumber: null, caseTitle: null });
    mockDetermineRegistrationStatus.mockResolvedValueOnce({
      registrationStatus: RegistrationStatus.REGISTERED,
      waitlistPosition: null,
    });
    mockCreateRegistrationRecord.mockResolvedValueOnce(createdRegistration as never);
    mockRecordActivityEventSafely.mockResolvedValue(undefined as never);
    mockRecalculateCounts.mockResolvedValue(undefined as never);
    mockMaybeSendConfirmationEmail.mockRejectedValueOnce(new Error('smtp exploded'));

    const result = await registerContactMutation(
      ctx,
      {
        event_id: 'event-1',
        occurrence_id: 'occ-1',
        contact_id: 'contact-1',
        send_confirmation_email: true,
      } as never,
      { actorUserId: 'user-1', source: 'staff' }
    );

    expect(result).toBe(createdRegistration);
    expect(mockQuery.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'COMMIT']);
    expect(mockMaybeSendConfirmationEmail).toHaveBeenCalledWith(
      ctx,
      'reg-1',
      'user-1',
      RegistrationStatus.REGISTERED,
      true
    );
    expect(mockQuery).not.toHaveBeenCalledWith('ROLLBACK');
  });
});
