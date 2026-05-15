import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DonationBatchReviewPage from '../DonationBatchReviewPage';
import { renderWithProviders } from '../../../../test/testUtils';
import api from '../../../../services/api';

vi.mock('../../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

const batch = {
  batch_id: 'batch-1',
  organization_id: 'org-1',
  name: 'May 14 donation batch',
  date_from: '2026-05-14',
  date_to: '2026-05-14',
  expected_count: 2,
  expected_amount: 125,
  currency: 'CAD',
  status: 'under_review' as const,
  notes: null,
  closed_at: '2026-05-14T10:00:00.000Z',
  reviewed_at: null,
  approved_at: null,
  posted_at: null,
  reopened_at: null,
  created_at: '2026-05-14T09:00:00.000Z',
  updated_at: '2026-05-14T10:00:00.000Z',
  created_by: 'user-1',
  modified_by: 'user-1',
  control_summary: {
    expected_count: 2,
    expected_amount: 125,
    actual_count: 2,
    actual_amount: 125,
    difference_count: 0,
    difference_amount: 0,
    currency: 'CAD',
  },
  restricted_fund_summary: [
    {
      restriction_type: 'temporarily_restricted' as const,
      designation_id: 'designation-1',
      designation_label: 'Building Fund',
      designation_code: 'building',
      count: 1,
      amount: 75,
    },
  ],
  exception_preview: [],
  audit_events: [
    {
      audit_event_id: 'audit-1',
      batch_id: 'batch-1',
      event_type: 'closed_for_review' as const,
      from_status: 'open' as const,
      to_status: 'under_review' as const,
      actor_user_id: 'user-1',
      metadata: {},
      created_at: '2026-05-14T10:00:00.000Z',
    },
  ],
};

describe('DonationBatchReviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.get.mockResolvedValue({ data: { data: [batch] } });
    mockedApi.post.mockImplementation((url: string) => {
      if (url === '/donations/batches') {
        return Promise.resolve({ data: { ...batch, name: 'Desk deposit' } });
      }

      return Promise.resolve({ data: { ...batch, status: 'approved' } });
    });
  });

  it('renders control totals, restricted funds, exceptions, and audit events', async () => {
    renderWithProviders(<DonationBatchReviewPage />, { route: '/donations/batches' });

    expect(await screen.findByRole('heading', { name: /donation batch review/i })).toBeInTheDocument();
    expect((await screen.findAllByText('May 14 donation batch')).length).toBeGreaterThan(0);
    expect(screen.getByText('Building Fund')).toBeInTheDocument();
    expect(screen.getByText('No control exceptions.')).toBeInTheDocument();
    expect(screen.getByText(/closed for review/i)).toBeInTheDocument();
  });

  it('creates batches and posts allowed state transitions to the backend', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DonationBatchReviewPage />, { route: '/donations/batches' });

    await screen.findAllByText('May 14 donation batch');
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Desk deposit');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(mockedApi.post).toHaveBeenCalledWith('/donations/batches', {
        name: 'Desk deposit',
        date_from: expect.any(String),
        date_to: expect.any(String),
        expected_count: 0,
        expected_amount: 0,
        currency: 'CAD',
        notes: '',
      })
    );

    await user.click(screen.getByRole('button', { name: /approve/i }));
    expect(mockedApi.post).toHaveBeenCalledWith('/donations/batches/batch-1/approve');
  });
});
