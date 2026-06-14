import { Route, Routes } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../test/testUtils';
import PortalAcceptInvitationPage from '../PortalAcceptInvitationPage';

const navigateMock = vi.fn();
const portalPostMock = vi.fn();
const portalLoginMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../../../services/portalApi', () => ({
  default: {
    post: (...args: unknown[]) => portalPostMock(...args),
  },
}));

vi.mock('../../../portalAuth/state', async () => {
  const actual = await vi.importActual('../../../portalAuth/state');
  return {
    ...actual,
    portalLogin: (...args: unknown[]) => portalLoginMock(...args),
  };
});

describe('PortalAcceptInvitationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    portalPostMock.mockResolvedValueOnce({
      data: {
        invitation: {
          email: 'portal@example.org',
          contactId: 'contact-1',
          expiresAt: '2026-12-31T00:00:00.000Z',
        },
      },
    });
    portalLoginMock.mockReturnValue({
      type: 'portal/login/mock',
      unwrap: () => Promise.resolve(),
    });
  });

  it('accepts portal invitations through the body-token endpoint', async () => {
    const user = userEvent.setup();
    portalPostMock.mockResolvedValueOnce({ data: {} });

    renderWithProviders(
      <Routes>
        <Route path="/portal/accept-invitation/:token" element={<PortalAcceptInvitationPage />} />
      </Routes>,
      { route: '/portal/accept-invitation/valid-token-1234567890' }
    );

    expect(await screen.findByDisplayValue('portal@example.org')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/first name/i), 'Portal');
    await user.type(screen.getByLabelText(/last name/i), 'Client');
    await user.type(screen.getByLabelText(/^password/i), 'Password1');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password1');
    await user.click(screen.getByRole('button', { name: /activate portal account/i }));

    await waitFor(() => {
      expect(portalPostMock).toHaveBeenLastCalledWith('/portal/auth/invitations/accept', {
        token: 'valid-token-1234567890',
        firstName: 'Portal',
        lastName: 'Client',
        password: 'Password1',
      });
      expect(portalLoginMock).toHaveBeenCalledWith({
        email: 'portal@example.org',
        password: 'Password1',
      });
      expect(navigateMock).toHaveBeenCalledWith('/portal');
    });
  });
});
