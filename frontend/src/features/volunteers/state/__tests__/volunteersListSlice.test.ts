import { describe, expect, it } from 'vitest';
import reducer from '../volunteersListSlice';
import { deleteVolunteer } from '../volunteersCore';

describe('volunteersListSlice', () => {
  it('removes deleted volunteers from the list and updates pagination totals', () => {
    const state = reducer(
      {
        volunteers: [
          {
            volunteer_id: 'volunteer-1',
            first_name: 'Taylor',
            last_name: 'Volunteer',
          },
          {
            volunteer_id: 'volunteer-2',
            first_name: 'Robin',
            last_name: 'Volunteer',
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
          skills: [],
          availability_status: '',
          background_check_status: '',
          is_active: true,
        },
      },
      deleteVolunteer.fulfilled('volunteer-1', 'req-1', 'volunteer-1')
    );

    expect(state.volunteers).toEqual([
      expect.objectContaining({
        volunteer_id: 'volunteer-2',
      }),
    ]);
    expect(state.pagination.total).toBe(1);
    expect(state.pagination.total_pages).toBe(1);
    expect(state.pagination.page).toBe(1);
  });

  it('keeps the current state when the deleted volunteer is not present in the loaded page', () => {
    const initialState = {
      volunteers: [
        {
          volunteer_id: 'volunteer-2',
          first_name: 'Robin',
          last_name: 'Volunteer',
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
        skills: [],
        availability_status: '',
        background_check_status: '',
        is_active: true,
      },
    };

    const state = reducer(
      initialState,
      deleteVolunteer.fulfilled('volunteer-1', 'req-1', 'volunteer-1')
    );

    expect(state).toEqual(initialState);
  });
});
