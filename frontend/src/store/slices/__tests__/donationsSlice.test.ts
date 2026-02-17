import { describe, it, expect, beforeEach } from 'vitest';
import reducer, {
  clearSelectedDonation,
  clearError,
  fetchDonations,
  fetchDonationById,
  createDonation,
  updateDonation,
  deleteDonation,
  markReceiptSent,
  fetchDonationSummary,
} from '../donationsSlice';
import type { Donation } from '../../../types/donation';

const mockDonation: Donation = {
  donation_id: 'donation-1',
  contact_id: 'contact-1',
  account_id: 'account-1',
  amount: 100,
  currency: 'USD',
  donation_date: '2024-01-15',
  payment_method: 'credit_card',
  campaign_id: null,
  fund_id: null,
  appeal_id: null,
  is_recurring: false,
  recurring_frequency: null,
  notes: null,
  receipt_sent: false,
  receipt_sent_at: null,
  acknowledgment_status: 'pending',
  gift_type: 'cash',
  designation: null,
  is_anonymous: false,
  soft_credit_contact_id: null,
  check_number: null,
  transaction_id: null,
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
};

const initialState = {
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

describe('donationsSlice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('reducers', () => {
    it('clears selected donation', () => {
      const stateWithDonation = { ...initialState, selectedDonation: mockDonation };
      const state = reducer(stateWithDonation, clearSelectedDonation());
      expect(state.selectedDonation).toBeNull();
    });

    it('clears error state', () => {
      const stateWithError = { ...initialState, error: 'Something went wrong' };
      const state = reducer(stateWithError, clearError());
      expect(state.error).toBeNull();
    });
  });

  describe('fetchDonations thunk', () => {
    it('sets loading to true on pending', () => {
      const action = { type: fetchDonations.pending.type };
      const state = reducer(initialState, action);
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('updates donations and pagination on fulfilled', () => {
      const action = {
        type: fetchDonations.fulfilled.type,
        payload: {
          data: [mockDonation],
          pagination: { total: 1, page: 1, limit: 20, total_pages: 1 },
          summary: { total_amount: 100, average_amount: 100 },
        },
      };
      const state = reducer(initialState, action);
      expect(state.loading).toBe(false);
      expect(state.donations).toEqual([mockDonation]);
      expect(state.pagination.total).toBe(1);
      expect(state.totalAmount).toBe(100);
      expect(state.averageAmount).toBe(100);
    });

    it('sets error on rejected', () => {
      const action = {
        type: fetchDonations.rejected.type,
        error: { message: 'Network error' },
      };
      const state = reducer(initialState, action);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });
  });

  describe('fetchDonationById thunk', () => {
    it('sets loading to true on pending', () => {
      const action = { type: fetchDonationById.pending.type };
      const state = reducer(initialState, action);
      expect(state.loading).toBe(true);
    });

    it('sets selected donation on fulfilled', () => {
      const action = {
        type: fetchDonationById.fulfilled.type,
        payload: mockDonation,
      };
      const state = reducer(initialState, action);
      expect(state.loading).toBe(false);
      expect(state.selectedDonation).toEqual(mockDonation);
    });
  });

  describe('createDonation thunk', () => {
    it('adds new donation to the beginning of the list', () => {
      const existingDonation = { ...mockDonation, donation_id: 'donation-0' };
      const stateWithDonations = { ...initialState, donations: [existingDonation] };

      const action = {
        type: createDonation.fulfilled.type,
        payload: mockDonation,
      };
      const state = reducer(stateWithDonations, action);
      expect(state.donations).toHaveLength(2);
      expect(state.donations[0]).toEqual(mockDonation);
    });
  });

  describe('updateDonation thunk', () => {
    it('updates existing donation in list', () => {
      const stateWithDonations = { ...initialState, donations: [mockDonation] };
      const updatedDonation = { ...mockDonation, amount: 200 };

      const action = {
        type: updateDonation.fulfilled.type,
        payload: updatedDonation,
      };
      const state = reducer(stateWithDonations, action);
      expect(state.donations[0].amount).toBe(200);
    });

    it('updates selectedDonation if it matches', () => {
      const stateWithSelected = { ...initialState, selectedDonation: mockDonation };
      const updatedDonation = { ...mockDonation, amount: 200 };

      const action = {
        type: updateDonation.fulfilled.type,
        payload: updatedDonation,
      };
      const state = reducer(stateWithSelected, action);
      expect(state.selectedDonation?.amount).toBe(200);
    });
  });

  describe('deleteDonation thunk', () => {
    it('removes donation from list', () => {
      const stateWithDonations = { ...initialState, donations: [mockDonation] };

      const action = {
        type: deleteDonation.fulfilled.type,
        payload: mockDonation.donation_id,
      };
      const state = reducer(stateWithDonations, action);
      expect(state.donations).toHaveLength(0);
    });

    it('clears selectedDonation if it matches', () => {
      const stateWithSelected = {
        ...initialState,
        donations: [mockDonation],
        selectedDonation: mockDonation,
      };

      const action = {
        type: deleteDonation.fulfilled.type,
        payload: mockDonation.donation_id,
      };
      const state = reducer(stateWithSelected, action);
      expect(state.selectedDonation).toBeNull();
    });
  });

  describe('markReceiptSent thunk', () => {
    it('updates donation with receipt sent status', () => {
      const stateWithDonations = { ...initialState, donations: [mockDonation] };
      const updatedDonation = { ...mockDonation, receipt_sent: true };

      const action = {
        type: markReceiptSent.fulfilled.type,
        payload: updatedDonation,
      };
      const state = reducer(stateWithDonations, action);
      expect(state.donations[0].receipt_sent).toBe(true);
    });
  });

  describe('fetchDonationSummary thunk', () => {
    it('sets loading on pending', () => {
      const action = { type: fetchDonationSummary.pending.type };
      const state = reducer(initialState, action);
      expect(state.loading).toBe(true);
    });

    it('sets summary on fulfilled', () => {
      const mockSummary = {
        total_amount: 10000,
        average_amount: 250,
        donation_count: 40,
        donor_count: 30,
        recurring_count: 5,
        by_payment_method: {},
        by_campaign: {},
        by_month: [],
      };

      const action = {
        type: fetchDonationSummary.fulfilled.type,
        payload: mockSummary,
      };
      const state = reducer(initialState, action);
      expect(state.loading).toBe(false);
      expect(state.summary).toEqual(mockSummary);
    });
  });
});
