import type { NextFunction, Request, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import { services } from '@container/services';
import {
  badRequest,
  notFoundMessage,
  unauthorized,
} from '@utils/responseHelpers';
import {
  requirePermissionSafe,
  sendForbidden,
  sendUnauthorized,
} from '@services/authGuardService';
import { Permission } from '@utils/permissions';
import { publicReportSnapshotService } from '@services/publicReportSnapshotService';
import { sendSuccess } from '@modules/shared/http/envelope';
import {
  downloadPublicReportByToken,
  generatePublicLink,
  getReportByPublicToken,
  getSharePrincipals,
  revokePublicLink,
  shareReport,
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

jest.mock('@modules/shared/http/envelope', () => ({
  sendSuccess: jest.fn(),
}));

const mockSavedReportService = services.savedReport as jest.Mocked<typeof services.savedReport>;
const mockRequirePermissionSafe = requirePermissionSafe as jest.MockedFunction<
  typeof requirePermissionSafe
>;
const mockSendForbidden = sendForbidden as jest.MockedFunction<typeof sendForbidden>;
const mockSendUnauthorized = sendUnauthorized as jest.MockedFunction<typeof sendUnauthorized>;
const mockUnauthorized = unauthorized as jest.MockedFunction<typeof unauthorized>;
const mockBadRequest = badRequest as jest.MockedFunction<typeof badRequest>;
const mockNotFoundMessage = notFoundMessage as jest.MockedFunction<typeof notFoundMessage>;
const mockSendSuccess = sendSuccess as jest.MockedFunction<typeof sendSuccess>;
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

const createRequest = (overrides: Partial<Request> = {}): Partial<Request> &
  Partial<{
    organizationId: string | null;
    accountId: string | null;
    tenantId: string | null;
    validatedQuery: Record<string, unknown>;
  }> => ({
  body: {},
  params: {},
  query: {},
  organizationId: 'org-1',
  accountId: null,
  tenantId: null,
  ...overrides,
});

describe('reportSharingController', () => {
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    res = createResponse();
    next = jest.fn();
    mockRequirePermissionSafe.mockReturnValue({ ok: true, value: null } as never);
  });

  describe('getSharePrincipals', () => {
    it('blocks unauthenticated requests before querying share principals', async () => {
      mockRequirePermissionSafe.mockReturnValueOnce({
        ok: false,
        error: {
          code: 'unauthorized',
          message: 'No session',
          statusCode: 401,
        },
      } as never);

      await getSharePrincipals(createRequest() as AuthRequest, res, next);

      expect(mockSendUnauthorized).toHaveBeenCalledWith(res, 'No session');
      expect(mockSavedReportService.getSharePrincipals).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('blocks forbidden requests before querying share principals', async () => {
      mockRequirePermissionSafe.mockReturnValueOnce({
        ok: false,
        error: {
          code: 'forbidden',
          message: 'Denied',
          statusCode: 403,
        },
      } as never);

      await getSharePrincipals(createRequest() as AuthRequest, res, next);

      expect(mockSendForbidden).toHaveBeenCalledWith(res, 'Denied');
      expect(mockSavedReportService.getSharePrincipals).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('returns share principals from the validated query payload', async () => {
      const principals = {
        users: [{ id: 'user-2', email: 'staff@example.com' }],
        roles: [{ name: 'staff', label: 'Staff' }],
      };
      mockSavedReportService.getSharePrincipals.mockResolvedValueOnce(principals as never);

      const req = createRequest({
        query: { search: 'staff', limit: '10' },
        validatedQuery: { search: 'staff', limit: 10 },
      });

      await getSharePrincipals(req as AuthRequest, res, next);

      expect(mockRequirePermissionSafe).toHaveBeenCalledWith(req, Permission.REPORT_VIEW);
      expect(mockSavedReportService.getSharePrincipals).toHaveBeenCalledWith('staff', 10);
      expect(mockSendSuccess).toHaveBeenCalledWith(res, principals);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('shareReport', () => {
    it('returns unauthorized when the user session is missing', async () => {
      const req = createRequest({
        params: { id: 'report-1' },
      });
      delete (req as Partial<Request> & { user?: unknown }).user;

      await shareReport(req as AuthRequest, res);

      expect(mockUnauthorized).toHaveBeenCalledWith(res, 'User not authenticated');
      expect(mockSavedReportService.shareReport).not.toHaveBeenCalled();
    });

    it('maps ownership failures to forbidden responses', async () => {
      mockSavedReportService.shareReport.mockRejectedValueOnce(
        new Error('Only report owner can share this report')
      );

      const req = createRequest({
        params: { id: 'report-1' },
        user: { id: 'user-1', role: 'admin' },
        body: {
          user_ids: ['user-2'],
          role_names: ['manager'],
          share_settings: { can_download: true },
        },
      });

      await shareReport(req as AuthRequest, res);

      expect(mockSendForbidden).toHaveBeenCalledWith(
        res,
        'Only report owner can share this report'
      );
    });

    it('shares a report with the actor context', async () => {
      mockSavedReportService.shareReport.mockResolvedValueOnce({
        id: 'report-1',
        shared: true,
      } as never);

      const req = createRequest({
        params: { id: 'report-1' },
        user: { id: 'user-1', role: 'admin' },
        body: {
          user_ids: ['user-2'],
          role_names: ['manager'],
          share_settings: { can_download: true },
        },
      });

      await shareReport(req as AuthRequest, res);

      expect(mockSavedReportService.shareReport).toHaveBeenCalledWith(
        'report-1',
        'user-1',
        'admin',
        ['user-2'],
        ['manager'],
        { can_download: true }
      );
      expect((res.json as jest.Mock)).toHaveBeenCalledWith({ id: 'report-1', shared: true });
    });
  });

  describe('generatePublicLink', () => {
    it('returns unauthorized when the user session is missing', async () => {
      const req = createRequest({
        params: { id: 'report-1' },
      });
      delete (req as Partial<Request> & { user?: unknown }).user;

      await generatePublicLink(req as AuthRequest, res);

      expect(mockUnauthorized).toHaveBeenCalledWith(res, 'User not authenticated');
      expect(mockPublicReportSnapshotService.createSnapshotForPublicLink).not.toHaveBeenCalled();
    });

    it.each([
      ['organizationId', { organizationId: 'org-1' }, 'org-1'],
      ['accountId', { organizationId: null, accountId: 'account-1' }, 'account-1'],
      ['tenantId', { organizationId: null, accountId: null, tenantId: 'tenant-1' }, 'tenant-1'],
    ])(
      'uses %s when deriving the organization context for public links',
      async (_label, context, expectedOrgId) => {
        mockPublicReportSnapshotService.createSnapshotForPublicLink.mockResolvedValueOnce({
          token: 'token-123',
          url: '/public/reports/token-123',
        } as never);

        const req = createRequest({
          params: { id: 'report-1' },
          user: { id: 'user-1', role: 'manager' },
          body: { expires_at: '2026-03-20T00:00:00.000Z' },
          ...context,
        });

        await generatePublicLink(req as AuthRequest, res);

        expect(mockPublicReportSnapshotService.createSnapshotForPublicLink).toHaveBeenCalledWith({
          savedReportId: 'report-1',
          actorUserId: 'user-1',
          actorRole: 'manager',
          organizationId: expectedOrgId,
          expiresAt: '2026-03-20T00:00:00.000Z',
        });
        expect((res.json as jest.Mock)).toHaveBeenCalledWith({
          token: 'token-123',
          url: '/public/reports/token-123',
        });
      }
    );
  });

  describe('revokePublicLink', () => {
    it('revokes the link using the actor context', async () => {
      mockPublicReportSnapshotService.revokePublicLink.mockResolvedValueOnce(undefined as never);

      const req = createRequest({
        params: { id: 'report-1' },
        user: { id: 'user-1', role: 'manager' },
      });

      await revokePublicLink(req as AuthRequest, res);

      expect(mockPublicReportSnapshotService.revokePublicLink).toHaveBeenCalledWith({
        savedReportId: 'report-1',
        actorUserId: 'user-1',
        actorRole: 'manager',
      });
      expect((res.json as jest.Mock)).toHaveBeenCalledWith({
        message: 'Public link revoked successfully',
      });
    });
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

      expect(mockPublicReportSnapshotService.getPublicSnapshotMeta).toHaveBeenCalledWith('token-123');
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
      mockPublicReportSnapshotService.getPublicSnapshotMeta.mockResolvedValueOnce(report as never);

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
