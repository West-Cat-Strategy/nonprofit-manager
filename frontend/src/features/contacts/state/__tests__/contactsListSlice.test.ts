import { describe, expect, it } from 'vitest';
import reducer, { fetchContacts } from '../contactsListSlice';
import { deleteContact } from '../contactsCore';

describe('contactsListSlice', () => {
  it('keeps stale contact list responses from replacing a newer pending filter result', () => {
    const olderPayload = {
      data: [
        {
          contact_id: 'contact-older',
          first_name: 'Older',
          last_name: 'Contact',
        },
      ],
      pagination: {
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      },
    } as Parameters<typeof fetchContacts.fulfilled>[0];
    const newerPayload = {
      data: [
        {
          contact_id: 'contact-newer',
          first_name: 'Newer',
          last_name: 'Contact',
        },
      ],
      pagination: {
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      },
    } as Parameters<typeof fetchContacts.fulfilled>[0];

    const stateAfterFirstRequest = reducer(undefined, fetchContacts.pending('req-1', {}));
    const stateAfterSecondRequest = reducer(
      stateAfterFirstRequest,
      fetchContacts.pending('req-2', { search: 'newer' })
    );
    const stateAfterStaleResponse = reducer(
      stateAfterSecondRequest,
      fetchContacts.fulfilled(olderPayload, 'req-1', {})
    );
    const stateAfterLatestResponse = reducer(
      stateAfterStaleResponse,
      fetchContacts.fulfilled(newerPayload, 'req-2', { search: 'newer' })
    );

    expect(stateAfterStaleResponse.loading).toBe(true);
    expect(stateAfterStaleResponse.currentRequestId).toBe('req-2');
    expect(stateAfterStaleResponse.contacts).toEqual([]);

    expect(stateAfterLatestResponse.loading).toBe(false);
    expect(stateAfterLatestResponse.currentRequestId).toBeNull();
    expect(stateAfterLatestResponse.contacts).toEqual([
      expect.objectContaining({
        contact_id: 'contact-newer',
      }),
    ]);
  });

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
        currentRequestId: null,
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
      currentRequestId: null,
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
