import { Route, Routes } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '../../../../test/testUtils';
import PortalLoginPage from '../PortalLoginPage';
import PortalSignupPage from '../PortalSignupPage';
import PortalForgotPasswordPage from '../PortalForgotPasswordPage';
import PortalResetPasswordPage from '../PortalResetPasswordPage';

const portalGetMock = vi.fn();
const portalPostMock = vi.fn();

vi.mock('../../../../services/portalApi', () => ({
  default: {
    get: (...args: unknown[]) => portalGetMock(...args),
    post: (...args: unknown[]) => portalPostMock(...args),
  },
}));

describe('Portal access pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows reset and recovery guidance on the portal login page', () => {
    renderWithProviders(<PortalLoginPage />, {
      route: '/portal/login',
      preloadedState: {
        portalAuth: {
          token: null,
          user: null,
          loading: false,
          error: 'Invalid credentials',
          signupStatus: 'idle',
        },
      },
    });

    expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute(
      'href',
      '/portal/forgot-password'
    );
    expect(screen.getByText(/need a new invitation/i)).toBeInTheDocument();
    expect(screen.getByText(/request a reset link/i)).toBeInTheDocument();
  });

  it('focuses the confirmation field when signup passwords do not match', async () => {
    const user = userEvent.setup();

    renderWithProviders(<PortalSignupPage />, { route: '/portal/signup' });

    await user.type(screen.getByLabelText(/first name/i), 'Taylor');
    await user.type(screen.getByLabelText(/last name/i), 'Morgan');
    await user.type(screen.getByLabelText(/^email/i), 'portal@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password1');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password2');
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toHaveFocus();
    expect(portalPostMock).not.toHaveBeenCalled();
  });

  it('submits a portal forgot-password request and shows neutral recovery copy', async () => {
    const user = userEvent.setup();
    portalPostMock.mockResolvedValue({ data: {} });

    renderWithProviders(<PortalForgotPasswordPage />, { route: '/portal/forgot-password' });

    await user.type(screen.getByLabelText(/email address/i), ' portal@example.com ');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(portalPostMock).toHaveBeenCalledWith('/portal/auth/forgot-password', {
        email: 'portal@example.com',
      });
    });

    expect(
      await screen.findByText(/we've sent a portal password-reset link/i)
    ).toBeInTheDocument();
  });

  it('validates a portal reset token and completes the reset flow', async () => {
    const user = userEvent.setup();
    portalGetMock.mockResolvedValue({ data: { valid: true } });
    portalPostMock.mockResolvedValue({ data: {} });

    renderWithProviders(
      <Routes>
        <Route path="/portal/reset-password/:token" element={<PortalResetPasswordPage />} />
      </Routes>,
      { route: '/portal/reset-password/token-123' }
    );

    expect(await screen.findByLabelText(/new password/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/new password/i), 'Password1');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password1');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(portalPostMock).toHaveBeenCalledWith('/portal/auth/reset-password', {
        token: 'token-123',
        password: 'Password1',
        password_confirm: 'Password1',
      });
    });

    expect(
      await screen.findByText(/your portal password has been reset successfully/i)
    ).toBeInTheDocument();
  });
});
