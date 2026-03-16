import { fireEvent, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders } from '../../../../test/testUtils';
import PortalCasesPage from '../PortalCasesPage';

const listCasesMock = vi.fn();
const setSelectedCaseIdMock = vi.fn();

vi.mock('../../api/portalApiClient', () => ({
  portalV2ApiClient: {
    listCases: (...args: unknown[]) => listCasesMock(...args),
  },
}));

vi.mock('../../../../hooks/usePersistentPortalCaseContext', () => ({
  usePersistentPortalCaseContext: () => ({
    setSelectedCaseId: setSelectedCaseIdMock,
  }),
}));

describe('PortalCasesPage', () => {
  beforeEach(() => {
    listCasesMock.mockResolvedValue([
      {
        id: 'case-1',
        case_number: 'CASE-001',
        title: 'Housing Support',
        status_name: 'Open',
        case_type_name: 'Housing',
        priority: 'high',
        updated_at: '2026-03-15T18:00:00.000Z',
      },
      {
        id: 'case-2',
        case_number: 'CASE-002',
        title: 'Employment Support',
        status_name: 'Pending',
        case_type_name: 'Employment',
        priority: 'medium',
        updated_at: '2026-03-14T18:00:00.000Z',
      },
    ]);
  });

  it('filters the shared case list with the shared toolbar pattern', async () => {
    renderWithProviders(<PortalCasesPage />);

    expect(await screen.findByText('Housing Support')).toBeInTheDocument();
    expect(screen.getByText('Employment Support')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search'), {
      target: { value: 'housing' },
    });

    expect(screen.getByText('Housing Support')).toBeInTheDocument();
    expect(screen.queryByText('Employment Support')).not.toBeInTheDocument();
  });
});
