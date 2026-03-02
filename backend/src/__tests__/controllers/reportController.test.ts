import { Response, NextFunction } from 'express';
import * as reportController from '../../controllers/reportController';
import { services } from '../../container/services';
import { AuthRequest } from '../../middleware/auth';
import {
  requirePermissionOrError,
  sendForbidden,
  sendUnauthorized,
} from '../../services/authGuardService';
import { Permission } from '../../utils/permissions';

jest.mock('../../utils/responseHelpers', () => ({
  badRequest: jest.fn((res, message) => res.status(400).json({ error: message, code: 'bad_request' })),
  unauthorized: jest.fn((res, message) =>
    res.status(401).json({ error: message, code: 'unauthorized' })
  ),
}));

jest.mock('../../services/authGuardService', () => ({
  requirePermissionOrError: jest.fn(),
  sendForbidden: jest.fn(),
  sendUnauthorized: jest.fn(),
}));

jest.mock('../../container/services', () => ({
  services: {
    report: {
      generateReport: jest.fn(),
      getAvailableFields: jest.fn(),
      exportReport: jest.fn(),
    },
  },
}));

const mockReportService = services.report as jest.Mocked<typeof services.report>;
const mockRequirePermissionOrError = requirePermissionOrError as jest.Mock;
const mockSendForbidden = sendForbidden as jest.Mock;
const mockSendUnauthorized = sendUnauthorized as jest.Mock;

describe('Report Controller', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockSend: jest.Mock;
  let mockSetHeader: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockJson = jest.fn();
    mockSend = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    mockSetHeader = jest.fn();
    mockNext = jest.fn();

    mockRequirePermissionOrError.mockReturnValue({ success: true });

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

      expect(mockRequirePermissionOrError).toHaveBeenCalledWith(
        mockRequest,
        Permission.REPORT_CREATE
      );
      expect(mockReportService.generateReport).toHaveBeenCalledWith(definition, {
        organizationId: 'org-1',
      });
      expect(mockJson).toHaveBeenCalledWith(mockResult);
    });

    it('returns forbidden when permission check fails', async () => {
      mockRequirePermissionOrError.mockReturnValue({
        success: false,
        error: 'Forbidden: Permission denied',
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

    it('returns 400 when fields are missing', async () => {
      mockRequest.body = { entity: 'contacts' };

      await reportController.generateReport(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'At least one field must be selected',
        code: 'bad_request',
      });
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

      expect(mockRequirePermissionOrError).toHaveBeenCalledWith(
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
      mockReportService.exportReport.mockResolvedValue(mockBuffer as never);

      await reportController.exportReport(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequirePermissionOrError).toHaveBeenCalledWith(
        mockRequest,
        Permission.REPORT_EXPORT
      );
      expect(mockReportService.generateReport).toHaveBeenCalledWith(definition, {
        organizationId: 'org-1',
      });
      expect(mockSetHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
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

    it('routes unauthorized guard failures to sendUnauthorized', async () => {
      mockRequirePermissionOrError.mockReturnValue({
        success: false,
        error: 'Unauthorized: No authenticated user',
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
});
