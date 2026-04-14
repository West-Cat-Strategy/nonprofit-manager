import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { volunteersApiClient } from '../api/volunteersApiClient';
import { deleteVolunteer } from './volunteersCore';
import type {
  Volunteer,
  VolunteersListQuery,
} from '../types/contracts';

export interface VolunteersListState {
  volunteers: Volunteer[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  filters: {
    search: string;
    skills: string[];
    availability_status: '' | Volunteer['availability_status'];
    background_check_status: '' | Volunteer['background_check_status'];
    is_active: boolean;
  };
}

const initialState: VolunteersListState = {
  volunteers: [],
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
    skills: [],
    availability_status: '',
    background_check_status: '',
    is_active: true,
  },
};

export const fetchVolunteers = createAsyncThunk(
  'volunteersList/fetchVolunteers',
  async (params: VolunteersListQuery = {}) => {
    return volunteersApiClient.listVolunteers(params);
  }
);

export const fetchVolunteersBySkills = createAsyncThunk(
  'volunteersList/fetchVolunteersBySkills',
  async (skills: string[]) => {
    return volunteersApiClient.findVolunteersBySkills(skills);
  }
);

const volunteersListSlice = createSlice({
  name: 'volunteersList',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<VolunteersListState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVolunteers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVolunteers.fulfilled, (state, action) => {
        state.loading = false;
        state.volunteers = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchVolunteers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch volunteers';
      })
      .addCase(fetchVolunteersBySkills.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchVolunteersBySkills.fulfilled, (state, action) => {
        state.loading = false;
        state.volunteers = action.payload;
      })
      .addCase(fetchVolunteersBySkills.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch volunteers by skills';
      })
      .addCase(deleteVolunteer.fulfilled, (state, action) => {
        const deletedVolunteerId = action.payload;
        const nextVolunteers = state.volunteers.filter(
          (volunteer) => volunteer.volunteer_id !== deletedVolunteerId
        );
        const removedCount = state.volunteers.length - nextVolunteers.length;

        if (removedCount === 0) {
          return;
        }

        state.volunteers = nextVolunteers;
        const nextTotal = Math.max(0, state.pagination.total - removedCount);
        state.pagination.total = nextTotal;
        state.pagination.total_pages =
          state.pagination.limit > 0
            ? Math.max(1, Math.ceil(nextTotal / state.pagination.limit))
            : state.pagination.total_pages;
        if (state.pagination.page > state.pagination.total_pages) {
          state.pagination.page = state.pagination.total_pages;
        }
      });
  },
});

export const { setFilters, clearFilters } = volunteersListSlice.actions;
export default volunteersListSlice.reducer;
