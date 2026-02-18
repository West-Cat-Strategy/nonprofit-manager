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

// ─── register ─────────────────────────────────────────────────────────────────

describe('authService.register', () => {
  it('POSTs to /auth/register and returns message + user', async () => {
    const payload = { message: 'User created', user: mockUser };
    vi.mocked(api.post).mockResolvedValueOnce({ data: payload });

    const result = await authService.register({
      email: 'new@example.com',
      password: 'pass123',
      firstName: 'New',
      lastName: 'User',
    });

    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      email: 'new@example.com',
      password: 'pass123',
      firstName: 'New',
      lastName: 'User',
    });
    expect(result.message).toBe('User created');
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
