import { screen } from '@testing-library/react';
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

const state = {
  contactsV2: contactsState,
};

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (s: typeof state) => unknown) => selector(state),
}));

vi.mock('../../../../features/contacts/state', () => ({
  default: (sliceState = contactsState) => sliceState,
  fetchContacts: (payload: unknown) => ({ type: 'contacts/fetchContacts', payload }),
  deleteContact: (id: string) => ({ type: 'contacts/delete', payload: id }),
  setFilters: (payload: unknown) => ({ type: 'contacts/setFilters', payload }),
  clearFilters: () => ({ type: 'contacts/clearFilters' }),
  fetchContactTags: () => ({ type: 'contacts/fetchTags' }),
}));

vi.mock('../../../../components/people', () => ({
  PeopleListContainer: () => <div>Contact List</div>,
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

describe('ContactList page', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    importExportModalMock.mockClear();
    localStorage.clear();
  });

  it('sanitizes invalid URL filters before dispatching the initial load', () => {
    renderWithProviders(<ContactList />, {
      route: '/contacts?type=unknown&status=broken&page=0&limit=-3&sort_order=sideways',
    });

    expect(screen.getByText('Contact List')).toBeInTheDocument();
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
});
