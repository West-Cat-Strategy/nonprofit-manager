import { Route, Routes } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerTestApiPost } from '../../../../test/setup';
import { renderWithProviders } from '../../../../test/testUtils';
import AcceptInvitationPage from '../AcceptInvitationPage';

const navigateMock = vi.fn();
const primeStaffSessionMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../../auth/utils/primeStaffSession', () => ({
  primeStaffSession: (...args: unknown[]) => primeStaffSessionMock(...args),
}));

describe('AcceptInvitationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates staff invitations through the body-token endpoint', async () => {
    const validation = registerTestApiPost('/invitations/validate', (request) => {
      expect(request.data).toEqual({ token: 'valid-token-1234567890' });
      return {
        data: {
          valid: true,
          invitation: {
            email: 'staff@example.org',
            role: 'Coordinator',
            message: null,
            invitedBy: 'Admin User',
            expiresAt: '2026-12-31T00:00:00.000Z',
          },
        },
      };
    });

    renderWithProviders(
      <Routes>
        <Route path="/accept-invitation/:token" element={<AcceptInvitationPage />} />
      </Routes>,
      { route: '/accept-invitation/valid-token-1234567890' }
    );

    await waitFor(() => {
      expect(validation.getCalls()).toHaveLength(1);
    });
    expect(await screen.findByDisplayValue('staff@example.org')).toBeInTheDocument();
  });

  it('accepts staff invitations through the body-token endpoint', async () => {
    const user = userEvent.setup();
    registerTestApiPost('/invitations/validate', {
      data: {
        valid: true,
        invitation: {
          email: 'staff@example.org',
          role: 'Coordinator',
          message: null,
          invitedBy: 'Admin User',
          expiresAt: '2026-12-31T00:00:00.000Z',
        },
      },
    });
    const accept = registerTestApiPost('/invitations/accept', (request) => {
      expect(request.data).toEqual({
        token: 'valid-token-1234567890',
        firstName: 'Ada',
        lastName: 'Lovelace',
        password: 'Password1',
      });
      return {
        data: {
          user: {
            id: 'user-1',
            email: 'staff@example.org',
            firstName: 'Ada',
            lastName: 'Lovelace',
            role: 'Coordinator',
          },
          organizationId: 'org-1',
        },
      };
    });
    primeStaffSessionMock.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'staff@example.org',
        firstName: 'Ada',
        lastName: 'Lovelace',
        role: 'Coordinator',
      },
      organizationId: 'org-1',
    });

    renderWithProviders(
      <Routes>
        <Route path="/accept-invitation/:token" element={<AcceptInvitationPage />} />
      </Routes>,
      { route: '/accept-invitation/valid-token-1234567890' }
    );

    expect(await screen.findByDisplayValue('staff@example.org')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/first name/i), 'Ada');
    await user.type(screen.getByLabelText(/last name/i), 'Lovelace');
    await user.type(screen.getByLabelText(/^password/i), 'Password1');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password1');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(accept.getCalls()).toHaveLength(1);
      expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });
});
