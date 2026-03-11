import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import AccountList from '../AccountListPage';
import { renderWithProviders } from '../../../../test/testUtils';

const { dispatchMock, importExportModalMock } = vi.hoisted(() => ({
  dispatchMock: vi.fn(),
  importExportModalMock: vi.fn(),
}));

const state = {
  accounts: {
    accounts: [],
    loading: false,
    error: null,
    pagination: { total: 0, page: 1, limit: 20, total_pages: 1 },
    filters: {
      search: '',
      account_type: '',
      category: '',
      is_active: true,
    },
  },
};

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (s: typeof state) => unknown) => selector(state),
}));

vi.mock('../../../../features/accounts/state', () => ({
  default: (sliceState = {
    accounts: [],
    loading: false,
    error: null,
    pagination: { total: 0, page: 1, limit: 20, total_pages: 1 },
    filters: {
      search: '',
      account_type: '',
      category: '',
      is_active: true,
    },
  }) => sliceState,
  fetchAccounts: (payload: unknown) => ({ type: 'accounts/fetch', payload }),
  deleteAccount: (id: string) => ({ type: 'accounts/delete', payload: id }),
  setFilters: (payload: unknown) => ({ type: 'accounts/setFilters', payload }),
  clearFilters: () => ({ type: 'accounts/clearFilters' }),
}));

vi.mock('../../../../components/people', () => ({
  PeopleListContainer: () => <div>Account List</div>,
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

describe('AccountList page', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    importExportModalMock.mockClear();
    localStorage.clear();
  });

  it('renders and wires backend import/export request props', () => {
    renderWithProviders(<AccountList />);

    expect(screen.getByText('Account List')).toBeInTheDocument();
    expect(dispatchMock).toHaveBeenCalled();
    expect(importExportModalMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'accounts',
        selectedIds: [],
        exportRequest: {
          search: undefined,
          account_type: undefined,
          category: undefined,
          is_active: true,
          sort_by: 'created_at',
          sort_order: 'desc',
        },
      })
    );
  });

  it('sanitizes invalid URL filters before dispatching the initial load', () => {
    renderWithProviders(<AccountList />, {
      route: '/accounts?type=invalid&category=unknown&status=broken&page=0&limit=-4&sort_order=sideways',
    });

    expect(dispatchMock).toHaveBeenCalledWith({
      type: 'accounts/fetch',
      payload: {
        page: 1,
        limit: 20,
        search: undefined,
        account_type: undefined,
        category: undefined,
        is_active: true,
      },
    });
  });
});
