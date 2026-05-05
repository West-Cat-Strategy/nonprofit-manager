jest.mock('@config/database', () => ({
  query: jest.fn(),
}));

jest.mock('@config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../services/communicationsService', () => ({
  sendCampaignRun: jest.fn(),
}));

import pool from '@config/database';
import { logger } from '@config/logger';
import { sendCampaignRun } from '../services/communicationsService';
import {
  drainDueLocalCampaignRuns,
  recoverStaleLocalCampaignSendingRecipients,
} from '../services/localCampaignDrainService';

const mockPool = pool as jest.Mocked<typeof pool>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockSendCampaignRun = sendCampaignRun as jest.MockedFunction<typeof sendCampaignRun>;

describe('localCampaignDrainService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    delete process.env.LOCAL_CAMPAIGN_STALE_SENDING_RECOVERY_MS;
  });

  it('recovers stale local sending recipients back to queued before retrying delivery', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 'recipient-1' }, { id: 'recipient-2' }], rowCount: 2 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const recovered = await recoverStaleLocalCampaignSendingRecipients();

    expect(recovered).toBe(2);
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining("cr.provider = 'local_email'"),
      [15 * 60 * 1000]
    );
    expect(String(mockPool.query.mock.calls[0]?.[0])).toContain("cr.status = 'sending'");
    expect(String(mockPool.query.mock.calls[0]?.[0])).toContain("crr.status = 'sending'");
    expect(String(mockPool.query.mock.calls[0]?.[0])).toContain("SET status = 'queued'");
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Recovered stale local campaign recipients from sending state',
      expect.objectContaining({ recovered: 2 })
    );
  });

  it('runs stale-sending recovery before claiming due local campaign runs', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 'recipient-1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'run-1' }], rowCount: 1 });
    mockSendCampaignRun.mockResolvedValueOnce({
      action: 'sent',
      message: 'sent',
      run: {} as never,
    });

    const processed = await drainDueLocalCampaignRuns(4);

    expect(processed).toBe(1);
    expect(String(mockPool.query.mock.calls[0]?.[0])).toContain('stale_recipients');
    expect(String(mockPool.query.mock.calls[1]?.[0])).toContain('candidate_runs');
    expect(mockPool.query.mock.calls[1]?.[1]).toEqual([4]);
    expect(mockSendCampaignRun).toHaveBeenCalledWith('run-1');
  });
});
