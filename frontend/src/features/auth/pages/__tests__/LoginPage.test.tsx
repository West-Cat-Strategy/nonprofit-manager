import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as ReactRouterDom from 'react-router-dom';
import Login from '../LoginPage';
import { authService } from '../../../../services/authService';
import { primeStaffSession } from '../../utils/primeStaffSession';
import { renderWithProviders, createTestStore } from '../../../../test/testUtils';
import { vi } from 'vitest';

const mockNavigate = vi.fn();
const mockStartAuthentication = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@simplewebauthn/browser', () => ({
  startAuthentication: mockStartAuthentication,
}));

vi.mock('../../../../services/authService', () => ({
  authService: {
    login: vi.fn(),
    completeTotpLogin: vi.fn(),
    passkeyLoginOptions: vi.fn(),
    passkeyLoginVerify: vi.fn(),
  },
}));

vi.mock('../../../../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { registrationEnabled: true } }),
  },
}));

vi.mock('../../utils/primeStaffSession', () => ({
  primeStaffSession: vi.fn(async ({ user, organizationId }) => ({
    user,
    organizationId: organizationId ?? null,
  })),
}));

const renderLogin = () => {
  const store = createTestStore();
  renderWithProviders(<Login />, { store });
  return store;
};

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders login form fields', () => {
    renderLogin();

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    const submitButton = screen.getByRole('button', { name: /^sign in$/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveTextContent(/^sign in$/i);
    expect(submitButton).toBeEnabled();
  });

  it('shows the registration link when self-registration is enabled', async () => {
    renderLogin();

    expect(await screen.findByRole('link', { name: /create one/i })).toHaveAttribute(
      'href',
      '/register'
    );
  });

  it('renders the primary login button with accent token classes', () => {
    renderLogin();

    const submitButton = screen.getByRole('button', { name: /^sign in$/i });

    expect(submitButton).toHaveClass(
      'bg-[var(--app-accent)]',
      'text-[var(--app-accent-foreground)]',
      'border-[var(--app-accent)]'
    );
  });

  it('submits credentials and navigates on success', async () => {
    const user = userEvent.setup();
    const authResponse = {
      token: 'token-123',
      user: {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
      },
    };

    const loginMock = authService.login as unknown as {
      mockResolvedValueOnce: (value: unknown) => void;
    };
    loginMock.mockResolvedValueOnce(authResponse);

    const store = renderLogin();

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(authService.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123!',
    });

    expect(primeStaffSession).toHaveBeenCalledWith({
      user: authResponse.user,
      organizationId: undefined,
    });
    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('normalizes email before submitting credentials', async () => {
    const user = userEvent.setup();
    const authResponse = {
      token: 'token-123',
      user: {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
      },
    };

    const loginMock = authService.login as unknown as {
      mockResolvedValueOnce: (value: unknown) => void;
    };
    loginMock.mockResolvedValueOnce(authResponse);

    renderLogin();

    await user.type(screen.getByLabelText(/email address/i), '  Test@Example.com  ');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(authService.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123!',
    });
  });

  it('shows error message on failed login', async () => {
    const user = userEvent.setup();
    const loginMock = authService.login as unknown as {
      mockRejectedValueOnce: (value: unknown) => void;
    };
    loginMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { error: 'Invalid credentials' } },
    });

    renderLogin();

    await user.type(screen.getByLabelText(/email address/i), 'fail@example.com');
    await user.type(screen.getByLabelText(/password/i), 'BadPassword');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('completes TOTP login and navigates on success', async () => {
    const user = userEvent.setup();
    const mfaResponse = {
      mfaRequired: true as const,
      method: 'totp' as const,
      mfaToken: 'mfa-token-123',
      user: {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
      },
    };
    const completeResponse = {
      token: 'token-123',
      csrfToken: 'csrf-token-123',
      organizationId: 'org-1',
      user: mfaResponse.user,
    };

    const loginMock = authService.login as unknown as {
      mockResolvedValueOnce: (value: unknown) => void;
    };
    const completeTotpLoginMock = authService.completeTotpLogin as unknown as {
      mockResolvedValueOnce: (value: unknown) => void;
    };
    loginMock.mockResolvedValueOnce(mfaResponse);
    completeTotpLoginMock.mockResolvedValueOnce(completeResponse);

    const store = renderLogin();

    await user.type(screen.getByLabelText(/email address/i), 'Test@Example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByLabelText(/authentication code/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/authentication code/i), '123456');
    await user.click(screen.getByRole('button', { name: /^verify code$/i }));

    expect(authService.completeTotpLogin).toHaveBeenCalledWith({
      email: 'test@example.com',
      mfaToken: 'mfa-token-123',
      code: '123456',
    });
    expect(primeStaffSession).toHaveBeenCalledWith({
      user: completeResponse.user,
      organizationId: 'org-1',
    });
    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('completes passkey login and navigates on success', async () => {
    const user = userEvent.setup();
    const passkeyResponse = {
      token: 'token-123',
      csrfToken: 'csrf-token-123',
      organizationId: 'org-1',
      user: {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
      },
    };

    const passkeyOptionsMock = authService.passkeyLoginOptions as unknown as {
      mockResolvedValueOnce: (value: unknown) => void;
    };
    const passkeyVerifyMock = authService.passkeyLoginVerify as unknown as {
      mockResolvedValueOnce: (value: unknown) => void;
    };
    passkeyOptionsMock.mockResolvedValueOnce({
      challengeId: 'challenge-123',
      options: { challenge: 'mock-challenge' },
    });
    passkeyVerifyMock.mockResolvedValueOnce(passkeyResponse);
    mockStartAuthentication.mockResolvedValueOnce({ id: 'credential-123' });

    const store = renderLogin();

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /sign in with passkey/i }));

    expect(authService.passkeyLoginOptions).toHaveBeenCalledWith('test@example.com');
    expect(mockStartAuthentication).toHaveBeenCalledWith({ challenge: 'mock-challenge' });
    expect(authService.passkeyLoginVerify).toHaveBeenCalledWith({
      email: 'test@example.com',
      challengeId: 'challenge-123',
      credential: { id: 'credential-123' },
    });
    expect(primeStaffSession).toHaveBeenCalledWith({
      user: passkeyResponse.user,
      organizationId: 'org-1',
    });
    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });
});
