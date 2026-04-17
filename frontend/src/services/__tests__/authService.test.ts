import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import { authService } from '../authService';
import api from '../api';

const mockUser = {
  id: 'user-1',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin',
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── login ────────────────────────────────────────────────────────────────────

describe('authService.login', () => {
  it('POSTs to /auth/login and returns response data', async () => {
    const payload = { user: mockUser };
    vi.mocked(api.post).mockResolvedValueOnce({ data: payload });

    const result = await authService.login({ email: 'admin@example.com', password: 'secret' });

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'admin@example.com',
      password: 'secret',
    });
    expect(result).toEqual(payload);
  });

  it('returns MFA-required response shape when TOTP is enabled', async () => {
    const mfaPayload = {
      mfaRequired: true,
      method: 'totp',
      mfaToken: 'mfa-tok',
      user: mockUser,
    };
    vi.mocked(api.post).mockResolvedValueOnce({ data: mfaPayload });

    const result = await authService.login({ email: 'admin@example.com', password: 'secret' });
    expect(result).toHaveProperty('mfaRequired', true);
  });
});

// ─── completeTotpLogin ────────────────────────────────────────────────────────

describe('authService.completeTotpLogin', () => {
  it('POSTs to /auth/login/2fa and returns response data', async () => {
    const payload = { user: mockUser };
    vi.mocked(api.post).mockResolvedValueOnce({ data: payload });

    const result = await authService.completeTotpLogin({
      email: 'admin@example.com',
      mfaToken: 'mfa-tok',
      code: '123456',
    });

    expect(api.post).toHaveBeenCalledWith('/auth/login/2fa', {
      email: 'admin@example.com',
      mfaToken: 'mfa-tok',
      code: '123456',
      token: '123456',
    });
    expect(result).toEqual(payload);
  });
});

// ─── passkeyLoginOptions ──────────────────────────────────────────────────────

describe('authService.passkeyLoginOptions', () => {
  it('POSTs to /auth/passkeys/login/options with email', async () => {
    const payload = { challengeId: 'ch-1', options: {} };
    vi.mocked(api.post).mockResolvedValueOnce({ data: payload });

    const result = await authService.passkeyLoginOptions('admin@example.com');

    expect(api.post).toHaveBeenCalledWith('/auth/passkeys/login/options', {
      email: 'admin@example.com',
    });
    expect(result.challengeId).toBe('ch-1');
  });
});

// ─── passkeyLoginVerify ───────────────────────────────────────────────────────

describe('authService.passkeyLoginVerify', () => {
  it('POSTs to /auth/passkeys/login/verify and returns response data', async () => {
    const payload = { user: mockUser };
    vi.mocked(api.post).mockResolvedValueOnce({ data: payload });

    const result = await authService.passkeyLoginVerify({
      email: 'admin@example.com',
      challengeId: 'ch-1',
      credential: { id: 'cred-id' },
    });

    expect(api.post).toHaveBeenCalledWith('/auth/passkeys/login/verify', {
      email: 'admin@example.com',
      challengeId: 'ch-1',
      credential: { id: 'cred-id' },
    });
    expect(result).toEqual(payload);
  });
});

// ─── pendingPasskeyRegistrationOptions ────────────────────────────────────────

describe('authService.pendingPasskeyRegistrationOptions', () => {
  it('POSTs to /auth/passkeys/pending/options with registration token and email', async () => {
    const payload = { challengeId: 'ch-pending', options: {} };
    vi.mocked(api.post).mockResolvedValueOnce({ data: payload });

    const result = await authService.pendingPasskeyRegistrationOptions({
      registrationToken: 'reg-token',
      email: 'new@example.com',
    });

    expect(api.post).toHaveBeenCalledWith('/auth/passkeys/pending/options', {
      registrationToken: 'reg-token',
      email: 'new@example.com',
    });
    expect(result).toEqual(payload);
  });
});

// ─── pendingPasskeyRegistrationVerify ───────────────────────────────────────

describe('authService.pendingPasskeyRegistrationVerify', () => {
  it('POSTs to /auth/passkeys/pending/verify and returns response data', async () => {
    const payload = { message: 'Passkey staged', hasStagedPasskeys: true };
    vi.mocked(api.post).mockResolvedValueOnce({ data: payload });

    const result = await authService.pendingPasskeyRegistrationVerify({
      registrationToken: 'reg-token',
      challengeId: 'ch-pending',
      credential: { id: 'cred-id' },
      name: 'New User',
    });

    expect(api.post).toHaveBeenCalledWith('/auth/passkeys/pending/verify', {
      registrationToken: 'reg-token',
      challengeId: 'ch-pending',
      credential: { id: 'cred-id' },
      name: 'New User',
    });
    expect(result).toEqual(payload);
  });
});

// ─── register ─────────────────────────────────────────────────────────────────

describe('authService.register', () => {
  it('POSTs to /auth/register and returns message + pending approval metadata', async () => {
    const payload = {
      message: 'User created',
      pendingApproval: true,
      registrationToken: 'reg-token',
      passkeySetupAllowed: true,
      hasStagedPasskeys: false,
    };
    vi.mocked(api.post).mockResolvedValueOnce({ data: payload });

    const result = await authService.register({
      email: 'new@example.com',
      password: 'pass123',
      passwordConfirm: 'pass123',
      firstName: 'New',
      lastName: 'User',
    });

    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      email: 'new@example.com',
      password: 'pass123',
      passwordConfirm: 'pass123',
      firstName: 'New',
      lastName: 'User',
    });
    expect(result.message).toBe('User created');
    expect(result.pendingApproval).toBe(true);
    expect(result.registrationToken).toBe('reg-token');
  });
});

// ─── getCurrentUser ───────────────────────────────────────────────────────────

describe('authService.getCurrentUser', () => {
  it('GETs /auth/me and returns response data', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockUser });

    const result = await authService.getCurrentUser();

    expect(api.get).toHaveBeenCalledWith('/auth/me');
    expect(result).toEqual(mockUser);
  });
});

// ─── adminRegistrationReview ──────────────────────────────────────────────────

describe('authService admin registration review helpers', () => {
  it('GETs the signed review preview payload', async () => {
    const payload = {
      action: 'approve',
      reviewer: { ...mockUser, displayName: 'Admin User' },
      pendingRegistration: {
        id: 'pending-1',
        email: 'pending@example.com',
        firstName: 'Pending',
        lastName: 'Person',
        createdAt: '2026-04-16T12:00:00.000Z',
        status: 'pending',
        reviewedAt: null,
        rejectionReason: null,
        hasStagedPasskeys: false,
      },
      currentReview: {
        status: 'pending',
        reviewedAt: null,
        rejectionReason: null,
        reviewedBy: null,
      },
      canConfirm: true,
    };
    vi.mocked(api.get).mockResolvedValueOnce({ data: payload });

    const result = await authService.getAdminRegistrationReviewPreview('review.token.value');

    expect(api.get).toHaveBeenCalledWith('/auth/admin-registration-review/review.token.value');
    expect(result).toEqual(payload);
  });

  it('POSTs the confirm request and returns the enriched review payload', async () => {
    const payload = {
      status: 'already_reviewed',
      action: 'approve',
      message: 'This registration request has already been approved by Ada Admin.',
      review: {
        action: 'approve',
        reviewer: { ...mockUser, displayName: 'Admin User' },
        pendingRegistration: {
          id: 'pending-1',
          email: 'pending@example.com',
          firstName: 'Pending',
          lastName: 'Person',
          createdAt: '2026-04-16T12:00:00.000Z',
          status: 'approved',
          reviewedAt: '2026-04-16T12:15:00.000Z',
          rejectionReason: null,
          hasStagedPasskeys: true,
        },
        currentReview: {
          status: 'approved',
          reviewedAt: '2026-04-16T12:15:00.000Z',
          rejectionReason: null,
          reviewedBy: {
            ...mockUser,
            displayName: 'Admin User',
          },
        },
        canConfirm: false,
      },
    };
    vi.mocked(api.post).mockResolvedValueOnce({ data: payload });

    const result = await authService.confirmAdminRegistrationReview('review.token.value');

    expect(api.post).toHaveBeenCalledWith('/auth/admin-registration-review/review.token.value/confirm');
    expect(result).toEqual(payload);
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe('authService.logout', () => {
  it('POSTs to /auth/logout', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} });

    await authService.logout();

    expect(api.post).toHaveBeenCalledWith('/auth/logout');
  });

  it('does not return a value', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} });

    const result = await authService.logout();
    expect(result).toBeUndefined();
  });
});
