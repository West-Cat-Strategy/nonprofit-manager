import { describe, it, expect, beforeEach } from 'vitest';
import reducer, {
  setFilters,
  clearFilters,
  clearCurrentContact,
  clearError,
  fetchContacts,
  fetchContactById,
  createContact,
  updateContact,
  deleteContact,
  type ContactsState,
} from '../contactsSlice';

const mockContact = {
  contact_id: 'contact-1',
  account_id: 'account-1',
  first_name: 'John',
  preferred_name: null,
  last_name: 'Doe',
  middle_name: null,
  salutation: 'Mr.',
  suffix: null,
  birth_date: null,
  gender: null,
  pronouns: null,
  email: 'john@example.com',
  phone: '555-1234',
  mobile_phone: null,
  address_line1: null,
  address_line2: null,
  city: null,
  state_province: null,
  postal_code: null,
  country: null,
  job_title: null,
  department: null,
  preferred_contact_method: null,
  do_not_email: false,
  do_not_phone: false,
  notes: null,
  tags: [],
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const initialState: ContactsState = {
  contacts: [],
  currentContact: null,
  loading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    total_pages: 0,
  },
  filters: {
    search: '',
    account_id: '',
    is_active: null,
    tags: [],
    role: '',
    sort_by: 'created_at',
    sort_order: 'desc',
  },
  phones: [],
  emails: [],
  relationships: [],
  contactNotes: [],
  documents: [],
  phonesLoading: false,
  emailsLoading: false,
  relationshipsLoading: false,
  notesLoading: false,
  documentsLoading: false,
  availableTags: [],
};

describe('contactsSlice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('reducers', () => {
    it('sets filters correctly', () => {
      const state = reducer(initialState, setFilters({ search: 'test', account_id: 'acc-1' }));
      expect(state.filters.search).toBe('test');
      expect(state.filters.account_id).toBe('acc-1');
      expect(state.filters.is_active).toBeNull();
    });

    it('clears filters to initial state', () => {
      const stateWithFilters = {
        ...initialState,
        filters: {
          search: 'test',
          account_id: 'acc-1',
          is_active: false,
          tags: ['vip'],
          role: 'staff',
          sort_by: 'first_name',
          sort_order: 'asc',
        },
      };
      const state = reducer(stateWithFilters, clearFilters());
      expect(state.filters).toEqual(initialState.filters);
    });

    it('clears current contact and related data', () => {
      const stateWithContact = {
        ...initialState,
        currentContact: mockContact,
        phones: [{ id: '1', phone_number: '555-1234', phone_type: 'mobile', is_primary: true }],
        emails: [{ id: '1', email_address: 'test@example.com', email_type: 'work', is_primary: true }],
      } as ContactsState;

      const state = reducer(stateWithContact, clearCurrentContact());
      expect(state.currentContact).toBeNull();
      expect(state.phones).toEqual([]);
      expect(state.emails).toEqual([]);
      expect(state.relationships).toEqual([]);
      expect(state.contactNotes).toEqual([]);
      expect(state.documents).toEqual([]);
    });

    it('clears error state', () => {
      const stateWithError = { ...initialState, error: 'Something went wrong' };
      const state = reducer(stateWithError, clearError());
      expect(state.error).toBeNull();
    });
  });

  describe('fetchContacts thunk', () => {
    it('sets loading to true on pending', () => {
      const action = { type: fetchContacts.pending.type };
      const state = reducer(initialState, action);
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('updates contacts and pagination on fulfilled', () => {
      const action = {
        type: fetchContacts.fulfilled.type,
        payload: {
          data: [mockContact],
          pagination: { total: 1, page: 1, limit: 20, total_pages: 1 },
        },
      };
      const state = reducer(initialState, action);
      expect(state.loading).toBe(false);
      expect(state.contacts).toEqual([mockContact]);
      expect(state.pagination.total).toBe(1);
    });

    it('sets error on rejected', () => {
      const action = {
        type: fetchContacts.rejected.type,
        error: { message: 'Network error' },
      };
      const state = reducer(initialState, action);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });
  });

  describe('fetchContactById thunk', () => {
    it('sets loading to true on pending', () => {
      const action = { type: fetchContactById.pending.type };
      const state = reducer(initialState, action);
      expect(state.loading).toBe(true);
    });

    it('sets current contact on fulfilled', () => {
      const action = {
        type: fetchContactById.fulfilled.type,
        payload: mockContact,
      };
      const state = reducer(initialState, action);
      expect(state.loading).toBe(false);
      expect(state.currentContact).toEqual(mockContact);
    });
  });

  describe('createContact thunk', () => {
    it('adds new contact to the beginning of the list', () => {
      const existingContact = { ...mockContact, contact_id: 'contact-0' };
      const stateWithContacts = { ...initialState, contacts: [existingContact] };

      const action = {
        type: createContact.fulfilled.type,
        payload: mockContact,
      };
      const state = reducer(stateWithContacts, action);
      expect(state.contacts).toHaveLength(2);
      expect(state.contacts[0]).toEqual(mockContact);
    });
  });

  describe('updateContact thunk', () => {
    it('updates existing contact in list', () => {
      const stateWithContacts = { ...initialState, contacts: [mockContact] };
      const updatedContact = { ...mockContact, first_name: 'Jane' };

      const action = {
        type: updateContact.fulfilled.type,
        payload: updatedContact,
      };
      const state = reducer(stateWithContacts, action);
      expect(state.contacts[0].first_name).toBe('Jane');
    });

    it('updates currentContact if it matches', () => {
      const stateWithCurrent = { ...initialState, currentContact: mockContact };
      const updatedContact = { ...mockContact, first_name: 'Jane' };

      const action = {
        type: updateContact.fulfilled.type,
        payload: updatedContact,
      };
      const state = reducer(stateWithCurrent, action);
      expect(state.currentContact?.first_name).toBe('Jane');
    });
  });

  describe('deleteContact thunk', () => {
    it('removes contact from list', () => {
      const stateWithContacts = { ...initialState, contacts: [mockContact] };

      const action = {
        type: deleteContact.fulfilled.type,
        payload: mockContact.contact_id,
      };
      const state = reducer(stateWithContacts, action);
      expect(state.contacts).toHaveLength(0);
    });
  });
});
