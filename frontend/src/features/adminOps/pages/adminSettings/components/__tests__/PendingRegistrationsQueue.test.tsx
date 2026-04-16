import { fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders } from '../../../../../../test/testUtils';
import PendingRegistrationsQueue from '../PendingRegistrationsQueue';

const pushToastMock = vi.fn();
const listPendingRegistrationsMock = vi.fn();
const approvePendingRegistrationMock = vi.fn();
const rejectPendingRegistrationMock = vi.fn();

vi.mock('../../../../../../contexts/useToast', () => ({
  useToast: () => ({
    pushToast: pushToastMock,
  }),
}));

vi.mock('../../../../api/adminHubApiClient', () => ({
  listPendingRegistrations: (...args: unknown[]) => listPendingRegistrationsMock(...args),
  approvePendingRegistration: (...args: unknown[]) => approvePendingRegistrationMock(...args),
  rejectPendingRegistration: (...args: unknown[]) => rejectPendingRegistrationMock(...args),
}));

describe('PendingRegistrationsQueue', () => {
  beforeEach(() => {
    pushToastMock.mockReset();
    listPendingRegistrationsMock.mockReset();
    approvePendingRegistrationMock.mockReset();
    rejectPendingRegistrationMock.mockReset();
  });

  it('loads pending registrations and removes an item after approval', async () => {
    listPendingRegistrationsMock.mockResolvedValue({
      items: [
        {
          id: 'pending-1',
          email: 'pending@example.com',
          firstName: 'Pending',
          lastName: 'Person',
          status: 'pending',
          reviewedAt: null,
          rejectionReason: null,
          createdAt: '2026-04-16T12:00:00.000Z',
          hasStagedPasskeys: true,
        },
      ],
    });
    approvePendingRegistrationMock.mockResolvedValue({
      result: null,
      message: 'Registration approved',
    });

    renderWithProviders(<PendingRegistrationsQueue />);

    expect(await screen.findByText('Pending Person')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(approvePendingRegistrationMock).toHaveBeenCalledWith('pending-1');
    });
    await waitFor(() => {
      expect(screen.queryByText('Pending Person')).not.toBeInTheDocument();
    });
  });
});
