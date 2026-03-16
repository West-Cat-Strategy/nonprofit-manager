import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import type * as FinanceStateModule from '../../state';
import DonationDetailPage from '../DonationDetailPage';
import { renderWithProviders } from '../../../../test/testUtils';

const dispatchMock = vi.fn();
const navigateMock = vi.fn();

const state = {
  donations: {
    selectedDonation: {
      donation_id: 'donation-1',
      donation_number: 'DON-260315-00001',
      account_id: 'org-1',
      contact_id: 'contact-1',
      recurring_plan_id: 'plan-1',
      amount: 25,
      currency: 'CAD',
      donation_date: '2026-03-15T00:00:00.000Z',
      payment_method: 'credit_card' as const,
      payment_status: 'completed' as const,
      transaction_id: 'pi_1',
      stripe_subscription_id: 'sub_1',
      stripe_invoice_id: 'in_1',
      campaign_name: 'Monthly donors',
      designation: 'General fund',
      is_recurring: true,
      recurring_frequency: 'monthly' as const,
      recurring_plan_status: 'active',
      notes: 'Thank you.',
      receipt_sent: false,
      receipt_sent_date: null,
      created_at: '2026-03-15T00:00:00.000Z',
      updated_at: '2026-03-15T00:00:00.000Z',
      created_by: 'user-1',
      modified_by: 'user-1',
      account_name: 'Neighborhood Mutual Aid',
      contact_name: 'Ada Lovelace',
      official_tax_receipt_id: null,
      official_tax_receipt_number: null,
      official_tax_receipt_kind: null,
      official_tax_receipt_issued_at: null,
    },
    loading: false,
  },
};

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (value: typeof state) => unknown) => selector(state),
}));

vi.mock('../../state', async (importOriginal) => {
  const actual = await importOriginal<typeof FinanceStateModule>();
  return {
    ...actual,
    fetchDonationById: (payload: unknown) => ({ type: 'donations/fetchById', payload }),
    issueTaxReceipt: (payload: unknown) => ({ type: 'donations/issueTaxReceipt', payload }),
    issueAnnualTaxReceipt: (payload: unknown) => ({
      type: 'donations/issueAnnualTaxReceipt',
      payload,
    }),
    downloadTaxReceiptPdf: (payload: unknown) => ({
      type: 'donations/downloadTaxReceiptPdf',
      payload,
    }),
    clearSelectedDonation: () => ({ type: 'donations/clearSelected' }),
  };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ id: 'donation-1' }),
  };
});

vi.mock('../../../../hooks/useConfirmDialog', () => ({
  default: () => ({
    dialogState: {
      isOpen: false,
      title: '',
      message: '',
      confirmLabel: 'Confirm',
      variant: 'warning',
    },
    confirm: vi.fn().mockResolvedValue(false),
    handleConfirm: vi.fn(),
    handleCancel: vi.fn(),
  }),
}));

describe('DonationDetailPage', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    navigateMock.mockClear();
  });

  it('shows recurring plan status and links to the monthly plan detail page', () => {
    renderWithProviders(<DonationDetailPage />);

    expect(screen.getByRole('button', { name: /issue tax receipt/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /annual receipt/i })).toBeInTheDocument();
    expect(screen.getByText('Plan Status')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    screen.getByRole('button', { name: 'Open monthly plan' }).click();
    expect(navigateMock).toHaveBeenCalledWith('/recurring-donations/plan-1');
  });
});
