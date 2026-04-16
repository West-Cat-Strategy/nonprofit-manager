import {
  ADMIN_PENDING_REGISTRATION_REVIEW_TOKEN_ISSUER,
  issueAdminPendingRegistrationReviewToken,
  verifyTokenWithOptionalIssuer,
  type AdminPendingRegistrationReviewTokenPayload,
} from '../utils/sessionTokens';

describe('admin pending registration review session tokens', () => {
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-with-32-characters!!';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalJwtSecret;
  });

  it('issues review tokens that verify with the dedicated issuer', () => {
    const token = issueAdminPendingRegistrationReviewToken({
      pendingRegistrationId: 'pending-1',
      adminUserId: 'admin-1',
      action: 'approve',
    });

    const payload = verifyTokenWithOptionalIssuer<AdminPendingRegistrationReviewTokenPayload>(
      token,
      ADMIN_PENDING_REGISTRATION_REVIEW_TOKEN_ISSUER
    );

    expect(payload).toMatchObject({
      pendingRegistrationId: 'pending-1',
      adminUserId: 'admin-1',
      action: 'approve',
      type: 'admin_pending_registration_review',
      iss: ADMIN_PENDING_REGISTRATION_REVIEW_TOKEN_ISSUER,
    });
  });
});
