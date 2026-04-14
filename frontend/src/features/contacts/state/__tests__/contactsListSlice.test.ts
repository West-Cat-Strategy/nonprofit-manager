import { describe, expect, it } from 'vitest';
import reducer from '../contactsListSlice';
import { deleteContact } from '../contactsCore';

describe('contactsListSlice', () => {
  it('removes deleted contacts from the list and updates pagination totals', () => {
    const state = reducer(
      {
        contacts: [
          {
            contact_id: 'contact-1',
            first_name: 'Taylor',
            last_name: 'Contact',
          },
          {
            contact_id: 'contact-2',
            first_name: 'Robin',
            last_name: 'Contact',
          },
        ],
        loading: false,
        error: null,
        pagination: {
          total: 2,
          page: 1,
          limit: 20,
          total_pages: 1,
        },
        filters: {
          search: '',
          account_id: '',
          is_active: null,
          tags: [],
          role: '',
          sort_by: 'created_at',
          sort_order: 'desc' as const,
        },
        availableTags: [],
      },
      deleteContact.fulfilled('contact-1', 'req-1', 'contact-1')
    );

    expect(state.contacts).toEqual([
      expect.objectContaining({
        contact_id: 'contact-2',
      }),
    ]);
    expect(state.pagination.total).toBe(1);
    expect(state.pagination.total_pages).toBe(1);
    expect(state.pagination.page).toBe(1);
  });

  it('keeps the current state when the deleted contact is not present in the loaded page', () => {
    const initialState = {
      contacts: [
        {
          contact_id: 'contact-2',
          first_name: 'Robin',
          last_name: 'Contact',
        },
      ],
      loading: false,
      error: null,
      pagination: {
        total: 5,
        page: 2,
        limit: 2,
        total_pages: 3,
      },
      filters: {
        search: '',
        account_id: '',
        is_active: null,
        tags: [],
        role: '',
        sort_by: 'created_at',
        sort_order: 'desc' as const,
      },
      availableTags: [],
    };

    const state = reducer(
      initialState,
      deleteContact.fulfilled('contact-1', 'req-1', 'contact-1')
    );

    expect(state).toEqual(initialState);
  });
});
