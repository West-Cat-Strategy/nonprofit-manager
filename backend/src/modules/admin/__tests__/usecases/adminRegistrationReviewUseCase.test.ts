import jwt from 'jsonwebtoken';
import {
  confirmAdminRegistrationReview,
  previewAdminRegistrationReview,
  AdminRegistrationReviewError,
} from '../../usecases/adminRegistrationReviewUseCase';
import {
  ADMIN_PENDING_REGISTRATION_REVIEW_TOKEN_ISSUER,
  issueAdminPendingRegistrationReviewToken,
} from '@utils/sessionTokens';
import * as repo from '../../repositories/pendingRegistrationRepository';
import { approvePendingRegistration } from '../../usecases/approveRegistrationUseCase';
import { rejectPendingRegistration } from '../../usecases/rejectRegistrationUseCase';

jest.mock('../../repositories/pendingRegistrationRepository', () => ({
  __esModule: true,
  getActiveAdminRecipientById: jest.fn(),
  getPendingRegistrationReviewById: jest.fn(),
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
  const reviewerId = '22222222-2222-4222-8222-222222222222';
  const pendingRegistrationId = '11111111-1111-4111-8111-111111111111';
  const resolvedReviewerId = '33333333-3333-4333-8333-333333333333';
  const getActiveAdminRecipientByIdMock = repo.getActiveAdminRecipientById as jest.Mock;
  const getPendingRegistrationReviewByIdMock = repo.getPendingRegistrationReviewById as jest.Mock;
  const approvePendingRegistrationMock = approvePendingRegistration as jest.Mock;
  const rejectPendingRegistrationMock = rejectPendingRegistration as jest.Mock;

  const reviewer = {
    id: reviewerId,
    email: 'admin@example.com',
    first_name: 'Ada',
    last_name: 'Admin',
  };

  const pendingRow = {
    id: pendingRegistrationId,
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
    reviewed_by_email: null,
    reviewed_by_first_name: null,
    reviewed_by_last_name: null,
  };

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-with-32-characters!!';
    jest.clearAllMocks();
    getActiveAdminRecipientByIdMock.mockResolvedValue(reviewer);
    getPendingRegistrationReviewByIdMock.mockResolvedValue(pendingRow);
    approvePendingRegistrationMock.mockResolvedValue({
      user: {
        id: '44444444-4444-4444-8444-444444444444',
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
      pendingRegistrationId,
      adminUserId: reviewerId,
      action: 'approve',
    });

    await expect(previewAdminRegistrationReview(token)).resolves.toMatchObject({
      action: 'approve',
      reviewer: {
        id: reviewerId,
        displayName: 'Ada Admin',
      },
      pendingRegistration: {
        id: pendingRegistrationId,
        email: 'pending@example.com',
        hasStagedPasskeys: true,
      },
      currentReview: {
        status: 'pending',
        reviewedBy: null,
      },
      canConfirm: true,
    });
  });

  it('rejects expired review tokens', async () => {
    const token = issueAdminPendingRegistrationReviewToken({
      pendingRegistrationId,
      adminUserId: reviewerId,
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

  it('rejects review tokens with malformed runtime claims', async () => {
    const token = jwt.sign(
      {
        pendingRegistrationId,
        adminUserId: reviewerId,
        action: 'approve',
        type: 'wrong_review_type',
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: 60,
        issuer: ADMIN_PENDING_REGISTRATION_REVIEW_TOKEN_ISSUER,
      }
    );

    await expect(previewAdminRegistrationReview(token)).rejects.toMatchObject<
      Partial<AdminRegistrationReviewError>
    >({
      code: 'invalid_review_token',
      status: 400,
    });
  });

  it('rejects review tokens for inactive or missing reviewers', async () => {
    const token = issueAdminPendingRegistrationReviewToken({
      pendingRegistrationId,
      adminUserId: reviewerId,
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
      pendingRegistrationId,
      adminUserId: reviewerId,
      action: 'approve',
    });
    getPendingRegistrationReviewByIdMock
      .mockResolvedValueOnce(pendingRow)
      .mockResolvedValueOnce({
        ...pendingRow,
        status: 'approved',
        reviewed_by: reviewerId,
        reviewed_at: new Date('2026-04-16T16:00:00.000Z'),
        reviewed_by_email: 'admin@example.com',
        reviewed_by_first_name: 'Ada',
        reviewed_by_last_name: 'Admin',
      });

    await expect(confirmAdminRegistrationReview(token)).resolves.toMatchObject({
      status: 'completed',
      action: 'approve',
      review: {
        currentReview: {
          status: 'approved',
          reviewedBy: {
            id: reviewerId,
            displayName: 'Ada Admin',
          },
        },
        canConfirm: false,
      },
    });

    expect(approvePendingRegistrationMock).toHaveBeenCalledWith(
      pendingRegistrationId,
      reviewerId
    );
  });

  it('returns already-reviewed state with the actual resolving admin', async () => {
    const token = issueAdminPendingRegistrationReviewToken({
      pendingRegistrationId,
      adminUserId: reviewerId,
      action: 'reject',
    });
    getPendingRegistrationReviewByIdMock.mockResolvedValueOnce({
      ...pendingRow,
      status: 'approved',
      reviewed_by: resolvedReviewerId,
      reviewed_at: new Date('2026-04-16T16:00:00.000Z'),
      reviewed_by_email: 'grace@example.com',
      reviewed_by_first_name: 'Grace',
      reviewed_by_last_name: 'Reviewer',
    });

    await expect(confirmAdminRegistrationReview(token)).resolves.toMatchObject({
      status: 'already_reviewed',
      action: 'reject',
      message: 'This registration request has already been approved by Grace Reviewer.',
      review: {
        currentReview: {
          status: 'approved',
          reviewedBy: {
            id: resolvedReviewerId,
            displayName: 'Grace Reviewer',
          },
        },
        canConfirm: false,
      },
    });

    expect(rejectPendingRegistrationMock).not.toHaveBeenCalled();
  });

  it('returns already-reviewed on replay after a completed confirm', async () => {
    const token = issueAdminPendingRegistrationReviewToken({
      pendingRegistrationId,
      adminUserId: reviewerId,
      action: 'approve',
    });
    const approvedRow = {
      ...pendingRow,
      status: 'approved' as const,
      reviewed_by: reviewerId,
      reviewed_at: new Date('2026-04-16T16:00:00.000Z'),
      reviewed_by_email: 'admin@example.com',
      reviewed_by_first_name: 'Ada',
      reviewed_by_last_name: 'Admin',
    };
    getPendingRegistrationReviewByIdMock
      .mockResolvedValueOnce(pendingRow)
      .mockResolvedValueOnce(approvedRow)
      .mockResolvedValueOnce(approvedRow);

    const first = await confirmAdminRegistrationReview(token);
    const second = await confirmAdminRegistrationReview(token);

    expect(first.status).toBe('completed');
    expect(second).toMatchObject({
      status: 'already_reviewed',
      message: 'This registration request has already been approved by Ada Admin.',
      review: {
        currentReview: {
          status: 'approved',
          reviewedBy: {
            id: reviewerId,
            displayName: 'Ada Admin',
          },
        },
      },
    });
    expect(approvePendingRegistrationMock).toHaveBeenCalledTimes(1);
  });
});
