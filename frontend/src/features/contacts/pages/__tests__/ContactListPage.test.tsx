import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import ContactList from '../ContactListPage';
import { renderWithProviders } from '../../../../test/testUtils';

const { dispatchMock, importExportModalMock } = vi.hoisted(() => ({
  dispatchMock: vi.fn(),
  importExportModalMock: vi.fn(),
}));

const state = {
  contactsV2: {
    contacts: [],
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

vi.mock('../../../../features/contacts/state', () => ({
  default: (sliceState = { contacts: [], loading: false, error: null, pagination: { total: 0, page: 1, limit: 20, total_pages: 1 }, filters: {} }) => sliceState,
  fetchContacts: (payload: unknown) => ({ type: 'contacts/fetch', payload }),
  deleteContact: (id: string) => ({ type: 'contacts/delete', payload: id }),
  setFilters: (payload: unknown) => ({ type: 'contacts/setFilters', payload }),
  clearFilters: () => ({ type: 'contacts/clearFilters' }),
  fetchContactTags: () => ({ type: 'contacts/tags' }),
}));

vi.mock('../../../../components/people', () => ({
  PeopleListContainer: () => <div>People List</div>,
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
  });

  it('renders and wires backend import/export request props', () => {
    renderWithProviders(<ContactList />);

    expect(screen.getByText('People List')).toBeInTheDocument();
    expect(dispatchMock).toHaveBeenCalled();
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
  });
});
