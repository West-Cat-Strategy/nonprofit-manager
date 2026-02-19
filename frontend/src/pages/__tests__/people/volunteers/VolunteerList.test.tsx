import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import VolunteerList from '../../../people/volunteers/VolunteerList';
import { renderWithProviders } from '../../../../test/testUtils';

const dispatchMock = vi.fn();
const state = {
  volunteers: {
    volunteers: [],
    loading: false,
    error: null,
    pagination: { total: 0, page: 1, limit: 20, total_pages: 1 },
    filters: {},
  },
};

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (s: any) => any) => selector(state),
}));

vi.mock('../../../../store/slices/volunteersSlice', () => ({
  default: (state = { volunteers: [], loading: false, error: null, pagination: { total: 0, page: 1, limit: 20, total_pages: 1 }, filters: {} }) => state,
  fetchVolunteers: (payload: any) => ({ type: 'volunteers/fetch', payload }),
  deleteVolunteer: (id: string) => ({ type: 'volunteers/delete', payload: id }),
  setFilters: (payload: any) => ({ type: 'volunteers/setFilters', payload }),
  clearFilters: () => ({ type: 'volunteers/clearFilters' }),
}));

vi.mock('../../../../components/people', () => ({
  PeopleListContainer: () => <div>Volunteer List</div>,
  FilterPanel: () => <div>Filter Panel</div>,
  BulkActionBar: () => <div>Bulk Bar</div>,
  ImportExportModal: () => null,
}));

vi.mock('../../../../hooks', () => ({
  useBulkSelect: () => ({ selectedIds: new Set(), selectedCount: 0, toggleRow: vi.fn(), selectAll: vi.fn(), deselectAll: vi.fn() }),
  useImportExport: () => ({ exportToCSV: vi.fn() }),
}));

vi.mock('../../../../hooks/useConfirmDialog', () => ({
  default: () => ({ dialogState: { isOpen: false }, confirm: vi.fn().mockResolvedValue(false), handleConfirm: vi.fn(), handleCancel: vi.fn() }),
  confirmPresets: { delete: () => ({ title: 'Delete' }) },
}));
vi.mock('../../../../components/ConfirmDialog', () => ({ default: () => null }));

describe('VolunteerList page', () => {
  it('renders volunteer list shell', () => {
    renderWithProviders(<VolunteerList />);
    expect(screen.getByText('Volunteer List')).toBeInTheDocument();
    expect(dispatchMock).toHaveBeenCalled();
  });
});
