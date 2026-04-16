import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import {
  getEmailSettings,
  testEmailSettings,
  updateEmailSettings,
} from '../emailSettingsController';
import {
  getTwilioSettings,
  testTwilioSettings,
  updateTwilioSettings,
} from '../twilioSettingsController';
import {
  approvePendingRegistrationHandler,
  listPendingRegistrationsHandler,
  rejectPendingRegistrationHandler,
} from '../registrationSettingsController';
import {
  getOrganizationSettingsHandler,
  updateOrganizationSettingsHandler,
} from '../organizationSettingsController';
import { getBranding, putBranding } from '../adminBrandingController';
import { getAdminStats } from '../adminStatsController';
import { sendError, sendSuccess } from '@modules/shared/http/envelope';
import {
  guardWithPermission,
  requireActiveOrganizationSafe,
  requireUserSafe,
} from '@services/authGuardService';
import * as emailSettingsUseCase from '../../usecases/emailSettingsUseCase';
import * as twilioSettingsUseCase from '../../usecases/twilioSettingsUseCase';
import { testSmtpConnection } from '@services/emailService';
import { testTwilioConnection } from '@services/twilioSmsService';
import { listPendingRegistrations } from '../../usecases/listPendingRegistrationsUseCase';
import { approvePendingRegistration } from '../../usecases/approveRegistrationUseCase';
import { rejectPendingRegistration } from '../../usecases/rejectRegistrationUseCase';
import * as organizationSettingsUseCase from '../../usecases/organizationSettingsUseCase';
import * as adminBrandingUseCase from '../../usecases/adminBrandingUseCase';
import { getAdminDashboardStats } from '../../usecases/adminDashboardStatsUseCase';

jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@modules/shared/http/envelope', () => ({
  __esModule: true,
  sendSuccess: jest.fn(),
  sendError: jest.fn(),
}));

jest.mock('@services/authGuardService', () => ({
  __esModule: true,
  guardWithPermission: jest.fn(),
  requireUserSafe: jest.fn(),
  requireActiveOrganizationSafe: jest.fn(),
}));

jest.mock('../../usecases/emailSettingsUseCase', () => ({
  __esModule: true,
  getEmailSettings: jest.fn(),
  hasStoredCredentials: jest.fn(),
  updateEmailSettings: jest.fn(),
}));

jest.mock('../../usecases/twilioSettingsUseCase', () => ({
  __esModule: true,
  getTwilioSettings: jest.fn(),
  hasStoredCredentials: jest.fn(),
  updateTwilioSettings: jest.fn(),
}));

jest.mock('@services/emailService', () => ({
  __esModule: true,
  testSmtpConnection: jest.fn(),
}));

jest.mock('@services/twilioSmsService', () => ({
  __esModule: true,
  testTwilioConnection: jest.fn(),
}));

jest.mock('../../usecases/listPendingRegistrationsUseCase', () => ({
  __esModule: true,
  listPendingRegistrations: jest.fn(),
}));

jest.mock('../../usecases/approveRegistrationUseCase', () => ({
  __esModule: true,
  approvePendingRegistration: jest.fn(),
}));

jest.mock('../../usecases/rejectRegistrationUseCase', () => ({
  __esModule: true,
  rejectPendingRegistration: jest.fn(),
}));

jest.mock('../../usecases/organizationSettingsUseCase', () => ({
  __esModule: true,
  getOrganizationSettings: jest.fn(),
  updateOrganizationSettings: jest.fn(),
}));

jest.mock('../../usecases/adminBrandingUseCase', () => ({
  __esModule: true,
  getBranding: jest.fn(),
  updateBranding: jest.fn(),
}));

jest.mock('../../usecases/adminDashboardStatsUseCase', () => ({
  __esModule: true,
  getAdminDashboardStats: jest.fn(),
}));

const mockSendSuccess = sendSuccess as jest.MockedFunction<typeof sendSuccess>;
const mockSendError = sendError as jest.MockedFunction<typeof sendError>;
const mockGuardWithPermission = guardWithPermission as jest.MockedFunction<
  typeof guardWithPermission
>;
const mockRequireUserSafe = requireUserSafe as jest.MockedFunction<typeof requireUserSafe>;
const mockRequireActiveOrganizationSafe = requireActiveOrganizationSafe as jest.MockedFunction<
  typeof requireActiveOrganizationSafe
>;
const mockTestSmtpConnection = testSmtpConnection as jest.MockedFunction<
  typeof testSmtpConnection
>;
const mockTestTwilioConnection = testTwilioConnection as jest.MockedFunction<
  typeof testTwilioConnection
>;
const mockListPendingRegistrations = listPendingRegistrations as jest.MockedFunction<
  typeof listPendingRegistrations
>;
const mockApprovePendingRegistration = approvePendingRegistration as jest.MockedFunction<
  typeof approvePendingRegistration
>;
const mockRejectPendingRegistration = rejectPendingRegistration as jest.MockedFunction<
  typeof rejectPendingRegistration
>;
const mockGetAdminDashboardStats = getAdminDashboardStats as jest.MockedFunction<
  typeof getAdminDashboardStats
>;

const createResponse = (): Response => ({}) as Response;
const createNext = (): NextFunction => jest.fn();
const createRequest = (overrides: Partial<AuthRequest> = {}): AuthRequest =>
  ({
    user: { id: 'user-1' },
    body: {},
    params: {},
    query: {},
    validatedQuery: {},
    validatedParams: {},
    correlationId: 'corr-1',
    ...overrides,
  } as AuthRequest);

describe('admin surface controllers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGuardWithPermission.mockReturnValue(true);
    mockRequireUserSafe.mockReturnValue({
      ok: true,
      data: {
        user: { id: 'user-1' },
      },
    } as ReturnType<typeof requireUserSafe>);
    mockRequireActiveOrganizationSafe.mockResolvedValue({
      ok: true,
      data: {
        organizationId: 'org-1',
      },
    } as Awaited<ReturnType<typeof requireActiveOrganizationSafe>>);
  });

  it('returns normalized email settings payloads', async () => {
    const req = createRequest({
      body: {
        smtpHost: 'smtp.example.com',
        smtpPass: '',
      },
    });
    const res = createResponse();
    const next = createNext();
    const settings = {
      id: 'email-settings-1',
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpSecure: true,
      smtpUser: 'mailer',
      smtpFromAddress: 'mailer@example.com',
      smtpFromName: 'Mailer',
      imapHost: null,
      imapPort: 993,
      imapSecure: true,
      imapUser: null,
      isConfigured: true,
      lastTestedAt: null,
      lastTestSuccess: null,
      createdAt: new Date('2026-04-16T00:00:00.000Z'),
      updatedAt: new Date('2026-04-16T00:00:00.000Z'),
    };

    jest
      .spyOn(emailSettingsUseCase, 'getEmailSettings')
      .mockResolvedValueOnce(settings)
      .mockResolvedValueOnce(settings);
    jest
      .spyOn(emailSettingsUseCase, 'hasStoredCredentials')
      .mockResolvedValue({ smtp: true, imap: false });
    jest.spyOn(emailSettingsUseCase, 'updateEmailSettings').mockResolvedValue(settings);
    mockTestSmtpConnection.mockResolvedValue({
      success: true,
      message: 'Connected',
    } as Awaited<ReturnType<typeof testSmtpConnection>>);

    await getEmailSettings(req, res, next);
    await updateEmailSettings(req, res, next);
    await testEmailSettings(req, res, next);

    expect(emailSettingsUseCase.updateEmailSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        smtpHost: 'smtp.example.com',
        smtpPass: undefined,
      }),
      'user-1'
    );
    expect(mockSendSuccess).toHaveBeenNthCalledWith(1, res, {
      settings,
      credentials: { smtp: true, imap: false },
    });
    expect(mockSendSuccess).toHaveBeenNthCalledWith(2, res, {
      settings,
      message: 'Email settings updated',
    });
    expect(mockSendSuccess).toHaveBeenNthCalledWith(3, res, {
      result: { success: true, message: 'Connected' },
      message: 'SMTP connection successful',
    });
  });

  it('returns normalized twilio settings payloads', async () => {
    const req = createRequest({
      body: {
        accountSid: 'AC123',
        authToken: 'token-123',
      },
    });
    const res = createResponse();
    const next = createNext();
    const settings = {
      id: 'twilio-settings-1',
      accountSid: 'AC123',
      messagingServiceSid: 'MG123',
      fromPhoneNumber: '+16045551000',
      isConfigured: true,
      lastTestedAt: null,
      lastTestSuccess: null,
      createdAt: new Date('2026-04-16T00:00:00.000Z'),
      updatedAt: new Date('2026-04-16T00:00:00.000Z'),
    };

    jest
      .spyOn(twilioSettingsUseCase, 'getTwilioSettings')
      .mockResolvedValueOnce(settings)
      .mockResolvedValueOnce(settings);
    jest
      .spyOn(twilioSettingsUseCase, 'hasStoredCredentials')
      .mockResolvedValue({ authToken: true });
    jest.spyOn(twilioSettingsUseCase, 'updateTwilioSettings').mockResolvedValue(settings);
    mockTestTwilioConnection.mockResolvedValue({
      success: false,
      error: 'Unauthorized',
    } as Awaited<ReturnType<typeof testTwilioConnection>>);

    await getTwilioSettings(req, res, next);
    await updateTwilioSettings(req, res, next);
    await testTwilioSettings(req, res, next);

    expect(mockSendSuccess).toHaveBeenNthCalledWith(1, res, {
      settings,
      credentials: { authToken: true },
    });
    expect(mockSendSuccess).toHaveBeenNthCalledWith(2, res, {
      settings,
      message: 'Twilio settings updated',
    });
    expect(mockSendSuccess).toHaveBeenNthCalledWith(3, res, {
      result: { success: false, error: 'Unauthorized' },
      message: 'Twilio connection failed',
    });
  });

  it('returns normalized pending registration payloads', async () => {
    const listReq = createRequest({
      validatedQuery: { status: 'pending' },
    });
    const actionReq = createRequest({
      params: { id: 'pending-1' },
      body: { reason: 'Missing verification' },
    });
    const res = createResponse();
    const next = createNext();
    const items = [
      {
        id: 'pending-1',
        email: 'pending@example.com',
        firstName: 'Pending',
        lastName: 'User',
        status: 'pending' as const,
        reviewedAt: null,
        rejectionReason: null,
        createdAt: new Date('2026-04-16T00:00:00.000Z'),
        hasStagedPasskeys: true,
      },
    ];
    const approvalResult = {
      user: {
        id: 'user-2',
        email: 'pending@example.com',
      },
    };
    const rejectionResult = {
      status: 'rejected' as const,
      reviewed_by: 'user-1',
    };

    mockListPendingRegistrations.mockResolvedValue(items);
    mockApprovePendingRegistration.mockResolvedValue(approvalResult);
    mockRejectPendingRegistration.mockResolvedValue(rejectionResult);

    await listPendingRegistrationsHandler(listReq, res, next);
    await approvePendingRegistrationHandler(actionReq, res, next);
    await rejectPendingRegistrationHandler(actionReq, res, next);

    expect(mockSendSuccess).toHaveBeenNthCalledWith(1, res, { items });
    expect(mockSendSuccess).toHaveBeenNthCalledWith(2, res, {
      result: approvalResult,
      message: 'Registration approved',
    });
    expect(mockSendSuccess).toHaveBeenNthCalledWith(3, res, {
      result: rejectionResult,
      message: 'Registration rejected',
    });
  });

  it('routes organization settings through the usecase boundary', async () => {
    const config = {
      name: 'West Cat Society',
      email: 'hello@example.com',
    };
    const settings = {
      organizationId: 'org-1',
      config,
      createdAt: '2026-04-16T00:00:00.000Z',
      updatedAt: '2026-04-16T00:00:00.000Z',
    };
    const getReq = createRequest();
    const updateReq = createRequest({
      body: { config },
    });
    const res = createResponse();

    jest
      .spyOn(organizationSettingsUseCase, 'getOrganizationSettings')
      .mockResolvedValueOnce(settings as Awaited<ReturnType<typeof organizationSettingsUseCase.getOrganizationSettings>>);
    jest
      .spyOn(organizationSettingsUseCase, 'updateOrganizationSettings')
      .mockResolvedValueOnce(settings as Awaited<ReturnType<typeof organizationSettingsUseCase.updateOrganizationSettings>>);

    await getOrganizationSettingsHandler(getReq, res);
    await updateOrganizationSettingsHandler(updateReq, res);

    expect(organizationSettingsUseCase.getOrganizationSettings).toHaveBeenCalledWith(
      'org-1',
      'user-1'
    );
    expect(organizationSettingsUseCase.updateOrganizationSettings).toHaveBeenCalledWith(
      'org-1',
      config,
      'user-1'
    );
    expect(mockSendSuccess).toHaveBeenNthCalledWith(1, res, settings);
    expect(mockSendSuccess).toHaveBeenNthCalledWith(2, res, settings);
    expect(mockSendError).not.toHaveBeenCalled();
  });

  it('routes branding and dashboard stats through usecases', async () => {
    const brandingReq = createRequest({
      body: {
        appName: 'Nonprofit Manager',
        appIcon: null,
        primaryColour: '#0055AA',
        secondaryColour: '#00AA55',
        favicon: null,
      },
    });
    const statsReq = createRequest();
    const res = createResponse();
    const branding = {
      appName: 'Nonprofit Manager',
      appIcon: null,
      primaryColour: '#0055AA',
      secondaryColour: '#00AA55',
      favicon: null,
    };
    const stats = {
      totalUsers: 12,
      activeUsers: 8,
      totalContacts: 140,
      recentDonations: 3200,
      recentSignups: [],
    };

    jest.spyOn(adminBrandingUseCase, 'getBranding').mockResolvedValueOnce(branding);
    jest.spyOn(adminBrandingUseCase, 'updateBranding').mockResolvedValueOnce(branding);
    mockGetAdminDashboardStats.mockResolvedValue(stats);

    await getBranding(createRequest(), res);
    await putBranding(brandingReq, res);
    await getAdminStats(statsReq, res);

    expect(adminBrandingUseCase.updateBranding).toHaveBeenCalledWith(branding);
    expect(mockSendSuccess).toHaveBeenNthCalledWith(1, res, branding);
    expect(mockSendSuccess).toHaveBeenNthCalledWith(2, res, branding);
    expect(mockSendSuccess).toHaveBeenNthCalledWith(3, res, stats);
  });
});
