/**
 * Report Sharing Controller Tests
 * Unit tests for report shared access and public links
 */

import { Request, Response, NextFunction } from 'express';
import * as reportSharingController from '../../controllers/reportSharingController';
import { services } from '../../container/services';
import { AuthRequest } from '../../middleware/auth';

// Mock the response helpers
jest.mock('../../utils/responseHelpers', () => ({
    badRequest: jest.fn((res, message) => res.status(400).json({ error: message, code: 'bad_request' })),
}));

// Mock the services
jest.mock('../../container/services', () => ({
    services: {
        savedReport: {
            shareReport: jest.fn(),
            removeShare: jest.fn(),
            generatePublicLink: jest.fn(),
            revokePublicLink: jest.fn(),
            getReportByPublicToken: jest.fn(),
        },
    },
}));

const mockSavedReportService = services.savedReport as jest.Mocked<typeof services.savedReport>;

describe('Report Sharing Controller', () => {
    let mockRequest: Partial<AuthRequest>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        mockJson = jest.fn();
        mockStatus = jest.fn().mockReturnThis();
        mockNext = jest.fn();

        mockRequest = {
            body: {},
            params: {},
        };

        mockResponse = {
            json: mockJson,
            status: mockStatus,
        };
    });

    describe('shareReport', () => {
        it('shares report successfully', async () => {
            const mockReport = { id: '1', name: 'Shared Report' };
            mockRequest.params = { id: '1' };
            mockRequest.body = { user_ids: ['user1'], role_names: ['admin'] };
            mockSavedReportService.shareReport.mockResolvedValue(mockReport as any);

            await reportSharingController.shareReport(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockSavedReportService.shareReport).toHaveBeenCalledWith('1', ['user1'], ['admin'], undefined);
            expect(mockJson).toHaveBeenCalledWith(mockReport);
        });
    });

    describe('removeShare', () => {
        it('removes share access successfully', async () => {
            const mockReport = { id: '1', name: 'Shared Report' };
            mockRequest.params = { id: '1' };
            mockRequest.body = { user_ids: ['user1'] };
            mockSavedReportService.removeShare.mockResolvedValue(mockReport as any);

            await reportSharingController.removeShare(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockSavedReportService.removeShare).toHaveBeenCalledWith('1', ['user1'], undefined);
            expect(mockJson).toHaveBeenCalledWith(mockReport);
        });
    });

    describe('generatePublicLink', () => {
        it('generates public link successfully', async () => {
            mockRequest.params = { id: '1' };
            mockRequest.body = { expires_at: '2025-01-01' };
            mockSavedReportService.generatePublicLink.mockResolvedValue('token123');

            await reportSharingController.generatePublicLink(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockSavedReportService.generatePublicLink).toHaveBeenCalledWith('1', '2025-01-01');
            expect(mockJson).toHaveBeenCalledWith({ token: 'token123', url: '/public/reports/token123' });
        });
    });

    describe('revokePublicLink', () => {
        it('revokes public link successfully', async () => {
            mockRequest.params = { id: '1' };
            mockSavedReportService.revokePublicLink.mockResolvedValue(undefined);

            await reportSharingController.revokePublicLink(
                mockRequest as AuthRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockSavedReportService.revokePublicLink).toHaveBeenCalledWith('1');
            expect(mockJson).toHaveBeenCalledWith({ message: 'Public link revoked successfully' });
        });
    });

    describe('getReportByPublicToken', () => {
        it('returns report by token successfully', async () => {
            const mockReport = { id: '1', name: 'Public Report' };
            mockRequest.params = { token: 'token123' };
            mockSavedReportService.getReportByPublicToken.mockResolvedValue(mockReport as any);

            await reportSharingController.getReportByPublicToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockSavedReportService.getReportByPublicToken).toHaveBeenCalledWith('token123');
            expect(mockJson).toHaveBeenCalledWith(mockReport);
        });

        it('returns 400 when report not found', async () => {
            mockRequest.params = { token: 'invalid' };
            mockSavedReportService.getReportByPublicToken.mockResolvedValue(null);

            await reportSharingController.getReportByPublicToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Report not found or link has expired',
                code: 'bad_request'
            });
        });
    });
});
