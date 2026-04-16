import {
  confirmAdminRegistrationReview,
  previewAdminRegistrationReview,
  AdminRegistrationReviewError,
} from '../../usecases/adminRegistrationReviewUseCase';
import {
  issueAdminPendingRegistrationReviewToken,
} from '@utils/sessionTokens';
import * as repo from '../../repositories/pendingRegistrationRepository';
import { approvePendingRegistration } from '../../usecases/approveRegistrationUseCase';
import { rejectPendingRegistration } from '../../usecases/rejectRegistrationUseCase';

jest.mock('../../repositories/pendingRegistrationRepository', () => ({
  __esModule: true,
  getActiveAdminRecipientById: jest.fn(),
  getPendingRegistrationById: jest.fn(),
}));

jest.mock('../../usecases/approveRegistrationUseCase', () => ({
  __esModule: true,
  approvePendingRegistration: jest.fn(),
}));

jest.mock('../../usecases/rejectRegistrationUseCase', () => ({
  __esModule: true,
  rejectPendingRegistration: jest.fn(),
}));

describe('adminRegistrationReviewUseCase', () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const getActiveAdminRecipientByIdMock = repo.getActiveAdminRecipientById as jest.Mock;
  const getPendingRegistrationByIdMock = repo.getPendingRegistrationById as jest.Mock;
  const approvePendingRegistrationMock = approvePendingRegistration as jest.Mock;
  const rejectPendingRegistrationMock = rejectPendingRegistration as jest.Mock;

  const reviewer = {
    id: 'admin-1',
    email: 'admin@example.com',
    first_name: 'Ada',
    last_name: 'Admin',
  };

  const pendingRow = {
    id: 'pending-1',
    email: 'pending@example.com',
    password_hash: 'hashed-password',
    first_name: 'Pending',
    last_name: 'Person',
    status: 'pending' as const,
    reviewed_by: null,
    reviewed_at: null,
    rejection_reason: null,
    created_at: new Date('2026-04-16T15:00:00.000Z'),
    updated_at: new Date('2026-04-16T15:00:00.000Z'),
    has_staged_passkeys: true,
  };

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-with-32-characters!!';
    jest.clearAllMocks();
    getActiveAdminRecipientByIdMock.mockResolvedValue(reviewer);
    getPendingRegistrationByIdMock.mockResolvedValue(pendingRow);
    approvePendingRegistrationMock.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'pending@example.com',
      },
    });
    rejectPendingRegistrationMock.mockResolvedValue({
      ...pendingRow,
      status: 'rejected',
    });
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalJwtSecret;
  });

  it('previews a pending registration review token', async () => {
    const token = issueAdminPendingRegistrationReviewToken({
      pendingRegistrationId: 'pending-1',
      adminUserId: 'admin-1',
      action: 'approve',
    });

    await expect(previewAdminRegistrationReview(token)).resolves.toMatchObject({
      action: 'approve',
      reviewer: {
        id: 'admin-1',
        displayName: 'Ada Admin',
      },
      pendingRegistration: {
        id: 'pending-1',
        email: 'pending@example.com',
        hasStagedPasskeys: true,
      },
      currentReview: {
        status: 'pending',
      },
      canConfirm: true,
    });
  });

  it('rejects expired review tokens', async () => {
    const token = issueAdminPendingRegistrationReviewToken({
      pendingRegistrationId: 'pending-1',
      adminUserId: 'admin-1',
      action: 'approve',
      expiresInSeconds: -1,
    });

    await expect(previewAdminRegistrationReview(token)).rejects.toMatchObject<
      Partial<AdminRegistrationReviewError>
    >({
      code: 'expired_review_token',
      status: 410,
    });
  });

  it('rejects review tokens for inactive or missing reviewers', async () => {
    const token = issueAdminPendingRegistrationReviewToken({
      pendingRegistrationId: 'pending-1',
      adminUserId: 'admin-1',
      action: 'approve',
    });
    getActiveAdminRecipientByIdMock.mockResolvedValueOnce(null);

    await expect(previewAdminRegistrationReview(token)).rejects.toMatchObject<
      Partial<AdminRegistrationReviewError>
    >({
      code: 'reviewer_unavailable',
      status: 403,
    });
  });

  it('confirms an approval and returns the refreshed review state', async () => {
    const token = issueAdminPendingRegistrationReviewToken({
      pendingRegistrationId: 'pending-1',
      adminUserId: 'admin-1',
      action: 'approve',
    });
    getPendingRegistrationByIdMock
      .mockResolvedValueOnce(pendingRow)
      .mockResolvedValueOnce({
        ...pendingRow,
        status: 'approved',
        reviewed_at: new Date('2026-04-16T16:00:00.000Z'),
      });

    await expect(confirmAdminRegistrationReview(token)).resolves.toMatchObject({
      status: 'completed',
      action: 'approve',
      review: {
        currentReview: {
          status: 'approved',
        },
        canConfirm: false,
      },
    });

    expect(approvePendingRegistrationMock).toHaveBeenCalledWith('pending-1', 'admin-1');
  });

  it('returns already-reviewed state when the request was previously resolved', async () => {
    const token = issueAdminPendingRegistrationReviewToken({
      pendingRegistrationId: 'pending-1',
      adminUserId: 'admin-1',
      action: 'reject',
    });
    getPendingRegistrationByIdMock.mockResolvedValueOnce({
      ...pendingRow,
      status: 'approved',
      reviewed_at: new Date('2026-04-16T16:00:00.000Z'),
    });

    await expect(confirmAdminRegistrationReview(token)).resolves.toMatchObject({
      status: 'already_reviewed',
      action: 'reject',
      review: {
        currentReview: {
          status: 'approved',
        },
        canConfirm: false,
      },
    });

    expect(rejectPendingRegistrationMock).not.toHaveBeenCalled();
  });
});
