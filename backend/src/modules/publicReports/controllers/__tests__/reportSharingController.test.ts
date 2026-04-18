import type { NextFunction, Request, Response } from 'express';
import { publicReportSnapshotService } from '@services/publicReportSnapshotService';
import {
  badRequest,
  notFoundMessage,
} from '@utils/responseHelpers';
import {
  downloadPublicReportByToken as sharedDownloadPublicReportByToken,
  getReportByPublicToken as sharedGetReportByPublicToken,
} from '@modules/shared/reports/reportSharing.handlers';
import {
  downloadPublicReportByToken,
  getReportByPublicToken,
} from '../reportSharingController';

jest.mock('@container/services', () => ({
  services: {
    savedReport: {
      getSharePrincipals: jest.fn(),
      shareReport: jest.fn(),
      removeShare: jest.fn(),
    },
  },
}));

jest.mock('@services/authGuardService', () => ({
  requirePermissionSafe: jest.fn(),
  sendForbidden: jest.fn(),
  sendUnauthorized: jest.fn(),
}));

jest.mock('@services/publicReportSnapshotService', () => ({
  publicReportSnapshotService: {
    createSnapshotForPublicLink: jest.fn(),
    revokePublicLink: jest.fn(),
    getPublicSnapshotMeta: jest.fn(),
    getPublicSnapshotDownload: jest.fn(),
  },
}));

jest.mock('@utils/responseHelpers', () => ({
  badRequest: jest.fn(),
  notFoundMessage: jest.fn(),
  unauthorized: jest.fn(),
}));

const mockBadRequest = badRequest as jest.MockedFunction<typeof badRequest>;
const mockNotFoundMessage = notFoundMessage as jest.MockedFunction<
  typeof notFoundMessage
>;
const mockPublicReportSnapshotService = publicReportSnapshotService as jest.Mocked<
  typeof publicReportSnapshotService
>;

const createResponse = (): Response =>
  ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
  }) as unknown as Response;

const createRequest = (
  overrides: Partial<Request> = {}
): Partial<Request> & { validatedQuery?: Record<string, unknown> } => ({
  params: {},
  query: {},
  ...overrides,
});

describe('publicReports reportSharingController facade', () => {
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    res = createResponse();
    next = jest.fn();
  });

  it('re-exports the shared public-report handlers', () => {
    expect(getReportByPublicToken).toBe(sharedGetReportByPublicToken);
    expect(downloadPublicReportByToken).toBe(sharedDownloadPublicReportByToken);
  });

  describe('getReportByPublicToken', () => {
    it('rejects missing public tokens', async () => {
      const req = createRequest({ params: { token: '' } });

      await getReportByPublicToken(req as Request, res, next);

      expect(mockBadRequest).toHaveBeenCalledWith(res, 'Public report token is required');
      expect(mockPublicReportSnapshotService.getPublicSnapshotMeta).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('maps missing public reports to not found', async () => {
      mockPublicReportSnapshotService.getPublicSnapshotMeta.mockResolvedValueOnce(null as never);

      const req = createRequest({ params: { token: 'token-123' } });

      await getReportByPublicToken(req as Request, res, next);

      expect(mockPublicReportSnapshotService.getPublicSnapshotMeta).toHaveBeenCalledWith(
        'token-123'
      );
      expect(mockNotFoundMessage).toHaveBeenCalledWith(
        res,
        'Report not found or link has expired'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('returns the public report metadata when found', async () => {
      const report = {
        token: 'token-123',
        report_id: 'report-1',
        report_name: 'Public Report',
      };
      mockPublicReportSnapshotService.getPublicSnapshotMeta.mockResolvedValueOnce(
        report as never
      );

      const req = createRequest({ params: { token: 'token-123' } });

      await getReportByPublicToken(req as Request, res, next);

      expect((res.json as jest.Mock)).toHaveBeenCalledWith(report);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('downloadPublicReportByToken', () => {
    it('rejects invalid download formats before calling the snapshot service', async () => {
      const req = createRequest({
        params: { token: 'token-123' },
        query: { format: 'pdf' },
      });

      await downloadPublicReportByToken(req as Request, res, next);

      expect(mockBadRequest).toHaveBeenCalledWith(res, 'Format must be csv or xlsx');
      expect(mockPublicReportSnapshotService.getPublicSnapshotDownload).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('maps not-found snapshot download errors to not found', async () => {
      mockPublicReportSnapshotService.getPublicSnapshotDownload.mockRejectedValueOnce(
        new Error('Snapshot not found')
      );

      const req = createRequest({
        params: { token: 'token-123' },
        validatedQuery: { format: 'csv' },
      });

      await downloadPublicReportByToken(req as Request, res, next);

      expect(mockPublicReportSnapshotService.getPublicSnapshotDownload).toHaveBeenCalledWith(
        'token-123',
        'csv'
      );
      expect(mockNotFoundMessage).toHaveBeenCalledWith(res, 'Snapshot not found');
      expect(next).not.toHaveBeenCalled();
    });

    it('returns the download artifact with headers and body', async () => {
      const buffer = Buffer.from('a,b\n1,2');
      mockPublicReportSnapshotService.getPublicSnapshotDownload.mockResolvedValueOnce({
        fileName: 'report.csv',
        contentType: 'text/csv',
        buffer,
      } as never);

      const req = createRequest({
        params: { token: 'token-123' },
        validatedQuery: { format: 'csv' },
      });

      await downloadPublicReportByToken(req as Request, res, next);

      expect((res.setHeader as jest.Mock)).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect((res.setHeader as jest.Mock)).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="report.csv"'
      );
      expect((res.send as jest.Mock)).toHaveBeenCalledWith(buffer);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
