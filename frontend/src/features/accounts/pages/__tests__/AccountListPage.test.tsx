import { fireEvent, screen } from '@testing-library/react';
import { act, type ReactNode } from 'react';
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
  PeopleListContainer: ({ filters }: { filters?: ReactNode }) => (
    <div>
      <div>Account List</div>
      {filters}
    </div>
  ),
  FilterPanel: ({
    fields,
    onFilterChange,
  }: {
    fields: Array<{ id: string; ariaLabel?: string; value?: string }>;
    onFilterChange: (id: string, value: string) => void;
  }) => {
    const searchField = fields.find((field) => field.id === 'search');
    return (
      <input
        aria-label={searchField?.ariaLabel || 'Search accounts'}
        value={searchField?.value || ''}
        onChange={(event) => onFilterChange('search', event.target.value)}
      />
    );
  },
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

  afterEach(() => {
    vi.useRealTimers();
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

  it('debounces free-text search before dispatching another fetch', async () => {
    vi.useFakeTimers();

    renderWithProviders(<AccountList />);

    const getFetchActions = () =>
      dispatchMock.mock.calls
        .map(([action]) => action)
        .filter((action) => action.type === 'accounts/fetch');

    expect(getFetchActions()).toHaveLength(1);

    const searchInput = screen.getByLabelText('Search accounts');
    fireEvent.change(searchInput, { target: { value: 'w' } });
    fireEvent.change(searchInput, { target: { value: 'we' } });
    fireEvent.change(searchInput, { target: { value: 'wes' } });
    fireEvent.change(searchInput, { target: { value: 'west' } });

    expect(getFetchActions()).toHaveLength(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(getFetchActions()).toHaveLength(2);
    expect(getFetchActions()[1]).toEqual({
      type: 'accounts/fetch',
      payload: {
        page: 1,
        limit: 20,
        search: 'west',
        account_type: undefined,
        category: undefined,
        is_active: true,
      },
    });

    vi.useRealTimers();
  });
});
