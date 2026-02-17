/**
 * Volunteers Redux Slice
 * State management for volunteer operations
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

export interface Volunteer {
  volunteer_id: string;
  contact_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mobile_phone?: string;
  skills: string[];
  availability_status: 'available' | 'unavailable' | 'limited';
  availability_notes: string | null;
  background_check_status:
    | 'not_required'
    | 'pending'
    | 'in_progress'
    | 'approved'
    | 'rejected'
    | 'expired';
  background_check_date: string | null;
  background_check_expiry: string | null;
  preferred_roles: string[] | null;
  max_hours_per_week: number | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  volunteer_since: string;
  total_hours_logged: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VolunteerAssignment {
  assignment_id: string;
  volunteer_id: string;
  event_id: string | null;
  task_id: string | null;
  assignment_type: 'event' | 'task' | 'general';
  role: string | null;
  start_time: string;
  end_time: string | null;
  hours_logged: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  volunteer_name?: string;
  event_name?: string;
  task_name?: string;
}

export interface VolunteersState {
  volunteers: Volunteer[];
  currentVolunteer: Volunteer | null;
  assignments: VolunteerAssignment[];
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
    availability_status: string;
    background_check_status: string;
    is_active: boolean;
  };
}

type VolunteerInput = Partial<Volunteer>;
type AssignmentInput = Partial<VolunteerAssignment>;

const initialState: VolunteersState = {
  volunteers: [],
  currentVolunteer: null,
  assignments: [],
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

// Async Thunks
export const fetchVolunteers = createAsyncThunk(
  'volunteers/fetchVolunteers',
  async (params: {
    page?: number;
    limit?: number;
    search?: string;
    skills?: string[];
    availability_status?: string;
    background_check_status?: string;
    is_active?: boolean;
  }) => {
    const queryParams: Record<string, string | number | boolean | undefined> = {
      page: params.page,
      limit: params.limit,
      search: params.search,
      availability_status: params.availability_status,
      background_check_status: params.background_check_status,
      is_active: params.is_active,
    };
    if (params.skills && params.skills.length > 0) {
      queryParams.skills = params.skills.join(',');
    }
    const response = await api.get('/volunteers', { params: queryParams });
    return response.data;
  }
);

export const fetchVolunteerById = createAsyncThunk(
  'volunteers/fetchVolunteerById',
  async (volunteerId: string) => {
    const response = await api.get(`/volunteers/${volunteerId}`);
    return response.data;
  }
);

export const fetchVolunteersBySkills = createAsyncThunk(
  'volunteers/fetchVolunteersBySkills',
  async (skills: string[]) => {
    const response = await api.get('/volunteers/search/skills', {
      params: { skills: skills.join(',') },
    });
    return response.data;
  }
);

export const createVolunteer = createAsyncThunk(
  'volunteers/createVolunteer',
  async (volunteerData: VolunteerInput) => {
    const response = await api.post('/volunteers', volunteerData);
    return response.data;
  }
);

export const updateVolunteer = createAsyncThunk(
  'volunteers/updateVolunteer',
  async ({ volunteerId, data }: { volunteerId: string; data: VolunteerInput }) => {
    const response = await api.put(`/volunteers/${volunteerId}`, data);
    return response.data;
  }
);

export const deleteVolunteer = createAsyncThunk(
  'volunteers/deleteVolunteer',
  async (volunteerId: string) => {
    await api.delete(`/volunteers/${volunteerId}`);
    return volunteerId;
  }
);

export const fetchVolunteerAssignments = createAsyncThunk(
  'volunteers/fetchAssignments',
  async (volunteerId: string) => {
    const response = await api.get(`/volunteers/${volunteerId}/assignments`);
    return response.data;
  }
);

export const createAssignment = createAsyncThunk(
  'volunteers/createAssignment',
  async (assignmentData: AssignmentInput) => {
    const response = await api.post('/volunteers/assignments', assignmentData);
    return response.data;
  }
);

export const updateAssignment = createAsyncThunk(
  'volunteers/updateAssignment',
  async ({ assignmentId, data }: { assignmentId: string; data: AssignmentInput }) => {
    const response = await api.put(`/volunteers/assignments/${assignmentId}`, data);
    return response.data;
  }
);

// Slice
const volunteersSlice = createSlice({
  name: 'volunteers',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<VolunteersState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearCurrentVolunteer: (state) => {
      state.currentVolunteer = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Volunteers
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
      // Fetch Volunteer by ID
      .addCase(fetchVolunteerById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVolunteerById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentVolunteer = action.payload;
      })
      .addCase(fetchVolunteerById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch volunteer';
      })
      // Fetch by Skills
      .addCase(fetchVolunteersBySkills.fulfilled, (state, action) => {
        state.volunteers = action.payload;
      })
      // Create Volunteer
      .addCase(createVolunteer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createVolunteer.fulfilled, (state, action) => {
        state.loading = false;
        state.volunteers.unshift(action.payload);
      })
      .addCase(createVolunteer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create volunteer';
      })
      // Update Volunteer
      .addCase(updateVolunteer.fulfilled, (state, action) => {
        const index = state.volunteers.findIndex(
          (v) => v.volunteer_id === action.payload.volunteer_id
        );
        if (index !== -1) {
          state.volunteers[index] = action.payload;
        }
        if (state.currentVolunteer?.volunteer_id === action.payload.volunteer_id) {
          state.currentVolunteer = action.payload;
        }
      })
      // Delete Volunteer
      .addCase(deleteVolunteer.fulfilled, (state, action) => {
        state.volunteers = state.volunteers.filter((v) => v.volunteer_id !== action.payload);
      })
      // Fetch Assignments
      .addCase(fetchVolunteerAssignments.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchVolunteerAssignments.fulfilled, (state, action) => {
        state.loading = false;
        state.assignments = action.payload;
      })
      .addCase(fetchVolunteerAssignments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch assignments';
      })
      // Create Assignment
      .addCase(createAssignment.fulfilled, (state, action) => {
        state.assignments.unshift(action.payload);
      })
      // Update Assignment
      .addCase(updateAssignment.fulfilled, (state, action) => {
        const index = state.assignments.findIndex(
          (a) => a.assignment_id === action.payload.assignment_id
        );
        if (index !== -1) {
          state.assignments[index] = action.payload;
        }
      });
  },
});

export const { setFilters, clearFilters, clearCurrentVolunteer, clearError } =
  volunteersSlice.actions;
export default volunteersSlice.reducer;
