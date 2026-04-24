import { describe, expect, it } from 'vitest';
import reducer from '../volunteersListSlice';
import { fetchVolunteers } from '../volunteersListSlice';
import { deleteVolunteer } from '../volunteersCore';

describe('volunteersListSlice', () => {
  it('keeps stale volunteer list responses from replacing a newer pending filter result', () => {
    const olderPayload = {
      data: [
        {
          volunteer_id: 'volunteer-older',
          first_name: 'Older',
          last_name: 'Volunteer',
        },
      ],
      pagination: {
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      },
    } as Parameters<typeof fetchVolunteers.fulfilled>[0];
    const newerPayload = {
      data: [
        {
          volunteer_id: 'volunteer-newer',
          first_name: 'Newer',
          last_name: 'Volunteer',
        },
      ],
      pagination: {
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      },
    } as Parameters<typeof fetchVolunteers.fulfilled>[0];

    const stateAfterFirstRequest = reducer(undefined, fetchVolunteers.pending('req-1', {}));
    const stateAfterSecondRequest = reducer(
      stateAfterFirstRequest,
      fetchVolunteers.pending('req-2', { search: 'newer' })
    );
    const stateAfterStaleResponse = reducer(
      stateAfterSecondRequest,
      fetchVolunteers.fulfilled(olderPayload, 'req-1', {})
    );
    const stateAfterLatestResponse = reducer(
      stateAfterStaleResponse,
      fetchVolunteers.fulfilled(newerPayload, 'req-2', { search: 'newer' })
    );

    expect(stateAfterStaleResponse.loading).toBe(true);
    expect(stateAfterStaleResponse.currentRequestId).toBe('req-2');
    expect(stateAfterStaleResponse.volunteers).toEqual([]);

    expect(stateAfterLatestResponse.loading).toBe(false);
    expect(stateAfterLatestResponse.currentRequestId).toBeNull();
    expect(stateAfterLatestResponse.volunteers).toEqual([
      expect.objectContaining({
        volunteer_id: 'volunteer-newer',
      }),
    ]);
  });

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
        currentRequestId: null,
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
      currentRequestId: null,
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
