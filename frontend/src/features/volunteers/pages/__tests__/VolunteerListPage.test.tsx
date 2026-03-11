import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import VolunteerList from '../VolunteerListPage';
import { renderWithProviders } from '../../../../test/testUtils';

const { dispatchMock, importExportModalMock } = vi.hoisted(() => ({
  dispatchMock: vi.fn(),
  importExportModalMock: vi.fn(),
}));

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
  useAppSelector: (selector: (s: typeof state) => unknown) => selector(state),
}));

vi.mock('../../../../features/volunteers/state', () => ({
  default: (sliceState = { volunteers: [], loading: false, error: null, pagination: { total: 0, page: 1, limit: 20, total_pages: 1 }, filters: {} }) => sliceState,
  fetchVolunteers: (payload: unknown) => ({ type: 'volunteers/fetch', payload }),
  deleteVolunteer: (id: string) => ({ type: 'volunteers/delete', payload: id }),
  setFilters: (payload: unknown) => ({ type: 'volunteers/setFilters', payload }),
  clearFilters: () => ({ type: 'volunteers/clearFilters' }),
}));

vi.mock('../../../../components/people', () => ({
  PeopleListContainer: () => <div>Volunteer List</div>,
  FilterPanel: () => <div>Filter Panel</div>,
  BulkActionBar: () => <div>Bulk Bar</div>,
  ImportExportModal: (props: unknown) => {
    importExportModalMock(props);
    return <div>Import Export Modal</div>;
  },
}));

vi.mock('../../../../hooks', () => ({
  useBulkSelect: () => ({
    selectedIds: new Set(),
    selectedCount: 0,
    toggleRow: vi.fn(),
    selectAll: vi.fn(),
    deselectAll: vi.fn(),
  }),
}));

vi.mock('../../../../hooks/useConfirmDialog', () => ({
  default: () => ({
    dialogState: { isOpen: false },
    confirm: vi.fn().mockResolvedValue(false),
    handleConfirm: vi.fn(),
    handleCancel: vi.fn(),
  }),
  confirmPresets: { delete: () => ({ title: 'Delete' }) },
}));

vi.mock('../../../../components/ConfirmDialog', () => ({ default: () => null }));

describe('VolunteerList page', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    importExportModalMock.mockClear();
    localStorage.clear();
  });

  it('renders and wires backend import/export request props', () => {
    renderWithProviders(<VolunteerList />);

    expect(screen.getByText('Volunteer List')).toBeInTheDocument();
    expect(dispatchMock).toHaveBeenCalled();
    expect(importExportModalMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'volunteers',
        selectedIds: [],
        exportRequest: {
          search: undefined,
          availability_status: undefined,
          background_check_status: undefined,
          sort_by: 'created_at',
          sort_order: 'desc',
        },
      })
    );
  });

  it('sanitizes invalid URL filters before dispatching the initial load', () => {
    renderWithProviders(<VolunteerList />, {
      route: '/volunteers?status=busy&type=unknown&page=0&limit=-3&sort_order=sideways',
    });

    expect(dispatchMock).toHaveBeenCalledWith({
      type: 'volunteers/fetch',
      payload: {
        page: 1,
        limit: 20,
        search: undefined,
        availability_status: undefined,
        background_check_status: undefined,
      },
    });
  });
});
