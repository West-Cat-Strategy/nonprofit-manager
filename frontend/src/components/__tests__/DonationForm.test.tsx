import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type * as ReactRouterDomModule from 'react-router-dom';
import { vi } from 'vitest';
import DonationForm from '../DonationForm';
import type { DonationDesignation, Donation } from '../../types/donation';

const navigateMock = vi.hoisted(() => vi.fn());
const dispatchMock = vi.hoisted(() => vi.fn());
const fetchAccountsMock = vi.hoisted(() =>
  vi.fn((payload: unknown) => ({ type: 'accounts/fetch', payload }))
);
const fetchContactsMock = vi.hoisted(() =>
  vi.fn((payload: unknown) => ({ type: 'contacts/fetch', payload }))
);
const fetchDonationDesignationsMock = vi.hoisted(() =>
  vi.fn((payload: unknown) => ({ type: 'donations/fetchDesignations', payload }))
);

const createMockState = () => ({
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
  finance: {
    donations: {
      designations: [],
      designationsLoading: false,
    },
  },
});

let currentState = createMockState();

const createDesignation = (
  overrides: Partial<DonationDesignation> & Pick<DonationDesignation, 'designation_id' | 'name'>
): DonationDesignation => ({
  designation_id: overrides.designation_id,
  organization_id: overrides.organization_id ?? 'org-1',
  code: overrides.code ?? overrides.name.toLowerCase().replace(/\s+/g, '-'),
  name: overrides.name,
  description: overrides.description ?? null,
  restriction_type: overrides.restriction_type ?? 'unrestricted',
  is_active: overrides.is_active ?? true,
  created_at: overrides.created_at ?? '2026-05-01T00:00:00.000Z',
  updated_at: overrides.updated_at ?? '2026-05-01T00:00:00.000Z',
});

const createDonation = (overrides: Partial<Donation> = {}): Donation => ({
  donation_id: 'donation-1',
  donation_number: 'DON-260501-00001',
  account_id: 'account-1',
  contact_id: null,
  amount: 125,
  currency: 'CAD',
  donation_date: '2026-05-01T10:30:00.000Z',
  payment_method: 'cash',
  payment_status: 'completed',
  transaction_id: null,
  campaign_name: null,
  designation_id: null,
  designation: null,
  is_recurring: false,
  recurring_frequency: null,
  notes: null,
  receipt_sent: false,
  receipt_sent_date: null,
  created_at: '2026-05-01T10:30:00.000Z',
  updated_at: '2026-05-01T10:30:00.000Z',
  created_by: 'user-1',
  modified_by: 'user-1',
  ...overrides,
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDomModule>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: ReturnType<typeof createMockState>) => unknown) =>
    selector(currentState),
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

vi.mock('../../features/finance/state', () => ({
  fetchDonationDesignations: (payload: unknown) => fetchDonationDesignationsMock(payload),
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
    currentState = createMockState();
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

  it('only offers active designations on new donations', () => {
    currentState = {
      ...createMockState(),
      finance: {
        donations: {
          designations: [
            createDesignation({ designation_id: 'designation-active', name: 'General Fund' }),
            createDesignation({
              designation_id: 'designation-inactive',
              name: 'Dormant Capital',
              is_active: false,
            }),
          ],
          designationsLoading: false,
        },
      },
    };

    renderDonationForm();

    expect(screen.getByRole('option', { name: 'General Fund' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Dormant Capital/i })).not.toBeInTheDocument();
  });

  it('preserves the current inactive designation without offering unrelated inactive designations', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    currentState = {
      ...createMockState(),
      finance: {
        donations: {
          designations: [
            createDesignation({ designation_id: 'designation-active', name: 'General Fund' }),
            createDesignation({
              designation_id: 'designation-current',
              name: 'Legacy Scholarship',
              is_active: false,
            }),
            createDesignation({
              designation_id: 'designation-other-inactive',
              name: 'Dormant Capital',
              is_active: false,
            }),
          ],
          designationsLoading: false,
        },
      },
    };

    render(
      <MemoryRouter>
        <DonationForm
          donation={createDonation({
            designation_id: 'designation-current',
            designation: 'Legacy scholarship',
            designation_label: 'Legacy Scholarship',
          })}
          onSubmit={onSubmit}
          isEdit
        />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('option', { name: 'Legacy Scholarship (inactive)' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Dormant Capital/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /update donation/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    const submittedDonation = onSubmit.mock.calls[0][0];
    expect(submittedDonation).not.toHaveProperty('designation_id');
    expect(submittedDonation).not.toHaveProperty('designation');
  });

  it('only requests empty donor lookups once per mount', async () => {
    currentState = {
      accounts: {
        list: {
          accounts: [],
          loading: false,
        },
      },
      contacts: {
        list: {
          contacts: [],
          loading: false,
        },
      },
      finance: {
        donations: {
          designations: [],
          designationsLoading: false,
        },
      },
    };

    const { rerender } = render(
      <MemoryRouter>
        <DonationForm onSubmit={vi.fn().mockResolvedValue(undefined)} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(fetchAccountsMock).toHaveBeenCalledTimes(1);
      expect(fetchContactsMock).toHaveBeenCalledTimes(1);
    });

    currentState = {
      accounts: {
        list: {
          accounts: [],
          loading: true,
        },
      },
      contacts: {
        list: {
          contacts: [],
          loading: true,
        },
      },
      finance: {
        donations: {
          designations: [],
          designationsLoading: true,
        },
      },
    };

    rerender(
      <MemoryRouter>
        <DonationForm onSubmit={vi.fn().mockResolvedValue(undefined)} />
      </MemoryRouter>
    );

    currentState = {
      accounts: {
        list: {
          accounts: [],
          loading: false,
        },
      },
      contacts: {
        list: {
          contacts: [],
          loading: false,
        },
      },
      finance: {
        donations: {
          designations: [],
          designationsLoading: false,
        },
      },
    };

    rerender(
      <MemoryRouter>
        <DonationForm onSubmit={vi.fn().mockResolvedValue(undefined)} />
      </MemoryRouter>
    );

    expect(fetchAccountsMock).toHaveBeenCalledTimes(1);
    expect(fetchContactsMock).toHaveBeenCalledTimes(1);
    expect(fetchDonationDesignationsMock).toHaveBeenCalledTimes(1);
  });
});
