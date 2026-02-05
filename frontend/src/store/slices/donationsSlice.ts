/**
 * Donations Redux Slice
 * State management for donation data
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  Donation,
  CreateDonationDTO,
  UpdateDonationDTO,
  DonationFilters,
  PaginationParams,
  PaginatedDonations,
  DonationSummary,
} from '../../types/donation';
import api from '../../services/api';
import {
  handlePending,
  handleRejected,
  buildQueryParams,
} from '../sliceHelpers';

interface DonationsState {
  donations: Donation[];
  selectedDonation: Donation | null;
  summary: DonationSummary | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  totalAmount: number;
  averageAmount: number;
  loading: boolean;
  error: string | null;
}

const initialState: DonationsState = {
  donations: [],
  selectedDonation: null,
  summary: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    total_pages: 0,
  },
  totalAmount: 0,
  averageAmount: 0,
  loading: false,
  error: null,
};

// Donation async thunks
export const fetchDonations = createAsyncThunk(
  'donations/fetchDonations',
  async (params: { filters?: DonationFilters; pagination?: PaginationParams }) => {
    const queryParams = buildQueryParams(
      params.filters as Record<string, unknown> | undefined,
      params.pagination as Record<string, unknown> | undefined
    );
    const response = await api.get<PaginatedDonations>(`/donations?${queryParams.toString()}`);
    return response.data;
  }
);

export const fetchDonationById = createAsyncThunk(
  'donations/fetchDonationById',
  async (donationId: string) => {
    const response = await api.get<Donation>(`/donations/${donationId}`);
    return response.data;
  }
);

export const createDonation = createAsyncThunk(
  'donations/createDonation',
  async (donationData: CreateDonationDTO) => {
    const response = await api.post<Donation>('/donations', donationData);
    return response.data;
  }
);

export const updateDonation = createAsyncThunk(
  'donations/updateDonation',
  async ({ donationId, donationData }: { donationId: string; donationData: UpdateDonationDTO }) => {
    const response = await api.put<Donation>(`/donations/${donationId}`, donationData);
    return response.data;
  }
);

export const deleteDonation = createAsyncThunk(
  'donations/deleteDonation',
  async (donationId: string) => {
    await api.delete(`/donations/${donationId}`);
    return donationId;
  }
);

export const markReceiptSent = createAsyncThunk(
  'donations/markReceiptSent',
  async (donationId: string) => {
    const response = await api.post<Donation>(`/donations/${donationId}/receipt`);
    return response.data;
  }
);

export const fetchDonationSummary = createAsyncThunk(
  'donations/fetchDonationSummary',
  async (filters?: DonationFilters) => {
    const queryParams = buildQueryParams(filters as Record<string, unknown> | undefined);
    const response = await api.get<DonationSummary>(`/donations/summary?${queryParams.toString()}`);
    return response.data;
  }
);

const donationsSlice = createSlice({
  name: 'donations',
  initialState,
  reducers: {
    clearSelectedDonation: (state) => {
      state.selectedDonation = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch donations
    builder.addCase(fetchDonations.pending, handlePending);
    builder.addCase(
      fetchDonations.fulfilled,
      (state, action: PayloadAction<PaginatedDonations>) => {
        state.loading = false;
        state.donations = action.payload.data;
        state.pagination = action.payload.pagination;
        if (action.payload.summary) {
          state.totalAmount = action.payload.summary.total_amount;
          state.averageAmount = action.payload.summary.average_amount;
        }
      }
    );
    builder.addCase(fetchDonations.rejected, (state, action) => {
      handleRejected(state, action, 'Failed to fetch donations');
    });

    // Fetch donation by ID
    builder.addCase(fetchDonationById.pending, handlePending);
    builder.addCase(fetchDonationById.fulfilled, (state, action: PayloadAction<Donation>) => {
      state.loading = false;
      state.selectedDonation = action.payload;
    });
    builder.addCase(fetchDonationById.rejected, (state, action) => {
      handleRejected(state, action, 'Failed to fetch donation');
    });

    // Create donation
    builder.addCase(createDonation.pending, handlePending);
    builder.addCase(createDonation.fulfilled, (state, action: PayloadAction<Donation>) => {
      state.loading = false;
      state.donations.unshift(action.payload);
    });
    builder.addCase(createDonation.rejected, (state, action) => {
      handleRejected(state, action, 'Failed to create donation');
    });

    // Update donation
    builder.addCase(updateDonation.pending, handlePending);
    builder.addCase(updateDonation.fulfilled, (state, action: PayloadAction<Donation>) => {
      state.loading = false;
      const index = state.donations.findIndex((d) => d.donation_id === action.payload.donation_id);
      if (index !== -1) {
        state.donations[index] = action.payload;
      }
      if (state.selectedDonation?.donation_id === action.payload.donation_id) {
        state.selectedDonation = action.payload;
      }
    });
    builder.addCase(updateDonation.rejected, (state, action) => {
      handleRejected(state, action, 'Failed to update donation');
    });

    // Delete donation
    builder.addCase(deleteDonation.pending, handlePending);
    builder.addCase(deleteDonation.fulfilled, (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.donations = state.donations.filter((d) => d.donation_id !== action.payload);
      if (state.selectedDonation?.donation_id === action.payload) {
        state.selectedDonation = null;
      }
    });
    builder.addCase(deleteDonation.rejected, (state, action) => {
      handleRejected(state, action, 'Failed to delete donation');
    });

    // Mark receipt sent
    builder.addCase(markReceiptSent.pending, handlePending);
    builder.addCase(markReceiptSent.fulfilled, (state, action: PayloadAction<Donation>) => {
      state.loading = false;
      const index = state.donations.findIndex((d) => d.donation_id === action.payload.donation_id);
      if (index !== -1) {
        state.donations[index] = action.payload;
      }
      if (state.selectedDonation?.donation_id === action.payload.donation_id) {
        state.selectedDonation = action.payload;
      }
    });
    builder.addCase(markReceiptSent.rejected, (state, action) => {
      handleRejected(state, action, 'Failed to mark receipt sent');
    });

    // Fetch donation summary
    builder.addCase(fetchDonationSummary.pending, handlePending);
    builder.addCase(
      fetchDonationSummary.fulfilled,
      (state, action: PayloadAction<DonationSummary>) => {
        state.loading = false;
        state.summary = action.payload;
      }
    );
    builder.addCase(fetchDonationSummary.rejected, (state, action) => {
      handleRejected(state, action, 'Failed to fetch donation summary');
    });
  },
});

export const { clearSelectedDonation, clearError } = donationsSlice.actions;
export default donationsSlice.reducer;
