/**
 * Saved Report Controller Tests
 * Unit tests for saved report management
 */

import { Response, NextFunction } from 'express';
import * as savedReportController from '../savedReport.handlers';
import { services } from '@container/services';
import { AuthRequest } from '@middleware/auth';

// Mock the services
jest.mock('@container/services', () => ({
    services: {
        savedReport: {
            getSavedReports: jest.fn(),
            getSavedReportById: jest.fn(),
            createSavedReport: jest.fn(),
            updateSavedReport: jest.fn(),
            deleteSavedReport: jest.fn(),
        },
    },
}));

const mockSavedReportService = services.savedReport as jest.Mocked<typeof services.savedReport>;

describe('Saved Report Controller', () => {
    let mockRequest: Partial<AuthRequest>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;
    let mockSend: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        mockJson = jest.fn();
        mockStatus = jest.fn().mockReturnThis();
        mockSend = jest.fn();
        mockNext = jest.fn();

        mockRequest = {
            body: {},
            params: {},
            query: {},
            user: { id: 'user1', role: 'manager' } as any,
            authorizationContext: {
                roles: ['manager', 'staff'],
            } as any,
        };

        mockResponse = {
            json: mockJson,
            status: mockStatus,
            send: mockSend,
            getHeader: jest.fn().mockReturnValue(undefined),
            setHeader: jest.fn(),
        };
    });

    describe('getSavedReports', () => {
        it('returns saved reports successfully', async () => {
            const mockReportsPage = {
                items: [{ id: '1', name: 'Report 1' }],
                pagination: { page: 1, limit: 20, total: 1, total_pages: 1 },
            };
            mockRequest.query = { entity: 'contacts' };
            mockSavedReportService.getSavedReports.mockResolvedValue(mockReportsPage as any);

            await savedReportController.getSavedReports(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockSavedReportService.getSavedReports).toHaveBeenCalledWith(
                'user1',
                'contacts',
                ['manager', 'staff'],
                expect.objectContaining({
                    page: undefined,
                    limit: undefined,
                    summary: undefined,
                })
            );
            expect(mockJson).toHaveBeenCalledWith(mockReportsPage);
        });

        it('prefers validated query entity when available', async () => {
            const mockReportsPage = {
                items: [{ id: '1', name: 'Report 1' }],
                pagination: { page: 1, limit: 20, total: 1, total_pages: 1 },
            };
            mockRequest.query = { entity: 'donations' };
            (mockRequest as any).validatedQuery = { entity: 'contacts', page: 2, limit: 10, summary: false };
            mockSavedReportService.getSavedReports.mockResolvedValue(mockReportsPage as any);

            await savedReportController.getSavedReports(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockSavedReportService.getSavedReports).toHaveBeenCalledWith(
                'user1',
                'contacts',
                ['manager', 'staff'],
                expect.objectContaining({
                    page: 2,
                    limit: 10,
                    summary: false,
                })
            );
            expect(mockJson).toHaveBeenCalledWith(mockReportsPage);
        });
    });

    describe('getSavedReportById', () => {
        it('returns a specific report successfully', async () => {
            const mockReport = { id: '1', name: 'Report 1' };
            mockRequest.params = { id: '1' };
            mockSavedReportService.getSavedReportById.mockResolvedValue(mockReport as any);

            await savedReportController.getSavedReportById(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockSavedReportService.getSavedReportById).toHaveBeenCalledWith(
                '1',
                'user1',
                ['manager', 'staff']
            );
            expect(mockJson).toHaveBeenCalledWith(mockReport);
        });

        it('returns 404 when report not found', async () => {
            mockRequest.params = { id: '1' };
            mockSavedReportService.getSavedReportById.mockResolvedValue(null);

            await savedReportController.getSavedReportById(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockStatus).toHaveBeenCalledWith(404);
            expect(mockJson).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: expect.objectContaining({
                        code: 'not_found',
                        message: 'Saved report not found or access denied',
                    }),
                })
            );
        });
    });

    describe('createSavedReport', () => {
        it('creates report successfully', async () => {
            const mockReport = { id: '1', name: 'New Report' };
            const data = { name: 'New Report', entity: 'contacts', report_definition: {} };
            mockRequest.body = data;
            mockSavedReportService.createSavedReport.mockResolvedValue(mockReport as any);

            await savedReportController.createSavedReport(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockSavedReportService.createSavedReport).toHaveBeenCalledWith('user1', data);
            expect(mockStatus).toHaveBeenCalledWith(201);
            expect(mockJson).toHaveBeenCalledWith(mockReport);
        });

        it('returns 400 when required fields are missing', async () => {
            mockRequest.body = { name: 'Incomplete' };

            await savedReportController.createSavedReport(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: expect.objectContaining({
                        code: 'bad_request',
                        message: 'Name, entity, and report_definition are required',
                    }),
                })
            );
        });
    });

    describe('updateSavedReport', () => {
        it('updates report successfully', async () => {
            const mockReport = { id: '1', name: 'Updated Report' };
            const data = { name: 'Updated Report' };
            mockRequest.params = { id: '1' };
            mockRequest.body = data;
            mockSavedReportService.updateSavedReport.mockResolvedValue(mockReport as any);

            await savedReportController.updateSavedReport(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockSavedReportService.updateSavedReport).toHaveBeenCalledWith('1', 'user1', data);
            expect(mockJson).toHaveBeenCalledWith(mockReport);
        });
    });

    describe('deleteSavedReport', () => {
        it('deletes report successfully', async () => {
            mockRequest.params = { id: '1' };
            mockSavedReportService.deleteSavedReport.mockResolvedValue(true);

            await savedReportController.deleteSavedReport(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockSavedReportService.deleteSavedReport).toHaveBeenCalledWith('1', 'user1');
            expect(mockStatus).toHaveBeenCalledWith(204);
            expect(mockSend).toHaveBeenCalled();
        });

        it('returns 404 when report not found or delete fails', async () => {
            mockRequest.params = { id: '1' };
            mockSavedReportService.deleteSavedReport.mockResolvedValue(false);

            await savedReportController.deleteSavedReport(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockStatus).toHaveBeenCalledWith(404);
            expect(mockJson).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: expect.objectContaining({
                        code: 'not_found',
                        message: 'Saved report not found or access denied',
                    }),
                })
            );
        });
    });
});
