import { fireEvent, screen } from '@testing-library/react';
import { act, type ReactNode } from 'react';
import type * as ReactRouterDomModule from 'react-router-dom';
import { vi } from 'vitest';
import ContactList from '../ContactListPage';
import { renderWithProviders } from '../../../../test/testUtils';

const { contactsState, dispatchMock, importExportModalMock } = vi.hoisted(() => ({
  contactsState: {
    contacts: [],
    loading: false,
    error: null,
    pagination: { total: 0, page: 1, limit: 20, total_pages: 1 },
    filters: {
      search: '',
      account_id: '',
      is_active: null,
      tags: [],
      role: '',
      sort_by: 'created_at',
      sort_order: 'desc',
    },
  },
  dispatchMock: vi.fn(),
  importExportModalMock: vi.fn(),
}));
const navigateMock = vi.hoisted(() => vi.fn());

const state = {
  contactsV2: contactsState,
};

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (s: typeof state) => unknown) => selector(state),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDomModule>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../../../features/contacts/state', () => ({
  default: (sliceState = contactsState) => sliceState,
  fetchContacts: (payload: unknown) => ({ type: 'contacts/fetchContacts', payload }),
  deleteContact: (id: string) => ({ type: 'contacts/delete', payload: id }),
  setFilters: (payload: unknown) => ({ type: 'contacts/setFilters', payload }),
  clearFilters: () => ({ type: 'contacts/clearFilters' }),
  fetchContactTags: () => ({ type: 'contacts/fetchTags' }),
}));

vi.mock('../../../../components/people', () => ({
  PeopleListContainer: ({
    filters,
    data = [],
    columns = [],
  }: {
    filters?: ReactNode;
    data?: Array<Record<string, unknown>>;
    columns?: Array<{
      key: string;
      render?: (value: unknown, row: Record<string, unknown>) => ReactNode;
    }>;
  }) => (
    <div>
      <div>Contact List</div>
      {filters}
      {data.map((row, rowIndex) => (
        <div key={String(row.contact_id ?? rowIndex)}>
          {columns.map((column) => (
            <div key={column.key}>
              {column.render ? column.render(row[column.key], row) : null}
            </div>
          ))}
        </div>
      ))}
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
        aria-label={searchField?.ariaLabel || 'Search contacts'}
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

describe('ContactList page', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    importExportModalMock.mockClear();
    navigateMock.mockClear();
    contactsState.contacts = [];
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sanitizes invalid URL filters before dispatching the initial load', () => {
    renderWithProviders(<ContactList />, {
      route: '/contacts?type=unknown&status=broken&page=0&limit=-3&sort_order=sideways',
    });

    expect(screen.getByText('Contact List')).toBeInTheDocument();
    expect(importExportModalMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'contacts',
        selectedIds: [],
        exportRequest: {
          search: undefined,
          role: undefined,
          is_active: undefined,
          sort_by: 'created_at',
          sort_order: 'desc',
        },
      })
    );
    expect(dispatchMock).toHaveBeenCalledWith({
      type: 'contacts/fetchContacts',
      payload: {
        page: 1,
        limit: 20,
        search: undefined,
        is_active: undefined,
        role: undefined,
        sort_by: 'created_at',
        sort_order: 'desc',
      },
    });
    expect(dispatchMock).toHaveBeenCalledWith({ type: 'contacts/fetchTags' });
  });

  it('debounces free-text search before dispatching another fetch', async () => {
    vi.useFakeTimers();

    renderWithProviders(<ContactList />);

    const getFetchActions = () =>
      dispatchMock.mock.calls
        .map(([action]) => action)
        .filter((action) => action.type === 'contacts/fetchContacts');

    expect(getFetchActions()).toHaveLength(1);

    const searchInput = screen.getByLabelText('Search contacts');
    fireEvent.change(searchInput, { target: { value: 'a' } });
    fireEvent.change(searchInput, { target: { value: 'al' } });
    fireEvent.change(searchInput, { target: { value: 'ale' } });
    fireEvent.change(searchInput, { target: { value: 'alex' } });

    expect(getFetchActions()).toHaveLength(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(getFetchActions()).toHaveLength(2);
    expect(getFetchActions()[1]).toEqual({
      type: 'contacts/fetchContacts',
      payload: {
        page: 1,
        limit: 20,
        search: 'alex',
        is_active: undefined,
        role: undefined,
        sort_by: 'created_at',
        sort_order: 'desc',
      },
    });

    vi.useRealTimers();
  });

  it('navigates to a contact detail route using the canonical contact UUID', () => {
    contactsState.contacts = [
      {
        contact_id: '11111111-1111-4111-8111-111111111111',
        first_name: 'Avery',
        last_name: 'Stone',
        email: 'avery@example.com',
        job_title: null,
        department: null,
        account_name: null,
        tags: [],
        is_active: true,
      },
    ];

    renderWithProviders(<ContactList />);

    fireEvent.click(screen.getByText('Avery Stone'));

    expect(navigateMock).toHaveBeenCalledWith('/contacts/11111111-1111-4111-8111-111111111111');
  });
});
