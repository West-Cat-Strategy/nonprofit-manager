import bcrypt from 'bcryptjs';
import { createPendingRegistration } from '../../usecases/createPendingRegistrationUseCase';
import * as repo from '../../repositories/pendingRegistrationRepository';
import { sendMail } from '@services/emailService';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@services/emailService', () => ({
  __esModule: true,
  sendMail: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../repositories/pendingRegistrationRepository', () => ({
  __esModule: true,
  findPendingByEmail: jest.fn(),
  findUserByEmail: jest.fn(),
  supportsPendingRegistrationPasskeyStaging: jest.fn(),
  insertPendingRegistration: jest.fn(),
  listAdminRecipients: jest.fn(),
}));

describe('createPendingRegistration', () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalFrontendUrl = process.env.FRONTEND_URL;
  const hashMock = bcrypt.hash as jest.Mock;
  const sendMailMock = sendMail as jest.Mock;
  const findPendingByEmailMock = repo.findPendingByEmail as jest.Mock;
  const findUserByEmailMock = repo.findUserByEmail as jest.Mock;
  const supportsPendingRegistrationPasskeyStagingMock =
    repo.supportsPendingRegistrationPasskeyStaging as jest.Mock;
  const insertPendingRegistrationMock = repo.insertPendingRegistration as jest.Mock;
  const listAdminRecipientsMock = repo.listAdminRecipients as jest.Mock;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-with-32-characters!!';
    process.env.FRONTEND_URL = 'https://app.example.com';
    jest.clearAllMocks();
    hashMock.mockResolvedValue('hashed-password');
    findPendingByEmailMock.mockResolvedValue(null);
    findUserByEmailMock.mockResolvedValue(null);
    supportsPendingRegistrationPasskeyStagingMock.mockResolvedValue(true);
    insertPendingRegistrationMock.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'pending@example.com',
      first_name: 'Pending',
      last_name: 'Person',
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: new Date('2026-04-16T00:00:00.000Z'),
      updated_at: new Date('2026-04-16T00:00:00.000Z'),
    });
    listAdminRecipientsMock.mockResolvedValue([
      {
        id: '22222222-2222-4222-8222-222222222222',
        email: 'admin@example.com',
        first_name: 'Ada',
        last_name: 'Admin',
      },
    ]);
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalJwtSecret;
    process.env.FRONTEND_URL = originalFrontendUrl;
  });

  it('sends admin notification emails with approve and reject review links', async () => {
    const result = await createPendingRegistration({
      email: 'pending@example.com',
      password: 'StrongP@ssw0rd',
      firstName: 'Pending',
      lastName: 'Person',
    });

    expect(result).toMatchObject({
      passkeySetupAllowed: true,
      pendingRegistration: expect.objectContaining({
        id: '11111111-1111-4111-8111-111111111111',
      }),
    });
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@example.com',
        text: expect.stringContaining('Approve request: https://app.example.com/admin-registration-review/'),
        html: expect.stringContaining('Approve request'),
      })
    );

    const emailPayload = sendMailMock.mock.calls[0][0];
    expect(emailPayload.text).toContain('Reject request: https://app.example.com/admin-registration-review/');
    expect(emailPayload.text).not.toContain('?mode=complete');
    expect(emailPayload.html).toContain('Reject request');
    expect(emailPayload.html).toContain('/admin-registration-review/');
    expect(emailPayload.html).toContain('?mode=complete');
  });

  it('surfaces passkey setup as unavailable when pending passkey staging is missing', async () => {
    supportsPendingRegistrationPasskeyStagingMock.mockResolvedValueOnce(false);

    await expect(
      createPendingRegistration({
        email: 'pending@example.com',
        password: 'StrongP@ssw0rd',
        firstName: 'Pending',
        lastName: 'Person',
      })
    ).resolves.toMatchObject({
      passkeySetupAllowed: false,
      pendingRegistration: expect.objectContaining({
        id: '11111111-1111-4111-8111-111111111111',
      }),
    });
  });
});
