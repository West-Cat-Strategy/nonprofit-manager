import type { ReactNode } from 'react';
import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import ContactList from '../ContactListPage';
import { renderWithProviders } from '../../../../test/testUtils';

const { dispatchMock, importExportModalMock, filterPanelMock } = vi.hoisted(() => ({
  dispatchMock: vi.fn(),
  importExportModalMock: vi.fn(),
  filterPanelMock: vi.fn(),
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
  PeopleListContainer: ({ filters }: { filters?: ReactNode }) => (
    <div>
      <div>People List</div>
      {filters}
    </div>
  ),
  FilterPanel: (props: unknown) => {
    filterPanelMock(props);
    return <div>Filter Panel</div>;
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
    filterPanelMock.mockClear();
  });

  it('renders role filter options in the expected order and wires default export props', () => {
    renderWithProviders(<ContactList />);

    expect(screen.getByText('People List')).toBeInTheDocument();
    expect(dispatchMock).toHaveBeenCalled();
    const filterPanelProps = filterPanelMock.mock.calls[0]?.[0] as {
      fields: Array<{
        id: string;
        options?: Array<{ value: string; label: string }>;
      }>;
    };
    const roleField = filterPanelProps.fields.find((field) => field.id === 'role');

    expect(roleField?.options).toEqual([
      { value: 'client', label: 'Client' },
      { value: 'donor', label: 'Donor' },
      { value: 'support_person', label: 'Support Person' },
      { value: 'staff', label: 'Staff' },
      { value: 'volunteer', label: 'Volunteer' },
      { value: 'board', label: 'Board' },
    ]);
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

  it('uses the selected role filter for list fetches and export payloads', () => {
    renderWithProviders(<ContactList />, { route: '/contacts?type=client' });

    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'contacts/fetch',
        payload: expect.objectContaining({
          role: 'client',
        }),
      })
    );
    expect(importExportModalMock).toHaveBeenCalledWith(
      expect.objectContaining({
        exportRequest: expect.objectContaining({
          role: 'client',
        }),
      })
    );
  });
});
