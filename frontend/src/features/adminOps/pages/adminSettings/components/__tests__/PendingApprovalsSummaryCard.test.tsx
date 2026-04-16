import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders } from '../../../../../../test/testUtils';
import PendingApprovalsSummaryCard from '../PendingApprovalsSummaryCard';

const listPendingRegistrationsMock = vi.fn();

vi.mock('../../../../api/adminHubApiClient', () => ({
  listPendingRegistrations: (...args: unknown[]) => listPendingRegistrationsMock(...args),
}));

describe('PendingApprovalsSummaryCard', () => {
  beforeEach(() => {
    listPendingRegistrationsMock.mockReset();
  });

  it('shows the pending approval count and approvals link', async () => {
    listPendingRegistrationsMock.mockResolvedValue({
      items: [{ id: 'pending-1' }, { id: 'pending-2' }],
    });

    renderWithProviders(<PendingApprovalsSummaryCard />);

    expect(
      await screen.findByText('2 registration requests awaiting review')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open approvals/i })).toHaveAttribute(
      'href',
      '/settings/admin/approvals'
    );
  });
});
