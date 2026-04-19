import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type * as ReactRouterDomModule from 'react-router-dom';
import { vi } from 'vitest';
import DonationForm from '../DonationForm';

const navigateMock = vi.hoisted(() => vi.fn());
const dispatchMock = vi.hoisted(() => vi.fn());
const fetchAccountsMock = vi.hoisted(() => vi.fn((payload: unknown) => ({ type: 'accounts/fetch', payload })));
const fetchContactsMock = vi.hoisted(() => vi.fn((payload: unknown) => ({ type: 'contacts/fetch', payload })));

const mockState = {
  accounts: {
    list: {
      accounts: [
        {
          account_id: 'account-1',
          account_name: 'Acme Donors',
          category: 'donor',
          email: 'donors@example.org',
        },
      ],
      loading: false,
    },
  },
  contacts: {
    list: {
      contacts: [
        {
          contact_id: 'contact-1',
          first_name: 'Alex',
          last_name: 'Rivera',
          email: 'alex@example.org',
          account_name: 'Acme Donors',
        },
      ],
      loading: false,
    },
  },
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDomModule>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../hooks/useUnsavedChangesGuard', () => ({
  useUnsavedChangesGuard: vi.fn(),
}));

vi.mock('../../features/accounts/state', () => ({
  fetchAccounts: (payload: unknown) => fetchAccountsMock(payload),
}));

vi.mock('../../features/contacts/state', () => ({
  fetchContacts: (payload: unknown) => fetchContactsMock(payload),
}));

describe('DonationForm', () => {
  const renderDonationForm = (onSubmit = vi.fn().mockResolvedValue(undefined)) =>
    render(
      <MemoryRouter>
        <DonationForm onSubmit={onSubmit} />
      </MemoryRouter>
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits manual donations with linked donor records and transaction ids', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    renderDonationForm(onSubmit);

    fireEvent.change(screen.getByLabelText(/linked account/i), {
      target: { value: 'account-1' },
    });
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: '125.5' },
    });
    fireEvent.change(screen.getByLabelText(/donation date/i), {
      target: { value: '2026-04-18T10:30' },
    });
    fireEvent.change(screen.getByLabelText(/transaction id/i), {
      target: { value: 'MANUAL-125' },
    });

    fireEvent.click(screen.getByRole('button', { name: /record donation/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          account_id: 'account-1',
          amount: 125.5,
          donation_date: '2026-04-18T10:30',
          transaction_id: 'MANUAL-125',
        })
      );
    });
    expect(navigateMock).toHaveBeenCalledWith('/donations');
  });

  it('blocks submission when no donor linkage is selected', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    renderDonationForm(onSubmit);

    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: '75' },
    });
    fireEvent.change(screen.getByLabelText(/donation date/i), {
      target: { value: '2026-04-18T10:30' },
    });

    fireEvent.click(screen.getByRole('button', { name: /record donation/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/select an account or contact before recording the donation/i)
      ).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
