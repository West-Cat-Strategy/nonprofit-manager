/**
 * Report Controller Tests
 * Unit tests for report generation and export
 */

import { Response, NextFunction } from 'express';
import * as reportController from '../../controllers/reportController';
import { services } from '../../container/services';
import { AuthRequest } from '../../middleware/auth';

// Mock the response helpers
jest.mock('../../utils/responseHelpers', () => ({
    badRequest: jest.fn((res, message) => res.status(400).json({ error: message, code: 'bad_request' })),
}));

// Mock the services
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

        mockRequest = {
            body: {},
            params: {},
            query: {},
        };

        mockResponse = {
            json: mockJson,
            status: mockStatus,
            send: mockSend,
            setHeader: mockSetHeader,
        };
    });

    describe('generateReport', () => {
        it('generates report successfully', async () => {
            const mockResult = { data: [{ id: 1, name: 'Test' }], total: 1 };
            const definition = { entity: 'contacts', fields: ['name'] };
            mockRequest.body = definition;
            mockReportService.generateReport.mockResolvedValue(mockResult);

            await reportController.generateReport(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockReportService.generateReport).toHaveBeenCalledWith(definition);
            expect(mockJson).toHaveBeenCalledWith(mockResult);
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
                code: 'bad_request'
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
                code: 'bad_request'
            });
        });
    });

    describe('getAvailableFields', () => {
        it('returns fields successfully', async () => {
            const mockFields = [{ id: 'name', label: 'Name', type: 'string' }];
            mockRequest.params = { entity: 'contacts' };
            mockReportService.getAvailableFields.mockResolvedValue(mockFields);

            await reportController.getAvailableFields(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockReportService.getAvailableFields).toHaveBeenCalledWith('contacts');
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
                code: 'bad_request'
            });
        });
    });

    describe('exportReport', () => {
        it('exports CSV successfully', async () => {
            const mockResult = { data: [['Name'], ['Test']], total: 1 };
            const mockBuffer = Buffer.from('Name\nTest');
            const definition = { entity: 'contacts', fields: ['name'] };
            mockRequest.body = { definition, format: 'csv' };

            mockReportService.generateReport.mockResolvedValue(mockResult);
            mockReportService.exportReport.mockResolvedValue(mockBuffer);

            await reportController.exportReport(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext
            );

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
                code: 'bad_request'
            });
        });

        it('returns 400 for invalid format', async () => {
            mockRequest.body = {
                definition: { entity: 'contacts' },
                format: 'pdf'
            };

            await reportController.exportReport(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Invalid format. Supported formats: csv, xlsx',
                code: 'bad_request'
            });
        });
    });
});
