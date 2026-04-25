import crypto from 'crypto';
import pool from '@config/database';
import { logger } from '@config/logger';
import {
  recordPublicIntakeResolution,
  recordPublicIntakeResolutionBestEffort,
} from '@services/publicIntakeResolutionService';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

jest.mock('@config/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('publicIntakeResolutionService', () => {
  const mockQuery = pool.query as jest.Mock;
  const mockLoggerError = logger.error as jest.Mock;

  beforeEach(() => {
    mockQuery.mockReset();
    mockLoggerError.mockReset();
  });

  it('records scope columns when public intake can derive an account', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'resolution-1' }] });

    await recordPublicIntakeResolution({
      sourceSystem: 'public_event',
      sourceReference: 'event-1',
      collectionMethod: 'event_registration',
      accountId: 'account-1',
      organizationId: 'account-1',
      matchedContactId: 'contact-1',
      resolutionStatus: 'resolved',
    });

    expect(mockQuery.mock.calls[0][0]).toContain('account_id');
    expect(mockQuery.mock.calls[0][1]).toEqual(
      expect.arrayContaining(['account-1', 'contact-1'])
    );
  });

  it('does not throw and logs a hashed source reference when audit persistence fails', async () => {
    mockQuery.mockRejectedValueOnce(new Error('insert failed'));

    await expect(
      recordPublicIntakeResolutionBestEffort({
        sourceSystem: 'portal_signup',
        sourceReference: 'person@example.org',
        collectionMethod: 'portal_signup',
        email: 'person@example.org',
        resolutionStatus: 'needs_contact_resolution',
      })
    ).resolves.toBeNull();

    const expectedHash = crypto.createHash('sha256').update('person@example.org').digest('hex');
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Failed to record public intake resolution audit',
      expect.not.objectContaining({ sourceReference: 'person@example.org' })
    );
    expect(mockLoggerError.mock.calls[0][1]).toEqual(
      expect.objectContaining({ sourceReferenceHash: expectedHash })
    );
  });
});
