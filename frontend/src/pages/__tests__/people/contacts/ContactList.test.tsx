import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import ContactList from '../../../people/contacts/ContactList';
import { renderWithProviders } from '../../../../test/testUtils';

const dispatchMock = vi.fn();
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
  default: (state = { contacts: [], loading: false, error: null, pagination: { total: 0, page: 1, limit: 20, total_pages: 1 }, filters: {} }) => state,
  fetchContacts: (payload: unknown) => ({ type: 'contacts/fetch', payload }),
  deleteContact: (id: string) => ({ type: 'contacts/delete', payload: id }),
  setFilters: (payload: unknown) => ({ type: 'contacts/setFilters', payload }),
  clearFilters: () => ({ type: 'contacts/clearFilters' }),
  fetchContactTags: () => ({ type: 'contacts/tags' }),
}));

vi.mock('../../../../components/people', () => ({
  PeopleListContainer: () => <div>People List</div>,
  FilterPanel: ({ onApplyFilters }: { onApplyFilters: () => void }) => <button onClick={onApplyFilters}>Apply Filters</button>,
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

describe('ContactList page', () => {
  it('renders and loads contact list data', () => {
    renderWithProviders(<ContactList />);
    expect(screen.getByText('People List')).toBeInTheDocument();
    expect(dispatchMock).toHaveBeenCalled();
  });
});
