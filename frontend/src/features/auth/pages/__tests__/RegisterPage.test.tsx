import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as ReactRouterDom from 'react-router-dom';
import { vi } from 'vitest';
import Register from '../RegisterPage';
import { authService } from '../../../../services/authService';
import { primeStaffSession } from '../../utils/primeStaffSession';
import { createTestStore, renderWithProviders } from '../../../../test/testUtils';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../../services/authService', () => ({
  authService: {
    register: vi.fn(),
    pendingPasskeyRegistrationOptions: vi.fn(),
    pendingPasskeyRegistrationVerify: vi.fn(),
  },
}));

vi.mock('../../../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('@simplewebauthn/browser', () => ({
  startRegistration: vi.fn(),
}));

vi.mock('../../utils/primeStaffSession', () => ({
  primeStaffSession: vi.fn(async ({ user, organizationId }) => ({
    user,
    organizationId: organizationId ?? null,
  })),
}));

const renderRegister = () => {
  const store = createTestStore();
  renderWithProviders(<Register />, { store });
  return store;
};

describe('Register page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders the registration form', () => {
    renderRegister();

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows the pending approval state and lets the applicant stage an optional passkey', async () => {
    const user = userEvent.setup();
    const registerMock = authService.register as unknown as {
      mockResolvedValueOnce: (value: unknown) => void;
    };
    registerMock.mockResolvedValueOnce({
      message: 'Registration received',
      pendingApproval: true,
      registrationToken: 'reg-token',
      passkeySetupAllowed: true,
    });

    const pendingOptionsMock = authService.pendingPasskeyRegistrationOptions as unknown as {
      mockResolvedValueOnce: (value: unknown) => void;
    };
    pendingOptionsMock.mockResolvedValueOnce({
      challengeId: 'challenge-1',
      options: { challenge: 'challenge-1' },
    });

    const pendingVerifyMock = authService.pendingPasskeyRegistrationVerify as unknown as {
      mockResolvedValueOnce: (value: unknown) => void;
    };
    pendingVerifyMock.mockResolvedValueOnce({
      message: 'Passkey staged',
      hasStagedPasskeys: true,
    });

    const { startRegistration } = await import('@simplewebauthn/browser');
    vi.mocked(startRegistration).mockResolvedValueOnce({ id: 'credential-1' } as never);

    renderRegister();

    await user.type(screen.getByLabelText(/first name/i), 'New');
    await user.type(screen.getByLabelText(/last name/i), 'User');
    await user.type(screen.getByLabelText(/email address/i), 'new@example.com');
    await user.type(screen.getAllByLabelText(/password/i)[0], 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('heading', { name: /registration submitted/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /set up passkey/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /set up passkey/i }));

    await waitFor(() => {
      expect(authService.pendingPasskeyRegistrationOptions).toHaveBeenCalledWith({
        registrationToken: 'reg-token',
        email: 'new@example.com',
      });
    });

    expect(authService.pendingPasskeyRegistrationVerify).toHaveBeenCalledWith({
      registrationToken: 'reg-token',
      challengeId: 'challenge-1',
      credential: { id: 'credential-1' },
      name: 'New User',
    });
    expect(await screen.findByText(/passkey has been staged/i)).toBeInTheDocument();
  });

  it('still submits a pending approval when passkey setup is unavailable', async () => {
    const user = userEvent.setup();
    const registerMock = authService.register as unknown as {
      mockResolvedValueOnce: (value: unknown) => void;
    };
    registerMock.mockResolvedValueOnce({
      message: 'Registration received',
      pendingApproval: true,
      registrationToken: 'reg-token',
      passkeySetupAllowed: false,
    });

    renderRegister();

    await user.type(screen.getByLabelText(/first name/i), 'New');
    await user.type(screen.getByLabelText(/last name/i), 'User');
    await user.type(screen.getByLabelText(/email address/i), 'new@example.com');
    await user.type(screen.getAllByLabelText(/password/i)[0], 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('heading', { name: /registration submitted/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /set up passkey/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to login/i })).toHaveAttribute('href', '/login');
  });
});
