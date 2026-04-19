import { Response, NextFunction } from 'express';
import * as reportController from '../report.handlers';
import { services } from '@container/services';
import { AuthRequest } from '@middleware/auth';
import {
  requirePermissionSafe,
  sendForbidden,
  sendUnauthorized,
} from '@services/authGuardService';
import { DirectReportExportTooLargeError } from '@modules/reports/services/reportService';
import { Permission } from '@utils/permissions';

jest.mock('@utils/responseHelpers', () => ({
  badRequest: jest.fn((res, message) => res.status(400).json({ error: message, code: 'bad_request' })),
  conflict: jest.fn((res, message) => res.status(409).json({ error: message, code: 'conflict' })),
  notFoundMessage: jest.fn((res, message) => res.status(404).json({ error: message, code: 'not_found' })),
  unauthorized: jest.fn((res, message) =>
    res.status(401).json({ error: message, code: 'unauthorized' })
  ),
}));

jest.mock('@services/authGuardService', () => ({
  requirePermissionSafe: jest.fn(),
  sendForbidden: jest.fn(),
  sendUnauthorized: jest.fn(),
}));

jest.mock('@container/services', () => ({
  services: {
    report: {
      assertDirectExportSupported: jest.fn(),
      generateReport: jest.fn(),
      getAvailableFields: jest.fn(),
      exportReport: jest.fn(),
    },
  },
}));

jest.mock('@services/reportExportJobService', () => ({
  ReportExportJobArtifactNotReadyError: class ReportExportJobArtifactNotReadyError extends Error {},
  ReportExportJobArtifactGoneError: class ReportExportJobArtifactGoneError extends Error {},
  reportExportJobService: {
    createAndProcessJob: jest.fn(),
    listJobs: jest.fn(),
    getJob: jest.fn(),
    readArtifactFile: jest.fn(),
  },
}));

const mockReportService = services.report as jest.Mocked<typeof services.report>;
const mockRequirePermissionSafe = requirePermissionSafe as jest.Mock;
const mockSendForbidden = sendForbidden as jest.Mock;
const mockSendUnauthorized = sendUnauthorized as jest.Mock;
const {
  ReportExportJobArtifactGoneError,
  reportExportJobService,
} = jest.requireMock('@services/reportExportJobService') as {
  ReportExportJobArtifactGoneError: new (message: string) => Error;
  reportExportJobService: {
    createAndProcessJob: jest.Mock;
    listJobs: jest.Mock;
    getJob: jest.Mock;
    readArtifactFile: jest.Mock;
  };
};

describe('Report Controller', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockSend: jest.Mock;
  let mockSetHeader: jest.Mock;
  let mockGetHeader: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockJson = jest.fn();
    mockSend = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    mockSetHeader = jest.fn();
    mockGetHeader = jest.fn().mockReturnValue(undefined);
    mockNext = jest.fn();

    mockRequirePermissionSafe.mockReturnValue({ ok: true, value: null });

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
      getHeader: mockGetHeader,
    };
  });

  describe('generateReport', () => {
    it('generates report successfully with org scope', async () => {
      const mockResult = { data: [{ id: 1, name: 'Test' }], total: 1 };
      const definition = { entity: 'contacts', fields: ['name'] };
      mockRequest.body = definition;
      mockReportService.generateReport.mockResolvedValue(mockResult as never);

      await reportController.generateReport(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequirePermissionSafe).toHaveBeenCalledWith(
        mockRequest,
        Permission.REPORT_CREATE
      );
      expect(mockReportService.generateReport).toHaveBeenCalledWith(definition, {
        organizationId: 'org-1',
      });
      expect(mockJson).toHaveBeenCalledWith(mockResult);
    });

    it('returns forbidden when permission check fails', async () => {
      mockRequirePermissionSafe.mockReturnValue({
        ok: false,
        error: {
          code: 'forbidden',
          message: 'Forbidden: Permission denied',
        },
      });

      await reportController.generateReport(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockSendForbidden).toHaveBeenCalledWith(mockResponse, 'Forbidden: Permission denied');
      expect(mockReportService.generateReport).not.toHaveBeenCalled();
    });

    it('returns unauthorized when org context is missing', async () => {
      mockRequest.organizationId = undefined;
      mockRequest.accountId = undefined;
      mockRequest.tenantId = undefined;
      mockRequest.body = { entity: 'contacts', fields: ['name'] };

      await reportController.generateReport(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Organization context required',
        code: 'unauthorized',
      });
    });

    it('returns 400 when entity is missing', async () => {
      mockRequest.body = { fields: ['name'] };

      await reportController.generateReport(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Entity is required',
        code: 'bad_request',
      });
    });

    it('returns 400 when fields and aggregations are missing', async () => {
      mockRequest.body = { entity: 'contacts' };

      await reportController.generateReport(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'At least one field or aggregation must be selected',
        code: 'bad_request',
      });
    });

    it('allows aggregation-only report generation', async () => {
      const mockResult = { data: [{ total_count: 4 }], total_count: 1 };
      const definition = {
        entity: 'contacts',
        aggregations: [{ field: 'id', function: 'count', alias: 'total_count' }],
      };
      mockRequest.body = definition;
      mockReportService.generateReport.mockResolvedValue(mockResult as never);

      await reportController.generateReport(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockReportService.generateReport).toHaveBeenCalledWith(definition, {
        organizationId: 'org-1',
      });
      expect(mockJson).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('getAvailableFields', () => {
    it('returns fields successfully', async () => {
      const mockFields = [{ id: 'name', label: 'Name', type: 'string' }];
      mockRequest.params = { entity: 'opportunities' };
      mockReportService.getAvailableFields.mockResolvedValue(mockFields as never);

      await reportController.getAvailableFields(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequirePermissionSafe).toHaveBeenCalledWith(
        mockRequest,
        Permission.REPORT_VIEW
      );
      expect(mockReportService.getAvailableFields).toHaveBeenCalledWith('opportunities');
      expect(mockJson).toHaveBeenCalledWith(mockFields);
    });

    it('returns 400 for invalid entity', async () => {
      mockRequest.params = { entity: 'invalid' };

      await reportController.getAvailableFields(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid entity type',
        code: 'bad_request',
      });
    });
  });

  describe('exportReport', () => {
    it('exports CSV successfully with org scope', async () => {
      const mockResult = { data: [{ name: 'Test' }], total: 1 };
      const mockBuffer = Buffer.from('Name\nTest');
      const definition = { entity: 'contacts', fields: ['name'] };
      mockRequest.body = { definition, format: 'csv' };

      mockReportService.generateReport.mockResolvedValue(mockResult as never);
      mockReportService.exportReport.mockResolvedValue({
        buffer: mockBuffer,
        contentType: 'text/csv; charset=utf-8',
        extension: 'csv',
        filename: 'contacts.csv',
      } as never);

      await reportController.exportReport(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequirePermissionSafe).toHaveBeenCalledWith(
        mockRequest,
        Permission.REPORT_EXPORT
      );
      expect(mockReportService.assertDirectExportSupported).toHaveBeenCalledWith(definition, {
        organizationId: 'org-1',
      });
      expect(mockReportService.generateReport).toHaveBeenCalledWith(definition, {
        organizationId: 'org-1',
      });
      expect(mockSetHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(mockSetHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="contacts.csv"'
      );
      expect(mockSend).toHaveBeenCalledWith(mockBuffer);
    });

    it('returns 400 when format is missing', async () => {
      mockRequest.body = { definition: { entity: 'contacts' } };

      await reportController.exportReport(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Definition and format are required',
        code: 'bad_request',
      });
    });

    it('returns 400 for invalid format', async () => {
      mockRequest.body = {
        definition: { entity: 'contacts' },
        format: 'pdf',
      };

      await reportController.exportReport(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid format. Supported formats: csv, xlsx',
        code: 'bad_request',
      });
    });

    it('returns 409 when the direct export exceeds the synchronous size cap', async () => {
      const definition = { entity: 'contacts', fields: ['name'] };
      mockRequest.body = { definition, format: 'csv' };
      mockReportService.assertDirectExportSupported.mockRejectedValue(
        new DirectReportExportTooLargeError()
      );

      await reportController.exportReport(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith({
        error:
          'Report is too large for direct export. Use /v2/reports/exports to create an export job.',
        code: 'conflict',
      });
      expect(mockReportService.generateReport).not.toHaveBeenCalled();
      expect(mockReportService.exportReport).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('routes unauthorized guard failures to sendUnauthorized', async () => {
      mockRequirePermissionSafe.mockReturnValue({
        ok: false,
        error: {
          code: 'unauthorized',
          message: 'Unauthorized: No authenticated user',
        },
      });

      await reportController.exportReport(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockSendUnauthorized).toHaveBeenCalledWith(
        mockResponse,
        'Unauthorized: No authenticated user'
      );
      expect(mockReportService.generateReport).not.toHaveBeenCalled();
    });
  });

  describe('export jobs', () => {
    it('creates a persisted export job with org scope', async () => {
      const definition = {
        name: 'Contacts export',
        entity: 'contacts',
        fields: ['first_name', 'email'],
      };
      mockRequest.body = { definition, format: 'csv', idempotencyKey: 'job-1' };
      reportExportJobService.createAndProcessJob.mockResolvedValue({
        id: 'job-1',
        organizationId: 'org-1',
        name: 'Contacts export',
        entity: 'contacts',
        format: 'csv',
        status: 'completed',
      });

      await reportController.createExportJob(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(reportExportJobService.createAndProcessJob).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          requestedBy: 'user-1',
          definition,
          format: 'csv',
          idempotencyKey: 'job-1',
        })
      );
      expect(mockReportService.assertDirectExportSupported).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 'job-1',
            status: 'completed',
          }),
        })
      );
    });

    it('lists export jobs', async () => {
      reportExportJobService.listJobs.mockResolvedValue([{ id: 'job-1', status: 'completed' }]);
      mockRequest.query = { limit: '10' };
      mockRequest.validatedQuery = { limit: 10 } as never;

      await reportController.listExportJobs(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(reportExportJobService.listJobs).toHaveBeenCalledWith('org-1', 10);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [{ id: 'job-1', status: 'completed' }],
        })
      );
    });

    it('returns a single export job by id', async () => {
      mockRequest.params = { id: 'job-1' };
      reportExportJobService.getJob.mockResolvedValue({ id: 'job-1', status: 'completed' });

      await reportController.getExportJob(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(reportExportJobService.getJob).toHaveBeenCalledWith('org-1', 'job-1');
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { id: 'job-1', status: 'completed' },
        })
      );
    });

    it('downloads a completed export artifact', async () => {
      mockRequest.params = { id: 'job-1' };
      reportExportJobService.getJob.mockResolvedValue({
        id: 'job-1',
        status: 'completed',
        format: 'csv',
        artifactFileName: 'contacts.csv',
        artifactContentType: 'text/csv',
      });
      reportExportJobService.readArtifactFile.mockResolvedValue({
        buffer: Buffer.from('email\nalice@example.com'),
        filename: 'contacts.csv',
        contentType: 'text/csv',
        extension: 'csv',
      });

      await reportController.downloadExportJob(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(reportExportJobService.getJob).toHaveBeenCalledWith('org-1', 'job-1');
      expect(reportExportJobService.readArtifactFile).toHaveBeenCalled();
      expect(mockSetHeader).toHaveBeenCalled();
      expect(mockSend).toHaveBeenCalledWith(Buffer.from('email\nalice@example.com'));
    });

    it('returns 409 when downloading a non-terminal export job', async () => {
      mockRequest.params = { id: 'job-1' };
      reportExportJobService.getJob.mockResolvedValue({ id: 'job-1', status: 'processing' });

      await reportController.downloadExportJob(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(reportExportJobService.readArtifactFile).not.toHaveBeenCalled();
    });

    it('returns 410 when a completed export artifact is unavailable', async () => {
      mockRequest.params = { id: 'job-1' };
      reportExportJobService.getJob.mockResolvedValue({
        id: 'job-1',
        status: 'completed',
        format: 'csv',
        artifactFileName: 'contacts.csv',
      });
      reportExportJobService.readArtifactFile.mockRejectedValue(
        new ReportExportJobArtifactGoneError('gone')
      );

      await reportController.downloadExportJob(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(410);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'gone',
          }),
        })
      );
    });
  });
});
