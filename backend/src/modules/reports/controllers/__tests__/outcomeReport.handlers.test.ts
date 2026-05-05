import type { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { Permission } from '@utils/permissions';
import { requirePermissionSafe } from '@services/authGuardService';
import * as outcomeReportService from '../../services/outcomesReportService';
import { getOutcomesReport } from '../outcomeReport.handlers';

jest.mock('@services/authGuardService', () => ({
  requirePermissionSafe: jest.fn(),
  sendForbidden: jest.fn((res, message) =>
    res.status(403).json({ success: false, error: { code: 'forbidden', message } })
  ),
  sendUnauthorized: jest.fn((res, message) =>
    res.status(401).json({ success: false, error: { code: 'unauthorized', message } })
  ),
}));

jest.mock('../../services/outcomesReportService', () => ({
  getOutcomesReport: jest.fn(),
}));

const mockRequirePermissionSafe = requirePermissionSafe as jest.Mock;
const mockGetOutcomesReport = outcomeReportService.getOutcomesReport as jest.Mock;

const createResponse = (): Response => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    getHeader: jest.fn().mockReturnValue(undefined),
    setHeader: jest.fn(),
  };

  return response as unknown as Response;
};

describe('outcomeReport.handlers getOutcomesReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequirePermissionSafe.mockReturnValue({ ok: true, value: null });
    mockGetOutcomesReport.mockResolvedValue({
      totalsByOutcome: [],
      timeseries: [],
    });
  });

  it('forwards only the accepted outcomes report filters to the service', async () => {
    const req = {
      user: { id: 'user-1', role: 'admin' },
      query: {
        from: '2026-01-01',
        to: '2026-01-31',
        programId: 'raw-query-program-id',
      },
      validatedQuery: {
        from: '2026-01-01',
        to: '2026-01-31',
        staffId: '11111111-1111-4111-8111-111111111111',
        source: 'interaction',
        interactionType: 'meeting',
        bucket: 'month',
        includeNonReportable: true,
      },
    } as unknown as AuthRequest;
    const res = createResponse();

    await getOutcomesReport(req, res);

    expect(mockRequirePermissionSafe).toHaveBeenCalledWith(
      req,
      Permission.OUTCOMES_VIEW_REPORTS
    );
    expect(mockGetOutcomesReport).toHaveBeenCalledWith(
      {
        from: '2026-01-01',
        to: '2026-01-31',
        staffId: '11111111-1111-4111-8111-111111111111',
        source: 'interaction',
        interactionType: 'meeting',
        bucket: 'month',
        includeNonReportable: true,
      },
      true
    );
    expect(mockGetOutcomesReport.mock.calls[0][0]).not.toHaveProperty('programId');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        totalsByOutcome: [],
        timeseries: [],
      },
      totalsByOutcome: [],
      timeseries: [],
    });
  });
});
