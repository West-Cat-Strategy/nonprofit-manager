import { NextFunction, Request, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import * as reportSharingController from '../../controllers/reportSharingController';
import { services } from '../../container/services';
import { publicReportSnapshotService } from '../../services/publicReportSnapshotService';
import { requirePermissionSafe } from '../../services/authGuardService';

jest.mock('../../utils/responseHelpers', () => ({
  badRequest: jest.fn((res, message) =>
    res.status(400).json({ error: message, code: 'bad_request' })
  ),
  notFoundMessage: jest.fn((res, message) =>
    res.status(404).json({ error: message, code: 'not_found' })
  ),
  unauthorized: jest.fn((res, message) =>
    res.status(401).json({ error: message, code: 'unauthorized' })
  ),
}));

jest.mock('../../container/services', () => ({
  services: {
    savedReport: {
      getSharePrincipals: jest.fn(),
      shareReport: jest.fn(),
      removeShare: jest.fn(),
    },
  },
}));

jest.mock('../../services/publicReportSnapshotService', () => ({
  publicReportSnapshotService: {
    createSnapshotForPublicLink: jest.fn(),
    revokePublicLink: jest.fn(),
    getPublicSnapshotMeta: jest.fn(),
    getPublicSnapshotDownload: jest.fn(),
  },
}));

jest.mock('../../services/authGuardService', () => ({
  requirePermissionSafe: jest.fn(),
  sendForbidden: jest.fn(),
  sendUnauthorized: jest.fn(),
}));

const mockSavedReportService = services.savedReport as jest.Mocked<typeof services.savedReport>;
const mockSnapshotService = publicReportSnapshotService as jest.Mocked<typeof publicReportSnapshotService>;
const mockRequirePermissionSafe = requirePermissionSafe as jest.Mock;

describe('Report Sharing Controller', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockSend: jest.Mock;
  let mockSetHeader: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequirePermissionSafe.mockReturnValue({ ok: true, value: null });

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    mockSend = jest.fn();
    mockSetHeader = jest.fn();
    mockNext = jest.fn();

    mockRequest = {
      body: {},
      params: {},
      query: {},
      organizationId: 'org-1',
      user: {
        id: 'user-1',
        email: 'user@example.com',
        role: 'admin',
      },
    };

    mockResponse = {
      json: mockJson,
      status: mockStatus,
      send: mockSend,
      setHeader: mockSetHeader,
    };
  });

  it('returns share principals', async () => {
    mockRequest.query = { search: 'ann', limit: '10' };
    (mockRequest as any).validatedQuery = { search: 'ann', limit: 10 };
    mockSavedReportService.getSharePrincipals.mockResolvedValue({
      users: [],
      roles: [{ name: 'admin', label: 'Admin' }],
    } as any);

    await reportSharingController.getSharePrincipals(
      mockRequest as AuthRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockSavedReportService.getSharePrincipals).toHaveBeenCalledWith('ann', 10);
    expect(mockStatus).toHaveBeenCalledWith(200);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: {
          users: [],
          roles: [{ name: 'admin', label: 'Admin' }],
        },
      })
    );
  });

  it('shares report with actor context', async () => {
    mockRequest.params = { id: 'report-1' };
    mockRequest.body = { user_ids: ['user-2'], role_names: ['manager'] };
    mockSavedReportService.shareReport.mockResolvedValue({ id: 'report-1' } as any);

    await reportSharingController.shareReport(
      mockRequest as AuthRequest,
      mockResponse as Response
    );

    expect(mockSavedReportService.shareReport).toHaveBeenCalledWith(
      'report-1',
      'user-1',
      'admin',
      ['user-2'],
      ['manager'],
      undefined
    );
    expect(mockJson).toHaveBeenCalledWith({ id: 'report-1' });
  });

  it('generates public link through snapshot service', async () => {
    mockRequest.params = { id: 'report-1' };
    mockRequest.body = { expires_at: '2026-03-20T00:00:00.000Z' };
    mockSnapshotService.createSnapshotForPublicLink.mockResolvedValue({
      token: 'token-123',
      url: '/public/reports/token-123',
    });

    await reportSharingController.generatePublicLink(
      mockRequest as AuthRequest,
      mockResponse as Response
    );

    expect(mockSnapshotService.createSnapshotForPublicLink).toHaveBeenCalledWith({
      savedReportId: 'report-1',
      actorUserId: 'user-1',
      actorRole: 'admin',
      organizationId: 'org-1',
      expiresAt: '2026-03-20T00:00:00.000Z',
    });
    expect(mockJson).toHaveBeenCalledWith({
      token: 'token-123',
      url: '/public/reports/token-123',
    });
  });

  it('revokes public link through snapshot service', async () => {
    mockRequest.params = { id: 'report-1' };
    mockSnapshotService.revokePublicLink.mockResolvedValue(undefined);

    await reportSharingController.revokePublicLink(
      mockRequest as AuthRequest,
      mockResponse as Response
    );

    expect(mockSnapshotService.revokePublicLink).toHaveBeenCalledWith({
      savedReportId: 'report-1',
      actorUserId: 'user-1',
      actorRole: 'admin',
    });
    expect(mockJson).toHaveBeenCalledWith({ message: 'Public link revoked successfully' });
  });

  it('returns public snapshot metadata by token', async () => {
    mockRequest.params = { token: 'token-123' };
    mockSnapshotService.getPublicSnapshotMeta.mockResolvedValue({
      token: 'token-123',
      report_id: 'report-1',
      report_name: 'Public Report',
      entity: 'contacts',
      rows_count: 3,
      lifecycle_state: 'active',
      expires_at: null,
      created_at: new Date().toISOString(),
      available_formats: ['csv', 'xlsx'],
    } as any);

    await reportSharingController.getReportByPublicToken(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'token-123',
        lifecycle_state: 'active',
      })
    );
  });

  it('downloads public snapshot artifact', async () => {
    const buffer = Buffer.from('a,b\n1,2');
    mockRequest.params = { token: 'token-123' };
    (mockRequest as any).validatedQuery = { format: 'csv' };
    mockSnapshotService.getPublicSnapshotDownload.mockResolvedValue({
      fileName: 'report.csv',
      contentType: 'text/csv',
      buffer,
    });

    await reportSharingController.downloadPublicReportByToken(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockSnapshotService.getPublicSnapshotDownload).toHaveBeenCalledWith('token-123', 'csv');
    expect(mockSetHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(mockSetHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="report.csv"'
    );
    expect(mockSend).toHaveBeenCalledWith(buffer);
  });
});
